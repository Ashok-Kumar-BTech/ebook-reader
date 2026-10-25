import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: number;
  isSupported: boolean;
}

interface UiState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  currentRoot: string | null;
  expandedPaths: string[];
  sortBy: "name" | "date" | "size" | "type";
  sortOrder: "asc" | "desc";
  viewMode: "tree" | "list";
  appTheme: "light" | "dark" | "sepia";
  recentFolders: string[];
  recentFiles: string[];
}

type AppMode = "browse" | "reading";

interface BrowseViewProps {
  currentRoot: string | null;
  entries: FileEntry[];
  loading: boolean;
  error: string | null;
  onOpenDirectory: () => void;
  onEntryClick: (entry: FileEntry) => void;
  sortBy: UiState["sortBy"];
  sortOrder: UiState["sortOrder"];
  onSort: (field: UiState["sortBy"]) => void;
}

const BrowseView: React.FC<BrowseViewProps> = ({
  currentRoot,
  entries,
  loading,
  error,
  onOpenDirectory,
  onEntryClick,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const fileEntries = entries.filter((e) => !e.isDirectory);
  const dirEntries = entries.filter((e) => e.isDirectory);

  if (loading) {
    return (
      <div className="p-8 text-center text-[var(--color-text-muted)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!currentRoot) {
    return (
      <div className="max-w-md mx-auto text-center p-8">
        <svg className="w-24 h-24 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <h2 className="text-2xl font-semibold mb-2">Welcome to Ebook Reader</h2>
        <p className="text-[var(--color-text-muted)] mb-6">
          Open a directory to browse your books, or drag and drop files onto the window.
        </p>
        <button
          onClick={onOpenDirectory}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-lg"
        >
          Open Directory
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Directory Contents</h2>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSort(e.target.value as UiState["sortBy"])}
              className="px-2 py-1 text-sm border border-[var(--color-border)] rounded bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="size">Size</option>
              <option value="type">Type</option>
            </select>
            <button
              onClick={() => onSort(sortBy)}
              className="p-1 hover:bg-[var(--color-border)] rounded"
              title={sortOrder === "asc" ? "Descending" : "Ascending"}
            >
              {sortOrder === "asc" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {dirEntries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Folders</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {dirEntries.map((entry) => (
                <div
                  key={entry.path}
                  className="group p-4 border rounded-lg bg-[var(--color-surface)] transition-all hover:shadow-md cursor-pointer"
                  onClick={() => onEntryClick(entry)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="text-xs text-[var(--color-text-muted)]">Folder</span>
                  </div>
                  <h3 className="font-medium truncate mb-1">{entry.name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Modified: {new Date(entry.modified * 1000).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {fileEntries.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Files</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {fileEntries.map((entry) => (
                <div
                  key={entry.path}
                  className={`group p-4 border rounded-lg bg-[var(--color-surface)] transition-all hover:shadow-md cursor-pointer $
                    {!entry.isSupported ? "opacity-50" : ""}`}
                  onClick={() => onEntryClick(entry)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-[var(--color-text-muted)] capitalize">{entry.name.split(".").pop()}</span>
                  </div>
                  <h3 className="font-medium truncate mb-1">{entry.name}</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">{(entry.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {fileEntries.length === 0 && dirEntries.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p>This folder is empty</p>
            <p className="text-sm mt-1">Supported formats: PDF, EPUB, CBZ, TXT, HTML</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ReaderView: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-background)]">
      <div className="text-center p-8 max-w-md">
        <svg className="w-24 h-24 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <h2 className="text-2xl font-semibold mb-2">Reader View</h2>
        <p className="text-[var(--color-text-muted)]">
          Book reader implementation coming soon...
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          Supported formats: PDF, EPUB, CBZ, TXT, HTML
        </p>
      </div>
    </div>
  );
};

function App() {
  const [mode, setMode] = useState<AppMode>("browse");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentRoot, setCurrentRoot] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<UiState["sortBy"]>("name");
  const [sortOrder, setSortOrder] = useState<UiState["sortOrder"]>("asc");
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<FileEntry[]>("list_directory", { path });
      setEntries(result);
      setCurrentRoot(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDirectory = async () => {
    try {
      const path = await invoke<string>("pick_directory");
      if (path) {
        loadDirectory(path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pick directory");
    }
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.isDirectory) {
      const isExpanded = expandedPaths.includes(entry.path);
      if (isExpanded) {
        setExpandedPaths(expandedPaths.filter((p) => p !== entry.path));
      } else {
        setExpandedPaths([...expandedPaths, entry.path]);
        loadDirectory(entry.path);
      }
    } else if (entry.isSupported) {
      setMode("reading");
      setSidebarVisible(false);
    }
  };

  const handleSort = (field: UiState["sortBy"]) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
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

  const toggleSidebar = () => setSidebarVisible(!sidebarVisible);

  return (
    <div className="flex h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      {/* Sidebar */}
      {sidebarVisible && (
        <aside
          className="w-72 min-w-72 max-w-96 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col transition-width duration-200"
        >
          <div className="p-4 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">File Navigation</h2>
              <button
                onClick={handleOpenDirectory}
                className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
                title="Open Directory"
              >
                Open Directory
              </button>
            </div>
            {currentRoot && (
              <div className="text-sm text-[var(--color-text-muted)] truncate" title={currentRoot}>
                {currentRoot}
              </div>
            )}
          </div>

          {error && (
            <div className="m-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded dark:bg-red-900/20 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 text-center text-[var(--color-text-muted)]">Loading...</div>
            ) : currentRoot ? (
              <ul className="py-2" role="tree" aria-label="Directory contents">
                {sortedEntries.map((entry) => (
                  <li
                    key={entry.path}
                    className={`group relative py-1.5 px-3 hover:bg-[var(--color-border)] cursor-pointer transition-colors $
                      {!entry.isSupported && !entry.isDirectory ? "opacity-50" : ""}`}
                    onClick={() => handleEntryClick(entry)}
                    role="treeitem"
                    aria-expanded={entry.isDirectory ? expandedPaths.includes(entry.path) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {entry.isDirectory ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEntryClick(entry);
                          }}
                          className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                          aria-label={expandedPaths.includes(entry.path) ? "Collapse" : "Expand"}
                        >
                          {expandedPaths.includes(entry.path) ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                      <span className="flex-1 truncate text-sm font-medium">
                        {entry.name}
                      </span>
                      {!entry.isDirectory && (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {(entry.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </li>
                ))}
                {sortedEntries.length === 0 && (
                  <li className="py-8 text-center text-[var(--color-text-muted)]">
                    <p className="mb-2">This folder is empty</p>
                    <button
                      onClick={handleOpenDirectory}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      Open another directory
                    </button>
                  </li>
                )}
              </ul>
            ) : (
              <div className="p-8 text-center text-[var(--color-text-muted)]">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg font-medium mb-1">No folder opened</p>
                <p className="text-sm mb-4">Click "Open Directory" to start browsing</p>
                <button
                  onClick={handleOpenDirectory}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Open Directory
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-[var(--color-border)] rounded-lg transition-colors"
              aria-label={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">
              {mode === "browse" ? "Ebook Reader" : "Reading"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {mode === "reading" && (
              <button className="px-3 py-1.5 text-sm bg-[var(--color-primary)] text-white rounded hover:bg-[var(--color-primary-hover)] transition-colors">
                ⚙ Configure
              </button>
            )}
            <button
              onClick={() => setMode("browse")}
              className="p-2 hover:bg-[var(--color-border)] rounded-lg transition-colors"
              title="Back to Browse"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {mode === "browse" ? (
            <BrowseView
              currentRoot={currentRoot}
              entries={sortedEntries}
              loading={loading}
              error={error}
              onOpenDirectory={handleOpenDirectory}
              onEntryClick={handleEntryClick}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
            />
          ) : (
            <ReaderView />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
