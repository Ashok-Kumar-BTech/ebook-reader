import { isTauri } from '@tauri-apps/api/core';
import { logManager } from '../utils/logger';

let tauriCheckCache: boolean | null = null;
export async function checkIsTauri(): Promise<boolean> {
  if (tauriCheckCache !== null) return tauriCheckCache;
  try {
    tauriCheckCache = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window || isTauri());
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

export interface TauriFileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  modified: number;
  is_supported: boolean;
}

const SUPPORTED_EXTS = ["pdf", "epub", "cbz", "cbr", "txt", "html", "htm", "xhtml", "docx"];

// Web Browser In-Memory File System Registry (for npm run dev / web mode)
const webFileRegistry = new Map<string, File>();
const webDirRegistry = new Map<string, TauriFileEntry[]>();

/**
 * Triggers native directory picker in the browser using HTML5 File System Access API
 * or fallback input element, populating webFileRegistry with real files.
 */
async function pickWebDirectory(): Promise<string | null> {
  // Option A: window.showDirectoryPicker() (Supported in modern Chromium / Chrome / Edge)
  if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      if (!dirHandle) return null;

      webFileRegistry.clear();
      webDirRegistry.clear();

      const rootPath = `/${dirHandle.name}`;
      await indexDirectoryHandle(dirHandle, rootPath);
      return rootPath;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        return null;
      }
      tauriLogger.warn("SHOW_DIRECTORY_PICKER_FALLBACK", { error: String(err) });
    }
  }

  // Option B: Invisible <input type="file" webkitdirectory /> fallback
  return new Promise<string | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.style.display = "none";

    input.onchange = () => {
      const files = input.files;
      if (!files || files.length === 0) {
        if (input.parentNode) input.parentNode.removeChild(input);
        resolve(null);
        return;
      }

      webFileRegistry.clear();
      webDirRegistry.clear();

      const rootPath = indexFileList(files);
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(rootPath || null);
    };

    input.oncancel = () => {
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(null);
    };

    document.body.appendChild(input);
    input.click();
  });
}

async function indexDirectoryHandle(handle: any, currentPath: string): Promise<void> {
  const entries: TauriFileEntry[] = [];

  for await (const [name, entry] of handle.entries()) {
    const itemPath = `${currentPath}/${name}`;
    if (entry.kind === "directory") {
      entries.push({
        name,
        path: itemPath,
        is_directory: true,
        size: 0,
        modified: Date.now(),
        is_supported: false,
      });
      await indexDirectoryHandle(entry, itemPath);
    } else if (entry.kind === "file") {
      const file: File = await entry.getFile();
      const ext = name.toLowerCase().slice(name.lastIndexOf(".") + 1);
      const isSupported = SUPPORTED_EXTS.includes(ext);
      webFileRegistry.set(itemPath, file);
      entries.push({
        name,
        path: itemPath,
        is_directory: false,
        size: file.size,
        modified: file.lastModified,
        is_supported: isSupported,
      });
    }
  }

  // Sort directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.is_directory !== b.is_directory) return a.is_directory ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  webDirRegistry.set(currentPath, entries);
}

function indexFileList(files: FileList): string {
  let rootDir = "";
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split("/");
    if (!rootDir) {
      rootDir = `/${parts[0]}`;
    }
    const fullPath = `/${relPath}`;
    webFileRegistry.set(fullPath, file);

    // Build directory tree
    let currentDir = `/${parts[0]}`;
    for (let p = 1; p < parts.length - 1; p++) {
      const parentDir = currentDir;
      const subDirName = parts[p];
      currentDir = `${parentDir}/${subDirName}`;

      let list = webDirRegistry.get(parentDir) || [];
      if (!list.some(e => e.name === subDirName && e.is_directory)) {
        list.push({
          name: subDirName,
          path: currentDir,
          is_directory: true,
          size: 0,
          modified: file.lastModified,
          is_supported: false,
        });
        list.sort((a, b) => (a.is_directory !== b.is_directory ? (a.is_directory ? -1 : 1) : a.name.localeCompare(b.name)));
        webDirRegistry.set(parentDir, list);
      }
    }

    const parentDir = parts.length > 1 ? fullPath.slice(0, fullPath.lastIndexOf("/")) : rootDir;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf(".") + 1);
    const isSupported = SUPPORTED_EXTS.includes(ext);

    let list = webDirRegistry.get(parentDir) || [];
    if (!list.some(e => e.name === file.name && !e.is_directory)) {
      list.push({
        name: file.name,
        path: fullPath,
        is_directory: false,
        size: file.size,
        modified: file.lastModified,
        is_supported: isSupported,
      });
      list.sort((a, b) => (a.is_directory !== b.is_directory ? (a.is_directory ? -1 : 1) : a.name.localeCompare(b.name)));
      webDirRegistry.set(parentDir, list);
    }
  }
  return rootDir;
}

/**
 * Open a directory picker dialog.
 * In Tauri: opens native desktop folder picker.
 * In Web Browser: opens HTML5 showDirectoryPicker or file explorer dialog.
 */
export async function openDirectoryDialog(title = 'Select a directory'): Promise<string | null> {
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    return await pickWebDirectory();
  }

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
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
    const entries = webDirRegistry.get(normalized) || [];
    return entries.map(f => ({ name: f.name, isDirectory: f.is_directory }));
  }

  return logTauriCall('fs.readDir', async () => {
    const { readDir } = await import('@tauri-apps/plugin-fs');
    return await readDir(path);
  }, { path });
}

/**
 * Fast atomic directory listing via native Tauri Rust command or Web File Registry.
 * Avoids N+1 IPC stat roundtrips.
 */
export async function listDirectory(path: string): Promise<TauriFileEntry[] | null> {
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
    return webDirRegistry.get(normalized) || [];
  }

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
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const normalized = path.replace(/\\/g, '/');
    const file = webFileRegistry.get(normalized);
    if (file) {
      return { size: file.size, mtime: file.lastModified };
    }
    return { size: 0, mtime: Date.now() };
  }

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
 * In Tauri: Uses raw binary IPC Response from Rust (transfers 50MB in <15ms).
 * In Web Browser: Reads directly from real File object ArrayBuffer.
 */
export async function readFileData(path: string): Promise<Uint8Array | null> {
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const normalized = path.replace(/\\/g, '/');
    const file = webFileRegistry.get(normalized);
    if (file) {
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    }
    tauriLogger.warn('WEB_FILE_NOT_FOUND', { path });
    return null;
  }

  return logTauriCall('cmd.read_file', async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      // Rust read_file returns tauri::ipc::Response which transfers binary ArrayBuffer directly
      const response = await invoke<ArrayBuffer | Uint8Array | number[]>('read_file', { path });
      if (response instanceof Uint8Array) {
        return response;
      }
      if (response instanceof ArrayBuffer) {
        return new Uint8Array(response);
      }
      if (Array.isArray(response)) {
        return new Uint8Array(response);
      }
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(path);
    } catch {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(path);
    }
  }, { path });
}
