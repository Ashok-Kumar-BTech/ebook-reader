import type { FileSystemProvider, DirRef, Entry, PickedFilesResult } from './types';
import { formatRegistry } from '../../adapters/registry';
import { AppError, toAppError } from '../../errors/appError';
import { logManager } from '../../utils/logger';
import {
  showOpenDirPicker,
  showOpenFilePicker,
  readDir as androidReadDir,
  readFile as androidReadFile,
  getName as androidGetName,
  getFileByteLength as androidGetFileByteLength,
  persistPickerUriPermission,
  checkPersistedPickerUriPermission,
  UriPermissionState,
  type FsUri,
  type FileMetadata,
} from 'tauri-plugin-android-fs-api';

const logger = logManager.getLogger('fs:android');

const VIRTUAL_COLLECTION_STORAGE_KEY_PREFIX = 'ebook_reader_virtual_collection_';

function toFsUri(uriString: string): FsUri {
  return {
    uri: uriString,
    documentTopTreeUri: null,
  };
}

export class AndroidFsProvider implements FileSystemProvider {
  readonly kind = 'android' as const;
  readonly capabilities = {
    canGoAboveRoot: false, // Locked to the picked tree URI boundary
    revealInOS: false,
    persistentRecents: true,
  };

  private virtualCollections = new Map<string, Entry[]>();

  constructor() {
    // Rehydrate any persisted virtual collections from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(VIRTUAL_COLLECTION_STORAGE_KEY_PREFIX)) {
            const collectionId = key.replace(VIRTUAL_COLLECTION_STORAGE_KEY_PREFIX, '');
            const raw = localStorage.getItem(key);
            if (raw) {
              const entries = JSON.parse(raw) as Entry[];
              this.virtualCollections.set(collectionId, entries);
            }
          }
        }
      }
    } catch (e) {
      logger.warn('ANDROID_REHYDRATE_VIRTUAL_COLLECTIONS_FAILED', { error: String(e) });
    }
  }

  /**
   * Helper to decode a friendly folder or file name from a SAF URI or document segment.
   * Handles URL encoding (e.g. primary%3ADocuments -> Documents).
   */
  private decodeDisplayName(uriString: string): string {
    try {
      const decoded = decodeURIComponent(uriString);
      const afterColon = decoded.includes(':') ? decoded.split(':').pop() : decoded;
      const lastSegment = (afterColon || '').split('/').filter(Boolean).pop();
      return lastSegment || decoded;
    } catch {
      return uriString;
    }
  }

  /**
   * Resolves the real display name of a file or directory using ContentResolver metadata,
   * falling back to URL segment decoding.
   */
  private async getFriendlyName(fsUri: FsUri | string): Promise<string> {
    const uriStr = typeof fsUri === 'string' ? fsUri : fsUri.uri;
    try {
      const name = await androidGetName(typeof fsUri === 'string' ? toFsUri(fsUri) : fsUri);
      if (name && name.trim()) {
        return name.trim();
      }
    } catch {
      // Fall back to decoded segment
    }
    return this.decodeDisplayName(uriStr);
  }

  /**
   * Native file picking flow on Android using tauri-plugin-android-fs (ACTION_OPEN_DOCUMENT).
   * Retrieves real file names, actual byte sizes, and persists ContentResolver permissions.
   */
  async pickFiles(title = 'Select Ebook File(s)'): Promise<PickedFilesResult | null> {
    logger.info('ANDROID_PICK_FILES_START', { title });
    try {
      const fsUris = await showOpenFilePicker({
        multiple: true,
        mimeTypes: [
          'application/pdf',
          'application/epub+zip',
          'application/x-cbz',
          'application/vnd.comicbook+zip',
          'text/plain',
          '*/*',
        ],
      });

      if (!fsUris || fsUris.length === 0) {
        logger.debug('ANDROID_PICK_FILES_CANCELLED');
        return null;
      }

      const entries: Entry[] = [];
      const dirId = `collection:selected_${Date.now()}`;

      for (const fsUri of fsUris) {
        try {
          await persistPickerUriPermission(fsUri);
        } catch (permErr) {
          logger.warn('ANDROID_PERSIST_PERMISSION_FAILED', { uri: fsUri.uri, error: String(permErr) });
        }

        const name = await this.getFriendlyName(fsUri);
        let size = 0;
        try {
          size = await androidGetFileByteLength(fsUri);
        } catch {
          size = 0;
        }

        entries.push({
          id: fsUri.uri,
          parent: dirId,
          name,
          isDirectory: false,
          size,
          modifiedMs: Date.now(),
          isSupported: formatRegistry.isSupported(name),
        });
      }

      const dirName = entries.length === 1 ? entries[0].name : `Selected Ebooks (${entries.length})`;
      const dir: DirRef = {
        id: dirId,
        name: dirName,
        platform: 'android',
      };

      // Store in memory and persistent storage
      this.virtualCollections.set(dirId, entries);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(
            `${VIRTUAL_COLLECTION_STORAGE_KEY_PREFIX}${dirId}`,
            JSON.stringify(entries)
          );
        }
      } catch (e) {
        logger.warn('ANDROID_PERSIST_VIRTUAL_COLLECTION_STORAGE_FAILED', { error: String(e) });
      }

      logger.info('ANDROID_PICK_FILES_SUCCESS', { count: entries.length, dirId });
      return {
        dir,
        files: entries,
        singleFilePath: entries.length === 1 ? entries[0].id : undefined,
      };
    } catch (err) {
      logger.error('ANDROID_PICK_FILES_FAILED', { error: String(err) });
      throw toAppError(err);
    }
  }

  /**
   * Native directory picking flow on Android using SAF ACTION_OPEN_DOCUMENT_TREE.
   * Lets users select folders (like Documents, SEM 8, Books, SD Card) and persist permissions.
   */
  async pickDirectory(title = 'Select Ebook Folder'): Promise<DirRef | null> {
    logger.info('ANDROID_PICK_DIRECTORY_START', { title });
    try {
      const dirUri = await showOpenDirPicker();
      if (!dirUri) {
        logger.debug('ANDROID_PICK_DIRECTORY_CANCELLED');
        return null;
      }

      try {
        await persistPickerUriPermission(dirUri);
      } catch (permErr) {
        logger.warn('ANDROID_PERSIST_DIR_PERMISSION_FAILED', { dirUri: dirUri.uri, error: String(permErr) });
      }

      const dirName = await this.getFriendlyName(dirUri);
      logger.info('ANDROID_PICK_DIRECTORY_SUCCESS', { dirUri: dirUri.uri, dirName });

      return {
        id: dirUri.uri,
        name: dirName,
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
      // 1. Virtual collection check (e.g. collection:selected_... or virtual:...)
      if (dir.id.startsWith('collection:') || dir.id.startsWith('virtual:')) {
        let entries = this.virtualCollections.get(dir.id);
        if (!entries) {
          try {
            const raw = localStorage.getItem(`${VIRTUAL_COLLECTION_STORAGE_KEY_PREFIX}${dir.id}`);
            if (raw) {
              entries = JSON.parse(raw) as Entry[];
              this.virtualCollections.set(dir.id, entries);
            }
          } catch {}
        }
        return entries || [];
      }

      // 2. Native SAF Directory Traversal via tauri-plugin-android-fs
      if (dir.id.startsWith('content://')) {
        const rawEntries = await androidReadDir(toFsUri(dir.id));
        return rawEntries.map((e) => {
          const isDir = e.type === 'Dir';
          const fileMeta = !isDir ? (e as FileMetadata) : undefined;
          const size = fileMeta?.byteLength || 0;
          const modifiedMs = e.lastModified ? new Date(e.lastModified).getTime() : Date.now();

          return {
            id: e.uri.uri,
            parent: dir.id,
            name: e.name,
            isDirectory: isDir,
            size,
            modifiedMs,
            isSupported: !isDir && formatRegistry.isSupported(e.name),
          };
        });
      }

      // 3. Fallback for custom or POSIX paths if custom command is registered
      const { invoke } = await import('@tauri-apps/api/core');
      const rawEntries = await invoke<
        Array<{ name: string; path: string; is_directory: boolean; size: number; modified: number }>
      >('list_directory', { path: dir.id });

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
      if (entry.id.startsWith('content://')) {
        return await androidReadFile(toFsUri(entry.id));
      }

      // Try invoke binary Response or plugin-fs for POSIX paths
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke<ArrayBuffer | Uint8Array | number[]>('read_file', {
        path: entry.id,
      });
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
      if (dir.id.startsWith('collection:') || dir.id.startsWith('virtual:')) {
        return dir;
      }

      if (dir.id.startsWith('content://')) {
        const hasPerm = await checkPersistedPickerUriPermission(
          toFsUri(dir.id),
          UriPermissionState.Read
        );
        if (!hasPerm) {
          throw new AppError(
            'PERMISSION_DENIED',
            `Permission for folder "${dir.name}" has expired or was revoked.`
          );
        }
      }
      return dir;
    } catch (err) {
      throw toAppError(err);
    }
  }
}
