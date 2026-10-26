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

// Browser fallback demo data for dev/preview testing outside Tauri
const DEMO_FILES: Record<string, TauriFileEntry[]> = {
  "/demo-library": [
    {
      name: "personal",
      path: "/demo-library/personal",
      is_directory: true,
      size: 0,
      modified: Date.now() - 3600000,
      is_supported: false,
    },
    {
      name: "Pride and Prejudice.txt",
      path: "/demo-library/Pride and Prejudice.txt",
      is_directory: false,
      size: 712000,
      modified: Date.now() - 86400000,
      is_supported: true,
    },
    {
      name: "Frankenstein.html",
      path: "/demo-library/Frankenstein.html",
      is_directory: false,
      size: 450000,
      modified: Date.now() - 172800000,
      is_supported: true,
    },
    {
      name: "Alice in Wonderland.txt",
      path: "/demo-library/Alice in Wonderland.txt",
      is_directory: false,
      size: 154000,
      modified: Date.now() - 259200000,
      is_supported: true,
    },
  ],
  "/demo-library/personal": [
    {
      name: "My Notes.txt",
      path: "/demo-library/personal/My Notes.txt",
      is_directory: false,
      size: 12400,
      modified: Date.now() - 1800000,
      is_supported: true,
    },
    {
      name: "Journal.html",
      path: "/demo-library/personal/Journal.html",
      is_directory: false,
      size: 24500,
      modified: Date.now() - 3600000,
      is_supported: true,
    },
  ],
};

const SAMPLE_TXT = `Pride and Prejudice
Jane Austen

Chapter 1

It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

Chapter 2

Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it.

It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:

"I hope Mr. Bingley will like it, Lizzy."

"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."

Chapter 3

Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley.

They attacked him in various ways—with barefaced questions, ingenious suppositions, and distant surmises; but he eluded the skill of them all, and they were at last obliged to accept the second-hand intelligence of their neighbour, Lady Lucas.
`;

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head><title>Frankenstein</title></head>
<body>
<h1>Frankenstein</h1>
<h2>by Mary Wollstonecraft Shelley</h2>
<h3>Letter 1</h3>
<p>To Mrs. Saville, England. St. Petersburgh, Dec. 11th, 17—.</p>
<p>You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.</p>
<h3>Letter 2</h3>
<p>Archangel, 28th March, 17—.</p>
<p>How slowly the time passes here, encompassed as I am by frost and snow!</p>
<h3>Chapter 1</h3>
<p>I am by birth a Genevese, and my family is one of the most distinguished of that republic.</p>
</body>
</html>`;

/**
 * Open a directory picker dialog.
 * Returns the selected path or null if cancelled/not available.
 */
export async function openDirectoryDialog(title = 'Select a directory'): Promise<string | null> {
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    return "/demo-library";
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
    const files = DEMO_FILES[normalized] || DEMO_FILES["/demo-library"] || [];
    return files.map(f => ({ name: f.name, isDirectory: f.is_directory }));
  }

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
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
    return DEMO_FILES[normalized] || DEMO_FILES["/demo-library"] || [];
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
    for (const group of Object.values(DEMO_FILES)) {
      const file = group.find(f => f.path === normalized);
      if (file) return { size: file.size, mtime: file.modified };
    }
    return { size: 1024, mtime: Date.now() };
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
 */
export async function readFileData(path: string): Promise<Uint8Array | null> {
  const inTauri = await checkIsTauri();
  if (!inTauri) {
    const encoder = new TextEncoder();
    if (path.endsWith('.html') || path.endsWith('.htm')) {
      return encoder.encode(SAMPLE_HTML);
    }
    return encoder.encode(SAMPLE_TXT);
  }

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
