/**
 * Store Middleware - Zustand middleware for logging state changes
 */

import type { StateCreator } from 'zustand';
import { logManager } from './LogManager';

export interface StoreLogConfig {
  name: string;
  logLevel?: 'trace' | 'debug' | 'info';
  logStateDiff?: boolean;
  excludeKeys?: string[]; // Keys to exclude from logging (e.g., large objects)
}

function shallowEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key) || a[key as keyof T] !== b[key as keyof T]) {
      return false;
    }
  }
  
  return true;
}

function computeDiff<T extends Record<string, unknown>>(prev: T, next: T, excludeKeys: string[] = []): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  
  for (const key of allKeys) {
    if (excludeKeys.includes(key)) continue;
    if (!shallowEqual(prev[key], next[key])) {
      diff[key] = { from: prev[key], to: next[key] };
    }
  }
  
  return diff;
}

export function createLoggedStore<T extends object>(
  config: StoreLogConfig,
  storeCreator: StateCreator<T>
): StateCreator<T> {
  const logger = logManager.getLogger(`store:${config.name}`);
  const logLevel = config.logLevel ?? 'debug';
  const logDiff = config.logStateDiff ?? true;
  const excludeKeys = config.excludeKeys ?? [];
  
  return (set, get, api) => {
    // Wrap set to log state changes
    const loggedSet = (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: false) => {
      const prevState = get();
      
      // Call original set
      set(partial, replace);
      
      const nextState = get();
      
      if (logDiff) {
        const diff = computeDiff(prevState as Record<string, unknown>, nextState as Record<string, unknown>, excludeKeys);
        
        if (Object.keys(diff).length > 0) {
          logger[logLevel]('STATE_CHANGE', {
            store: config.name,
            action: 'set',
            diff,
            correlationId: undefined, // Will be filled by correlation context
          });
        }
      } else {
        logger[logLevel]('STATE_CHANGE', {
          store: config.name,
          action: 'set',
          correlationId: undefined,
        });
      }
    };
    
    // Wrap subscribe to log subscriptions
    const originalSubscribe = api.subscribe;
    api.subscribe = (listener: (state: T, prevState: T) => void) => {
      logger.debug('SUBSCRIBE', {
        store: config.name,
        listenerCount: Object.keys(api.getState?.() ?? {}).length,
      });
      return originalSubscribe(listener);
    };
    
    // Create store with logged set
    const store = storeCreator(loggedSet as typeof set, get, api);
    
    // Log hydration if present
    const originalHydrate = (store as { hydrate?: () => Promise<void> }).hydrate;
    if (originalHydrate) {
      (store as { hydrate?: () => Promise<void> }).hydrate = async () => {
        logger.info('HYDRATE_START', { store: config.name });
        const startTime = performance.now();
        
        try {
          await originalHydrate();
          const duration = performance.now() - startTime;
          logger.info('HYDRATE_SUCCESS', {
            store: config.name,
            durationMs: Math.round(duration),
          });
        } catch (error) {
          const duration = performance.now() - startTime;
          logger.error('HYDRATE_ERROR', {
            store: config.name,
            durationMs: Math.round(duration),
          }, error as Error);
          throw error;
        }
      };
    }
    
    return store;
  };
}

/**
 * Middleware for logging specific actions
 */
export function createActionLogger(
  storeName: string,
  actionName: string
) {
  const logger = logManager.getLogger(`store:${storeName}:action:${actionName}`);
  
  return (args: unknown[], result: unknown) => {
    logger.debug('ACTION', {
      store: storeName,
      action: actionName,
      args,
      result: result instanceof Error ? undefined : result,
      error: result instanceof Error ? result : undefined,
    });
  };
}

/**
 * Wrapper for async store actions with logging
 */
export function withActionLogging<T extends (...args: unknown[]) => Promise<unknown>>(
  storeName: string,
  actionName: string,
  fn: T
): T {
  const logger = logManager.getLogger(`store:${storeName}:action:${actionName}`);
  
  return (async (...args: unknown[]) => {
    const startTime = performance.now();
    
    logger.debug('ACTION_START', {
      store: storeName,
      action: actionName,
      args,
    });
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      
      logger.debug('ACTION_SUCCESS', {
        store: storeName,
        action: actionName,
        durationMs: Math.round(duration),
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error('ACTION_ERROR', {
        store: storeName,
        action: actionName,
        durationMs: Math.round(duration),
      }, error as Error);
      
      throw error;
    }
  }) as T;
}
