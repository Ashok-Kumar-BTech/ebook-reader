import { isTauri } from '@tauri-apps/api/core';
import { logManager } from '../utils/logger';

let tauriCheckCache: boolean | null = null;
export async function checkIsTauri(): Promise<boolean> {
  if (tauriCheckCache !== null) return tauriCheckCache;
  try {
    tauriCheckCache = await isTauri();
  } catch {
    tauriCheckCache = false;
  }
  return tauriCheckCache;
}

const tauriLogger = logManager.getLogger('tauriApi');

function logTauriCall<T>(apiName: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T | null> {
  return logTauriCallInternal(apiName, fn, context);
}

async function logTauriCallInternal<T>(apiName: string, fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T | null> {
  const startTime = performance.now();
  const inTauri = await checkIsTauri();
  
  tauriLogger.debug('TAURI_CALL_START', {
    api: apiName,
    context,
    inTauri,
  });
  
  if (!inTauri) {
    tauriLogger.warn('TAURI_CALL_SKIPPED', {
      api: apiName,
      reason: 'Not in Tauri environment',
    });
    return null;
  }
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    tauriLogger.info('TAURI_CALL_SUCCESS', {
      api: apiName,
      durationMs: Math.round(duration),
      hasResult: result !== null && result !== undefined,
    });
    
    return result;
  } catch (err) {
    const duration = performance.now() - startTime;
    
    tauriLogger.error('TAURI_CALL_ERROR', {
      api: apiName,
      durationMs: Math.round(duration),
    }, err as Error);
    
    return null;
  }
}

/**
 * Open a directory picker dialog.
 * Returns the selected path or null if cancelled/not available.
 */
export async function openDirectoryDialog(title = 'Select a directory'): Promise<string | null> {
  return logTauriCall('dialog.openDirectory', async () => {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title,
    });
    return selected as string | null;
  }, { title });
}

/**
 * Read a directory's contents.
 * Returns array of directory entries or null if not available.
 */
export async function readDirectory(path: string): Promise<Array<{ name: string; isDirectory?: boolean }> | null> {
  return logTauriCall('fs.readDir', async () => {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    return await readDir(path);
  }, { path });
}

export interface TauriFileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  modified: number;
  is_supported: boolean;
}

/**
 * Fast atomic directory listing via native Tauri Rust command.
 * Avoids N+1 IPC stat roundtrips.
 */
export async function listDirectory(path: string): Promise<TauriFileEntry[] | null> {
  return logTauriCall('cmd.list_directory', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<TauriFileEntry[]>('list_directory', { path });
  }, { path });
}

/**
 * Get file/directory stats.
 * Returns stat object or null if not available.
 */
export async function getFileStat(path: string): Promise<{ size?: number; mtime?: Date | number } | null> {
  return logTauriCall('fs.stat', async () => {
    const { stat } = await import('@tauri-apps/plugin-fs');
    const fileInfo = await stat(path);
    return {
      size: fileInfo.size ?? 0,
      mtime: fileInfo.mtime instanceof Date ? fileInfo.mtime.getTime() : (fileInfo.mtime ?? 0),
    };
  }, { path });
}

/**
 * Read raw file content as Uint8Array for book adapters.
 */
export async function readFileData(path: string): Promise<Uint8Array | null> {
  return logTauriCall('fs.readFile', async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes = await invoke<number[]>('read_file', { path });
      return new Uint8Array(bytes);
    } catch {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(path);
    }
  }, { path });
}
