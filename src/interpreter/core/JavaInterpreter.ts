import { JavaLexer, Token, TokenType } from './JavaLexer';
import { SyntaxValidator, SyntaxError } from './SyntaxValidator';

export interface JavaValue {
  value: any;
  type: 'int' | 'double' | 'String' | 'boolean' | 'void' | 'null';
}

export interface ExecutionState {
  line: number;
  variables: Map<string, JavaValue>;
  output: string;
  timestamp: number;
}

export interface GCMetrics {
  pauseTime: number;
  heapUsage: number;
  offHeapUsage: number;
  allocatedObjects: number;
  freedObjects: number;
  compactionTime: number;
  timestamp: number;
}

export interface DeadlineViolation {
  methodName: string;
  expectedMs: number;
  actualMs: number;
  severity: 'WARNING' | 'CRITICAL';
}

export class JavaInterpreter {
  private variables = new Map<string, JavaValue>();
  private output = '';
  private executionStates: ExecutionState[] = [];
  private gcMetrics: GCMetrics[] = [];
  private deadlineViolations: DeadlineViolation[] = [];
  private safetyViolations: SyntaxError[] = [];
  private currentLine = 0;
  
  // Memory management
  private heapSize = 0;
  private maxHeapSize = 1024 * 1024; // 1MB
  private allocatedObjects = 0;
  private freedObjects = 0;
  private objectRegistry = new Map<string, JavaValue>();
  
  // Deadline tracking
  private activeDeadlines = new Map<string, { startTime: number; deadlineMs: number }>();

  constructor() {
    this.initializeBuiltins();
  }

  private initializeBuiltins(): void {
    // Math functions
    this.variables.set('Math.random', {
      value: () => Math.random(),
      type: 'void'
    });

    this.variables.set('Math.floor', {
      value: (x: number) => Math.floor(x),
      type: 'void'
    });

    this.variables.set('Math.max', {
      value: (a: number, b: number) => Math.max(a, b),
      type: 'void'
    });

    this.variables.set('Math.min', {
      value: (a: number, b: number) => Math.min(a, b),
      type: 'void'
    });
  }

  interpret(source: string): {
    output: string;
    states: ExecutionState[];
    gcMetrics: GCMetrics[];
    deadlineViolations: DeadlineViolation[];
    safetyViolations: SyntaxError[];
  } {
    try {
      // Reset state
      this.reset();

      // Tokenize and validate
      const lexer = new JavaLexer(source);
      const tokens = lexer.tokenize();
      
      const validator = new SyntaxValidator(tokens);
      this.safetyViolations = validator.validate();

      // If there are critical errors, don't execute
      const criticalErrors = this.safetyViolations.filter(e => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        this.output = 'CRITICAL ERRORS DETECTED - EXECUTION HALTED:\n';
        criticalErrors.forEach(error => {
          this.output += `Line ${error.line}: ${error.message}\n`;
        });
        return this.getResults();
      }

      // Execute the code
      this.executeTokens(tokens);

      return this.getResults();
    } catch (error) {
      this.output += `\nExecution Error: ${error instanceof Error ? error.message : String(error)}\n`;
      return this.getResults();
    }
  }

  private reset(): void {
    this.variables.clear();
    this.output = '';
    this.executionStates = [];
    this.gcMetrics = [];
    this.deadlineViolations = [];
    this.safetyViolations = [];
    this.currentLine = 0;
    this.heapSize = 0;
    this.allocatedObjects = 0;
    this.freedObjects = 0;
    this.objectRegistry.clear();
    this.activeDeadlines.clear();
    this.initializeBuiltins();
  }

  private executeTokens(tokens: Token[]): void {
    const statements = this.parseStatements(tokens);
    
    for (const statement of statements) {
      this.currentLine = statement.line;
      this.executeStatement(statement);
      this.recordExecutionState();
      this.maybePerformGC();
    }
  }

  private parseStatements(tokens: Token[]): Array<{ type: string; line: number; tokens: Token[] }> {
    const statements: Array<{ type: string; line: number; tokens: Token[] }> = [];
    let current: Token[] = [];
    let currentLine = 1;

    for (const token of tokens) {
      if (token.type === TokenType.EOF) break;

      if (token.line !== currentLine && current.length > 0) {
        statements.push({
          type: this.getStatementType(current),
          line: currentLine,
          tokens: [...current]
        });
        current = [];
      }

      if (token.type !== TokenType.COMMENT && token.value.trim() !== '') {
        current.push(token);
        currentLine = token.line;
      }

      if (token.type === TokenType.SEMICOLON && current.length > 0) {
        statements.push({
          type: this.getStatementType(current),
          line: currentLine,
          tokens: [...current]
        });
        current = [];
      }
    }

    if (current.length > 0) {
      statements.push({
        type: this.getStatementType(current),
        line: currentLine,
        tokens: current
      });
    }

    return statements;
  }

  private getStatementType(tokens: Token[]): string {
    if (tokens.length === 0) return 'empty';
    
    const firstToken = tokens[0];
    
    if (firstToken.type === TokenType.DEADLINE || 
        firstToken.type === TokenType.SENSOR ||
        firstToken.type === TokenType.SAFETY_CHECK ||
        firstToken.type === TokenType.REAL_TIME) {
      return 'annotation';
    }
    
    if (firstToken.type === TokenType.INT || 
        firstToken.type === TokenType.DOUBLE ||
        firstToken.type === TokenType.STRING_TYPE ||
        firstToken.type === TokenType.BOOLEAN_TYPE) {
      return 'declaration';
    }
    
    if (tokens.some(t => t.value === 'System.out.println')) {
      return 'print';
    }
    
    if (tokens.some(t => t.type === TokenType.ASSIGN)) {
      return 'assignment';
    }
    
    if (firstToken.type === TokenType.FOR) {
      return 'for';
    }
    
    if (firstToken.type === TokenType.IF) {
      return 'if';
    }
    
    return 'expression';
  }

  private executeStatement(statement: { type: string; line: number; tokens: Token[] }): void {
    try {
      switch (statement.type) {
        case 'annotation':
          this.executeAnnotation(statement.tokens);
          break;
        case 'declaration':
          this.executeDeclaration(statement.tokens);
          break;
        case 'assignment':
          this.executeAssignment(statement.tokens);
          break;
        case 'print':
          this.executePrint(statement.tokens);
          break;
        case 'for':
          this.executeFor(statement.tokens);
          break;
        case 'if':
          this.executeIf(statement.tokens);
          break;
        case 'expression':
          this.executeExpression(statement.tokens);
          break;
      }
    } catch (error) {
      this.output += `Error on line ${statement.line}: ${error}\n`;
    }
  }

  private executeAnnotation(tokens: Token[]): void {
    const annotationType = tokens[0];
    
    if (annotationType.type === TokenType.DEADLINE) {
      // Parse @Deadline(ms=value)
      const msValue = this.parseDeadlineValue(tokens);
      if (msValue > 0) {
        // Store deadline for next method
        this.activeDeadlines.set('nextMethod', {
          startTime: performance.now(),
          deadlineMs: msValue
        });
      }
    }
  }

  private parseDeadlineValue(tokens: Token[]): number {
    // Find ms=value pattern
    for (let i = 0; i < tokens.length - 2; i++) {
      if (tokens[i].value === 'ms' && 
          tokens[i + 1].type === TokenType.ASSIGN &&
          tokens[i + 2].type === TokenType.NUMBER) {
        return parseInt(tokens[i + 2].value);
      }
    }
    return 0;
  }

  private executeDeclaration(tokens: Token[]): void {
    if (tokens.length < 2) return;
    
    const type = tokens[0].value;
    const name = tokens[1].value;
    let value: any = this.getDefaultValue(type);
    
    // Check for initialization
    const assignIndex = tokens.findIndex(t => t.type === TokenType.ASSIGN);
    if (assignIndex !== -1 && assignIndex + 1 < tokens.length) {
      const valueTokens = tokens.slice(assignIndex + 1);
      value = this.evaluateExpression(valueTokens);
    }
    
    this.variables.set(name, { value, type: type as any });
    this.allocateMemory({ value, type: type as any });
  }

  private executeAssignment(tokens: Token[]): void {
    const assignIndex = tokens.findIndex(t => t.type === TokenType.ASSIGN);
    if (assignIndex === -1 || assignIndex === 0) return;
    
    const varName = tokens[0].value;
    const valueTokens = tokens.slice(assignIndex + 1);
    const value = this.evaluateExpression(valueTokens);
    
    const existingVar = this.variables.get(varName);
    const type = existingVar?.type || 'int';
    
    this.variables.set(varName, { value, type });
    this.allocateMemory({ value, type });
  }

  private executePrint(tokens: Token[]): void {
    // Find content between parentheses
    const startParen = tokens.findIndex(t => t.type === TokenType.LEFT_PAREN);
    const endParen = tokens.findIndex(t => t.type === TokenType.RIGHT_PAREN);
    
    if (startParen === -1 || endParen === -1) return;
    
    const contentTokens = tokens.slice(startParen + 1, endParen);
    const result = this.evaluateExpression(contentTokens);
    
    this.output += String(result) + '\n';
  }

  private executeFor(tokens: Token[]): void {
    // Simple for loop execution
    // This is a simplified implementation
    const iterations = 5; // Default for demo
    
    for (let i = 0; i < iterations; i++) {
      this.variables.set('i', { value: i, type: 'int' });
      // Execute loop body (simplified)
      this.output += `Loop iteration ${i + 1}\n`;
    }
  }

  private executeIf(tokens: Token[]): void {
    // Simple if statement execution
    // This is a simplified implementation
    const condition = true; // Default for demo
    
    if (condition) {
      this.output += 'If condition executed\n';
    }
  }

  private executeExpression(tokens: Token[]): void {
    const result = this.evaluateExpression(tokens);
    if (result !== undefined && result !== null) {
      this.output += String(result) + '\n';
    }
  }

  private evaluateExpression(tokens: Token[]): any {
    if (tokens.length === 0) return null;
    
    // Handle string literals
    if (tokens.length === 1 && tokens[0].type === TokenType.STRING) {
      return tokens[0].value;
    }
    
    // Handle numbers
    if (tokens.length === 1 && tokens[0].type === TokenType.NUMBER) {
      const value = tokens[0].value;
      return value.includes('.') ? parseFloat(value) : parseInt(value);
    }
    
    // Handle variables
    if (tokens.length === 1 && tokens[0].type === TokenType.IDENTIFIER) {
      const variable = this.variables.get(tokens[0].value);
      return variable ? variable.value : tokens[0].value;
    }
    
    // Handle string concatenation
    if (tokens.some(t => t.type === TokenType.PLUS)) {
      return this.evaluateStringConcatenation(tokens);
    }
    
    // Handle arithmetic
    if (tokens.some(t => [TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY, TokenType.DIVIDE].includes(t.type))) {
      return this.evaluateArithmetic(tokens);
    }
    
    // Handle method calls
    if (tokens.some(t => t.type === TokenType.LEFT_PAREN)) {
      return this.evaluateMethodCall(tokens);
    }
    
    return null;
  }

  private evaluateStringConcatenation(tokens: Token[]): string {
    let result = '';
    let i = 0;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token.type === TokenType.STRING) {
        result += token.value;
      } else if (token.type === TokenType.NUMBER) {
        result += token.value;
      } else if (token.type === TokenType.IDENTIFIER) {
        const variable = this.variables.get(token.value);
        result += variable ? String(variable.value) : token.value;
      } else if (token.type === TokenType.PLUS) {
        // Skip plus signs in concatenation
      }
      
      i++;
    }
    
    return result;
  }

  private evaluateArithmetic(tokens: Token[]): number {
    // Simple arithmetic evaluation
    let result = 0;
    let operator = '+';
    
    for (const token of tokens) {
      if (token.type === TokenType.NUMBER) {
        const value = parseFloat(token.value);
        switch (operator) {
          case '+': result += value; break;
          case '-': result -= value; break;
          case '*': result *= value; break;
          case '/': result /= value; break;
        }
      } else if (token.type === TokenType.IDENTIFIER) {
        const variable = this.variables.get(token.value);
        if (variable && typeof variable.value === 'number') {
          const value = variable.value;
          switch (operator) {
            case '+': result += value; break;
            case '-': result -= value; break;
            case '*': result *= value; break;
            case '/': result /= value; break;
          }
        }
      } else if ([TokenType.PLUS, TokenType.MINUS, TokenType.MULTIPLY, TokenType.DIVIDE].includes(token.type)) {
        operator = token.value;
      }
    }
    
    return result;
  }

  private evaluateMethodCall(tokens: Token[]): any {
    // Handle Math.random(), Math.floor(), etc.
    const methodName = tokens[0].value;
    
    if (methodName === 'Math.random') {
      return Math.random();
    } else if (methodName === 'Math.floor') {
      // Find argument
      const parenStart = tokens.findIndex(t => t.type === TokenType.LEFT_PAREN);
      const parenEnd = tokens.findIndex(t => t.type === TokenType.RIGHT_PAREN);
      if (parenStart !== -1 && parenEnd !== -1) {
        const argTokens = tokens.slice(parenStart + 1, parenEnd);
        const arg = this.evaluateExpression(argTokens);
        return Math.floor(Number(arg));
      }
    }
    
    return null;
  }

  private getDefaultValue(type: string): any {
    switch (type) {
      case 'int': return 0;
      case 'double': return 0.0;
      case 'boolean': return false;
      case 'String': return '';
      default: return null;
    }
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
      case 'int': return 4;
      case 'double': return 8;
      case 'boolean': return 1;
      case 'String': return String(value.value).length * 2;
      default: return 8;
    }
  }

  private recordExecutionState(): void {
    const state: ExecutionState = {
      line: this.currentLine,
      variables: new Map(this.variables),
      output: this.output,
      timestamp: Date.now()
    };
    
    this.executionStates.push(state);
    
    if (this.executionStates.length > 100) {
      this.executionStates.shift();
    }
  }

  private maybePerformGC(): void {
    if (this.heapSize > this.maxHeapSize * 0.7) {
      this.performGC();
    }
  }

  private performGC(): void {
    const startTime = performance.now();
    
    // Mark and sweep
    const reachableObjects = this.markReachableObjects();
    const freedCount = this.objectRegistry.size - reachableObjects.size;
    
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
      offHeapUsage: 0, // Simplified for now
      allocatedObjects: this.allocatedObjects,
      freedObjects: this.freedObjects,
      compactionTime: pauseTime * 0.1, // Simplified
      timestamp: Date.now()
    });
    
    if (this.gcMetrics.length > 50) {
      this.gcMetrics.shift();
    }
  }

  private markReachableObjects(): Set<string> {
    const reachable = new Set<string>();
    
    for (const [name, value] of this.variables) {
      for (const [objectId, obj] of this.objectRegistry) {
        if (obj === value) {
          reachable.add(objectId);
        }
      }
    }
    
    return reachable;
  }

  private getResults() {
    return {
      output: this.output,
      states: this.executionStates,
      gcMetrics: this.gcMetrics,
      deadlineViolations: this.deadlineViolations,
      safetyViolations: this.safetyViolations
    };
  }

  // Public API methods
  getExecutionStates(): ExecutionState[] {
    return this.executionStates;
  }

  getGCMetrics(): any[] {
    return this.gcMetrics;
  }

  getDeadlineViolations(): DeadlineViolation[] {
    return this.deadlineViolations;
  }

  getSafetyViolations(): SyntaxError[] {
    return this.safetyViolations;
  }

  triggerGC(): void {
    this.performGC();
  }

  getHeapStatus(): { used: number; max: number; percentage: number; offHeap: any } {
    return {
      used: this.heapSize,
      max: this.maxHeapSize,
      percentage: (this.heapSize / this.maxHeapSize) * 100,
      offHeap: { allocated: 0, total: 512 * 1024 }
    };
  }

  getOffHeapStatus() {
    return { allocated: 0, total: 512 * 1024 };
  }

  getTimeTravelSnapshots(): any[] {
    return [];
  }

  stepBackInTime(): any {
    return null;
  }

  stepForwardInTime(): any {
    return null;
  }
}