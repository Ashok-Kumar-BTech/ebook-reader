import { useState, useEffect, useCallback } from "react";
import { useUiStore, type SortBy } from "./stores/uiStore";
import { useBookStore } from "./stores/bookStore";
import { FileTree, DirectoryPicker } from "./components/FileTree";
import { VirtualizedFileList } from "./components/VirtualizedFileList";
import { ReaderView } from "./components/ReaderView";
import { openDirectoryDialog, readDirectory, getFileStat, listDirectory } from "./utils/tauriApi";
import { useLogRender, useLogger } from "./utils/logger";

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
    sortBy,
    sortOrder,
    viewMode,
    appTheme,
    setSidebarWidth,
    setCurrentRoot,
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
    hydrate();
  }, [hydrate, logger]);

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

  const handleOpenDirectory = async () => {
    logger.info('OPEN_DIRECTORY_DIALOG');
    const selected = await openDirectoryDialog("Select a directory containing your ebooks");
    if (selected) {
      const path = selected as string;
      logger.info('DIRECTORY_SELECTED', { path });
      setCurrentRoot(path);
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
              onDirectoryChange={setCurrentRoot}
            />
          ) : (
            <VirtualizedFileList
              entries={entries}
              onFileClick={handleFileClick}
              onDirectoryClick={setCurrentRoot}
              loading={loading}
              error={error}
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

      <main className="content" style={{ flex: 1 }}>
        {mode === "browse" ? (
          <> 
            {currentRoot ? (
              viewMode === "list" && (
                <div className="list-toolbar" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="entry-count" style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{entries.length} items</span>
                  {loading && <span className="loading" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>Loading...</span>}
                  {error && <span className="error" style={{ fontSize: '12px', color: 'var(--color-error)' }}>{error}</span>}
                </div>
              )
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


