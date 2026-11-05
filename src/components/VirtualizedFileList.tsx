import { useMemo, useState, useRef } from "react";
import { List } from "react-window";
import { FileDirectoryFillIcon, BookIcon, ArrowUpIcon, CheckCircleFillIcon, KebabHorizontalIcon } from "@primer/octicons-react";
import { FormatBadge } from "./FormatBadge";
import { EntryContextMenu } from "./shell/EntryContextMenu";
import { useBookStore } from "../stores/bookStore";

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
  onFileClick: (path: string, name?: string) => void;
  onDirectoryClick: (path: string) => void;
  onRevealInOS?: (path: string) => void;
  parentPath?: string | null;
  onParentClick?: () => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  isCompact?: boolean;
}

const ITEM_HEIGHT = 44;

interface RowProps {
  entries: FileEntry[];
  onFileClick: (path: string, name?: string) => void;
  onDirectoryClick: (path: string) => void;
  onItemContextMenu: (e: React.MouseEvent, entry: FileEntry) => void;
}

function FileListItem({
  index,
  style,
  entries,
  onFileClick,
  onDirectoryClick,
  onItemContextMenu,
}: {
  index: number;
  style: React.CSSProperties;
} & RowProps) {
  const entry = entries[index];
  if (!entry) return null;

  const isCompleted = !entry.isDirectory && Boolean(useBookStore.getState().bookStates[entry.path]?.isCompleted);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onItemContextMenu(
        { clientX: x, clientY: y, preventDefault: () => {}, stopPropagation: () => {} } as any,
        entry
      );
    }, 500);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = () => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    if (entry.isDirectory) {
      onDirectoryClick(entry.path);
    } else {
      onFileClick(entry.path, entry.name);
    }
  };

  const badge = entry.isSupported ? (
    <FormatBadge path={entry.path} />
  ) : null;

  return (
    <div
      style={style}
      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-hover)] transition-colors cursor-pointer select-none group"
      onClick={handleClick}
      onContextMenu={(e) => onItemContextMenu(e, entry)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${isCompleted ? "text-emerald-500" : "text-[var(--color-primary)]"}`}>
        {entry.isDirectory ? (
          <FileDirectoryFillIcon size={18} />
        ) : isCompleted ? (
          <CheckCircleFillIcon size={18} />
        ) : (
          <BookIcon size={18} className="text-[var(--color-text-muted)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate font-medium text-[var(--color-text)]">{entry.name}</span>
          {isCompleted && (
            <span
              className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full"
              title="Completed reading"
            >
              Completed
            </span>
          )}
          {badge}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] truncate">
          {entry.isDirectory
            ? "Folder"
            : `${formatFileSize(entry.size)} • ${formatDate(entry.modified)}`}
        </div>
      </div>
      {(entry.isSupported || entry.isDirectory) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onItemContextMenu(
              { clientX: rect.left, clientY: rect.bottom + 4, preventDefault: () => {}, stopPropagation: () => {} } as any,
              entry
            );
          }}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/10 dark:hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity"
          title="Options"
          aria-label="Options"
        >
          <KebabHorizontalIcon size={14} />
        </button>
      )}
    </div>
  );
}

export function VirtualizedFileList({
  entries,
  onFileClick,
  onDirectoryClick,
  onRevealInOS,
  parentPath,
  onParentClick,
  loading = false,
  error = null,
  emptyMessage,
  isCompact,
}: VirtualizedFileListProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry } | null>(null);

  const handleItemContextMenu = (e: React.MouseEvent, entry: FileEntry) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry });
  };

  const itemData = useMemo(
    () => ({ entries, onFileClick, onDirectoryClick, onItemContextMenu: handleItemContextMenu }),
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
          <FileDirectoryFillIcon size={48} className="mx-auto mb-4 opacity-30" />
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
            <ArrowUpIcon size={18} />
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

      {contextMenu && (
        <EntryContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          entry={contextMenu.entry}
          onClose={() => setContextMenu(null)}
          onOpen={() => {
            if (contextMenu.entry.isDirectory) {
              onDirectoryClick(contextMenu.entry.path);
            } else if (contextMenu.entry.isSupported) {
              onFileClick(contextMenu.entry.path, contextMenu.entry.name);
            }
          }}
          onRevealInOS={onRevealInOS ? () => onRevealInOS(contextMenu.entry.path) : undefined}
          isCompleted={Boolean(contextMenu.entry && useBookStore.getState().isBookCompleted(contextMenu.entry.path))}
          onToggleCompleted={() => useBookStore.getState().toggleBookCompleted(contextMenu.entry.path)}
          isCompact={isCompact}
        />
      )}
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
