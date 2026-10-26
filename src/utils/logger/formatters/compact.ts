/**
 * Compact Formatter - Single-line structured output for production logs
 */

import type { LogEntry, LogFormatter } from '../types';

export const compactFormatter: LogFormatter = (entry: LogEntry): string => {
  const parts = [
    entry.timestamp,
    entry.level.toUpperCase(),
    `[${entry.logger}]`,
    entry.correlationId ? `[${entry.correlationId.slice(0, 8)}]` : '',
    entry.message,
  ].filter(Boolean).join(' ');
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    return parts + ' ' + JSON.stringify(entry.context);
  }
  
  return parts;
};