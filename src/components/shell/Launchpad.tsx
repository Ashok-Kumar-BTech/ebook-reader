import { BookIcon, FileDirectoryFillIcon, HistoryIcon, ArrowRightIcon } from "@primer/octicons-react";
import type { RecentFolder } from "../../stores/uiStore";

export interface LaunchpadProps {
  recentFolders: RecentFolder[];
  onOpenDirectory: (selectedPath?: RecentFolder | string) => void;
  onOpenFile?: () => void;
  onClearRecents: () => void;
  isCompact?: boolean;
}

function getFolderSubtitle(folder: RecentFolder): string {
  if (folder.id.startsWith('collection:') || folder.id.startsWith('virtual:')) {
    return 'Custom ebook collection';
  }
  if (folder.id.startsWith('content://')) {
    return `Android Storage • ${folder.name}`;
  }
  return folder.id;
}

export function Launchpad({
  recentFolders,
  onOpenDirectory,
  onOpenFile,
  onClearRecents,
  isCompact,
}: LaunchpadProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-y-auto">
      {/* Hero Welcome Card */}
      <div className="max-w-md w-full mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto mb-4 shadow-sm">
          <BookIcon size={32} />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text)] mb-2">
          Your Local Ebook Library
        </h2>
        <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mb-5 leading-relaxed">
          Open a folder or an ebook file on your device to read PDF, EPUB, CBZ, and TXT books with complete privacy and zero telemetry.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-md mx-auto">
          {isCompact ? (
            <>
              {onOpenFile && (
                <button
                  onClick={onOpenFile}
                  className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-95 cursor-pointer w-full"
                >
                  <BookIcon size={16} />
                  <span>Open Ebook</span>
                </button>
              )}
              <button
                onClick={() => onOpenDirectory()}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-xs active:scale-95 cursor-pointer w-full"
              >
                <FileDirectoryFillIcon size={16} />
                <span>Open Folder</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onOpenDirectory()}
                className="flex-1 min-w-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-primary)] text-white text-xs sm:text-sm font-semibold hover:bg-[var(--color-primary-hover)] transition-all shadow-md active:scale-95 cursor-pointer w-full"
              >
                <FileDirectoryFillIcon size={16} />
                <span className="truncate">Open Ebook Folder</span>
              </button>
              {onOpenFile && (
                <button
                  onClick={onOpenFile}
                  className="flex-1 min-w-0 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all shadow-xs active:scale-95 cursor-pointer w-full"
                >
                  <BookIcon size={16} />
                  <span className="truncate">Open Ebook</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recent Directories List */}
      <div className="w-full max-w-xl text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-5 shadow-xs">
        <div
          className="flex items-center justify-between mb-3 px-1 border-b pb-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <HistoryIcon size={14} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
              Recent Directories
            </span>
          </div>
          {recentFolders.length > 0 && (
            <button
              onClick={onClearRecents}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
            >
              Clear History
            </button>
          )}
        </div>

        {recentFolders.length > 0 ? (
          <div className="flex flex-col gap-2">
            {recentFolders.slice(0, 5).map((folder, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={folder.id}
                  onClick={() => onOpenDirectory(folder)}
                  className="flex items-center gap-3.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)] hover:shadow-sm transition-all cursor-pointer group select-none active:scale-[0.99]"
                  title={folder.name}
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <FileDirectoryFillIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {folder.name}
                      </span>
                      {isLatest && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                          Latest
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--color-text-muted)] truncate font-mono mt-0.5 opacity-75">
                      {getFolderSubtitle(folder)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-[var(--color-text-muted)] opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                    <ArrowRightIcon size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-black/5 dark:bg-white/5 text-xs text-[var(--color-text-muted)] text-center">
            No recent folders opened yet. Click <strong>Open Ebook Folder</strong> above to choose a directory.
          </div>
        )}
      </div>
    </div>
  );
}
