/**
 * Console Transport - Outputs logs to browser console or stdout
 */

import type { LogEntry, LogTransport } from '../types';
import { prettyFormatter, compactFormatter, jsonFormatter } from '../formatters';

export interface ConsoleTransportOptions {
  useColors?: boolean;
  useJson?: boolean;
}

export function createConsoleTransport(options: ConsoleTransportOptions = {}): LogTransport {
  const { useColors = true, useJson = false } = options;
  
  const formatter = useJson ? jsonFormatter : (useColors ? prettyFormatter : compactFormatter);
  
  return {
    name: 'console',
    write(entry: LogEntry): void {
      const formatted = formatter(entry);
      
      switch (entry.level) {
        case 'trace':
        case 'debug':
          console.debug(formatted);
          break;
        case 'info':
          console.info(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
        case 'fatal':
          console.error(formatted);
          break;
      }
    },
  };
}
