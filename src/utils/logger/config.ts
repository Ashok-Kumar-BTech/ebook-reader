/**
 * Logger Configuration - Environment-aware logging setup
 */

import type { LoggerConfig, LogLevel } from './types';
import { createConsoleTransport } from './transports/console';
import { createFileTransport } from './transports/file';
import { createTauriTransport } from './transports/tauri';
import { memoryTransport } from './transports/memory';
import { isTauri } from '@tauri-apps/api/core';

const isDev = import.meta.env.DEV;
const isTest = import.meta.env.MODE === 'test';

function getMinLevel(): LogLevel {
  if (isTest) return 'warn';
  if (isDev) return 'trace';
  return 'info';
}

function getTransports(): LoggerConfig['transports'] {
  return [
    createConsoleTransport({
      useColors: true,
      useJson: false,
    }),
    memoryTransport,
  ];
}

export const loggerConfig: LoggerConfig = {
  minLevel: getMinLevel(),
  transports: getTransports(),
  enableComponentTracking: isDev,
  enableStoreTracking: true,
  enablePerformanceTracking: isDev,
  maxContextDepth: 3,
  redactKeys: [
    'password',
    'token',
    'authorization',
    'secret',
    'key',
    'credential',
    'auth',
  ],
};

let tauriLoggerInitialized = false;

/**
 * Initialize logger with Tauri-aware config
 * Call this after Tauri is confirmed available
 */
export async function initializeLoggerWithTauri(): Promise<void> {
  if (tauriLoggerInitialized) return;
  const inTauri = await isTauri();
  
  if (inTauri) {
    loggerConfig.transports.push(createFileTransport());
    loggerConfig.transports.push(createTauriTransport());
    tauriLoggerInitialized = true;
  }
}

/**
 * Get config for specific environment
 */
export function getLoggerConfig(overrides?: Partial<LoggerConfig>): LoggerConfig {
  return {
    ...loggerConfig,
    ...overrides,
  };
}