export interface SafetyViolation {
  type: 'DIVISION_BY_ZERO' | 'ARRAY_BOUNDS' | 'NULL_POINTER' | 'STACK_OVERFLOW' | 'HEAP_OVERFLOW' | 'DEADLINE_MISS';
  line: number;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'CRITICAL';
  timestamp: number;
}

export interface VerificationResult {
  isValid: boolean;
  violations: SafetyViolation[];
  warnings: SafetyViolation[];
}

export class SafetyVerifier {
  private maxStackDepth = 100;
  private maxHeapSize = 1024 * 1024; // 1MB
  private currentStackDepth = 0;

  verifyOperation(operation: string, operands: any[], line: number): VerificationResult {
    const violations: SafetyViolation[] = [];
    const warnings: SafetyViolation[] = [];

    switch (operation) {
      case 'DIVISION':
        this.checkDivisionByZero(operands, line, violations);
        break;
      case 'ARRAY_ACCESS':
        this.checkArrayBounds(operands, line, violations);
        break;
      case 'METHOD_CALL':
        this.checkStackOverflow(line, violations);
        break;
      case 'MEMORY_ALLOCATION':
        this.checkHeapOverflow(operands, line, violations);
        break;
      case 'NULL_ACCESS':
        this.checkNullPointer(operands, line, violations);
        break;
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  private checkDivisionByZero(operands: any[], line: number, violations: SafetyViolation[]): void {
    if (operands.length >= 2 && Number(operands[1]) === 0) {
      violations.push({
        type: 'DIVISION_BY_ZERO',
        line,
        message: `Division by zero detected: ${operands[0]} / ${operands[1]}`,
        severity: 'CRITICAL',
        timestamp: Date.now()
      });
    }
  }

  private checkArrayBounds(operands: any[], line: number, violations: SafetyViolation[]): void {
    const [array, index] = operands;
    if (Array.isArray(array) && typeof index === 'number') {
      if (index < 0 || index >= array.length) {
        violations.push({
          type: 'ARRAY_BOUNDS',
          line,
          message: `Array index out of bounds: index ${index}, array length ${array.length}`,
          severity: 'ERROR',
          timestamp: Date.now()
        });
      }
    }
  }

  private checkStackOverflow(line: number, violations: SafetyViolation[]): void {
    this.currentStackDepth++;
    if (this.currentStackDepth > this.maxStackDepth) {
      violations.push({
        type: 'STACK_OVERFLOW',
        line,
        message: `Stack overflow: depth ${this.currentStackDepth} exceeds maximum ${this.maxStackDepth}`,
        severity: 'CRITICAL',
        timestamp: Date.now()
      });
    }
  }

  private checkHeapOverflow(operands: any[], line: number, violations: SafetyViolation[]): void {
    const [requestedSize, currentHeapSize] = operands;
    if (currentHeapSize + requestedSize > this.maxHeapSize) {
      violations.push({
        type: 'HEAP_OVERFLOW',
        line,
        message: `Heap overflow: requested ${requestedSize} bytes, available ${this.maxHeapSize - currentHeapSize}`,
        severity: 'CRITICAL',
        timestamp: Date.now()
      });
    }
  }

  private checkNullPointer(operands: any[], line: number, violations: SafetyViolation[]): void {
    const [object] = operands;
    if (object === null || object === undefined) {
      violations.push({
        type: 'NULL_POINTER',
        line,
        message: 'Null pointer access detected',
        severity: 'ERROR',
        timestamp: Date.now()
      });
    }
  }

  resetStackDepth(): void {
    this.currentStackDepth = 0;
  }

  decrementStackDepth(): void {
    this.currentStackDepth = Math.max(0, this.currentStackDepth - 1);
  }
}