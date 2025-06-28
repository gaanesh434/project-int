export interface ExecutionSnapshot {
  id: string;
  timestamp: number;
  line: number;
  variables: Map<string, any>;
  stackTrace: string[];
  heapState: Map<string, any>;
  output: string;
  gcState: {
    heapUsage: number;
    allocatedObjects: number;
    freedObjects: number;
  };
}

export class TimeTravelDebugger {
  private snapshots: ExecutionSnapshot[] = [];
  private maxSnapshots = 1000; // Circular buffer size
  private currentIndex = 0;
  private snapshotId = 0;

  captureSnapshot(
    line: number,
    variables: Map<string, any>,
    stackTrace: string[],
    heapState: Map<string, any>,
    output: string,
    gcState: any
  ): string {
    const snapshot: ExecutionSnapshot = {
      id: `snapshot_${this.snapshotId++}`,
      timestamp: Date.now(),
      line,
      variables: new Map(variables),
      stackTrace: [...stackTrace],
      heapState: new Map(heapState),
      output,
      gcState: { ...gcState }
    };

    // Circular buffer implementation
    if (this.snapshots.length < this.maxSnapshots) {
      this.snapshots.push(snapshot);
      this.currentIndex = this.snapshots.length - 1;
    } else {
      this.snapshots[this.currentIndex % this.maxSnapshots] = snapshot;
      this.currentIndex = (this.currentIndex + 1) % this.maxSnapshots;
    }

    return snapshot.id;
  }

  stepBack(): ExecutionSnapshot | null {
    if (this.snapshots.length === 0) return null;
    
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    return this.snapshots[this.currentIndex];
  }

  stepForward(): ExecutionSnapshot | null {
    if (this.snapshots.length === 0) return null;
    
    this.currentIndex = Math.min(this.snapshots.length - 1, this.currentIndex + 1);
    return this.snapshots[this.currentIndex];
  }

  jumpToSnapshot(snapshotId: string): ExecutionSnapshot | null {
    const index = this.snapshots.findIndex(s => s.id === snapshotId);
    if (index !== -1) {
      this.currentIndex = index;
      return this.snapshots[index];
    }
    return null;
  }

  getCurrentSnapshot(): ExecutionSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.currentIndex] : null;
  }

  getAllSnapshots(): ExecutionSnapshot[] {
    return [...this.snapshots];
  }

  getSnapshotRange(startTime: number, endTime: number): ExecutionSnapshot[] {
    return this.snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
  }

  clearSnapshots(): void {
    this.snapshots = [];
    this.currentIndex = 0;
    this.snapshotId = 0;
  }

  getMemoryUsageHistory(): Array<{ timestamp: number; heapUsage: number }> {
    return this.snapshots.map(s => ({
      timestamp: s.timestamp,
      heapUsage: s.gcState.heapUsage
    }));
  }
}