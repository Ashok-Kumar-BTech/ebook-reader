import { useRef, useState, useEffect } from "react";
import appLogo from "../../assets/logo.png";
import {
  BookIcon,
  FileDirectoryFillIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
  HistoryIcon,
  SlidersIcon,
} from "@primer/octicons-react";
import type { RecentFolder } from "../../stores/uiStore";

export interface AppBarProps {
  isCompact: boolean;
  isMedium: boolean;
  recentFolders: RecentFolder[];
  currentRoot: string | null;
  onOpenDirectory: (selectedPath?: string) => void;
  onOpenFile?: () => void;
  onClearRecents: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleViewOptions: () => void;
  isViewOptionsOpen: boolean;
}

export function AppBar({
  isCompact,
  isMedium,
  recentFolders,
  currentRoot,
  onOpenDirectory,
  onOpenFile,
  onClearRecents,
  searchQuery,
  onSearchChange,
  onToggleViewOptions,
  isViewOptionsOpen,
}: AppBarProps) {
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recentDropdownRef = useRef<HTMLDivElement>(null);

  // Close recent folders dropdown when clicking outside
  useEffect(() => {
    if (!isRecentOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(e.target as Node)) {
        setIsRecentOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRecentOpen]);

  // Focus search input when expanded on compact
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  return (
    <header
      className="h-12 border-b flex items-center justify-between px-3 sm:px-4 z-20 flex-shrink-0 gap-2 sm:gap-4"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* If compact search is expanded, show full search bar row */}
      {isCompact && isSearchExpanded ? (
        <div className="flex-1 flex items-center gap-2 animate-in fade-in duration-100">
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-2.5 opacity-50 pointer-events-none flex items-center">
              <SearchIcon size={14} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search books in folder..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)" }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 opacity-60 hover:opacity-100 text-xs cursor-pointer"
                title="Clear search"
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsSearchExpanded(false);
              onSearchChange("");
            }}
            className="p-1.5 rounded-lg text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          {/* Left Zone: Brand & Open Folder */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <img
                src={appLogo}
                alt="Ebook Reader Logo"
                className="w-7 h-7 rounded-lg object-contain shadow-xs flex-shrink-0"
              />
              <h1 className="text-sm font-bold tracking-tight text-[var(--color-text)] hidden sm:inline">
                Ebook Reader
              </h1>
              {Boolean(import.meta.env?.DEV) && (
                <span
                  data-testid="dev-badge"
                  className="px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 select-none"
                  title="Running in Development Sandbox (Isolated Storage)"
                >
                  DEV
                </span>
              )}
            </div>

            {/* Open Folder & Recents */}
            <div className="relative flex items-center h-8" ref={recentDropdownRef}>
              <button
                onClick={() => onOpenDirectory()}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 h-8 text-xs font-semibold rounded-l-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-xs cursor-pointer select-none active:scale-95"
                title="Open Folder (Select directory containing ebooks)"
              >
                <FileDirectoryFillIcon size={14} />
                <span className={isCompact ? "hidden" : "inline"}>Open Folder</span>
              </button>
              <button
                onClick={() => setIsRecentOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isRecentOpen}
                aria-label="Recent Directories History"
                className={`flex items-center justify-center px-2 h-8 text-xs font-semibold rounded-r-lg border-l border-white/20 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-xs cursor-pointer select-none active:scale-95 ${
                  isRecentOpen ? "bg-[var(--color-primary-hover)] brightness-95" : ""
                }`}
                title={recentFolders.length > 0 ? "Recent Directories" : "No recent directories"}
              >
                <ChevronDownIcon
                  size={14}
                  className={`transition-transform duration-200 ${isRecentOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Recents Dropdown */}
              {isRecentOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-xl border shadow-2xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-2 border-b text-[11px] font-bold tracking-wider uppercase opacity-75"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <HistoryIcon size={14} />
                      Recent Directories
                    </span>
                    {recentFolders.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearRecents();
                        }}
                        className="text-[10px] lowercase text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
                      >
                        clear
                      </button>
                    )}
                  </div>

                  {onOpenFile && (
                    <button
                      onClick={() => {
                        setIsRecentOpen(false);
                        onOpenFile();
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer text-left"
                    >
                      <BookIcon size={14} />
                      <span>Open Book...</span>
                    </button>
                  )}

                  {recentFolders.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs opacity-60">
                      No recent folders
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
                      {recentFolders.slice(0, 5).map((folder, idx) => {
                        const isCurrent = folder.id === currentRoot;
                        return (
                          <button
                            key={folder.id}
                            onClick={() => {
                              setIsRecentOpen(false);
                              onOpenDirectory(folder.id);
                            }}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer group ${
                              isCurrent
                                ? "bg-[var(--color-primary)]/15 font-semibold text-[var(--color-primary)]"
                                : "hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0">
                              <FileDirectoryFillIcon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="truncate font-medium leading-tight">
                                {folder.name}
                              </div>
                              <div className="text-[10px] opacity-60 truncate font-mono mt-0.5">
                                {folder.id}
                              </div>
                            </div>
                            <span className="text-[10px] opacity-50 font-mono flex-shrink-0">
                              {idx === 0 ? "Latest" : `#${idx + 1}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center Zone: Search Bar (Desktop / Medium) */}
          {!isCompact && (
            <div className="flex-1 max-w-md flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-2.5 opacity-40 pointer-events-none flex items-center">
                  <SearchIcon size={13} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isMedium ? "Search..." : "Search books in folder... (Ctrl+F)"}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                  style={{ borderColor: "var(--color-border)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 opacity-50 hover:opacity-100 flex items-center text-xs cursor-pointer"
                    title="Clear search"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Right Zone: Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {isCompact && (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[var(--color-text-muted)]"
                style={{ borderColor: "var(--color-border)" }}
                aria-label="Search books"
              >
                <SearchIcon size={14} />
              </button>
            )}

            <button
              onClick={onToggleViewOptions}
              className={`flex items-center gap-1.5 px-2.5 h-8 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isViewOptionsOpen
                  ? "bg-[var(--color-primary)] text-white shadow-xs"
                  : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]"
              }`}
              style={{ borderColor: isViewOptionsOpen ? "var(--color-primary)" : "var(--color-border)" }}
              title="Display & View Options"
              aria-label="Display and View Options"
            >
              <SlidersIcon size={14} />
              <span className={isCompact ? "hidden" : "inline"}>Display</span>
            </button>
          </div>
        </>
      )}
    </header>
  );
}
