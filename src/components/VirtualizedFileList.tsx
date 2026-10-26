import { useMemo } from "react";
import { List } from "react-window";
import { FormatBadge } from "./FormatBadge";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  isSupported: boolean;
}

interface VirtualizedFileListProps {
  entries: FileEntry[];
  onFileClick: (path: string) => void;
  onDirectoryClick: (path: string) => void;
  parentPath?: string | null;
  onParentClick?: () => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

const ITEM_HEIGHT = 44;

interface RowProps {
  entries: FileEntry[];
  onFileClick: (path: string) => void;
  onDirectoryClick: (path: string) => void;
}

function FileListItem({
  index,
  style,
  entries,
  onFileClick,
  onDirectoryClick,
}: {
  index: number;
  style: React.CSSProperties;
} & RowProps) {
  const entry = entries[index];
  if (!entry) return null;

  const badge = entry.isSupported ? (
    <FormatBadge path={entry.path} />
  ) : null;

  return (
    <div
      style={style}
      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
      onClick={() => {
        if (entry.isDirectory) {
          onDirectoryClick(entry.path);
        } else {
          onFileClick(entry.path);
        }
      }}
    >
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
        {entry.isDirectory ? (
          <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate font-medium text-[var(--color-text)]">{entry.name}</span>
          {badge}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] truncate">
          {entry.isDirectory
            ? "Folder"
            : `${formatFileSize(entry.size)} • ${formatDate(entry.modified)}`}
        </div>
      </div>
    </div>
  );
}

export function VirtualizedFileList({
  entries,
  onFileClick,
  onDirectoryClick,
  parentPath,
  onParentClick,
  loading = false,
  error = null,
  emptyMessage,
}: VirtualizedFileListProps) {
  const itemData = useMemo(
    () => ({ entries, onFileClick, onDirectoryClick }),
    [entries, onFileClick, onDirectoryClick]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--color-text-muted)]">
          <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500 p-4">{error}</div>
      </div>
    );
  }

  if (entries.length === 0 && !parentPath) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-[var(--color-text-muted)] p-8">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-1">{emptyMessage || "No files found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-t border-[var(--color-border)]" style={{ height: '100%' }}>
      {parentPath && onParentClick && (
        <div
          onClick={onParentClick}
          className="flex items-center gap-3 px-3 py-2 border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer bg-[var(--color-surface)]/40 flex-shrink-0"
          title={`Go up to ${parentPath}`}
        >
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-[var(--color-primary)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[var(--color-text)]">.. (Up to parent)</span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] truncate">{parentPath}</div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden" style={{ height: '100%' }}>
        <List<RowProps>
          rowCount={entries.length}
          rowHeight={ITEM_HEIGHT}
          rowComponent={FileListItem}
          rowProps={itemData}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(timestamp: number): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
