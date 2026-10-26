/**
 * Pretty Formatter - Human-readable colored output for development
 */

import type { LogEntry, LogFormatter } from '../types';

const LEVEL_COLORS: Record<string, string> = {
  trace: '\x1b[90m',   // Gray
  debug: '\x1b[36m',   // Cyan
  info: '\x1b[32m',    // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  fatal: '\x1b[35m',   // Magenta
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function formatContext(context?: Record<string, unknown>, depth = 0): string {
  if (!context || Object.keys(context).length === 0) return '';
  
  const indent = '  '.repeat(depth + 1);
  const lines = Object.entries(context).map(([key, value]) => {
    const formattedValue = typeof value === 'object' && value !== null
      ? JSON.stringify(value, null, 2).split('\n').map(l => indent + l).join('\n')
      : String(value);
    return `${indent}${DIM}${key}:${RESET} ${formattedValue}`;
  });
  
  return '\n' + lines.join('\n');
}

function formatError(error?: LogEntry['error']): string {
  if (!error) return '';
  const indent = '  ';
  return `\n${indent}${DIM}Error:${RESET} ${error.name}: ${error.message}${error.stack ? `\n${indent}${DIM}Stack:${RESET} ${error.stack.split('\n').map(l => indent + l).join('\n')}` : ''}`;
}

export const prettyFormatter: LogFormatter = (entry: LogEntry): string => {
  const color = LEVEL_COLORS[entry.level] || '';
  const levelStr = entry.level.toUpperCase().padEnd(5);
  const timestamp = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + new Date(entry.timestamp).getMilliseconds().toString().padStart(3, '0');
  const correlation = entry.correlationId ? `${DIM}[${entry.correlationId.slice(0, 8)}]${RESET} ` : '';
  const logger = `${DIM}[${entry.logger}]${RESET}`;
  const indent = '  ';

  let output = `${color}${timestamp} ${levelStr}${RESET} ${logger} ${correlation}${entry.message}`;

  if (entry.durationMs !== undefined) {
    output += ` ${DIM}(${entry.durationMs}ms)${RESET}`;
  }

  output += formatContext(entry.context);
  output += formatError(entry.error);

  if (entry.componentStack) {
    output += `\n${indent}${DIM}Component Stack:${RESET}\n${entry.componentStack.split('\n').map(l => indent + indent + l).join('\n')}`;
  }

  return output;
};
