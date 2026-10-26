/**
 * Tauri Log Transport - Integrates with tauri-plugin-log on Rust side
 * Sends structured logs to the Rust logging infrastructure
 */

import type { LogEntry, LogTransport } from '../types';
import { isTauri } from '@tauri-apps/api/core';

const LEVEL_MAP: Record<string, string> = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error',
};

export function createTauriTransport(): LogTransport {
  let initialized = false;
  let logFn: ((level: string, target: string, args: unknown[]) => void) | null = null;
  
  async function initialize(): Promise<void> {
    if (initialized) return;
    
    const inTauri = await isTauri();
    if (!inTauri) {
      initialized = true;
      return;
    }
    
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      logFn = async (level: string, target: string, args: unknown[]) => {
        await invoke('log_from_frontend', {
          level: LEVEL_MAP[level] || 'info',
          target,
          args: JSON.stringify(args),
        });
      };
      
      initialized = true;
    } catch (err) {
      console.error('[Logger] Failed to initialize Tauri transport:', err);
      initialized = true;
    }
  }
  
  return {
    name: 'tauri',
    async write(entry: LogEntry): Promise<void> {
      await initialize();
      
      if (!logFn) return;
      
      try {
        const args = [
          entry.message,
          entry.context ? JSON.stringify(entry.context) : undefined,
          entry.correlationId ? `corr_id=${entry.correlationId.slice(0, 8)}` : undefined,
          entry.durationMs !== undefined ? `duration=${entry.durationMs}ms` : undefined,
          entry.error ? `error=${entry.error.name}: ${entry.error.message}` : undefined,
        ].filter(Boolean);
        
        await logFn(entry.level, entry.logger, args);
      } catch (err) {
        console.error('[Logger] Tauri log write failed:', err);
      }
    },
  };
}
