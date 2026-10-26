/**
 * JSON Formatter - Machine-parseable structured logging
 */

import type { LogEntry, LogFormatter } from '../types';

export const jsonFormatter: LogFormatter = (entry: LogEntry): string => {
  return JSON.stringify(entry);
};