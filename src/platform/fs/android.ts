import type { FileSystemProvider, DirRef, Entry } from './types';
import { formatRegistry } from '../../adapters/registry';
import { AppError, toAppError } from '../../errors/appError';
import { logManager } from '../../utils/logger';

const logger = logManager.getLogger('fs:android');

export class AndroidFsProvider implements FileSystemProvider {
  readonly kind = 'android' as const;
  readonly capabilities = {
    canGoAboveRoot: false, // Locked to the picked tree URI boundary
    revealInOS: false,
    persistentRecents: true,
  };

  /**
   * Helper to decode a friendly folder or file name from a SAF URI or document segment.
   * Handles URL encoding (e.g. primary%3ADocuments -> Documents).
   */
  private decodeDisplayName(uriString: string): string {
    try {
      const decoded = decodeURIComponent(uriString);
      // If it contains a colon (like primary:Documents or 1234-5678:Books)
      const afterColon = decoded.includes(':') ? decoded.split(':').pop() : decoded;
      const lastSegment = (afterColon || '').split('/').filter(Boolean).pop();
      return lastSegment || decoded;
    } catch {
      return uriString;
    }
  }

  async pickDirectory(title = 'Select Ebook Folder'): Promise<DirRef | null> {
    logger.info('ANDROID_PICK_DIRECTORY_START');
    try {
      // 1. Check for community or custom Tauri Android FS plugin
      const globalWindow = window as any;
      if (globalWindow.androidFs && typeof globalWindow.androidFs.pickDir === 'function') {
        const picked = await globalWindow.androidFs.pickDir({ persist: true, title });
        if (!picked || !picked.uri) return null;
        return {
          id: picked.uri,
          name: picked.name || this.decodeDisplayName(picked.uri),
          platform: 'android',
        };
      }

      // 2. Standard Tauri dialog plugin on Android
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title,
      });

      if (!selected || typeof selected !== 'string') {
        return null;
      }

      return {
        id: selected,
        name: this.decodeDisplayName(selected),
        platform: 'android',
      };
    } catch (err) {
      logger.error('ANDROID_PICK_DIRECTORY_FAILED', { error: String(err) });
      throw toAppError(err);
    }
  }

  async listChildren(dir: DirRef): Promise<Entry[]> {
    logger.info('ANDROID_LIST_CHILDREN_START', { dirId: dir.id });
    try {
      const globalWindow = window as any;
      if (globalWindow.androidFs && typeof globalWindow.androidFs.readDir === 'function') {
        const rawEntries: Array<{ uri: string; name: string; isDirectory: boolean; size?: number; modified?: number }> =
          await globalWindow.androidFs.readDir(dir.id);

        return rawEntries.map((e) => ({
          id: e.uri,
          parent: dir.id,
          name: e.name,
          isDirectory: e.isDirectory,
          size: e.size || 0,
          modifiedMs: e.modified || Date.now(),
          isSupported: !e.isDirectory && formatRegistry.isSupported(e.name),
        }));
      }

      // Fallback via Tauri core invocation if custom command is registered
      const { invoke } = await import('@tauri-apps/api/core');
      const rawEntries = await invoke<Array<{ name: string; path: string; is_directory: boolean; size: number; modified: number }>>(
        'list_directory',
        { path: dir.id }
      );

      return rawEntries.map((e) => ({
        id: e.path,
        parent: dir.id,
        name: e.name,
        isDirectory: e.is_directory,
        size: e.size,
        modifiedMs: e.modified < 1e11 ? e.modified * 1000 : e.modified,
        isSupported: !e.is_directory && formatRegistry.isSupported(e.name),
      }));
    } catch (err) {
      logger.error('ANDROID_LIST_CHILDREN_FAILED', { dirId: dir.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async readFile(entry: Pick<Entry, 'id' | 'name'>): Promise<Uint8Array> {
    logger.info('ANDROID_READ_FILE_START', { entryId: entry.id });
    try {
      const globalWindow = window as any;
      if (globalWindow.androidFs && typeof globalWindow.androidFs.readFile === 'function') {
        return await globalWindow.androidFs.readFile(entry.id);
      }

      // Try invoke binary Response or plugin-fs
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke<ArrayBuffer | Uint8Array | number[]>('read_file', { path: entry.id });
      if (response instanceof Uint8Array) return response;
      if (response instanceof ArrayBuffer) return new Uint8Array(response);
      if (Array.isArray(response)) return new Uint8Array(response);

      const { readFile } = await import('@tauri-apps/plugin-fs');
      return await readFile(entry.id);
    } catch (err) {
      logger.error('ANDROID_READ_FILE_FAILED', { entryId: entry.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async reopen(dir: DirRef): Promise<DirRef> {
    try {
      const globalWindow = window as any;
      if (globalWindow.androidFs && typeof globalWindow.androidFs.hasPermission === 'function') {
        const hasPerm = await globalWindow.androidFs.hasPermission(dir.id);
        if (!hasPerm) {
          throw new AppError('PERMISSION_DENIED', `Permission for folder ${dir.name} has expired or was revoked.`);
        }
      }
      return dir;
    } catch (err) {
      throw toAppError(err);
    }
  }
}
