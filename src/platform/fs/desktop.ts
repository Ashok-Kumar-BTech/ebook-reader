import type { FileSystemProvider, DirRef, Entry } from './types';
import { formatRegistry } from '../../adapters/registry';
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

  async listChildren(dir: DirRef): Promise<Entry[]> {
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
