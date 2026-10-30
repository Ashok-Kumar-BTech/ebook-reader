/**
 * File Transport - Writes logs to rotating files in Tauri environment
 * Only works in Tauri; no-op in browser
 */

import type { LogEntry, LogTransport } from '../types';
import { jsonFormatter } from '../formatters';
import { isTauri } from '@tauri-apps/api/core';

let fileWriteQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function processQueue(): Promise<void> {
  if (isProcessingQueue || fileWriteQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (fileWriteQueue.length > 0) {
    const task = fileWriteQueue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error('[Logger] File transport write failed:', err);
      }
    }
  }
  
  isProcessingQueue = false;
}

function enqueueWrite(task: () => Promise<void>): void {
  fileWriteQueue.push(task);
  processQueue();
}

export function createFileTransport(): LogTransport {
  let initialized = false;
  let logFilePath: string | null = null;
  let currentFileSize = 0;
  
  async function initialize(): Promise<void> {
    if (initialized) return;
    
    // File logging is only applicable to desktop targets; on mobile, native console & logcat are active
    if (typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
      initialized = true;
      return;
    }

    const inTauri = await isTauri();
    if (!inTauri) {
      initialized = true;
      return;
    }
    
    try {
      const { appDataDir, join } = await import('@tauri-apps/api/path');
      const { exists, mkdir, readTextFile } = await import('@tauri-apps/plugin-fs');
      
      const baseDir = await appDataDir();
      const logDir = await join(baseDir, 'logs');
      
      if (!(await exists(logDir))) {
        await mkdir(logDir, { recursive: true });
      }
      
      const date = new Date().toISOString().split('T')[0];
      logFilePath = await join(logDir, `app-${date}.log`);
      
      // Check current file size
      if (await exists(logFilePath)) {
        const content = await readTextFile(logFilePath);
        currentFileSize = content.length;
      }
      
      initialized = true;
    } catch (err) {
      console.error('[Logger] Failed to initialize file transport:', err);
      initialized = true;
    }
  }
  
  return {
    name: 'file',
    async write(entry: LogEntry): Promise<void> {
      await initialize();
      
      if (!logFilePath) return;
      
      const line = jsonFormatter(entry) + '\n';
      
      enqueueWrite(async () => {
        try {
          const { writeTextFile } = await import('@tauri-apps/plugin-fs');
          await writeTextFile(logFilePath!, line, { append: true });
          currentFileSize += line.length;
        } catch (err) {
          console.error('[Logger] File write failed:', err);
        }
      });
    },
    async flush(): Promise<void> {
      while (fileWriteQueue.length > 0 || isProcessingQueue) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    },
  };
}
