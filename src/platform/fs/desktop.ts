import type { FileSystemProvider, DirRef, Entry, PickedFilesResult } from './types';
import { formatRegistry } from '../../adapters/registry';
import { getAllSupportedExtensions } from '../../formats/registry';
import { AppError, toAppError } from '../../errors/appError';
import { logManager } from '../../utils/logger';
import { getParentPath } from '../../utils/pathUtils';
import { listDirectory, readFileData, getFileStat } from '../../utils/tauriApi';

const logger = logManager.getLogger('fs:desktop');

export class DesktopFsProvider implements FileSystemProvider {
  readonly kind = 'desktop' as const;
  readonly capabilities = {
    canGoAboveRoot: true,
    revealInOS: true,
    persistentRecents: true,
  };

  private virtualCollections = new Map<string, Entry[]>();

  async pickDirectory(title = 'Select Ebook Directory'): Promise<DirRef | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title,
      });

      if (!selected || typeof selected !== 'string') {
        return null;
      }

      const name = selected.split(/[/\\]/).filter(Boolean).pop() || selected;
      return {
        id: selected,
        name,
        platform: 'desktop',
      };
    } catch (err) {
      logger.error('PICK_DIRECTORY_FAILED', { error: String(err) });
      throw toAppError(err);
    }
  }

  async pickFiles(title = 'Select Ebook File(s)'): Promise<PickedFilesResult | null> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: false,
        multiple: true,
        title,
        filters: [
          {
            name: 'Ebooks',
            extensions: getAllSupportedExtensions(),
          },
        ],
      });

      if (!selected) return null;
      const fileList = Array.isArray(selected) ? selected : [selected];
      if (fileList.length === 0) return null;

      const entries: Entry[] = fileList.map((filePath) => {
        const name = filePath.split(/[/\\]/).filter(Boolean).pop() || filePath;
        return {
          id: filePath,
          parent: 'virtual:selected_books',
          name,
          isDirectory: false,
          size: 0,
          modifiedMs: Date.now(),
          isSupported: formatRegistry.isSupported(name),
        };
      });

      const dirId = `virtual:selected_books_${Date.now()}`;
      const dir: DirRef = {
        id: dirId,
        name: fileList.length === 1 ? entries[0].name : `Selected Books (${entries.length})`,
        platform: 'desktop',
      };

      this.virtualCollections.set(dirId, entries);

      return {
        dir,
        files: entries,
        singleFilePath: fileList.length === 1 ? fileList[0] : undefined,
      };
    } catch (err) {
      logger.error('PICK_FILES_FAILED', { error: String(err) });
      throw toAppError(err);
    }
  }

  async listChildren(dir: DirRef): Promise<Entry[]> {
    if (dir.id.startsWith('virtual:')) {
      return this.virtualCollections.get(dir.id) || [];
    }

    try {
      const fastEntries = await listDirectory(dir.id);
      return fastEntries.map((e) => {
        const modifiedMs = e.modified < 1e11 ? e.modified * 1000 : e.modified;
        return {
          id: e.path,
          parent: dir.id,
          name: e.name,
          isDirectory: e.is_directory,
          size: e.size,
          modifiedMs,
          isSupported: !e.is_directory && formatRegistry.isSupported(e.name),
        };
      });
    } catch (err) {
      logger.error('LIST_CHILDREN_FAILED', { dirId: dir.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async readFile(entry: Pick<Entry, 'id' | 'name'>): Promise<Uint8Array> {
    try {
      return await readFileData(entry.id);
    } catch (err) {
      logger.error('READ_FILE_FAILED', { entryId: entry.id, error: String(err) });
      throw toAppError(err);
    }
  }

  async reopen(dir: DirRef): Promise<DirRef> {
    try {
      const stat = await getFileStat(dir.id);
      if (!stat) {
        throw new AppError('FILE_NOT_FOUND', `Directory not found: ${dir.id}`);
      }
      return dir;
    } catch (err) {
      throw toAppError(err);
    }
  }

  async getParentDir(dir: DirRef): Promise<DirRef | null> {
    const parentPath = getParentPath(dir.id);
    if (!parentPath) return null;
    const name = parentPath.split(/[/\\]/).filter(Boolean).pop() || parentPath;
    return {
      id: parentPath,
      name,
      platform: 'desktop',
    };
  }
}
