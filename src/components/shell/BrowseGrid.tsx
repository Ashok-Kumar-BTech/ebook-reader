import { useState, useRef } from "react";
import { BookIcon, FileDirectoryFillIcon, CheckCircleFillIcon, KebabHorizontalIcon } from "@primer/octicons-react";
import { FormatBadge } from "../FormatBadge";
import { EntryContextMenu } from "./EntryContextMenu";
import { useBookStore } from "../../stores/bookStore";

export interface BrowseGridEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  isSupported: boolean;
}

export interface BrowseGridProps {
  entries: BrowseGridEntry[];
  onFileClick: (path: string, name?: string) => void;
  onDirectoryClick: (path: string) => void;
  onRevealInOS?: (path: string) => void;
  searchQuery: string;
  isCompact?: boolean;
}

interface BrowseGridCardProps {
  entry: BrowseGridEntry;
  isCompleted: boolean;
  onFileClick: (path: string, name?: string) => void;
  onDirectoryClick: (path: string) => void;
  onOpenContextMenu: (x: number, y: number, entry: BrowseGridEntry) => void;
}

function BrowseGridCard({
  entry,
  isCompleted,
  onFileClick,
  onDirectoryClick,
  onOpenContextMenu,
}: BrowseGridCardProps) {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onOpenContextMenu(x, y, entry);
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
    } else if (entry.isSupported) {
      onFileClick(entry.path, entry.name);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenContextMenu(e.clientX, e.clientY, entry);
  };

  const handleKebabClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenContextMenu(rect.left, rect.bottom + 4, entry);
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`flex flex-col rounded-xl border p-3 transition-all select-none group min-h-[140px] relative ${
        entry.isSupported || entry.isDirectory
          ? "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm cursor-pointer active:scale-[0.98]"
          : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--color-border)] opacity-40 cursor-not-allowed"
      }`}
    >
      {/* Top row: Icon / Badge / Kebab */}
      <div className="flex items-center justify-between mb-2">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
            entry.isDirectory
              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : entry.isSupported
              ? isCompleted
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-black/5 dark:bg-white/5 text-[var(--color-text)]"
              : "text-[var(--color-text-muted)]"
          }`}
        >
          {entry.isDirectory ? (
            <FileDirectoryFillIcon size={18} />
          ) : isCompleted ? (
            <CheckCircleFillIcon size={18} />
          ) : (
            <BookIcon size={18} />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isCompleted && (
            <span
              className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full"
              title="Completed reading"
            >
              Completed
            </span>
          )}
          {!entry.isDirectory && entry.isSupported && <FormatBadge path={entry.name} />}
          
          {(entry.isSupported || entry.isDirectory) && (
            <button
              onClick={handleKebabClick}
              title="Options"
              aria-label="Options"
              className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-black/10 dark:hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <KebabHorizontalIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom info: Title & Subtitle */}
      <div className="flex-1 flex flex-col justify-end mt-1">
        <div
          className="text-xs font-semibold leading-tight line-clamp-2 text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors"
          title={entry.name}
        >
          {entry.name}
        </div>
        {!entry.isDirectory && entry.size > 0 && (
          <div className="text-[10px] text-[var(--color-text-muted)] mt-1 font-mono">
            {(entry.size / (1024 * 1024)).toFixed(1)} MB
          </div>
        )}
      </div>
    </div>
  );
}

export function BrowseGrid({
  entries,
  onFileClick,
  onDirectoryClick,
  onRevealInOS,
  searchQuery,
  isCompact,
}: BrowseGridProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: BrowseGridEntry } | null>(null);
  const bookStates = useBookStore((s) => s.bookStates);
  const toggleBookCompleted = useBookStore((s) => s.toggleBookCompleted);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-[var(--color-text-muted)] text-center h-full">
        <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
          <BookIcon size={24} className="opacity-40" />
        </div>
        <p className="text-sm sm:text-base font-medium mb-1">
          {searchQuery ? `No ebooks match "${searchQuery}"` : "No supported ebooks found in this folder"}
        </p>
        <p className="text-xs opacity-60 max-w-sm">
          {searchQuery
            ? "Try checking your spelling or searching for a different keyword."
            : "Select a folder that contains supported formats (PDF, EPUB, CBZ, TXT, HTML, DOCX)."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {entries.map((entry) => {
          const isCompleted = !entry.isDirectory && Boolean(bookStates[entry.path]?.isCompleted);
          return (
            <BrowseGridCard
              key={entry.path}
              entry={entry}
              isCompleted={isCompleted}
              onFileClick={onFileClick}
              onDirectoryClick={onDirectoryClick}
              onOpenContextMenu={(x, y, e) => setContextMenu({ x, y, entry: e })}
            />
          );
        })}
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
          isCompleted={Boolean(contextMenu.entry && bookStates[contextMenu.entry.path]?.isCompleted)}
          onToggleCompleted={() => toggleBookCompleted(contextMenu.entry.path)}
          isCompact={isCompact}
        />
      )}
    </div>
  );
}
