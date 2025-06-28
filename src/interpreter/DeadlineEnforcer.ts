export interface DeadlineAnnotation {
  methodName: string;
  deadlineMs: number;
  line: number;
}

export interface DeadlineViolation {
  methodName: string;
  expectedMs: number;
  actualMs: number;
  line: number;
  timestamp: number;
  severity: 'WARNING' | 'CRITICAL';
}

export class DeadlineEnforcer {
  private activeDeadlines = new Map<string, { startTime: number; deadlineMs: number; line: number }>();
  private violations: DeadlineViolation[] = [];
  private annotations: DeadlineAnnotation[] = [];

  registerDeadline(methodName: string, deadlineMs: number, line: number): void {
    this.annotations.push({ methodName, deadlineMs, line });
  }

  startMethod(methodName: string): void {
    const annotation = this.annotations.find(a => a.methodName === methodName);
    if (annotation) {
      this.activeDeadlines.set(methodName, {
        startTime: performance.now(),
        deadlineMs: annotation.deadlineMs,
        line: annotation.line
      });
    }
  }

  endMethod(methodName: string): DeadlineViolation | null {
    const deadline = this.activeDeadlines.get(methodName);
    if (!deadline) return null;

    const actualMs = performance.now() - deadline.startTime;
    this.activeDeadlines.delete(methodName);

    if (actualMs > deadline.deadlineMs) {
      const violation: DeadlineViolation = {
        methodName,
        expectedMs: deadline.deadlineMs,
        actualMs,
        line: deadline.line,
        timestamp: Date.now(),
        severity: actualMs > deadline.deadlineMs * 2 ? 'CRITICAL' : 'WARNING'
      };

      this.violations.push(violation);
      return violation;
    }

    return null;
  }

  getViolations(): DeadlineViolation[] {
    return [...this.violations];
  }

  clearViolations(): void {
    this.violations = [];
  }

  getActiveDeadlines(): Array<{ methodName: string; remainingMs: number }> {
    const now = performance.now();
    return Array.from(this.activeDeadlines.entries()).map(([methodName, deadline]) => ({
      methodName,
      remainingMs: Math.max(0, deadline.deadlineMs - (now - deadline.startTime))
    }));
  }
}