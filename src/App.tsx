import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUiStore, type SortBy } from "./stores/uiStore";
import { useBookStore } from "./stores/bookStore";
import { FileTree, DirectoryPicker } from "./components/FileTree";
import { VirtualizedFileList } from "./components/VirtualizedFileList";
import { ReaderView } from "./components/ReaderView";
import { FormatBadge } from "./components/FormatBadge";
import { openDirectoryDialog, readDirectory, getFileStat, listDirectory } from "./utils/tauriApi";
import { useLogRender, useLogger } from "./utils/logger";
import { initWindowStateWatcher } from "./utils/windowState";
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
    sidebarVisible,
    setSidebarVisible,
    sidebarWidth,
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
    setSidebarWidth,
    setSort,
    setSortOrder,
    setViewMode,
    setTheme,
    addRecentFolder,
    addRecentFile,
    hydrate,
  } = useUiStore();

  const { setCurrentBookPath } = useBookStore();

  const [mode, setMode] = useState<AppMode>("browse");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
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

  // Add render logging (after state declarations)
  useLogRender('App', { 
    mode, 
    currentRoot, 
    sidebarVisible, 
    viewMode, 
    appTheme,
    entriesCount: entries.length 
  });

  // Hydrate store on mount
  useEffect(() => {
    logger.info('HYDRATE_START');
    hydrate().then(() => {
      // In browse mode, ensure sidebar is visible per PRD 5.4.1 rule 1
      setSidebarVisible(true);
    });
  }, [hydrate, logger, setSidebarVisible]);

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

      const dirEntries = await readDirectory(path);
      if (!dirEntries) {
        dirLogger.warn('LOAD_DIRECTORY_UNAVAILABLE', { path });
        setError("Directory reading not available in this environment");
        setEntries([]);
        setLoading(false);
        return;
      }
      
      dirLogger.debug('LOAD_DIRECTORY_READ', { path, entryCount: dirEntries.length });
      
      const fileEntries: FileEntry[] = [];

      for (const entry of dirEntries) {
        const fullPath = path + "/" + entry.name;
        const isDirectory = entry.isDirectory ?? false;
        const isSupported = !isDirectory && SUPPORTED_EXTENSIONS.has(
          entry.name.toLowerCase().slice(entry.name.lastIndexOf("."))
        );

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
    setSidebarVisible(false); // auto-hide sidebar when opening book per PRD 5.4.3
    setMode("reading");
  };

  const handleCloseBook = () => {
    setCurrentBookPath(null);
    setMode("browse");
    setSidebarVisible(true);
  };

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setResizing(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-background)' }}>
      <aside
        className="sidebar"
        style={{ 
          width: sidebarWidth, 
          minWidth: 200, 
          maxWidth: 600,
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          display: sidebarVisible ? 'flex' : 'none',
          flexDirection: 'column',
        }}
      >
        <div className="sidebar-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Library</h2>
        </div>
        <div className="sidebar-toolbar" style={{ padding: '12px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <DirectoryPicker onSelect={handleOpenDirectory} />
          <div className="theme-toggle">
            <button
              onClick={() => setTheme(appTheme === 'dark' ? 'light' : 'dark')}
              className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              {appTheme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        {/* Global Library Search Input */}
        <div className="sidebar-search" style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <div className="relative flex items-center">
            <svg className="w-4 h-4 absolute left-2.5 text-[var(--color-text-muted)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search library... (Ctrl+F)"
              value={librarySearchQuery}
              onChange={(e) => setLibrarySearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            {librarySearchQuery && (
              <button
                onClick={() => setLibrarySearchQuery("")}
                className="absolute right-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] p-0.5"
                title="Clear library search"
              >
                ✕
              </button>
            )}
          </div>
          {librarySearchQuery && (
            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] px-1">
              <span>{filteredEntries.length} {filteredEntries.length === 1 ? 'item' : 'items'} found</span>
              <button
                onClick={() => setLibrarySearchQuery("")}
                className="hover:underline text-[var(--color-primary)] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        <div className="sidebar-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="sort-controls" style={{ padding: '12px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                Sort by:
                <select
                  value={sortBy}
                  onChange={e => setSort(e.target.value as SortBy)}
                  className="px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                  <option value="type">Type</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                Order:
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as "asc" | "desc")}
                  className="px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="asc">↑</option>
                  <option value="desc">↓</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                View:
                <select
                  value={viewMode}
                  onChange={e => setViewMode(e.target.value as "tree" | "list")}
                  className="px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="tree">Tree</option>
                  <option value="list">List</option>
                </select>
              </label>
            </div>
          </div>

          {viewMode === "tree" ? (
            <FileTree
              rootPath={currentRoot ?? ""}
              onFileClick={handleFileClick}
              onDirectoryChange={handleDirectoryNavigate}
              searchQuery={librarySearchQuery}
            />
          ) : (
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
          )}
        </div>
      </aside>

      {sidebarVisible && (
        <div
          className="sidebar-resizer"
          onMouseDown={handleSidebarResize}
          style={{ cursor: resizing ? "ew-resize" : "col-resize" }}
          aria-label="Resize sidebar"
        />
      )}

      <main className="content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mode === "browse" ? (
          <> 
            {currentRoot ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="list-toolbar" style={{ padding: '8px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!sidebarVisible && (
                      <button
                        onClick={() => setSidebarVisible(true)}
                        className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
                        title="Show Sidebar (M)"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                    )}

                    {/* Navigation Buttons: Back, Forward, Up */}
                    <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg flex-shrink-0 border border-[var(--color-border)]">
                      <button
                        onClick={navigateBack}
                        disabled={!canGoBack}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
                        title="Go Back (Alt + Left)"
                        aria-label="Go Back"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={navigateForward}
                        disabled={!canGoForward}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
                        title="Go Forward (Alt + Right)"
                        aria-label="Go Forward"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleNavigateUp}
                        disabled={!canGoUp}
                        className="p-1.5 rounded transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
                        title={parentPath ? `Up to parent (${parentPath})` : "Parent folder"}
                        aria-label="Up to parent directory"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      </button>
                    </div>

                    {/* Breadcrumbs Trail */}
                    <div className="flex items-center gap-1 overflow-x-auto text-xs py-1 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-[var(--color-border)] max-w-xl scrollbar-none">
                      {breadcrumbSegments.map((segment, idx) => (
                        <div key={segment.path} className="flex items-center gap-1 flex-shrink-0">
                          {idx > 0 && <span className="text-[var(--color-text-muted)] opacity-40">/</span>}
                          <button
                            onClick={() => handleDirectoryNavigate(segment.path)}
                            disabled={segment.isLast}
                            className={`px-1.5 py-0.5 rounded transition-colors ${
                              segment.isLast
                                ? "font-semibold text-[var(--color-text)] cursor-default bg-black/5 dark:bg-white/10"
                                : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                            }`}
                            title={segment.path}
                          >
                            {idx === 0 && (
                              <svg className="w-3.5 h-3.5 inline mr-1 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            )}
                            {segment.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="entry-count" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {librarySearchQuery.trim()
                        ? `Showing ${filteredEntries.length} of ${entries.length} items`
                        : `${entries.length} items`}
                    </span>
                    {librarySearchQuery.trim() && (
                      <button
                        onClick={() => setLibrarySearchQuery("")}
                        className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                      >
                        Clear search
                      </button>
                    )}
                    {loading && <span className="loading" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>Loading...</span>}
                    {error && <span className="error" style={{ fontSize: '12px', color: 'var(--color-error)' }}>{error}</span>}
                  </div>
                </div>

                {/* Main Content Area: Book Library Grid */}
                <div className="flex-1 overflow-auto p-6">
                  {filteredEntries.length === 0 && !canGoUp ? (
                    <div className="flex flex-col items-center justify-center p-12 text-[var(--color-text-muted)]">
                      <p className="text-base font-medium">
                        {librarySearchQuery ? `No ebooks match "${librarySearchQuery}"` : "No books found in this folder"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Parent Directory item card */}
                      {canGoUp && !librarySearchQuery.trim() && (
                        <div
                          onClick={handleNavigateUp}
                          className="flex flex-col p-4 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)] hover:shadow-lg transition-all cursor-pointer group"
                          title={`Up to parent (${parentPath})`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                              </svg>
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
                          className="flex flex-col p-4 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] bg-[var(--color-surface)] hover:shadow-lg transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                              {entry.isDirectory ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477 4.5 1.253" />
                                </svg>
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
              </div>
            ) : (
              // Welcome screen when no directory opened
              <div className="text-center text-[var(--color-text-muted)]" style={{ padding: '48px 24px' }}>
                <svg className="w-24 h-24 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477 4.5 1.253" />
                </svg>
                <h2 className="text-2xl font-semibold mb-2">Welcome to Ebook Reader</h2>
                <p className="text-[var(--color-text-muted)] mb-6">Open a directory containing your ebooks to get started</p>
                <button
                  onClick={handleOpenDirectory}
                  className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Open Directory
                </button>
              </div>
            )}
          </>
        ) : (
          <ReaderView onClose={handleCloseBook} />
        )}
      </main>
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


