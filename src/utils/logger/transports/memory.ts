/**
 * Memory Transport - In-memory ring buffer transport for live in-app log viewing
 * Retains up to `maxEntries` (default 500) and notifies subscribers in real-time.
 */

import type { LogEntry, LogTransport } from '../types';

export class MemoryTransport implements LogTransport {
  readonly name = 'memory';
  private buffer: LogEntry[] = [];
  private listeners: Set<(entry: LogEntry) => void> = new Set();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.maxEntries) {
      this.buffer.shift();
    }
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error('[MemoryTransport] Listener notification failed:', err);
      }
    }
  }

  getEntries(): LogEntry[] {
    return [...this.buffer];
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  clear(): void {
    this.buffer = [];
  }

  async flush(): Promise<void> {
    // Synchronous memory buffer, no-op
  }
}

export const memoryTransport = new MemoryTransport(500);

export function createMemoryTransport(maxEntries = 500): MemoryTransport {
  return new MemoryTransport(maxEntries);
}

