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
}

export interface GCMetrics {
  pauseTime: number;
  heapUsage: number;
  collections: number;
  timestamp: number;
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
  private gcThreshold = 0.8;

  constructor() {
    // Built-in functions
    this.globals.set('System.out.println', {
      value: (args: JavaValue[]) => {
        const output = args.map(arg => this.valueToString(arg.value)).join(' ');
        console.log(output);
        return { value: null, type: 'void' };
      },
      type: 'function'
    });

    this.globals.set('Math.random', {
      value: () => ({ value: Math.random(), type: 'double' }),
      type: 'function'
    });

    this.globals.set('Math.floor', {
      value: (args: JavaValue[]) => ({ value: Math.floor(args[0].value), type: 'int' }),
      type: 'function'
    });
  }

  interpret(source: string): { output: string; states: ExecutionState[]; gcMetrics: GCMetrics[]; violations: string[] } {
    try {
      const parser = new JavaParser(source);
      const program = parser.parse();
      
      // Register classes
      for (const classDecl of program.classes) {
        this.classes.set(classDecl.name, classDecl);
      }

      // Find main method and execute
      const output = this.executeProgram(program);
      
      return {
        output,
        states: this.executionStates,
        gcMetrics: this.gcMetrics,
        violations: this.deadlineViolations
      };
    } catch (error) {
      return {
        output: `Error: ${error instanceof Error ? error.message : String(error)}`,
        states: this.executionStates,
        gcMetrics: this.gcMetrics,
        violations: this.deadlineViolations
      };
    }
  }

  private executeProgram(program: AST.Program): string {
    let output = '';
    
    // Look for a class with methods to execute
    for (const classDecl of program.classes) {
      for (const method of classDecl.methods) {
        if (method.name === 'processData' || method.name === 'main') {
          output += this.executeMethod(classDecl, method);
        }
      }
    }
    
    return output;
  }

  private executeMethod(classDecl: AST.ClassDeclaration, method: AST.MethodDeclaration): string {
    let output = '';
    this.callStack.push(`${classDecl.name}.${method.name}`);
    
    // Check for @Deadline annotation
    const deadlineAnnotation = method.annotations.find(a => a.name === 'Deadline');
    const deadline = deadlineAnnotation?.parameters.ms || Infinity;
    const startTime = performance.now();
    
    try {
      // Initialize class fields
      for (const field of classDecl.fields) {
        if (field.initializer) {
          const value = this.evaluateExpression(field.initializer);
          this.environment.set(field.name, value);
        } else {
          this.environment.set(field.name, this.getDefaultValue(field.dataType));
        }
      }

      // Execute method body
      for (const statement of method.body) {
        this.currentLine = statement.line;
        this.recordExecutionState();
        
        const result = this.executeStatement(statement);
        if (result && result.type === 'return') {
          break;
        }
        
        // Trigger GC periodically
        if (this.heapSize > this.maxHeapSize * this.gcThreshold) {
          this.performGC();
        }
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
    
    return output;
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
        this.heapSize += this.getValueSize(value);
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
        while (true) {
          const cond = this.evaluateExpression(whileStmt.condition);
          if (!this.isTruthy(cond.value)) break;
          
          const result = this.executeStatement(whileStmt.body);
          if (result && result.type === 'return') return result;
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
      const object = this.evaluateExpression(member.object);
      const property = member.property as AST.Identifier;
      
      // Handle System.out.println
      if (object.value === 'System.out' && property.name === 'println') {
        const args = call.arguments.map(arg => this.evaluateExpression(arg));
        const output = args.map(arg => this.valueToString(arg.value)).join(' ');
        console.log(output);
        return { value: null, type: 'void' };
      }
    }
    
    if (call.callee.type === 'Identifier') {
      const funcName = (call.callee as AST.Identifier).name;
      const func = this.globals.get(funcName);
      
      if (func && func.type === 'function') {
        const args = call.arguments.map(arg => this.evaluateExpression(arg));
        return func.value(args);
      }
    }
    
    throw new Error(`Cannot call ${call.callee.type}`);
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
    
    throw new Error(`Cannot access property ${property} of ${object.type}`);
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
      timestamp: Date.now()
    };
    
    this.executionStates.push(state);
    
    // Keep only last 100 states
    if (this.executionStates.length > 100) {
      this.executionStates.shift();
    }
  }

  private performGC(): void {
    const startTime = performance.now();
    
    // Simple mark and sweep simulation
    const reachableSize = this.heapSize * 0.7; // 70% of objects are reachable
    this.heapSize = reachableSize;
    
    const pauseTime = performance.now() - startTime;
    
    this.gcMetrics.push({
      pauseTime,
      heapUsage: (this.heapSize / this.maxHeapSize) * 100,
      collections: 1,
      timestamp: Date.now()
    });
    
    // Keep only last 50 GC metrics
    if (this.gcMetrics.length > 50) {
      this.gcMetrics.shift();
    }
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
}