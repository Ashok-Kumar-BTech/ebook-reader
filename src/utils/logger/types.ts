/**
 * Logging System Types
 * RFC 5424 compatible log levels with structured logging support
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  logger: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  componentStack?: string;
  durationMs?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface LogTransport {
  name: string;
  write(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  transports: LogTransport[];
  enableComponentTracking: boolean;
  enableStoreTracking: boolean;
  enablePerformanceTracking: boolean;
  maxContextDepth: number;
  redactKeys: string[];
}

export interface LoggerInstance {
  trace(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown> | Error, err?: Error): void;
  fatal(message: string, context?: Record<string, unknown> | Error, err?: Error): void;
  child(bindings: Record<string, unknown>): LoggerInstance;
  setCorrelationId(id: string | undefined): void;
  getCorrelationId(): string | undefined;
}

export type LogFormatter = (entry: LogEntry) => string;