import * as AST from './JavaAST';
import { JavaParser } from './JavaParser';

export interface JavaValue {
  value: any;
  type: string;
}

export interface ExecutionState {
  line: number;
  variables: Map<string, JavaValue>;
  stackTrace: string[];
  timestamp: number;
  output: string;
}

export interface GCMetrics {
  pauseTime: number;
  heapUsage: number;
  collections: number;
  timestamp: number;
  allocatedObjects: number;
  freedObjects: number;
}

export class JavaInterpreter {
  private globals = new Map<string, JavaValue>();
  private environment = new Map<string, JavaValue>();
  private classes = new Map<string, AST.ClassDeclaration>();
  private executionStates: ExecutionState[] = [];
  private gcMetrics: GCMetrics[] = [];
  private deadlineViolations: string[] = [];
  private currentLine = 0;
  private callStack: string[] = [];
  private heapSize = 0;
  private maxHeapSize = 1024 * 1024; // 1MB
  private gcThreshold = 0.7;
  private output = '';
  private allocatedObjects = 0;
  private freedObjects = 0;
  private objectRegistry = new Map<string, any>();

  constructor() {
    this.initializeBuiltins();
  }

  private initializeBuiltins() {
    // System.out.println
    this.globals.set('System.out.println', {
      value: (...args: any[]) => {
        const output = args.map(arg => this.valueToString(arg)).join(' ');
        this.output += output + '\n';
        console.log(output);
        return { value: null, type: 'void' };
      },
      type: 'function'
    });

    // Math functions
    this.globals.set('Math.random', {
      value: () => ({ value: Math.random(), type: 'double' }),
      type: 'function'
    });

    this.globals.set('Math.floor', {
      value: (arg: number) => ({ value: Math.floor(arg), type: 'int' }),
      type: 'function'
    });

    this.globals.set('Math.max', {
      value: (a: number, b: number) => ({ value: Math.max(a, b), type: 'double' }),
      type: 'function'
    });

    this.globals.set('Math.min', {
      value: (a: number, b: number) => ({ value: Math.min(a, b), type: 'double' }),
      type: 'function'
    });

    // String methods
    this.globals.set('String.valueOf', {
      value: (arg: any) => ({ value: String(arg), type: 'String' }),
      type: 'function'
    });
  }

  interpret(source: string): { output: string; states: ExecutionState[]; gcMetrics: GCMetrics[]; violations: string[] } {
    try {
      // Reset state
      this.output = '';
      this.executionStates = [];
      this.gcMetrics = [];
      this.deadlineViolations = [];
      this.environment.clear();
      this.classes.clear();
      this.callStack = [];
      this.currentLine = 0;
      this.heapSize = 0;
      this.allocatedObjects = 0;
      this.freedObjects = 0;

      // Handle simple expressions and statements without full class structure
      if (!source.includes('class ') && !source.includes('public class')) {
        return this.interpretSimpleCode(source);
      }

      const parser = new JavaParser(source);
      const program = parser.parse();
      
      // Register classes
      for (const classDecl of program.classes) {
        this.classes.set(classDecl.name, classDecl);
      }

      // Execute the program
      this.executeProgram(program);
      
      return {
        output: this.output,
        states: this.executionStates,
        gcMetrics: this.gcMetrics,
        violations: this.deadlineViolations
      };
    } catch (error) {
      const errorMsg = `Error: ${error instanceof Error ? error.message : String(error)}`;
      this.output += errorMsg + '\n';
      return {
        output: this.output,
        states: this.executionStates,
        gcMetrics: this.gcMetrics,
        violations: this.deadlineViolations
      };
    }
  }

  private interpretSimpleCode(source: string): { output: string; states: ExecutionState[]; gcMetrics: GCMetrics[]; violations: string[] } {
    // Handle simple statements like variable declarations, expressions, etc.
    const lines = source.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      this.currentLine = i + 1;
      
      try {
        if (line.includes('System.out.println')) {
          this.handlePrintStatement(line);
        } else if (line.includes('=') && !line.includes('==')) {
          this.handleAssignment(line);
        } else if (line.includes('int ') || line.includes('double ') || line.includes('String ')) {
          this.handleVariableDeclaration(line);
        }
        
        this.recordExecutionState();
        this.maybePerformGC();
      } catch (error) {
        this.output += `Error on line ${i + 1}: ${error}\n`;
      }
    }

    return {
      output: this.output,
      states: this.executionStates,
      gcMetrics: this.gcMetrics,
      violations: this.deadlineViolations
    };
  }

  private handlePrintStatement(line: string) {
    const match = line.match(/System\.out\.println\s*\(\s*(.+?)\s*\)/);
    if (match) {
      const content = match[1];
      let output = '';
      
      if (content.startsWith('"') && content.endsWith('"')) {
        // String literal
        output = content.slice(1, -1);
      } else if (content.includes('+')) {
        // String concatenation
        output = this.evaluateStringExpression(content);
      } else {
        // Variable or expression
        const value = this.environment.get(content.trim());
        output = value ? this.valueToString(value.value) : content;
      }
      
      this.output += output + '\n';
    }
  }

  private handleAssignment(line: string) {
    const parts = line.split('=');
    if (parts.length === 2) {
      const varName = parts[0].trim();
      const value = parts[1].trim().replace(';', '');
      
      let javaValue: JavaValue;
      if (value.startsWith('"') && value.endsWith('"')) {
        javaValue = { value: value.slice(1, -1), type: 'String' };
      } else if (!isNaN(Number(value))) {
        const num = Number(value);
        javaValue = { value: num, type: Number.isInteger(num) ? 'int' : 'double' };
      } else if (value === 'true' || value === 'false') {
        javaValue = { value: value === 'true', type: 'boolean' };
      } else {
        // Expression or variable reference
        const existingVar = this.environment.get(value);
        javaValue = existingVar || { value: value, type: 'String' };
      }
      
      this.environment.set(varName, javaValue);
      this.allocateMemory(javaValue);
    }
  }

  private handleVariableDeclaration(line: string) {
    const match = line.match(/(int|double|String|boolean)\s+(\w+)(?:\s*=\s*(.+?))?;?$/);
    if (match) {
      const type = match[1];
      const varName = match[2];
      const initialValue = match[3];
      
      let javaValue: JavaValue;
      if (initialValue) {
        if (initialValue.startsWith('"') && initialValue.endsWith('"')) {
          javaValue = { value: initialValue.slice(1, -1), type: 'String' };
        } else if (!isNaN(Number(initialValue))) {
          const num = Number(initialValue);
          javaValue = { value: num, type: type };
        } else if (initialValue === 'true' || initialValue === 'false') {
          javaValue = { value: initialValue === 'true', type: 'boolean' };
        } else {
          javaValue = this.getDefaultValue(type);
        }
      } else {
        javaValue = this.getDefaultValue(type);
      }
      
      this.environment.set(varName, javaValue);
      this.allocateMemory(javaValue);
    }
  }

  private evaluateStringExpression(expr: string): string {
    // Simple string concatenation evaluation
    const parts = expr.split('+').map(p => p.trim());
    let result = '';
    
    for (const part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        result += part.slice(1, -1);
      } else {
        const value = this.environment.get(part);
        result += value ? this.valueToString(value.value) : part;
      }
    }
    
    return result;
  }

  private executeProgram(program: AST.Program): void {
    // Look for classes and execute their methods
    for (const classDecl of program.classes) {
      this.executeClass(classDecl);
    }
  }

  private executeClass(classDecl: AST.ClassDeclaration): void {
    // Initialize class fields
    for (const field of classDecl.fields) {
      if (field.initializer) {
        const value = this.evaluateExpression(field.initializer);
        this.environment.set(field.name, value);
      } else {
        this.environment.set(field.name, this.getDefaultValue(field.dataType));
      }
      this.allocateMemory(this.environment.get(field.name)!);
    }

    // Execute methods that should run automatically
    for (const method of classDecl.methods) {
      if (method.name === 'processData' || method.name === 'main' || method.name === 'run') {
        this.executeMethod(classDecl, method);
      }
    }
  }

  private executeMethod(classDecl: AST.ClassDeclaration, method: AST.MethodDeclaration): void {
    this.callStack.push(`${classDecl.name}.${method.name}`);
    
    // Check for @Deadline annotation
    const deadlineAnnotation = method.annotations.find(a => a.name === 'Deadline');
    const deadline = deadlineAnnotation?.parameters.ms || Infinity;
    const startTime = performance.now();
    
    try {
      // Execute method body
      for (const statement of method.body) {
        this.currentLine = statement.line;
        this.recordExecutionState();
        
        const result = this.executeStatement(statement);
        if (result && result.type === 'return') {
          break;
        }
        
        this.maybePerformGC();
      }
      
      const executionTime = performance.now() - startTime;
      
      // Check deadline violation
      if (executionTime > deadline) {
        this.deadlineViolations.push(
          `Method ${classDecl.name}.${method.name} exceeded deadline: ${executionTime.toFixed(2)}ms > ${deadline}ms`
        );
      }
      
    } finally {
      this.callStack.pop();
    }
  }

  private executeStatement(statement: AST.Statement): JavaValue | null {
    switch (statement.type) {
      case 'ExpressionStatement':
        return this.evaluateExpression((statement as AST.ExpressionStatement).expression);
        
      case 'VariableDeclaration':
        const varDecl = statement as AST.VariableDeclaration;
        const value = varDecl.initializer 
          ? this.evaluateExpression(varDecl.initializer)
          : this.getDefaultValue(varDecl.dataType);
        this.environment.set(varDecl.name, value);
        this.allocateMemory(value);
        return null;
        
      case 'IfStatement':
        const ifStmt = statement as AST.IfStatement;
        const condition = this.evaluateExpression(ifStmt.condition);
        if (this.isTruthy(condition.value)) {
          return this.executeStatement(ifStmt.thenStatement);
        } else if (ifStmt.elseStatement) {
          return this.executeStatement(ifStmt.elseStatement);
        }
        return null;
        
      case 'WhileStatement':
        const whileStmt = statement as AST.WhileStatement;
        let iterations = 0;
        while (iterations < 1000) { // Prevent infinite loops
          const cond = this.evaluateExpression(whileStmt.condition);
          if (!this.isTruthy(cond.value)) break;
          
          const result = this.executeStatement(whileStmt.body);
          if (result && result.type === 'return') return result;
          iterations++;
        }
        return null;
        
      case 'ForStatement':
        const forStmt = statement as AST.ForStatement;
        if (forStmt.init) {
          this.executeStatement(forStmt.init);
        }
        
        let forIterations = 0;
        while (forIterations < 1000) { // Prevent infinite loops
          if (forStmt.condition) {
            const cond = this.evaluateExpression(forStmt.condition);
            if (!this.isTruthy(cond.value)) break;
          }
          
          const result = this.executeStatement(forStmt.body);
          if (result && result.type === 'return') return result;
          
          if (forStmt.update) {
            this.evaluateExpression(forStmt.update);
          }
          forIterations++;
        }
        return null;
        
      case 'BlockStatement':
        const blockStmt = statement as AST.BlockStatement;
        for (const stmt of blockStmt.statements) {
          const result = this.executeStatement(stmt);
          if (result && result.type === 'return') return result;
        }
        return null;
        
      case 'ReturnStatement':
        const returnStmt = statement as AST.ReturnStatement;
        const returnValue = returnStmt.value 
          ? this.evaluateExpression(returnStmt.value)
          : { value: null, type: 'void' };
        return { ...returnValue, type: 'return' };
        
      default:
        return null;
    }
  }

  private evaluateExpression(expression: AST.Expression): JavaValue {
    switch (expression.type) {
      case 'Literal':
        const literal = expression as AST.Literal;
        return { value: literal.value, type: literal.dataType };
        
      case 'Identifier':
        const identifier = expression as AST.Identifier;
        const value = this.environment.get(identifier.name) || this.globals.get(identifier.name);
        if (!value) {
          throw new Error(`Undefined variable: ${identifier.name}`);
        }
        return value;
        
      case 'BinaryExpression':
        const binary = expression as AST.BinaryExpression;
        const left = this.evaluateExpression(binary.left);
        const right = this.evaluateExpression(binary.right);
        return this.evaluateBinaryOperation(left, binary.operator, right);
        
      case 'UnaryExpression':
        const unary = expression as AST.UnaryExpression;
        const operand = this.evaluateExpression(unary.operand);
        return this.evaluateUnaryOperation(unary.operator, operand);
        
      case 'AssignmentExpression':
        const assignment = expression as AST.AssignmentExpression;
        const assignValue = this.evaluateExpression(assignment.right);
        if (assignment.left.type === 'Identifier') {
          const id = assignment.left as AST.Identifier;
          this.environment.set(id.name, assignValue);
        }
        return assignValue;
        
      case 'CallExpression':
        const call = expression as AST.CallExpression;
        return this.evaluateCall(call);
        
      case 'MemberExpression':
        const member = expression as AST.MemberExpression;
        return this.evaluateMemberAccess(member);
        
      default:
        throw new Error(`Unknown expression type: ${expression.type}`);
    }
  }

  private evaluateBinaryOperation(left: JavaValue, operator: string, right: JavaValue): JavaValue {
    switch (operator) {
      case '+':
        if (left.type === 'String' || right.type === 'String') {
          return { value: String(left.value) + String(right.value), type: 'String' };
        }
        return { value: Number(left.value) + Number(right.value), type: 'double' };
      case '-':
        return { value: Number(left.value) - Number(right.value), type: 'double' };
      case '*':
        return { value: Number(left.value) * Number(right.value), type: 'double' };
      case '/':
        return { value: Number(left.value) / Number(right.value), type: 'double' };
      case '%':
        return { value: Number(left.value) % Number(right.value), type: 'double' };
      case '==':
        return { value: left.value === right.value, type: 'boolean' };
      case '!=':
        return { value: left.value !== right.value, type: 'boolean' };
      case '<':
        return { value: Number(left.value) < Number(right.value), type: 'boolean' };
      case '>':
        return { value: Number(left.value) > Number(right.value), type: 'boolean' };
      case '<=':
        return { value: Number(left.value) <= Number(right.value), type: 'boolean' };
      case '>=':
        return { value: Number(left.value) >= Number(right.value), type: 'boolean' };
      case '&&':
        return { value: this.isTruthy(left.value) && this.isTruthy(right.value), type: 'boolean' };
      case '||':
        return { value: this.isTruthy(left.value) || this.isTruthy(right.value), type: 'boolean' };
      default:
        throw new Error(`Unknown binary operator: ${operator}`);
    }
  }

  private evaluateUnaryOperation(operator: string, operand: JavaValue): JavaValue {
    switch (operator) {
      case '-':
        return { value: -Number(operand.value), type: operand.type };
      case '!':
        return { value: !this.isTruthy(operand.value), type: 'boolean' };
      default:
        throw new Error(`Unknown unary operator: ${operator}`);
    }
  }

  private evaluateCall(call: AST.CallExpression): JavaValue {
    if (call.callee.type === 'MemberExpression') {
      const member = call.callee as AST.MemberExpression;
      
      // Handle System.out.println
      if (member.object.type === 'MemberExpression') {
        const systemOut = member.object as AST.MemberExpression;
        if ((systemOut.object as AST.Identifier).name === 'System' && 
            (systemOut.property as AST.Identifier).name === 'out' &&
            (member.property as AST.Identifier).name === 'println') {
          
          const args = call.arguments.map(arg => this.evaluateExpression(arg));
          const output = args.map(arg => this.valueToString(arg.value)).join(' ');
          this.output += output + '\n';
          return { value: null, type: 'void' };
        }
      }
      
      // Handle Math functions
      if (member.object.type === 'Identifier') {
        const objName = (member.object as AST.Identifier).name;
        const methodName = (member.property as AST.Identifier).name;
        
        if (objName === 'Math') {
          const mathFunc = this.globals.get(`Math.${methodName}`);
          if (mathFunc && mathFunc.type === 'function') {
            const args = call.arguments.map(arg => this.evaluateExpression(arg));
            return mathFunc.value(...args.map(arg => arg.value));
          }
        }
      }
    }
    
    if (call.callee.type === 'Identifier') {
      const funcName = (call.callee as AST.Identifier).name;
      const func = this.globals.get(funcName);
      
      if (func && func.type === 'function') {
        const args = call.arguments.map(arg => this.evaluateExpression(arg));
        return func.value(...args.map(arg => arg.value));
      }
    }
    
    return { value: null, type: 'void' };
  }

  private evaluateMemberAccess(member: AST.MemberExpression): JavaValue {
    if (member.object.type === 'Identifier') {
      const objName = (member.object as AST.Identifier).name;
      const propName = (member.property as AST.Identifier).name;
      
      // Handle System.out
      if (objName === 'System' && propName === 'out') {
        return { value: 'System.out', type: 'PrintStream' };
      }
      
      // Handle Math functions
      if (objName === 'Math') {
        const mathFunc = this.globals.get(`Math.${propName}`);
        if (mathFunc) return mathFunc;
      }
    }
    
    const object = this.evaluateExpression(member.object);
    const property = (member.property as AST.Identifier).name;
    
    // Handle object property access
    if (typeof object.value === 'object' && object.value !== null) {
      return { value: object.value[property], type: 'unknown' };
    }
    
    return { value: null, type: 'unknown' };
  }

  private getDefaultValue(type: string): JavaValue {
    switch (type) {
      case 'int':
        return { value: 0, type: 'int' };
      case 'double':
        return { value: 0.0, type: 'double' };
      case 'boolean':
        return { value: false, type: 'boolean' };
      case 'String':
        return { value: '', type: 'String' };
      default:
        return { value: null, type: type };
    }
  }

  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }

  private valueToString(value: any): string {
    if (value === null || value === undefined) return 'null';
    return String(value);
  }

  private allocateMemory(value: JavaValue): void {
    const size = this.getValueSize(value);
    this.heapSize += size;
    this.allocatedObjects++;
    
    // Store object in registry for GC tracking
    const objectId = `obj_${this.allocatedObjects}`;
    this.objectRegistry.set(objectId, value);
  }

  private getValueSize(value: JavaValue): number {
    switch (value.type) {
      case 'int':
        return 4;
      case 'double':
        return 8;
      case 'boolean':
        return 1;
      case 'String':
        return (value.value as string).length * 2;
      default:
        return 8; // reference size
    }
  }

  private recordExecutionState(): void {
    const state: ExecutionState = {
      line: this.currentLine,
      variables: new Map(this.environment),
      stackTrace: [...this.callStack],
      timestamp: Date.now(),
      output: this.output
    };
    
    this.executionStates.push(state);
    
    // Keep only last 100 states
    if (this.executionStates.length > 100) {
      this.executionStates.shift();
    }
  }

  private maybePerformGC(): void {
    if (this.heapSize > this.maxHeapSize * this.gcThreshold) {
      this.performGC();
    }
  }

  private performGC(): void {
    const startTime = performance.now();
    
    // Mark and sweep simulation
    const reachableObjects = this.markReachableObjects();
    const freedObjects = this.objectRegistry.size - reachableObjects.size;
    
    // Sweep unreachable objects
    for (const [objectId, obj] of this.objectRegistry) {
      if (!reachableObjects.has(objectId)) {
        this.heapSize -= this.getValueSize(obj);
        this.objectRegistry.delete(objectId);
        this.freedObjects++;
      }
    }
    
    const pauseTime = performance.now() - startTime;
    
    this.gcMetrics.push({
      pauseTime,
      heapUsage: (this.heapSize / this.maxHeapSize) * 100,
      collections: 1,
      timestamp: Date.now(),
      allocatedObjects: this.allocatedObjects,
      freedObjects: this.freedObjects
    });
    
    // Keep only last 50 GC metrics
    if (this.gcMetrics.length > 50) {
      this.gcMetrics.shift();
    }
  }

  private markReachableObjects(): Set<string> {
    const reachable = new Set<string>();
    
    // Mark objects reachable from environment
    for (const [name, value] of this.environment) {
      for (const [objectId, obj] of this.objectRegistry) {
        if (obj === value) {
          reachable.add(objectId);
        }
      }
    }
    
    // Mark objects reachable from globals
    for (const [name, value] of this.globals) {
      for (const [objectId, obj] of this.objectRegistry) {
        if (obj === value) {
          reachable.add(objectId);
        }
      }
    }
    
    return reachable;
  }

  getExecutionStates(): ExecutionState[] {
    return this.executionStates;
  }

  getGCMetrics(): GCMetrics[] {
    return this.gcMetrics;
  }

  getDeadlineViolations(): string[] {
    return this.deadlineViolations;
  }

  // Method to trigger GC manually for monitoring
  triggerGC(): void {
    this.performGC();
  }

  // Method to get current heap status
  getHeapStatus(): { used: number; max: number; percentage: number } {
    return {
      used: this.heapSize,
      max: this.maxHeapSize,
      percentage: (this.heapSize / this.maxHeapSize) * 100
    };
  }
}