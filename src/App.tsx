import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BookIcon,
  FileDirectoryFillIcon,
  SearchIcon,
  XIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  SunIcon,
  MoonIcon,
  ColumnsIcon,
  RowsIcon,
  ChevronDownIcon,
  HistoryIcon,
  HomeIcon,
} from "@primer/octicons-react";
import { useUiStore, type SortBy } from "./stores/uiStore";
import { useBookStore } from "./stores/bookStore";
import { VirtualizedFileList } from "./components/VirtualizedFileList";
import { ReaderView } from "./components/ReaderView";
import { FormatBadge } from "./components/FormatBadge";
import { openDirectoryDialog, readDirectory, getFileStat, listDirectory } from "./utils/tauriApi";
import { useLogRender, useLogger } from "./utils/logger";
import { initWindowStateWatcher, toggleFullscreen } from "./utils/windowState";
import { getParentPath, getBreadcrumbSegments } from "./utils/pathUtils";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  isSupported: boolean;
}

type AppMode = "browse" | "reading";

export default function App() {
  const logger = useLogger('App');

  const {
    currentRoot,
    dirHistory,
    dirHistoryIndex,
    navigateToDir,
    navigateBack,
    navigateForward,
    sortBy,
    sortOrder,
    viewMode,
    appTheme,
    recentFolders,
    clearRecents,
    setSort,
    setSortOrder,
    setViewMode,
    setTheme,
    addRecentFolder,
    addRecentFile,
    setCurrentRoot,
    hydrate: hydrateUiStore,
  } = useUiStore();

  const { setCurrentBookPath, hydrate: hydrateBookStore } = useBookStore();

  const [mode, setMode] = useState<AppMode>("browse");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [isRecentOpen, setIsRecentOpen] = useState(false);
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

  // Directory navigation state
  const parentPath = useMemo(() => (currentRoot ? getParentPath(currentRoot) : null), [currentRoot]);
  const breadcrumbSegments = useMemo(() => (currentRoot ? getBreadcrumbSegments(currentRoot) : []), [currentRoot]);
  const canGoBack = dirHistoryIndex > 0;
  const canGoForward = dirHistoryIndex < dirHistory.length - 1;
  const canGoUp = parentPath !== null;

  const handleDirectoryNavigate = useCallback((path: string) => {
    logger.info('NAVIGATE_TO_DIRECTORY', { path });
    navigateToDir(path);
  }, [logger, navigateToDir]);

  const handleNavigateUp = useCallback(() => {
    if (parentPath) {
      logger.info('NAVIGATE_UP_TO_PARENT', { parentPath });
      navigateToDir(parentPath);
    }
  }, [parentPath, logger, navigateToDir]);

  // Filter entries based on library search query
  const filteredEntries = useMemo(() => {
    if (!librarySearchQuery.trim()) return entries;
    const q = librarySearchQuery.toLowerCase().trim();
    return entries.filter(e => {
      const nameMatch = e.name.toLowerCase().includes(q);
      const extMatch = e.name.toLowerCase().slice(e.name.lastIndexOf(".")).includes(q);
      return nameMatch || extMatch;
    });
  }, [entries, librarySearchQuery]);

  // Global keyboard shortcuts in browse mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === "browse") {
        if (e.key === "F11") {
          e.preventDefault();
          toggleFullscreen();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        } else if (e.altKey && e.key === "ArrowLeft") {
          if (canGoBack) {
            e.preventDefault();
            navigateBack();
          }
        } else if (e.altKey && e.key === "ArrowRight") {
          if (canGoForward) {
            e.preventDefault();
            navigateForward();
          }
        } else if (e.altKey && e.key === "ArrowUp") {
          if (canGoUp) {
            e.preventDefault();
            handleNavigateUp();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, canGoBack, canGoForward, canGoUp, navigateBack, navigateForward, handleNavigateUp]);

  // Render logging
  useLogRender('App', { 
    mode, 
    currentRoot, 
    viewMode, 
    appTheme,
    entriesCount: entries.length 
  });

  // Hydrate stores on mount
  useEffect(() => {
    logger.info('HYDRATE_START');
    hydrateUiStore();
    hydrateBookStore();
  }, [hydrateUiStore, hydrateBookStore, logger]);

  // Initialize window state persistence
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initWindowStateWatcher().then((fn) => {
      cleanup = fn;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Sync appTheme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  // Load directory entries when root changes
  const loadDirectory = useCallback(async (path: string) => {
    const dirLogger = logger.child({ operation: 'loadDirectory', path });
    dirLogger.info('LOAD_DIRECTORY_START', { path });
    
    setLoading(true);
    setError(null);
    try {
      const fastEntries = await listDirectory(path);
      if (fastEntries) {
        dirLogger.debug('LOAD_DIRECTORY_FAST_IPC', { path, entryCount: fastEntries.length });
        const fileEntries: FileEntry[] = fastEntries.map((e) => ({
          name: e.name,
          path: e.path,
          isDirectory: e.is_directory,
          size: e.size,
          modified: e.modified * 1000,
          isSupported: e.is_supported,
        }));
        const sorted = sortEntries(fileEntries, sortBy, sortOrder);
        setEntries(sorted);
        dirLogger.info('LOAD_DIRECTORY_SUCCESS', { path, count: sorted.length });
        return;
      }

      // Fallback: slow entry-by-entry scan
      dirLogger.debug('LOAD_DIRECTORY_FALLBACK_SCAN', { path });
      const rawEntries = (await readDirectory(path)) ?? [];
      const fileEntries: FileEntry[] = [];

      for (const entry of rawEntries) {
        const fullPath = `${path}/${entry.name}`;
        const isDirectory = entry.isDirectory ?? false;
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf("."));
        const isSupported = !isDirectory && SUPPORTED_EXTENSIONS.has(ext);

        let size = 0;
        let modified = 0;

        if (!isDirectory) {
          try {
            const fileStat = await getFileStat(fullPath);
            size = fileStat?.size ?? 0;
            const mtime = fileStat?.mtime;
            modified = mtime instanceof Date ? mtime.getTime() : (mtime ?? 0);
          } catch {
            // Ignore stat errors
          }
        }

        fileEntries.push({
          name: entry.name,
          path: fullPath,
          isDirectory,
          size,
          modified,
          isSupported,
        });
      }

      // Apply sorting
      const sorted = sortEntries(fileEntries, sortBy, sortOrder);
      setEntries(sorted);
      dirLogger.info('LOAD_DIRECTORY_SUCCESS', { path, count: sorted.length });
    } catch (err) {
      dirLogger.error('LOAD_DIRECTORY_ERROR', { path }, err as Error);
      setError(err instanceof Error ? err.message : "Failed to load directory");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [logger, sortBy, sortOrder, setEntries, setLoading, setError]);

  useEffect(() => {
    if (currentRoot) {
      loadDirectory(currentRoot);
    } else {
      setEntries([]);
    }
  }, [currentRoot, loadDirectory]);

  const handleOpenDirectory = async (selectedPath?: string | unknown) => {
    logger.info('OPEN_DIRECTORY_DIALOG');
    const path = typeof selectedPath === 'string' && selectedPath
      ? selectedPath
      : await openDirectoryDialog("Select a directory containing your ebooks");
    if (path) {
      logger.info('DIRECTORY_SELECTED', { path });
      navigateToDir(path);
      addRecentFolder(path);
      setMode("browse");
    } else {
      logger.debug('DIRECTORY_DIALOG_CANCELLED');
    }
  };

  const handleFileClick = async (path: string) => {
    logger.info('FILE_CLICKED', { path });
    const ext = path.toLowerCase().slice(path.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      logger.warn('FILE_NOT_SUPPORTED', { path, ext });
      return;
    }

    setCurrentBookPath(path);
    addRecentFile(path);
    setMode("reading");
  };

  const handleCloseBook = () => {
    setMode("browse");
    setTimeout(() => setCurrentBookPath(null), 50);
  };

  return (
    <div className="app">
      {mode === "browse" ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Slim Minimalist Navigation Bar */}
          <header
            className="h-12 border-b flex items-center justify-between px-4 z-20 flex-shrink-0 gap-4"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            {/* Left: App Logo / Brand & Open Folder */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <BookIcon size={16} />
                </div>
                <h1 className="text-sm font-bold tracking-tight text-[var(--color-text)] hidden sm:inline">
                  Ebook Reader
                </h1>
              </div>

              <div className="relative flex items-center h-8" ref={recentDropdownRef}>
                <button
                  onClick={() => handleOpenDirectory()}
                  className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-l-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-sm cursor-pointer select-none active:brightness-95"
                  title="Open Folder (Select directory containing ebooks)"
                >
                  <FileDirectoryFillIcon size={14} />
                  <span>Open Folder</span>
                </button>
                <button
                  onClick={() => setIsRecentOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isRecentOpen}
                  aria-label="Recent Directories History"
                  className={`flex items-center justify-center px-2 h-8 text-xs font-semibold rounded-r-lg border-l border-white/20 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all shadow-sm cursor-pointer select-none ${
                    isRecentOpen ? "bg-[var(--color-primary-hover)] brightness-95" : ""
                  }`}
                  title={recentFolders.length > 0 ? "Recent Directories" : "No recent directories"}
                >
                  <ChevronDownIcon
                    size={14}
                    className={`transition-transform duration-200 ${isRecentOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isRecentOpen && (
                  <div
                    className="absolute left-0 top-full mt-1.5 w-80 rounded-xl border shadow-2xl z-50 p-1.5 flex flex-col gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b text-[11px] font-bold tracking-wider uppercase opacity-75" style={{ borderColor: 'var(--color-border)' }}>
                      <span className="flex items-center gap-1.5">
                        <HistoryIcon size={14} />
                        Recent Directories
                      </span>
                      {recentFolders.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearRecents();
                          }}
                          className="text-[10px] lowercase text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
                        >
                          clear
                        </button>
                      )}
                    </div>

                    {recentFolders.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs opacity-60">
                        No recent folders
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto flex flex-col gap-0.5">
                        {recentFolders.slice(0, 5).map((folderPath, idx) => {
                          const name = folderPath.split(/[/\\]/).filter(Boolean).pop() || folderPath;
                          const isCurrent = folderPath === currentRoot;
                          return (
                            <button
                              key={folderPath}
                              onClick={() => {
                                setIsRecentOpen(false);
                                handleOpenDirectory(folderPath);
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
                                  {name}
                                </div>
                                <div className="text-[10px] opacity-60 truncate font-mono mt-0.5">
                                  {folderPath}
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

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-md flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <div className="absolute left-2.5 opacity-40 pointer-events-none flex items-center">
                  <SearchIcon size={13} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search books in folder... (Ctrl+F)"
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                  style={{ borderColor: 'var(--color-border)' }}
                />
                {librarySearchQuery && (
                  <button
                    onClick={() => setLibrarySearchQuery("")}
                    className="absolute right-2.5 opacity-50 hover:opacity-100 flex items-center text-xs"
                    title="Clear search"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Sort, View Toggle & Theme Toggle in Top Right Corner */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Sort By Dropdown */}
              <div className="hidden md:flex items-center gap-1 text-xs">
                <select
                  value={sortBy}
                  onChange={(e) => setSort(e.target.value as SortBy)}
                  className="px-2 py-1 text-xs border rounded-lg bg-[var(--color-background)] text-[var(--color-text)] cursor-pointer focus:outline-none"
                  style={{ borderColor: 'var(--color-border)' }}
                  title="Sort by"
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1 px-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs font-semibold cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                  title={sortOrder === 'asc' ? "Ascending (click for descending)" : "Descending (click for ascending)"}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* View Mode Toggle: Grid vs List */}
              <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    viewMode !== "list"
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]"
                  }`}
                  title="Grid View"
                >
                  <ColumnsIcon size={13} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 transition-colors border-l cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[var(--color-primary)] text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]"
                  }`}
                  style={{ borderColor: 'var(--color-border)' }}
                  title="List View"
                >
                  <RowsIcon size={13} />
                </button>
              </div>

              {/* Theme Toggle (Top Right Corner) */}
              <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => setTheme("light")}
                  className={`p-1.5 transition-colors cursor-pointer ${
                    appTheme === "light"
                      ? "bg-amber-100 text-amber-900"
                      : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                  }`}
                  title="Light Theme"
                >
                  <SunIcon size={14} />
                </button>
                <button
                  onClick={() => setTheme("sepia")}
                  className={`p-1.5 transition-colors border-l cursor-pointer ${
                    appTheme === "sepia"
                      ? "bg-[#ecd5b3] text-[#5f4b32]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                  }`}
                  style={{ borderColor: 'var(--color-border)' }}
                  title="Sepia Theme"
                >
                  <span className="text-xs leading-none">📜</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-1.5 transition-colors border-l cursor-pointer ${
                    appTheme === "dark"
                      ? "bg-gray-800 text-white"
                      : "hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100"
                  }`}
                  style={{ borderColor: 'var(--color-border)' }}
                  title="Dark Theme"
                >
                  <MoonIcon size={14} />
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {currentRoot ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Sub-directory & Breadcrumbs Navigation Toolbar */}
                <div
                  className="px-4 py-2 border-b flex items-center justify-between gap-3 flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Navigation Buttons: Home, Back, Forward, Up */}
                    <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg flex-shrink-0 border border-[var(--color-border)]">
                      <button
                        onClick={() => setCurrentRoot(null)}
                        className="p-1.5 rounded transition-colors hover:bg-black/10 dark:hover:bg-white/10 flex items-center cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                        title="Close Folder / Return to Main Launchpad"
                        aria-label="Return to Main Launchpad"
                      >
                        <HomeIcon size={14} />
                      </button>
                      <button
                        onClick={navigateBack}
                        disabled={!canGoBack}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center cursor-pointer"
                        title="Go Back (Alt + Left)"
                        aria-label="Go Back"
                      >
                        <ArrowLeftIcon size={14} />
                      </button>
                      <button
                        onClick={navigateForward}
                        disabled={!canGoForward}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center cursor-pointer"
                        title="Go Forward (Alt + Right)"
                        aria-label="Go Forward"
                      >
                        <ArrowRightIcon size={14} />
                      </button>
                      <button
                        onClick={handleNavigateUp}
                        disabled={!canGoUp}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10 flex items-center cursor-pointer"
                        title={parentPath ? `Up to parent (${parentPath})` : "Parent folder"}
                        aria-label="Up to parent directory"
                      >
                        <ArrowUpIcon size={14} />
                      </button>
                    </div>

                    {/* Breadcrumbs Trail */}
                    <div className="flex items-center gap-1 overflow-x-auto text-xs py-1 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--color-border)] max-w-2xl scrollbar-none">
                      {breadcrumbSegments.map((segment, idx) => (
                        <div key={segment.path} className="flex items-center gap-1 flex-shrink-0">
                          {idx > 0 && <span className="text-[var(--color-text-muted)] opacity-40">/</span>}
                          <button
                            onClick={() => handleDirectoryNavigate(segment.path)}
                            disabled={segment.isLast}
                            className={`px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 ${
                              segment.isLast
                                ? "font-semibold text-[var(--color-text)] cursor-default bg-black/5 dark:bg-white/10"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                            }`}
                            title={segment.path}
                          >
                            {idx === 0 && <FileDirectoryFillIcon size={12} className="text-[var(--color-primary)]" />}
                            <span>{segment.name}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right count info */}
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-[var(--color-text-muted)]">
                    <span>
                      {librarySearchQuery.trim()
                        ? `${filteredEntries.length} of ${entries.length} items`
                        : `${entries.length} items`}
                    </span>
                    {loading && <span className="text-[var(--color-primary)] animate-pulse">Loading...</span>}
                    {error && <span className="text-[var(--color-error)]">{error}</span>}
                  </div>
                </div>

                {/* View Container: Grid or List */}
                {viewMode === "list" ? (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <VirtualizedFileList
                      entries={filteredEntries}
                      onFileClick={handleFileClick}
                      onDirectoryClick={handleDirectoryNavigate}
                      parentPath={parentPath}
                      onParentClick={handleNavigateUp}
                      loading={loading}
                      error={error}
                      emptyMessage={librarySearchQuery ? `No ebooks match "${librarySearchQuery}"` : "No files found"}
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto p-6">
                    {filteredEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-[var(--color-text-muted)] text-center">
                        <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                          <BookIcon size={24} className="opacity-40" />
                        </div>
                        <p className="text-base font-medium mb-1">
                          {librarySearchQuery ? `No ebooks match "${librarySearchQuery}"` : "No supported ebooks found in this folder"}
                        </p>
                        <p className="text-xs mb-4 opacity-75 max-w-sm">
                          Select a folder containing your EPUB, PDF, CBZ, TXT, HTML, or DOCX books.
                        </p>
                        <button
                          onClick={() => handleOpenDirectory()}
                          className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <FileDirectoryFillIcon size={14} />
                          <span>Open Folder</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {/* Parent Directory item card */}
                        {canGoUp && !librarySearchQuery.trim() && (
                          <div
                            onClick={handleNavigateUp}
                            className="flex flex-col p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] hover:shadow-md transition-all cursor-pointer group"
                            title={`Up to parent (${parentPath})`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                                <ArrowUpIcon size={18} />
                              </div>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[var(--color-text-muted)]">
                                ..
                              </span>
                            </div>
                            <span className="font-semibold text-sm text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors mb-1">
                              .. (Parent Directory)
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)] truncate">
                              {parentPath}
                            </span>
                          </div>
                        )}

                        {filteredEntries.map((entry) => (
                          <div
                            key={entry.path}
                            onClick={() => {
                              if (entry.isDirectory) {
                                handleDirectoryNavigate(entry.path);
                              } else {
                                handleFileClick(entry.path);
                              }
                            }}
                            className="flex flex-col p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)] hover:shadow-md transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                                {entry.isDirectory ? (
                                  <FileDirectoryFillIcon size={20} />
                                ) : (
                                  <BookIcon size={20} />
                                )}
                              </div>
                              {!entry.isDirectory && <FormatBadge path={entry.path} />}
                            </div>
                            <span className="font-semibold text-sm text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors mb-1">
                              {entry.name}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)] truncate">
                              {entry.isDirectory ? "Folder" : entry.path}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Welcome screen when no directory is opened (Main Page Launchpad)
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-muted)] overflow-y-auto">
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-5 shadow-sm">
                  <BookIcon size={42} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--color-text)]">Welcome to Ebook Reader</h2>
                <p className="text-sm max-w-md mb-6 text-[var(--color-text-muted)]">
                  Select a directory containing your ebooks to begin reading. All reading positions, themes, and bookmarks are preserved offline.
                </p>

                {/* Main Page Open Folder Action */}
                <div className="flex items-center justify-center mb-8">
                  <button
                    onClick={() => handleOpenDirectory()}
                    className="px-6 py-3 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-primary-hover)] transition-all flex items-center gap-2.5 shadow-md hover:shadow-xl hover:-translate-y-0.5 cursor-pointer active:translate-y-0 select-none"
                    title="Select a directory containing ebooks"
                  >
                    <FileDirectoryFillIcon size={18} />
                    <span>Open Folder</span>
                  </button>
                </div>

                {/* Recent Directories Section on Main Page Window */}
                {recentFolders.length > 0 ? (
                  <div className="w-full max-w-2xl text-left bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3 px-1 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                          <HistoryIcon size={14} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text)]">
                          Recent Directories
                        </span>
                      </div>
                      <button
                        onClick={clearRecents}
                        className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
                      >
                        Clear History
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {recentFolders.slice(0, 5).map((folderPath, idx) => {
                        const name = folderPath.split(/[/\\]/).filter(Boolean).pop() || folderPath;
                        const isLatest = idx === 0;
                        return (
                          <div
                            key={folderPath}
                            onClick={() => handleOpenDirectory(folderPath)}
                            className="flex items-center gap-3.5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] hover:border-[var(--color-primary)] hover:shadow-md transition-all cursor-pointer group select-none"
                            title={folderPath}
                          >
                            <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                              <FileDirectoryFillIcon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                                  {name}
                                </span>
                                {isLatest && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                    Latest
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--color-text-muted)] truncate font-mono mt-0.5 opacity-75">
                                {folderPath}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 text-[var(--color-text-muted)] opacity-40 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
                              <ArrowRightIcon size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-md p-4 rounded-xl border border-dashed border-[var(--color-border)] bg-black/5 dark:bg-white/5 text-xs text-[var(--color-text-muted)] text-center">
                    No recent folders opened yet. Click <strong>Open Folder</strong> above to choose an ebook directory.
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      ) : (
        <ReaderView onClose={handleCloseBook} />
      )}
    </div>
  );
}

// Helper functions
const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".epub",
  ".cbz",
  ".cbr",
  ".txt",
  ".html",
  ".htm",
  ".xhtml",
  ".docx",
]);

function sortEntries(entries: FileEntry[], sortBy: string, sortOrder: string): FileEntry[] {
  return [...entries].sort((a, b) => {
    // Directories first
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "date":
        comparison = a.modified - b.modified;
        break;
      case "size":
        comparison = a.size - b.size;
        break;
      case "type":
        comparison = a.name.split(".").pop()?.localeCompare(b.name.split(".").pop() || "") || 0;
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
}
