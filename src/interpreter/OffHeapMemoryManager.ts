export interface OffHeapBlock {
  id: string;
  size: number;
  data: ArrayBuffer;
  allocated: boolean;
  timestamp: number;
}

export class OffHeapMemoryManager {
  private blocks = new Map<string, OffHeapBlock>();
  private freeBlocks: OffHeapBlock[] = [];
  private totalAllocated = 0;
  private maxOffHeapSize = 512 * 1024; // 512KB off-heap
  private blockIdCounter = 0;

  allocate(size: number): string | null {
    // Try to reuse a free block
    const freeBlock = this.freeBlocks.find(block => block.size >= size);
    if (freeBlock) {
      freeBlock.allocated = true;
      freeBlock.timestamp = Date.now();
      this.freeBlocks = this.freeBlocks.filter(b => b.id !== freeBlock.id);
      this.blocks.set(freeBlock.id, freeBlock);
      return freeBlock.id;
    }

    // Check if we have enough space
    if (this.totalAllocated + size > this.maxOffHeapSize) {
      return null; // Out of memory
    }

    // Allocate new block
    const blockId = `offheap_${this.blockIdCounter++}`;
    const block: OffHeapBlock = {
      id: blockId,
      size,
      data: new ArrayBuffer(size),
      allocated: true,
      timestamp: Date.now()
    };

    this.blocks.set(blockId, block);
    this.totalAllocated += size;
    return blockId;
  }

  deallocate(blockId: string): boolean {
    const block = this.blocks.get(blockId);
    if (!block || !block.allocated) return false;

    block.allocated = false;
    this.blocks.delete(blockId);
    this.freeBlocks.push(block);
    return true;
  }

  read(blockId: string, offset: number, length: number): ArrayBuffer | null {
    const block = this.blocks.get(blockId);
    if (!block || !block.allocated || offset + length > block.size) return null;

    return block.data.slice(offset, offset + length);
  }

  write(blockId: string, offset: number, data: ArrayBuffer): boolean {
    const block = this.blocks.get(blockId);
    if (!block || !block.allocated || offset + data.byteLength > block.size) return false;

    const view = new Uint8Array(block.data, offset);
    const dataView = new Uint8Array(data);
    view.set(dataView);
    return true;
  }

  getUsage(): { allocated: number; free: number; total: number; fragmentation: number } {
    const freeSize = this.freeBlocks.reduce((sum, block) => sum + block.size, 0);
    const allocatedSize = this.totalAllocated - freeSize;
    
    return {
      allocated: allocatedSize,
      free: this.maxOffHeapSize - this.totalAllocated,
      total: this.maxOffHeapSize,
      fragmentation: this.freeBlocks.length / Math.max(1, this.blocks.size)
    };
  }

  defragment(): number {
    // Compact free blocks
    this.freeBlocks.sort((a, b) => a.size - b.size);
    let compacted = 0;

    for (let i = 0; i < this.freeBlocks.length - 1; i++) {
      const current = this.freeBlocks[i];
      const next = this.freeBlocks[i + 1];
      
      if (current.size + next.size <= this.maxOffHeapSize) {
        // Merge blocks
        current.size += next.size;
        current.data = new ArrayBuffer(current.size);
        this.freeBlocks.splice(i + 1, 1);
        compacted++;
        i--; // Recheck current position
      }
    }

    return compacted;
  }
}