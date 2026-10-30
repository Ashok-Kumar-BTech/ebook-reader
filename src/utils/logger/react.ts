/**
 * React Integration - Hooks and utilities for component-level logging
 */

import { useEffect, useRef } from 'react';
import { logManager, type LoggerInstance } from './index';
import { pushCorrelationId, popCorrelationId, getCorrelationId } from './correlation';

export interface UseLogRenderOptions {
  logProps?: boolean;
  logMount?: boolean;
  logUnmount?: boolean;
  logUpdates?: boolean;
}

/**
 * Hook to log component render lifecycle
 */
export function useLogRender(
  componentName: string,
  props?: Record<string, unknown>,
  options: UseLogRenderOptions = {}
): LoggerInstance {
  const {
    logProps = true,
    logMount = true,
    logUnmount = true,
    logUpdates = false,
  } = options;
  
  const logger = logManager.getLogger(`component:${componentName}`);
  const renderCount = useRef(0);
  const prevProps = useRef(props);
  const propsRef = useRef(props);
  propsRef.current = props;
  const mounted = useRef(false);
  
  // Log mount & unmount
  useEffect(() => {
    if (logMount) {
      logger.info('MOUNT', {
        component: componentName,
        props: logProps ? propsRef.current : undefined,
        correlationId: getCorrelationId(),
      });
    }
    mounted.current = true;
    
    return () => {
      if (logUnmount) {
        logger.info('UNMOUNT', {
          component: componentName,
          renderCount: renderCount.current,
          correlationId: getCorrelationId(),
        });
      }
    };
  }, [componentName, logger, logMount, logUnmount, logProps]);
  
  // Log updates
  useEffect(() => {
    if (!mounted.current) return; // Skip mount
    
    renderCount.current++;
    
    if (logUpdates && prevProps.current !== props) {
      logger.debug('UPDATE', {
        component: componentName,
        renderCount: renderCount.current,
        prevProps: logProps ? prevProps.current : undefined,
        nextProps: logProps ? props : undefined,
        correlationId: getCorrelationId(),
      });
    }
    
    prevProps.current = props;
  }, [props, componentName, logger, logUpdates, logProps]);
  
  return logger;
}

/**
 * Hook to log effect lifecycle
 */
export function useLogEffect(
  effectName: string,
  deps: unknown[],
  cleanup?: () => void
): LoggerInstance {
  const logger = logManager.getLogger(`effect:${effectName}`);
  const effectCount = useRef(0);
  
  useEffect(() => {
    effectCount.current++;
    logger.debug('EFFECT_START', {
      effect: effectName,
      count: effectCount.current,
      deps,
      correlationId: getCorrelationId(),
    });
    
    return () => {
      logger.debug('EFFECT_CLEANUP', {
        effect: effectName,
        count: effectCount.current,
        correlationId: getCorrelationId(),
      });
      cleanup?.();
    };
  }, deps);
  
  return logger;
}

/**
 * Hook to create a component-scoped logger with correlation ID
 */
export function useLogger(componentName: string): LoggerInstance {
  const loggerRef = useRef<LoggerInstance | null>(null);
  
  if (!loggerRef.current) {
    loggerRef.current = logManager.getLogger(componentName);
  }
  
  // Auto-push correlation ID for this component's lifecycle
  useEffect(() => {
    const id = pushCorrelationId();
    loggerRef.current?.debug('CORRELATION_START', { component: componentName, correlationId: id });
    
    return () => {
      loggerRef.current?.debug('CORRELATION_END', { component: componentName, correlationId: id });
      popCorrelationId();
    };
  }, [componentName]);
  
  return loggerRef.current;
}

/**
 * Higher-order function to wrap async operations with logging
 */
export function withLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  operationName: string,
  logger?: LoggerInstance
): T {
  const log = logger ?? logManager.getLogger(`operation:${operationName}`);
  
  return (async (...args: unknown[]) => {
    const startTime = performance.now();
    const correlationId = pushCorrelationId();
    
    log.info('OPERATION_START', {
      operation: operationName,
      args: args.length > 0 ? args : undefined,
      correlationId,
    });
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      log.info('OPERATION_SUCCESS', {
        operation: operationName,
        durationMs: Math.round(duration),
        correlationId,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      log.error('OPERATION_ERROR', {
        operation: operationName,
        durationMs: Math.round(duration),
        correlationId,
      }, error as Error);
      
      throw error;
    } finally {
      popCorrelationId();
    }
  }) as T;
}

/**
 * Create a timed logger for performance tracking
 */
export function createTimedLogger(baseLogger: LoggerInstance, operation: string) {
  const startTime = performance.now();
  
  return {
    success: (context?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      baseLogger.info(`${operation}_SUCCESS`, {
        ...context,
        operation,
        durationMs: Math.round(duration),
      });
    },
    error: (error: Error | unknown, context?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      baseLogger.error(`${operation}_ERROR`, {
        ...context,
        operation,
        durationMs: Math.round(duration),
      }, error as Error);
    },
    complete: (context?: Record<string, unknown>) => {
      const duration = performance.now() - startTime;
      baseLogger.debug(`${operation}_COMPLETE`, {
        ...context,
        operation,
        durationMs: Math.round(duration),
      });
    },
  };
}