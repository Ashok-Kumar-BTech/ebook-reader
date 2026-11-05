import {
  HomeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  FileDirectoryFillIcon,
} from "@primer/octicons-react";
import type { BreadcrumbSegment } from "../../utils/pathUtils";

export interface BreadcrumbsBarProps {
  breadcrumbs: BreadcrumbSegment[];
  onNavigate: (path: string) => void;
  onNavigateHome: () => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateUp: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  parentPath: string | null;
  itemCount: number;
  totalCount: number;
  isFiltered: boolean;
  loading: boolean;
  isCompact: boolean;
}

export function BreadcrumbsBar({
  breadcrumbs,
  onNavigate,
  onNavigateHome,
  onNavigateBack,
  onNavigateForward,
  onNavigateUp,
  canGoBack,
  canGoForward,
  canGoUp,
  parentPath,
  itemCount,
  totalCount,
  isFiltered,
  loading,
  isCompact,
}: BreadcrumbsBarProps) {
  return (
    <div
      className="px-3 sm:px-4 py-2 border-b flex items-center justify-between gap-2.5 flex-shrink-0"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Navigation Group */}
        <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg flex-shrink-0 border border-[var(--color-border)]">
          <button
            onClick={onNavigateHome}
            className="min-w-8 min-h-8 p-1.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-primary)] active:scale-95"
            title="Return to Launchpad"
            aria-label="Return to Launchpad"
          >
            <HomeIcon size={14} />
          </button>
          <button
            onClick={onNavigateBack}
            disabled={!canGoBack}
            className="min-w-8 min-h-8 p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer active:scale-95"
            title="Go Back (Alt + Left)"
            aria-label="Go Back"
          >
            <ArrowLeftIcon size={14} />
          </button>
          <button
            onClick={onNavigateForward}
            disabled={!canGoForward}
            className="min-w-8 min-h-8 p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer active:scale-95"
            title="Go Forward (Alt + Right)"
            aria-label="Go Forward"
          >
            <ArrowRightIcon size={14} />
          </button>
          <button
            onClick={onNavigateUp}
            disabled={!canGoUp}
            className="min-w-8 min-h-8 p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center cursor-pointer active:scale-95"
            title={parentPath ? `Up to parent (${parentPath})` : "Parent folder"}
            aria-label="Up to parent directory"
          >
            <ArrowUpIcon size={14} />
          </button>
        </div>

        {/* Scrollable Breadcrumbs Chips */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs py-1 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--color-border)] min-w-0 max-w-full sm:max-w-xl scrollbar-none">
          {breadcrumbs.map((segment, idx) => (
            <div key={segment.path} className="flex items-center gap-1 flex-shrink-0">
              {idx > 0 && <span className="text-[var(--color-text-muted)] opacity-40">/</span>}
              <button
                onClick={() => onNavigate(segment.path)}
                disabled={segment.isLast}
                className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                  segment.isLast
                    ? "font-semibold text-[var(--color-text)] cursor-default bg-black/5 dark:bg-white/10"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                }`}
                title={segment.path}
              >
                {idx === 0 && <FileDirectoryFillIcon size={12} className="text-[var(--color-primary)]" />}
                <span className="truncate max-w-32">{segment.name}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Item Count / Loading indicator */}
      {!isCompact && (
        <div className="flex items-center gap-2.5 flex-shrink-0 text-xs text-[var(--color-text-muted)] pl-2">
          <span>
            {isFiltered ? `${itemCount} of ${totalCount} items` : `${totalCount} items`}
          </span>
          {loading && <span className="text-[var(--color-primary)] font-medium animate-pulse">Loading...</span>}
        </div>
      )}
    </div>
  );
}
