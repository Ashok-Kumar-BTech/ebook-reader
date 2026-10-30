import type { AppErrorCode } from '../../errors/appError';

export type RefId = string; // desktop: absolute path; android: content:// URI; web: virtual path

export interface DirRef {
  id: RefId;
  name: string; // human-readable, pre-decoded (never derive it via string splitting in the UI)
  platform?: 'desktop' | 'android' | 'web';
}

export interface Entry {
  id: RefId; // opaque; pass back to the provider, never concatenate
  parent: RefId;
  name: string;
  isDirectory: boolean;
  size: number; // bytes, 0 for dirs
  modifiedMs: number; // ALWAYS epoch milliseconds
  isSupported: boolean;
  error?: AppErrorCode; // per-entry error, shown inline (FR-DIR-17)
}

export interface FileSystemCapabilities {
  canGoAboveRoot: boolean; // desktop: true; android: false (boundary = picked tree)
  revealInOS: boolean;
  persistentRecents: boolean;
}

export interface PickedFilesResult {
  dir: DirRef;
  files: Entry[];
  singleFilePath?: string;
}

export interface FileSystemProvider {
  readonly kind: 'desktop' | 'android' | 'web';
  readonly capabilities: FileSystemCapabilities;
  pickDirectory(title?: string): Promise<DirRef | null>;
  pickFiles?(title?: string): Promise<PickedFilesResult | null>;
  listChildren(dir: DirRef): Promise<Entry[]>; // immediate children only, lazy
  readFile(entry: Pick<Entry, 'id' | 'name'>): Promise<Uint8Array>;
  reopen(dir: DirRef): Promise<DirRef>;
  getParentDir?(dir: DirRef): Promise<DirRef | null>;
}
