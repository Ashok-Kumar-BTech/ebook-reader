/**
 * Logger barrel export - Main entry point for the logging system
 */

// Types
export type {
  LogLevel,
  LogEntry,
  LogTransport,
  LoggerConfig,
  LoggerInstance,
  LogFormatter,
} from './types';

export { LOG_LEVELS } from './types';

// Core
export { logManager, logger, LogManager } from './LogManager';

// Configuration
export { loggerConfig, initializeLoggerWithTauri, getLoggerConfig } from './config';

// React integration
export {
  useLogRender,
  useLogEffect,
  useLogger,
  withLogging,
  createTimedLogger,
} from './react';

// Store middleware
export {
  createLoggedStore,
  createActionLogger,
  withActionLogging,
} from './storeMiddleware';

// Correlation ID
export {
  generateCorrelationId,
  getCorrelationId,
  setCorrelationId,
  withCorrelationId,
  pushCorrelationId,
  popCorrelationId,
  runWithCorrelation,
} from './correlation';

// Transports
export {
  createConsoleTransport,
  createFileTransport,
  createTauriTransport,
  memoryTransport,
  MemoryTransport,
  createMemoryTransport,
} from './transports';

// Formatters
export {
  jsonFormatter,
  prettyFormatter,
  compactFormatter,
} from './formatters';