import { BookIcon, FileDirectoryFillIcon } from "@primer/octicons-react";
import { FormatBadge } from "../FormatBadge";

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
  searchQuery: string;
}

export function BrowseGrid({
  entries,
  onFileClick,
  onDirectoryClick,
  searchQuery,
}: BrowseGridProps) {
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
        {entries.map((entry) => (
          <div
            key={entry.path}
            onClick={() => {
              if (entry.isDirectory) {
                onDirectoryClick(entry.path);
              } else if (entry.isSupported) {
                onFileClick(entry.path, entry.name);
              }
            }}
            className={`flex flex-col rounded-xl border p-3 transition-all select-none group min-h-[140px] ${
              entry.isSupported || entry.isDirectory
                ? "bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-sm cursor-pointer active:scale-[0.98]"
                : "bg-black/[0.02] dark:bg-white/[0.02] border-[var(--color-border)] opacity-40 cursor-not-allowed"
            }`}
          >
            {/* Top row: Icon / Badge */}
            <div className="flex items-center justify-between mb-2">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                  entry.isDirectory
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : entry.isSupported
                    ? "bg-black/5 dark:bg-white/5 text-[var(--color-text)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {entry.isDirectory ? <FileDirectoryFillIcon size={18} /> : <BookIcon size={18} />}
              </div>
              {!entry.isDirectory && entry.isSupported && <FormatBadge path={entry.name} />}
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
        ))}
      </div>
    </div>
  );
}
