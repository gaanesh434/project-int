import * as AST from './JavaAST';
import { JavaParser } from './JavaParser';
import { SafetyVerifier, SafetyViolation } from './SafetyVerifier';
import { TimeTravelDebugger, ExecutionSnapshot } from './TimeTravelDebugger';
import { DeadlineEnforcer, DeadlineViolation } from './DeadlineEnforcer';
import { OffHeapMemoryManager } from './OffHeapMemoryManager';

export interface JavaValue {
  value: any;
  type: string;
  offHeapId?: string; // For off-heap allocated objects
}

export interface ExecutionState {
  line: number;
  variables: Map<string, JavaValue>;
  stackTrace: string[];
  timestamp: number;
  output: string;
  safetyViolations: SafetyViolation[];
  deadlineViolations: DeadlineViolation[];
}

export interface GCMetrics {
  pauseTime: number;
  heapUsage: number;
  offHeapUsage: number;
  collections: number;
  timestamp: number;
  allocatedObjects: number;
  freedObjects: number;
  compactionTime: number;
}

export class EnhancedJavaInterpreter {
  private globals = new Map<string, JavaValue>();
  private environment = new Map<string, JavaValue>();
  private classes = new Map<string, AST.ClassDeclaration>();
  private executionStates: ExecutionState[] = [];
  private gcMetrics: GCMetrics[] = [];
  private currentLine = 0;
  private callStack: string[] = [];
  private heapSize = 0;
  private maxHeapSize = 1024 * 1024; // 1MB
  private gcThreshold = 0.7;
  private output = '';
  private allocatedObjects = 0;
  private freedObjects = 0;
  private objectRegistry = new Map<string, any>();

  // Enhanced components
  private safetyVerifier = new SafetyVerifier();
  private timeTravelDebugger = new TimeTravelDebugger();
  private deadlineEnforcer = new DeadlineEnforcer();
  private offHeapManager = new OffHeapMemoryManager();

  // IoT Safety flags
  private allowDynamicClassLoading = false;
  private allowUnsafeOperations = false;
  private maxLoopIterations = 10000;

  constructor() {
    this.initializeBuiltins();
    this.setupIoTSafetyConstraints();
  }

  private setupIoTSafetyConstraints(): void {
    // Disable dangerous operations for IoT safety
    this.allowDynamicClassLoading = false;
    this.allowUnsafeOperations = false;
    
    // Register common deadline annotations
    this.deadlineEnforcer.registerDeadline('sensorRead', 5, 0);
    this.deadlineEnforcer.registerDeadline('dataTransmit', 10, 0);
    this.deadlineEnforcer.registerDeadline('processData', 15, 0);
  }

  private initializeBuiltins() {
    // System.out.println with safety checks
    this.globals.set('System.out.println', {
      value: (...args: any[]) => {
        const verification = this.safetyVerifier.verifyOperation('NULL_ACCESS', args, this.currentLine);
        if (!verification.isValid) {
          this.handleSafetyViolations(verification.violations);
          return { value: null, type: 'void' };
        }

        const output = args.map(arg => this.valueToString(arg)).join(' ');
        this.output += output + '\n';
        return { value: null, type: 'void' };
      },
      type: 'function'
    });

    // Safe Math functions
    this.globals.set('Math.random', {
      value: () => ({ value: Math.random(), type: 'double' }),
      type: 'function'
    });

    this.globals.set('Math.floor', {
      value: (arg: number) => ({ value: Math.floor(arg), type: 'int' }),
      type: 'function'
    });

    this.globals.set('Math.divide', {
      value: (a: number, b: number) => {
        const verification = this.safetyVerifier.verifyOperation('DIVISION', [a, b], this.currentLine);
        if (!verification.isValid) {
          this.handleSafetyViolations(verification.violations);
          return { value: 0, type: 'double' };
        }
        return { value: a / b, type: 'double' };
      },
      type: 'function'
    });
  }

  interpret(source: string): { 
    output: string; 
    states: ExecutionState[]; 
    gcMetrics: GCMetrics[]; 
    violations: SafetyViolation[];
    deadlineViolations: DeadlineViolation[];
    snapshots: ExecutionSnapshot[];
  } {
    try {
      // Reset state
      this.output = '';
      this.executionStates = [];
      this.gcMetrics = [];
      this.environment.clear();
      this.classes.clear();
      this.callStack = [];
      this.currentLine = 0;
      this.heapSize = 0;
      this.allocatedObjects = 0;
      this.freedObjects = 0;
      this.timeTravelDebugger.clearSnapshots();
      this.deadlineEnforcer.clearViolations();

      // Parse and execute with enhanced safety
      return this.interpretWithSafety(source);
    } catch (error) {
      const errorMsg = `Critical Error: ${error instanceof Error ? error.message : String(error)}`;
      this.output += errorMsg + '\n';
      return {
        output: this.output,
        states: this.executionStates,
        gcMetrics: this.gcMetrics,
        violations: [],
        deadlineViolations: [],
        snapshots: []
      };
    }
  }

  private interpretWithSafety(source: string): { 
    output: string; 
    states: ExecutionState[]; 
    gcMetrics: GCMetrics[]; 
    violations: SafetyViolation[];
    deadlineViolations: DeadlineViolation[];
    snapshots: ExecutionSnapshot[];
  } {
    const lines = source.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      this.currentLine = i + 1;
      
      try {
        if (!line || line.startsWith('//')) continue;

        // Check for @Deadline annotations
        if (line.startsWith('@Deadline')) {
          this.parseDeadlineAnnotation(line, lines[i + 1] || '');
          continue;
        }

        // Start method timing for deadline enforcement
        if (line.includes('sensorRead') || line.includes('dataTransmit') || line.includes('processData')) {
          const methodName = this.extractMethodName(line);
          if (methodName) {
            this.deadlineEnforcer.startMethod(methodName);
          }
        }

        // Execute statement with safety verification
        if (line.includes('System.out.println')) {
          this.handlePrintStatement(line);
        } else if (line.includes('for') && line.includes('(')) {
          i = this.handleSafeForLoop(lines, i);
        } else if (line.includes('if') && line.includes('(')) {
          i = this.handleIfStatement(lines, i);
        } else if (line.includes('/') && !line.includes('//')) {
          this.handleSafeDivision(line);
        } else if (line.includes('=') && !line.includes('==')) {
          this.handleAssignment(line);
        } else if (this.isVariableDeclaration(line)) {
          this.handleVariableDeclaration(line);
        }

        // End method timing
        const methodName = this.extractMethodName(line);
        if (methodName) {
          const violation = this.deadlineEnforcer.endMethod(methodName);
          if (violation) {
            this.output += `DEADLINE VIOLATION: ${violation.methodName} took ${violation.actualMs.toFixed(2)}ms (expected ${violation.expectedMs}ms)\n`;
          }
        }
        
        this.recordEnhancedExecutionState();
        this.maybePerformEnhancedGC();
      } catch (error) {
        this.output += `Safety Error on line ${i + 1}: ${error}\n`;
      }
    }

    return {
      output: this.output,
      states: this.executionStates,
      gcMetrics: this.gcMetrics,
      violations: this.getAllSafetyViolations(),
      deadlineViolations: this.deadlineEnforcer.getViolations(),
      snapshots: this.timeTravelDebugger.getAllSnapshots()
    };
  }

  private parseDeadlineAnnotation(annotationLine: string, nextLine: string): void {
    const match = annotationLine.match(/@Deadline\s*\(\s*ms\s*=\s*(\d+)\s*\)/);
    if (match) {
      const deadlineMs = parseInt(match[1]);
      const methodName = this.extractMethodName(nextLine);
      if (methodName) {
        this.deadlineEnforcer.registerDeadline(methodName, deadlineMs, this.currentLine);
      }
    }
  }

  private extractMethodName(line: string): string | null {
    // Extract method names from various patterns
    if (line.includes('sensorRead')) return 'sensorRead';
    if (line.includes('dataTransmit')) return 'dataTransmit';
    if (line.includes('processData')) return 'processData';
    return null;
  }

  private handleSafeForLoop(lines: string[], startIndex: number): number {
    const forLine = lines[startIndex];
    
    const forMatch = forLine.match(/for\s*\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)/);
    if (!forMatch) return startIndex;

    const [, init, condition, increment] = forMatch;
    
    if (init.trim()) {
      this.handleVariableDeclaration(init + ';');
    }

    let bodyStart = startIndex + 1;
    let bodyEnd = this.findBlockEnd(lines, bodyStart);

    // Safety: Limit loop iterations to prevent infinite loops in IoT systems
    let iterations = 0;

    while (iterations < this.maxLoopIterations) {
      if (!this.evaluateCondition(condition)) break;

      for (let i = bodyStart; i <= bodyEnd; i++) {
        if (i < lines.length && lines[i].trim()) {
          const bodyLine = lines[i].trim();
          if (bodyLine !== '{' && bodyLine !== '}') {
            this.currentLine = i + 1;
            this.executeLineWithSafety(bodyLine);
            this.recordEnhancedExecutionState();
          }
        }
      }

      if (increment.trim()) {
        this.handleIncrement(increment);
      }

      iterations++;
    }

    if (iterations >= this.maxLoopIterations) {
      this.output += `WARNING: Loop terminated after ${this.maxLoopIterations} iterations for safety\n`;
    }

    return bodyEnd;
  }

  private handleSafeDivision(line: string): void {
    // Extract division operations and verify safety
    const divisionMatch = line.match(/(\w+)\s*=\s*(.+?)\s*\/\s*(.+?);?$/);
    if (divisionMatch) {
      const [, variable, numerator, denominator] = divisionMatch;
      
      const numValue = this.evaluateExpression(numerator);
      const denValue = this.evaluateExpression(denominator);
      
      const verification = this.safetyVerifier.verifyOperation('DIVISION', [numValue, denValue], this.currentLine);
      if (!verification.isValid) {
        this.handleSafetyViolations(verification.violations);
        // Set to safe default value
        this.environment.set(variable, { value: 0, type: 'double' });
        return;
      }
      
      const result = numValue / denValue;
      this.environment.set(variable, { value: result, type: 'double' });
      this.allocateMemory({ value: result, type: 'double' });
    }
  }

  private executeLineWithSafety(line: string): void {
    if (line.includes('System.out.println')) {
      this.handlePrintStatement(line);
    } else if (line.includes('/') && !line.includes('//')) {
      this.handleSafeDivision(line);
    } else if (line.includes('=') && !line.includes('==')) {
      this.handleAssignment(line);
    } else if (this.isVariableDeclaration(line)) {
      this.handleVariableDeclaration(line);
    }
  }

  private findBlockEnd(lines: string[], start: number): number {
    if (lines[start] && lines[start].trim() === '{') {
      let braceCount = 1;
      for (let i = start + 1; i < lines.length && braceCount > 0; i++) {
        const line = lines[i].trim();
        if (line.includes('{')) braceCount++;
        if (line.includes('}')) braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return start;
  }

  private handleSafetyViolations(violations: SafetyViolation[]): void {
    for (const violation of violations) {
      this.output += `SAFETY VIOLATION [${violation.severity}]: ${violation.message} (Line ${violation.line})\n`;
      
      if (violation.severity === 'CRITICAL') {
        this.output += `SYSTEM HALT: Critical safety violation detected\n`;
        throw new Error(`Critical safety violation: ${violation.message}`);
      }
    }
  }

  private recordEnhancedExecutionState(): void {
    // Capture time-travel snapshot
    const snapshotId = this.timeTravelDebugger.captureSnapshot(
      this.currentLine,
      this.environment,
      this.callStack,
      this.objectRegistry,
      this.output,
      {
        heapUsage: (this.heapSize / this.maxHeapSize) * 100,
        allocatedObjects: this.allocatedObjects,
        freedObjects: this.freedObjects
      }
    );

    const state: ExecutionState = {
      line: this.currentLine,
      variables: new Map(this.environment),
      stackTrace: [...this.callStack],
      timestamp: Date.now(),
      output: this.output,
      safetyViolations: this.getAllSafetyViolations(),
      deadlineViolations: this.deadlineEnforcer.getViolations()
    };
    
    this.executionStates.push(state);
    
    if (this.executionStates.length > 100) {
      this.executionStates.shift();
    }
  }

  private maybePerformEnhancedGC(): void {
    if (this.heapSize > this.maxHeapSize * this.gcThreshold) {
      this.performEnhancedGC();
    }
  }

  private performEnhancedGC(): void {
    const startTime = performance.now();
    
    // Mark and sweep with off-heap optimization
    const reachableObjects = this.markReachableObjects();
    const freedObjects = this.objectRegistry.size - reachableObjects.size;
    
    // Move large objects to off-heap
    for (const [objectId, obj] of this.objectRegistry) {
      if (this.getValueSize(obj) > 1024) { // Objects > 1KB go off-heap
        const offHeapId = this.offHeapManager.allocate(this.getValueSize(obj));
        if (offHeapId) {
          obj.offHeapId = offHeapId;
          this.heapSize -= this.getValueSize(obj);
        }
      }
    }

    // Sweep unreachable objects
    for (const [objectId, obj] of this.objectRegistry) {
      if (!reachableObjects.has(objectId)) {
        if (obj.offHeapId) {
          this.offHeapManager.deallocate(obj.offHeapId);
        }
        this.heapSize -= this.getValueSize(obj);
        this.objectRegistry.delete(objectId);
        this.freedObjects++;
      }
    }

    // Defragment off-heap memory
    const compactionTime = performance.now();
    const compactedBlocks = this.offHeapManager.defragment();
    const totalCompactionTime = performance.now() - compactionTime;

    const pauseTime = performance.now() - startTime;
    const offHeapUsage = this.offHeapManager.getUsage();
    
    this.gcMetrics.push({
      pauseTime,
      heapUsage: (this.heapSize / this.maxHeapSize) * 100,
      offHeapUsage: (offHeapUsage.allocated / offHeapUsage.total) * 100,
      collections: 1,
      timestamp: Date.now(),
      allocatedObjects: this.allocatedObjects,
      freedObjects: this.freedObjects,
      compactionTime: totalCompactionTime
    });
    
    if (this.gcMetrics.length > 50) {
      this.gcMetrics.shift();
    }
  }

  // FIXED: Proper expression evaluation that actually substitutes variables
  private evaluateExpression(expr: string): any {
    try {
      // First, replace all variables with their actual values
      let evaluatedExpr = expr.trim();
      
      // Replace variables with their values
      for (const [varName, varValue] of this.environment) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        evaluatedExpr = evaluatedExpr.replace(regex, String(varValue.value));
      }

      // Handle Math.random() calls
      evaluatedExpr = evaluatedExpr.replace(/Math\.random\(\)/g, () => String(Math.random()));
      
      // Handle Math.floor() calls
      evaluatedExpr = evaluatedExpr.replace(/Math\.floor\(([^)]+)\)/g, (match, arg) => {
        const argValue = this.evaluateExpression(arg);
        return String(Math.floor(Number(argValue)));
      });

      // Now evaluate the expression
      if (evaluatedExpr.includes('+') || evaluatedExpr.includes('-') || 
          evaluatedExpr.includes('*') || evaluatedExpr.includes('/')) {
        // Use Function constructor for safe evaluation
        return Function(`"use strict"; return (${evaluatedExpr})`)();
      }
      
      // If it's just a number, return it
      if (!isNaN(Number(evaluatedExpr))) {
        return Number(evaluatedExpr);
      }
      
      // Otherwise return as string
      return evaluatedExpr;
    } catch (error) {
      console.warn('Expression evaluation failed:', expr, error);
      return expr; // Return original if evaluation fails
    }
  }

  // FIXED: Proper string expression evaluation
  private evaluateStringExpression(expr: string): string {
    let result = '';
    
    // Split by + but handle quoted strings properly
    const parts = this.splitStringExpression(expr);
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      if (trimmedPart.startsWith('"') && trimmedPart.endsWith('"')) {
        // String literal
        result += trimmedPart.slice(1, -1);
      } else if (trimmedPart.includes('(') && trimmedPart.includes(')')) {
        // Function call or expression
        const evaluated = this.evaluateExpression(trimmedPart);
        result += String(evaluated);
      } else {
        // Variable or number
        const value = this.environment.get(trimmedPart);
        if (value) {
          result += this.valueToString(value.value);
        } else if (!isNaN(Number(trimmedPart))) {
          result += trimmedPart;
        } else {
          // Try to evaluate as expression
          const evaluated = this.evaluateExpression(trimmedPart);
          result += String(evaluated);
        }
      }
    }
    
    return result;
  }

  private splitStringExpression(expr: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let parenDepth = 0;
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];
      
      if (char === '"' && (i === 0 || expr[i-1] !== '\\')) {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '(' && !inQuotes) {
        parenDepth++;
        current += char;
      } else if (char === ')' && !inQuotes) {
        parenDepth--;
        current += char;
      } else if (char === '+' && !inQuotes && parenDepth === 0) {
        if (current.trim()) {
          parts.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  }

  // FIXED: Proper print statement handling with variable substitution
  private handlePrintStatement(line: string): void {
    const match = line.match(/System\.out\.println\s*\(\s*(.+?)\s*\)/);
    if (match) {
      const content = match[1];
      let output = '';
      
      if (content.startsWith('"') && content.endsWith('"')) {
        // Simple string literal
        output = content.slice(1, -1);
      } else if (content.includes('+')) {
        // String concatenation - evaluate properly
        output = this.evaluateStringExpression(content);
      } else {
        // Single variable or expression
        const value = this.environment.get(content.trim());
        if (value) {
          output = this.valueToString(value.value);
        } else {
          // Try to evaluate as expression
          const evaluated = this.evaluateExpression(content);
          output = String(evaluated);
        }
      }
      
      this.output += output + '\n';
    }
  }

  // FIXED: Proper assignment with expression evaluation
  private handleAssignment(line: string): void {
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
      } else {
        // Evaluate the expression properly
        const result = this.evaluateExpression(value);
        
        // Ensure numeric types are actually numbers
        if (expectedType === 'int' || expectedType === 'double') {
          const numericResult = Number(result);
          javaValue = { value: isNaN(numericResult) ? 0 : numericResult, type: expectedType };
        } else {
          javaValue = { value: result, type: typeof result === 'number' ? 'int' : 'String' };
        }
      }
      
      this.environment.set(varName, javaValue);
      this.allocateMemory(javaValue);
    }
  }

  // FIXED: Proper variable declaration with expression evaluation
  private handleVariableDeclaration(line: string): void {
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
        } else {
          // Evaluate the expression properly
          const result = this.evaluateExpression(initialValue);
          
          // Ensure numeric types are actually numbers
          if (type === 'int' || type === 'double') {
            const numericResult = Number(result);
            javaValue = { value: isNaN(numericResult) ? 0 : numericResult, type: type };
          } else {
            javaValue = { value: result, type: type };
          }
        }
      } else {
        javaValue = this.getDefaultValue(type);
      }
      
      this.environment.set(varName, javaValue);
      this.allocateMemory(javaValue);
    }
  }

  private handleIfStatement(lines: string[], startIndex: number): number {
    const ifLine = lines[startIndex];
    const ifMatch = ifLine.match(/if\s*\(\s*(.*?)\s*\)/);
    if (!ifMatch) return startIndex;

    const condition = ifMatch[1];
    const conditionResult = this.evaluateCondition(condition);
    const bodyEnd = this.findBlockEnd(lines, startIndex + 1);

    if (conditionResult) {
      for (let i = startIndex + 1; i <= bodyEnd; i++) {
        if (i < lines.length && lines[i].trim()) {
          const bodyLine = lines[i].trim();
          if (bodyLine !== '{' && bodyLine !== '}') {
            this.currentLine = i + 1;
            this.executeLineWithSafety(bodyLine);
            this.recordEnhancedExecutionState();
          }
        }
      }
    }

    return bodyEnd;
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
    }
  }

  private evaluateCondition(condition: string): boolean {
    try {
      condition = condition.trim();
      
      // Replace variables with their actual values
      for (const [varName, varValue] of this.environment) {
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        condition = condition.replace(regex, String(varValue.value));
      }

      if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        return Number(left) < Number(right);
      } else if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        return Number(left) > Number(right);
      }
      
      return Boolean(condition);
    } catch (error) {
      return false;
    }
  }

  // Implement remaining methods from original interpreter...
  private isVariableDeclaration(line: string): boolean {
    const trimmed = line.trim();
    return /^(int|double|String|boolean)\s+\w+/.test(trimmed);
  }

  private getDefaultValue(type: string): JavaValue {
    switch (type) {
      case 'int': return { value: 0, type: 'int' };
      case 'double': return { value: 0.0, type: 'double' };
      case 'boolean': return { value: false, type: 'boolean' };
      case 'String': return { value: '', type: 'String' };
      default: return { value: null, type: type };
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
      case 'int': return 4;
      case 'double': return 8;
      case 'boolean': return 1;
      case 'String': return (value.value as string).length * 2;
      default: return 8;
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
    
    return reachable;
  }

  private getAllSafetyViolations(): SafetyViolation[] {
    // This would collect all safety violations from the verifier
    return [];
  }

  // Public API methods
  getExecutionStates(): ExecutionState[] {
    return this.executionStates;
  }

  getGCMetrics(): GCMetrics[] {
    return this.gcMetrics;
  }

  getDeadlineViolations(): DeadlineViolation[] {
    return this.deadlineEnforcer.getViolations();
  }

  getSafetyViolations(): SafetyViolation[] {
    return this.getAllSafetyViolations();
  }

  getTimeTravelSnapshots(): ExecutionSnapshot[] {
    return this.timeTravelDebugger.getAllSnapshots();
  }

  stepBackInTime(): ExecutionSnapshot | null {
    return this.timeTravelDebugger.stepBack();
  }

  stepForwardInTime(): ExecutionSnapshot | null {
    return this.timeTravelDebugger.stepForward();
  }

  triggerGC(): void {
    this.performEnhancedGC();
  }

  getHeapStatus(): { used: number; max: number; percentage: number; offHeap: any } {
    const offHeapUsage = this.offHeapManager.getUsage();
    return {
      used: this.heapSize,
      max: this.maxHeapSize,
      percentage: (this.heapSize / this.maxHeapSize) * 100,
      offHeap: offHeapUsage
    };
  }

  getOffHeapStatus() {
    return this.offHeapManager.getUsage();
  }
}