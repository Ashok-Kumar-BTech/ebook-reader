/**
 * LogManager - Core singleton for structured logging
 * Manages transports, level filtering, context enrichment, and child loggers
 */

import type {
  LogLevel,
  LogEntry,
  LoggerConfig,
  LoggerInstance,
} from './types';
import { LOG_LEVELS } from './types';
import { createConsoleTransport } from './transports/console';
import { getCorrelationId } from './correlation';

function getComponentStack(): string | undefined {
  return undefined;
}

function redactContext(context: Record<string, unknown> | undefined, redactKeys: string[]): Record<string, unknown> | undefined {
  if (!context) return undefined;
  
  const redacted: Record<string, unknown> = {};
  const lowerRedactKeys = redactKeys.map(k => k.toLowerCase());
  
  for (const [key, value] of Object.entries(context)) {
    if (lowerRedactKeys.some(rk => key.toLowerCase().includes(rk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactContext(value as Record<string, unknown>, redactKeys);
    } else {
      redacted[key] = value;
    }
  }
  
  return redacted;
}

function formatError(error: unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { name: 'Error', message: error };
  }
  if (error && typeof error === 'object') {
    return {
      name: 'UnknownError',
      message: JSON.stringify(error),
    };
  }
  return { name: 'UnknownError', message: String(error) };
}

class LogManager {
  private static instance: LogManager | null = null;
  
  private config: LoggerConfig | null = null;
  private initialized = false;
  private defaultLogger: string = 'app';
  
  private constructor() {}
  
  static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }
  
  initialize(config: LoggerConfig): void {
    if (this.initialized) {
      this.warn('LogManager already initialized, skipping');
      return;
    }
    
    this.config = config;
    this.initialized = true;
    
    if (config.transports.length === 0) {
      config.transports.push(createConsoleTransport());
    }
    
    this.info('LogManager initialized', {
      minLevel: config.minLevel,
      transports: config.transports.map(t => t.name),
      componentTracking: config.enableComponentTracking,
      storeTracking: config.enableStoreTracking,
      performanceTracking: config.enablePerformanceTracking,
    });
  }
  
  private shouldLog(level: LogLevel): boolean {
    if (!this.config) return true;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }
  
  private write(level: LogLevel, logger: string, message: string, context?: Record<string, unknown> | Error, err?: Error): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger,
      message,
      correlationId: getCorrelationId(),
      componentStack: getComponentStack(),
    };
    
    if (context instanceof Error) {
      entry.error = formatError(context);
      if (err) {
        entry.context = { ...context, cause: formatError(err) };
      }
    } else if (err) {
      entry.error = formatError(err);
      entry.context = context;
    } else {
      entry.context = context;
    }
    
    if (entry.context && this.config?.redactKeys) {
      entry.context = redactContext(entry.context, this.config.redactKeys);
    }
    
    for (const transport of this.config?.transports ?? []) {
      try {
        transport.write(entry);
      } catch (err) {
        console.error(`[Logger] Transport ${transport.name} failed:`, err);
      }
    }
  }
  
  trace(message: string, context?: Record<string, unknown>): void {
    this.write('trace', this.defaultLogger, message, context);
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    this.write('debug', this.defaultLogger, message, context);
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    this.write('info', this.defaultLogger, message, context);
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    this.write('warn', this.defaultLogger, message, context);
  }
  
  error(message: string, context?: Record<string, unknown> | Error, err?: Error): void {
    this.write('error', this.defaultLogger, message, context, err);
  }
  
  fatal(message: string, context?: Record<string, unknown> | Error, err?: Error): void {
    this.write('fatal', this.defaultLogger, message, context, err);
  }
  
  child(bindings: Record<string, unknown>): LoggerInstance {
    const parentWrite = this.write.bind(this);
    
    return {
      trace: (msg, ctx) => parentWrite('trace', this.defaultLogger, msg, { ...bindings, ...ctx }),
      debug: (msg, ctx) => parentWrite('debug', this.defaultLogger, msg, { ...bindings, ...ctx }),
      info: (msg, ctx) => parentWrite('info', this.defaultLogger, msg, { ...bindings, ...ctx }),
      warn: (msg, ctx) => parentWrite('warn', this.defaultLogger, msg, { ...bindings, ...ctx }),
      error: (msg, ctx, err) => parentWrite('error', this.defaultLogger, msg, ctx instanceof Error ? ctx : { ...bindings, ...ctx }, err),
      fatal: (msg, ctx, err) => parentWrite('fatal', this.defaultLogger, msg, ctx instanceof Error ? ctx : { ...bindings, ...ctx }, err),
      child: (moreBindings) => this.child({ ...bindings, ...moreBindings }),
      setCorrelationId: () => { },
      getCorrelationId: () => getCorrelationId(),
    };
  }
  
  getLogger(name: string): LoggerInstance {
    return this.child({ logger: name });
  }
  
  async flush(): Promise<void> {
    if (!this.config) return;
    
    await Promise.all(
      this.config.transports
        .filter(t => t.flush)
        .map(t => t.flush!())
    );
  }
  
  updateConfig(partial: Partial<LoggerConfig>): void {
    if (!this.config) return;
    this.config = { ...this.config, ...partial };
  }
  
  getConfig(): LoggerConfig | null {
    return this.config;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const logManager = LogManager.getInstance();

export const logger = {
  trace: (msg: string, ctx?: Record<string, unknown>) => logManager.trace(msg, ctx),
  debug: (msg: string, ctx?: Record<string, unknown>) => logManager.debug(msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => logManager.info(msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => logManager.warn(msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown> | Error, err?: Error) => logManager.error(msg, ctx, err),
  fatal: (msg: string, ctx?: Record<string, unknown> | Error, err?: Error) => logManager.fatal(msg, ctx, err),
  child: (bindings: Record<string, unknown>) => logManager.child(bindings),
  getLogger: (name: string) => logManager.getLogger(name),
};

export { LogManager };
