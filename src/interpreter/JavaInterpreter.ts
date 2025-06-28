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

      // Parse and execute the code
      return this.interpretSimpleCode(source);
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
    // Clean and split the source into lines
    const lines = source.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.currentLine = i + 1;
      
      try {
        // Skip empty lines and comments
        if (!line || line.startsWith('//')) continue;

        // Handle different types of statements
        if (line.includes('System.out.println')) {
          this.handlePrintStatement(line);
        } else if (line.includes('for') && line.includes('(')) {
          i = this.handleForLoop(lines, i);
        } else if (line.includes('if') && line.includes('(')) {
          i = this.handleIfStatement(lines, i);
        } else if (line.includes('=') && !line.includes('==') && !line.includes('!=') && !line.includes('<=') && !line.includes('>=')) {
          this.handleAssignment(line);
        } else if (this.isVariableDeclaration(line)) {
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

  private isVariableDeclaration(line: string): boolean {
    const trimmed = line.trim();
    return /^(int|double|String|boolean)\s+\w+/.test(trimmed);
  }

  private handleForLoop(lines: string[], startIndex: number): number {
    const forLine = lines[startIndex];
    
    // Parse for loop: for (int i = 0; i < 5; i++)
    const forMatch = forLine.match(/for\s*\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)/);
    if (!forMatch) return startIndex;

    const [, init, condition, increment] = forMatch;
    
    // Execute initialization
    if (init.trim()) {
      this.handleVariableDeclaration(init + ';');
    }

    // Find the loop body
    let bodyStart = startIndex + 1;
    let bodyEnd = bodyStart;
    let braceCount = 0;
    let hasOpenBrace = false;

    // Check if next line starts with {
    if (lines[bodyStart] && lines[bodyStart].trim() === '{') {
      hasOpenBrace = true;
      bodyStart++;
      braceCount = 1;
      
      for (let i = bodyStart; i < lines.length && braceCount > 0; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
        if (braceCount === 0) {
          bodyEnd = i;
          break;
        }
      }
    } else {
      // Single statement
      bodyEnd = bodyStart;
    }

    // Execute loop
    let iterations = 0;
    const maxIterations = 1000; // Prevent infinite loops

    while (iterations < maxIterations) {
      // Check condition
      if (!this.evaluateCondition(condition)) break;

      // Execute body
      for (let i = bodyStart; i <= bodyEnd; i++) {
        if (i < lines.length && lines[i].trim()) {
          const bodyLine = lines[i].trim();
          if (bodyLine !== '{' && bodyLine !== '}') {
            this.currentLine = i + 1;
            
            if (bodyLine.includes('System.out.println')) {
              this.handlePrintStatement(bodyLine);
            } else if (bodyLine.includes('=') && !bodyLine.includes('==')) {
              this.handleAssignment(bodyLine);
            } else if (this.isVariableDeclaration(bodyLine)) {
              this.handleVariableDeclaration(bodyLine);
            }
            
            this.recordExecutionState();
          }
        }
      }

      // Execute increment
      if (increment.trim()) {
        this.handleIncrement(increment);
      }

      iterations++;
    }

    return hasOpenBrace ? bodyEnd : bodyEnd;
  }

  private handleIfStatement(lines: string[], startIndex: number): number {
    const ifLine = lines[startIndex];
    
    // Parse if condition
    const ifMatch = ifLine.match(/if\s*\(\s*(.*?)\s*\)/);
    if (!ifMatch) return startIndex;

    const condition = ifMatch[1];
    const conditionResult = this.evaluateCondition(condition);

    // Find the if body
    let bodyStart = startIndex + 1;
    let bodyEnd = bodyStart;
    let braceCount = 0;
    let hasOpenBrace = false;

    if (lines[bodyStart] && lines[bodyStart].trim() === '{') {
      hasOpenBrace = true;
      bodyStart++;
      braceCount = 1;
      
      for (let i = bodyStart; i < lines.length && braceCount > 0; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
        if (braceCount === 0) {
          bodyEnd = i;
          break;
        }
      }
    } else {
      bodyEnd = bodyStart;
    }

    // Execute if body if condition is true
    if (conditionResult) {
      for (let i = bodyStart; i <= bodyEnd; i++) {
        if (i < lines.length && lines[i].trim()) {
          const bodyLine = lines[i].trim();
          if (bodyLine !== '{' && bodyLine !== '}') {
            this.currentLine = i + 1;
            
            if (bodyLine.includes('System.out.println')) {
              this.handlePrintStatement(bodyLine);
            } else if (bodyLine.includes('=') && !bodyLine.includes('==')) {
              this.handleAssignment(bodyLine);
            } else if (this.isVariableDeclaration(bodyLine)) {
              this.handleVariableDeclaration(bodyLine);
            }
            
            this.recordExecutionState();
          }
        }
      }
    }

    return hasOpenBrace ? bodyEnd : bodyEnd;
  }

  private evaluateCondition(condition: string): boolean {
    try {
      // Handle simple conditions like "i < 5", "temperature > 30", etc.
      condition = condition.trim();
      
      // Replace variables with their values
      for (const [varName, varValue] of this.environment) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        condition = condition.replace(regex, String(varValue.value));
      }

      // Evaluate the condition
      if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        return Number(left) < Number(right);
      } else if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        return Number(left) > Number(right);
      } else if (condition.includes('<=')) {
        const [left, right] = condition.split('<=').map(s => s.trim());
        return Number(left) <= Number(right);
      } else if (condition.includes('>=')) {
        const [left, right] = condition.split('>=').map(s => s.trim());
        return Number(left) >= Number(right);
      } else if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim());
        return left === right;
      } else if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(s => s.trim());
        return left !== right;
      }
      
      return Boolean(condition);
    } catch (error) {
      return false;
    }
  }

  private handleIncrement(increment: string): void {
    increment = increment.trim();
    
    if (increment.includes('++')) {
      const varName = increment.replace('++', '').trim();
      const currentValue = this.environment.get(varName);
      if (currentValue && typeof currentValue.value === 'number') {
        this.environment.set(varName, {
          value: currentValue.value + 1,
          type: currentValue.type
        });
      }
    } else if (increment.includes('--')) {
      const varName = increment.replace('--', '').trim();
      const currentValue = this.environment.get(varName);
      if (currentValue && typeof currentValue.value === 'number') {
        this.environment.set(varName, {
          value: currentValue.value - 1,
          type: currentValue.type
        });
      }
    } else if (increment.includes('=')) {
      this.handleAssignment(increment);
    }
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
    if (parts.length >= 2) {
      const varName = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(';', '');
      
      // Get the existing variable to determine its type
      const existingVar = this.environment.get(varName);
      const expectedType = existingVar?.type;
      
      let javaValue: JavaValue;
      
      if (value.startsWith('"') && value.endsWith('"')) {
        javaValue = { value: value.slice(1, -1), type: 'String' };
      } else if (value === 'true' || value === 'false') {
        javaValue = { value: value === 'true', type: 'boolean' };
      } else if (value.includes('+') || value.includes('-') || value.includes('*') || value.includes('/')) {
        // Expression evaluation
        const result = this.evaluateExpression(value);
        
        // Ensure numeric types are actually numbers
        if (expectedType === 'int' || expectedType === 'double') {
          const numericResult = Number(result);
          javaValue = { value: isNaN(numericResult) ? 0 : numericResult, type: expectedType };
        } else {
          javaValue = { value: result, type: typeof result === 'number' ? 'int' : 'String' };
        }
      } else if (!isNaN(Number(value))) {
        const num = Number(value);
        javaValue = { value: num, type: Number.isInteger(num) ? 'int' : 'double' };
      } else {
        // Variable reference or function call
        if (value.includes('Math.random()')) {
          javaValue = { value: Math.random(), type: 'double' };
        } else {
          const referencedVar = this.environment.get(value);
          if (referencedVar) {
            // Ensure numeric types are preserved
            if ((expectedType === 'int' || expectedType === 'double') && typeof referencedVar.value === 'string') {
              const numericValue = Number(referencedVar.value);
              javaValue = { value: isNaN(numericValue) ? 0 : numericValue, type: expectedType };
            } else {
              javaValue = referencedVar;
            }
          } else {
            javaValue = { value: value, type: 'String' };
          }
        }
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
        } else if (initialValue === 'true' || initialValue === 'false') {
          javaValue = { value: initialValue === 'true', type: 'boolean' };
        } else if (initialValue.includes('Math.random()')) {
          javaValue = { value: Math.random(), type: 'double' };
        } else if (!isNaN(Number(initialValue))) {
          const num = Number(initialValue);
          javaValue = { value: num, type: type };
        } else if (initialValue.includes('+') || initialValue.includes('-')) {
          const result = this.evaluateExpression(initialValue);
          
          // Ensure numeric types are actually numbers
          if (type === 'int' || type === 'double') {
            const numericResult = Number(result);
            javaValue = { value: isNaN(numericResult) ? 0 : numericResult, type: type };
          } else {
            javaValue = { value: result, type: type };
          }
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

  private evaluateExpression(expr: string): any {
    // Replace variables with their values
    for (const [varName, varValue] of this.environment) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      expr = expr.replace(regex, String(varValue.value));
    }

    // Handle Math.random()
    expr = expr.replace(/Math\.random\(\)/g, String(Math.random()));
    
    // Handle string concatenation
    if (expr.includes('+') && (expr.includes('"') || this.hasStringVariable(expr))) {
      return this.evaluateStringExpression(expr);
    }

    // Handle arithmetic
    try {
      return eval(expr);
    } catch (error) {
      return expr;
    }
  }

  private hasStringVariable(expr: string): boolean {
    for (const [varName, varValue] of this.environment) {
      if (expr.includes(varName) && varValue.type === 'String') {
        return true;
      }
    }
    return false;
  }

  private evaluateStringExpression(expr: string): string {
    // Handle string concatenation with variables
    let result = '';
    const parts = expr.split('+').map(p => p.trim());
    
    for (const part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        result += part.slice(1, -1);
      } else if (part.includes('(') && part.includes(')')) {
        // Function call or expression in parentheses
        const evaluated = this.evaluateExpression(part);
        result += String(evaluated);
      } else {
        const value = this.environment.get(part);
        if (value) {
          result += this.valueToString(value.value);
        } else if (!isNaN(Number(part))) {
          result += part;
        } else {
          result += part;
        }
      }
    }
    
    return result;
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

  private valueToString(value: any): string {
    if (value === null || value === undefined) return 'null';
    return String(value);
  }

  private allocateMemory(value: JavaValue): void {
    const size = this.getValueSize(value);
    this.heapSize += size;
    this.allocatedObjects++;
    
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
        return 8;
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
    
    const reachableObjects = this.markReachableObjects();
    const freedObjects = this.objectRegistry.size - reachableObjects.size;
    
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
    
    if (this.gcMetrics.length > 50) {
      this.gcMetrics.shift();
    }
  }

  private markReachableObjects(): Set<string> {
    const reachable = new Set<string>();
    
    for (const [name, value] of this.environment) {
      for (const [objectId, obj] of this.objectRegistry) {
        if (obj === value) {
          reachable.add(objectId);
        }
      }
    }
    
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

  triggerGC(): void {
    this.performGC();
  }

  getHeapStatus(): { used: number; max: number; percentage: number } {
    return {
      used: this.heapSize,
      max: this.maxHeapSize,
      percentage: (this.heapSize / this.maxHeapSize) * 100
    };
  }
}