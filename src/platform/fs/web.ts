import type { FileSystemProvider, DirRef, Entry } from './types';
import { formatRegistry } from '../../adapters/registry';
import { AppError, toAppError } from '../../errors/appError';
import { logManager } from '../../utils/logger';

const logger = logManager.getLogger('fs:web');

export class WebFsProvider implements FileSystemProvider {
  readonly kind = 'web' as const;
  readonly capabilities = {
    canGoAboveRoot: false,
    revealInOS: false,
    persistentRecents: false,
  };

  private dirHandles = new Map<string, FileSystemDirectoryHandle>();
  private fileHandles = new Map<string, FileSystemFileHandle>();

  async pickDirectory(_title = 'Select Ebook Directory'): Promise<DirRef | null> {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
      throw new AppError('MISSING_COMPONENT', 'File System Access API is not supported in this browser.');
    }

    try {
      const handle = await (window as any).showDirectoryPicker();
      if (!handle) return null;

      const dirId = `/${handle.name}`;
      this.dirHandles.set(dirId, handle);

      return {
        id: dirId,
        name: handle.name,
        platform: 'web',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return null;
      }
      logger.error('WEB_PICK_DIRECTORY_FAILED', { error: String(err) });
      throw toAppError(err);
    }
  }

  async listChildren(dir: DirRef): Promise<Entry[]> {
    const handle = this.dirHandles.get(dir.id);
    if (!handle) {
      throw new AppError('FILE_NOT_FOUND', `Directory handle expired or not found for: ${dir.id}`);
    }

    try {
      const entries: Entry[] = [];
      for await (const [name, entryHandle] of (handle as any).entries()) {
        const isDir = entryHandle.kind === 'directory';
        const entryId = `${dir.id}/${name}`;

        if (isDir) {
          this.dirHandles.set(entryId, entryHandle);
          entries.push({
            id: entryId,
            parent: dir.id,
            name,
            isDirectory: true,
            size: 0,
            modifiedMs: Date.now(),
            isSupported: false,
          });
        } else {
          this.fileHandles.set(entryId, entryHandle);
          let size = 0;
          let modifiedMs = Date.now();
          try {
            const file = await (entryHandle as FileSystemFileHandle).getFile();
            size = file.size;
            modifiedMs = file.lastModified;
          } catch {
            // Ignore stat errors for single files
          }

          entries.push({
            id: entryId,
            parent: dir.id,
            name,
            isDirectory: false,
            size,
            modifiedMs,
            isSupported: formatRegistry.isSupported(name),
          });
        }
      }

      // Sort directories first, then alphabetical
      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });

      return entries;
    } catch (err) {
      logger.error('WEB_LIST_CHILDREN_FAILED', { dirId: dir.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async readFile(entry: Pick<Entry, 'id' | 'name'>): Promise<Uint8Array> {
    const fileHandle = this.fileHandles.get(entry.id);
    if (!fileHandle) {
      throw new AppError('FILE_NOT_FOUND', `File handle not found for: ${entry.name}`);
    }

    try {
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (err) {
      logger.error('WEB_READ_FILE_FAILED', { entryId: entry.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async reopen(dir: DirRef): Promise<DirRef> {
    if (this.dirHandles.has(dir.id)) {
      return dir;
    }
    throw new AppError('FILE_NOT_FOUND', 'Web session handle expired. Please choose the folder again.');
  }
}
