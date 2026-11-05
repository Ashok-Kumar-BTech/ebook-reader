import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { UploadIcon } from "@primer/octicons-react";
import { useUiStore, type SortBy, type ViewMode, type AppTheme, type RecentFolder } from "./stores/uiStore";
import { useBookStore } from "./stores/bookStore";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { VirtualizedFileList } from "./components/VirtualizedFileList";
import { ReaderView } from "./components/ReaderView";
import { ErrorHost } from "./components/ErrorHost";
import { LogViewer } from "./components/LogViewer";
import { AppBar } from "./components/shell/AppBar";
import { BreadcrumbsBar } from "./components/shell/BreadcrumbsBar";
import { ViewOptionsSheet } from "./components/shell/ViewOptionsSheet";
import { Launchpad } from "./components/shell/Launchpad";
import { BrowseGrid } from "./components/shell/BrowseGrid";
import { getFileSystemProvider, type DirRef } from "./platform/fs";
import { formatRegistry } from "./adapters/registry";
import { useLogRender, useLogger } from "./utils/logger";
import { initWindowStateWatcher, toggleFullscreen } from "./utils/windowState";
import { initPlatformBackNavigation, registerBackHandler } from "./utils/backNavigation";
import { getParentPath, getBreadcrumbSegments } from "./utils/pathUtils";
import { AppError, toAppError } from "./errors/appError";

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
  const logger = useLogger("App");
  const { isCompact, isMedium } = useBreakpoint();

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
  const [error, setError] = useState<AppError | null>(null);
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [canRevealInOS, setCanRevealInOS] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close Log Viewer on Back gesture / Escape
  useEffect(() => {
    if (!isLogViewerOpen) return;
    const unregister = registerBackHandler(() => {
      setIsLogViewerOpen(false);
      return true;
    }, 20); // Priority 20: closes before reader modals or directory navigation
    return unregister;
  }, [isLogViewerOpen]);

  // Global keyboard shortcut: Ctrl+Shift+L to toggle In-App Log Console
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "L" || e.key === "l" || e.code === "KeyL")) {
        e.preventDefault();
        setIsLogViewerOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const triggerExitToast = useCallback(() => {
    setShowExitToast(true);
    if (exitToastTimerRef.current) {
      clearTimeout(exitToastTimerRef.current);
    }
    exitToastTimerRef.current = setTimeout(() => {
      setShowExitToast(false);
      exitToastTimerRef.current = null;
    }, 2000);
  }, []);

  // Initialize native platform back gesture & button listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    initPlatformBackNavigation({
      onExitPrompt: triggerExitToast,
      enableTouchFallback: isCompact,
    }).then((cleanup) => {
      unlisten = cleanup;
    });

    return () => {
      if (unlisten) unlisten();
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [triggerExitToast, isCompact]);

  useEffect(() => {
    let isMounted = true;
    getFileSystemProvider().then((provider) => {
      if (isMounted) {
        setCanRevealInOS(Boolean(provider.capabilities.revealInOS && provider.revealInOS));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRevealInOS = useCallback(async (path: string) => {
    try {
      const provider = await getFileSystemProvider();
      if (provider.revealInOS) {
        await provider.revealInOS(path);
      }
    } catch (err) {
      const appErr = toAppError(err);
      setError(appErr);
    }
  }, []);

  // Check CLI startup path (associated file double-click or CLI argument)
  useEffect(() => {
    const checkCliPath = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const cliPath = await invoke<string | null>("get_cli_open_path");
        if (cliPath) {
          logger.info("CLI_OPEN_PATH_DETECTED", { path: cliPath });
          if (formatRegistry.isSupported(cliPath)) {
            const name = cliPath.split(/[/\\]/).filter(Boolean).pop() || cliPath;
            setCurrentBookPath(cliPath, name);
            addRecentFile(cliPath);
            setMode("reading");
          } else {
            navigateToDir(cliPath);
            addRecentFolder({ id: cliPath, name: cliPath.split(/[/\\]/).filter(Boolean).pop() || cliPath, platform: "desktop" });
            setMode("browse");
          }
        }
      } catch {
        // Non-Tauri environment or command unavailable
      }
    };
    checkCliPath();
  }, [logger, setCurrentBookPath, addRecentFile, navigateToDir, addRecentFolder]);

  // Window drag-and-drop listener (Tauri native webview events)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    const setupDragDrop = async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDraggingFile(true);
          } else if (event.payload.type === "leave") {
            setIsDraggingFile(false);
          } else if (event.payload.type === "drop") {
            setIsDraggingFile(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const dropped = paths[0];
              if (formatRegistry.isSupported(dropped)) {
                const name = dropped.split(/[/\\]/).filter(Boolean).pop() || dropped;
                setCurrentBookPath(dropped, name);
                addRecentFile(dropped);
                setMode("reading");
              } else {
                navigateToDir(dropped);
                addRecentFolder({ id: dropped, name: dropped.split(/[/\\]/).filter(Boolean).pop() || dropped, platform: "desktop" });
                setMode("browse");
              }
            }
          }
        });
      } catch {
        // Fallback to browser HTML5 drag & drop
      }
    };
    setupDragDrop();
    return () => {
      if (unlisten) unlisten();
    };
  }, [setCurrentBookPath, addRecentFile, navigateToDir, addRecentFolder]);

  const handleHtmlDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = (file as any).path || file.name;
      if (formatRegistry.isSupported(filePath)) {
        setCurrentBookPath(filePath, file.name);
        addRecentFile(filePath);
        setMode("reading");
      } else if ((file as any).path) {
        navigateToDir((file as any).path);
        addRecentFolder({ id: (file as any).path, name: file.name, platform: "desktop" });
        setMode("browse");
      }
    }
  }, [setCurrentBookPath, addRecentFile, navigateToDir, addRecentFolder]);

  // Directory navigation calculations
  const parentPath = useMemo(() => (currentRoot ? getParentPath(currentRoot) : null), [currentRoot]);
  const breadcrumbSegments = useMemo(() => (currentRoot ? getBreadcrumbSegments(currentRoot) : []), [currentRoot]);
  const canGoBack = dirHistoryIndex > 0;
  const canGoForward = dirHistoryIndex < dirHistory.length - 1;
  const canGoUp = parentPath !== null;

  const handleDirectoryNavigate = useCallback((path: string) => {
    logger.info("NAVIGATE_TO_DIRECTORY", { path });
    navigateToDir(path);
  }, [logger, navigateToDir]);

  const handleNavigateUp = useCallback(() => {
    if (parentPath) {
      logger.info("NAVIGATE_UP_TO_PARENT", { parentPath });
      navigateToDir(parentPath);
    }
  }, [parentPath, logger, navigateToDir]);

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!librarySearchQuery.trim()) return entries;
    const q = librarySearchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      const nameMatch = e.name.toLowerCase().includes(q);
      const extMatch = e.name.toLowerCase().slice(e.name.lastIndexOf(".")).includes(q);
      return nameMatch || extMatch;
    });
  }, [entries, librarySearchQuery]);

  // Android System Back Gesture Handler in Browse Mode
  useEffect(() => {
    if (mode !== "browse") return;

    const unregister = registerBackHandler(() => {
      if (isViewOptionsOpen) {
        setIsViewOptionsOpen(false);
        return true;
      }
      if (librarySearchQuery) {
        setLibrarySearchQuery("");
        return true;
      }
      if (canGoBack) {
        navigateBack();
        return true;
      }
      if (canGoUp) {
        handleNavigateUp();
        return true;
      }
      if (currentRoot) {
        setCurrentRoot(null);
        return true;
      }
      return false; // Exit app / root reached
    }, 0);

    (window as any).__handleAndroidBack = () => {
      if (isViewOptionsOpen) {
        setIsViewOptionsOpen(false);
        return true;
      }
      if (librarySearchQuery) {
        setLibrarySearchQuery("");
        return true;
      }
      if (canGoBack) {
        navigateBack();
        return true;
      }
      if (canGoUp) {
        handleNavigateUp();
        return true;
      }
      if (currentRoot) {
        setCurrentRoot(null);
        return true;
      }
      return false; // Exit app
    };

    return () => {
      unregister();
      delete (window as any).__handleAndroidBack;
    };
  }, [mode, isViewOptionsOpen, librarySearchQuery, canGoBack, canGoUp, currentRoot, navigateBack, handleNavigateUp, setCurrentRoot]);

  // Desktop keyboard shortcuts (disabled on compact/touch)
  useEffect(() => {
    if (isCompact) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === "browse") {
        if (e.key === "F11") {
          e.preventDefault();
          toggleFullscreen();
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
  }, [mode, isCompact, canGoBack, canGoForward, canGoUp, navigateBack, navigateForward, handleNavigateUp]);

  // Render logging
  useLogRender("App", {
    mode,
    currentRoot,
    viewMode,
    appTheme,
    entriesCount: entries.length,
  });

  // Hydrate stores on mount
  useEffect(() => {
    logger.info("HYDRATE_START");
    hydrateUiStore();
    hydrateBookStore();
  }, [hydrateUiStore, hydrateBookStore, logger]);

  // Initialize desktop window state persistence
  useEffect(() => {
    if (typeof navigator !== "undefined" && /android/i.test(navigator.userAgent)) {
      return;
    }
    let cleanup: (() => void) | undefined;
    initWindowStateWatcher().then((fn) => {
      cleanup = fn;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", appTheme);
  }, [appTheme]);

  // Load directory entries via FileSystemProvider
  const loadDirectory = useCallback(async (path: string) => {
    const dirLogger = logger.child({ operation: "loadDirectory", path });
    dirLogger.info("LOAD_DIRECTORY_START", { path });

    setLoading(true);
    setError(null);
    try {
      const provider = await getFileSystemProvider();
      const existingRecent = useUiStore.getState().recentFolders.find((f) => f.id === path);
      let dirName = existingRecent?.name;
      if (!dirName) {
        if (path.startsWith("collection:") || path.startsWith("virtual:")) {
          dirName = "Selected Ebooks";
        } else {
          dirName = path.split(/[/\\]/).filter(Boolean).pop() || path;
        }
      }
      const dirRef: DirRef = { id: path, name: dirName, platform: provider.kind };

      const rawEntries = await provider.listChildren(dirRef);
      const fileEntries: FileEntry[] = rawEntries.map((e) => ({
        name: e.name,
        path: e.id,
        isDirectory: e.isDirectory,
        size: e.size,
        modified: e.modifiedMs,
        isSupported: e.isSupported,
      }));

      const sorted = sortEntries(fileEntries, sortBy, sortOrder);
      setEntries(sorted);
      dirLogger.info("LOAD_DIRECTORY_SUCCESS", { path, count: sorted.length });
    } catch (err) {
      const appErr = toAppError(err);
      dirLogger.error("LOAD_DIRECTORY_ERROR", { path }, appErr);
      setError(appErr);
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

  const handleOpenDirectory = async (selectedDir?: string | RecentFolder | DirRef | unknown) => {
    logger.info("OPEN_DIRECTORY");
    try {
      const provider = await getFileSystemProvider();
      let dir: DirRef | null = null;
      if (selectedDir && typeof selectedDir === "object" && "id" in selectedDir) {
        const item = selectedDir as { id: string; name?: string };
        const existingRecent = useUiStore.getState().recentFolders.find((f) => f.id === item.id);
        const name = item.name || existingRecent?.name || item.id.split(/[/\\]/).filter(Boolean).pop() || item.id;
        dir = { id: item.id, name, platform: provider.kind };
      } else if (typeof selectedDir === "string" && selectedDir) {
        const existingRecent = useUiStore.getState().recentFolders.find((f) => f.id === selectedDir);
        const name = existingRecent?.name || selectedDir.split(/[/\\]/).filter(Boolean).pop() || selectedDir;
        dir = { id: selectedDir, name, platform: provider.kind };
      } else {
        dir = await provider.pickDirectory("Select a directory containing your ebooks");
      }

      if (dir) {
        logger.info("DIRECTORY_SELECTED", { dir });
        navigateToDir(dir.id);
        addRecentFolder({ id: dir.id, name: dir.name, platform: provider.kind });
        setMode("browse");
      } else {
        logger.debug("DIRECTORY_DIALOG_CANCELLED");
      }
    } catch (err) {
      const appErr = toAppError(err);
      setError(appErr);
    }
  };

  const handleOpenFile = async () => {
    logger.info("OPEN_FILE");
    try {
      const provider = await getFileSystemProvider();
      if (provider.pickFile) {
        const file = await provider.pickFile("Select Ebook");
        if (file) {
          await handleFileClick(file.id, file.name);
        } else {
          logger.debug("FILE_DIALOG_CANCELLED");
        }
      } else if (provider.pickFiles) {
        const res = await provider.pickFiles("Select Ebook");
        if (res && res.files.length > 0) {
          await handleFileClick(res.files[0].id, res.files[0].name);
        }
      } else {
        await handleOpenDirectory();
      }
    } catch (err) {
      const appErr = toAppError(err);
      setError(appErr);
    }
  };

  const handleFileClick = async (path: string, name?: string) => {
    logger.info("FILE_CLICKED", { path, name });
    if (!formatRegistry.isSupported(path)) {
      logger.warn("FILE_NOT_SUPPORTED", { path });
      return;
    }

    setCurrentBookPath(path, name);
    addRecentFile(path);
    setMode("reading");
  };

  const handleCloseBook = () => {
    setMode("browse");
    setTimeout(() => setCurrentBookPath(null), 50);
  };

  return (
    <div
      className="app relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={(e) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          setIsDraggingFile(false);
        }
      }}
      onDrop={handleHtmlDrop}
    >
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-primary)] rounded-2xl p-8 max-w-sm text-center shadow-2xl flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <UploadIcon size={32} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--color-text)]">Drop Ebook or Folder Here</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Release to open ebook or browse folder</p>
            </div>
          </div>
        </div>
      )}
      {mode === "browse" ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Responsive Top Application Bar */}
          <AppBar
            isCompact={isCompact}
            isMedium={isMedium}
            recentFolders={recentFolders}
            currentRoot={currentRoot}
            onOpenDirectory={handleOpenDirectory}
            onOpenFile={handleOpenFile}
            onClearRecents={clearRecents}
            searchQuery={librarySearchQuery}
            onSearchChange={setLibrarySearchQuery}
            onToggleViewOptions={() => setIsViewOptionsOpen((prev) => !prev)}
            isViewOptionsOpen={isViewOptionsOpen}
          />

          {/* Non-overlapping Error Banner Surface */}
          <ErrorHost
            error={error}
            onDismiss={() => setError(null)}
            onAction={() => handleOpenDirectory()}
            actionLabel="Open Folder"
          />

          {/* View Options Modal Sheet / Popover */}
          <ViewOptionsSheet
            isOpen={isViewOptionsOpen}
            onClose={() => setIsViewOptionsOpen(false)}
            isCompact={isCompact}
            sortBy={sortBy}
            sortOrder={sortOrder}
            viewMode={viewMode}
            appTheme={appTheme}
            onSortChange={(sort: SortBy) => setSort(sort)}
            onSortOrderToggle={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            onViewModeChange={(mode: ViewMode) => setViewMode(mode)}
            onThemeChange={(theme: AppTheme) => setTheme(theme)}
          />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {currentRoot ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Secondary Breadcrumbs Navigation Toolbar */}
                <BreadcrumbsBar
                  breadcrumbs={breadcrumbSegments}
                  onNavigate={handleDirectoryNavigate}
                  onNavigateHome={() => setCurrentRoot(null)}
                  onNavigateBack={navigateBack}
                  onNavigateForward={navigateForward}
                  onNavigateUp={handleNavigateUp}
                  canGoBack={canGoBack}
                  canGoForward={canGoForward}
                  canGoUp={canGoUp}
                  parentPath={parentPath}
                  itemCount={filteredEntries.length}
                  totalCount={entries.length}
                  isFiltered={!!librarySearchQuery.trim()}
                  loading={loading}
                  isCompact={isCompact}
                />

                {/* View Container: List or Grid */}
                {viewMode === "list" ? (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <VirtualizedFileList
                      entries={filteredEntries}
                      onFileClick={handleFileClick}
                      onDirectoryClick={handleDirectoryNavigate}
                      onRevealInOS={canRevealInOS ? handleRevealInOS : undefined}
                      parentPath={parentPath}
                      onParentClick={handleNavigateUp}
                      loading={loading}
                      error={error ? error.message : null}
                      emptyMessage={
                        librarySearchQuery ? `No ebooks match "${librarySearchQuery}"` : "No files found"
                      }
                      isCompact={isCompact}
                    />
                  </div>
                ) : (
                  <BrowseGrid
                    entries={filteredEntries}
                    onFileClick={handleFileClick}
                    onDirectoryClick={handleDirectoryNavigate}
                    onRevealInOS={canRevealInOS ? handleRevealInOS : undefined}
                    searchQuery={librarySearchQuery}
                    isCompact={isCompact}
                  />
                )}
              </div>
            ) : (
              <Launchpad
                recentFolders={recentFolders}
                onOpenDirectory={handleOpenDirectory}
                onOpenFile={handleOpenFile}
                onClearRecents={clearRecents}
                isCompact={isCompact}
              />
            )}
          </main>
        </div>
      ) : (
        <ReaderView onClose={handleCloseBook} />
      )}

      {showExitToast && (
        <div
          role="status"
          data-testid="exit-toast"
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/85 text-white text-xs font-medium shadow-2xl backdrop-blur-md pointer-events-none animate-in fade-in zoom-in-95 duration-150 border border-white/10 select-none"
        >
          Press back again to exit
        </div>
      )}

      <LogViewer
        isOpen={isLogViewerOpen}
        onClose={() => setIsLogViewerOpen(false)}
      />
    </div>
  );
}

function sortEntries(entries: FileEntry[], sortBy: string, sortOrder: string): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    let comparison = 0;
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        break;
      case "date":
        comparison = (b.modified || 0) - (a.modified || 0);
        break;
      case "size":
        comparison = (b.size || 0) - (a.size || 0);
        break;
      case "type": {
        const extA = a.name.slice(a.name.lastIndexOf(".")).toLowerCase();
        const extB = b.name.slice(b.name.lastIndexOf(".")).toLowerCase();
        comparison = extA.localeCompare(extB);
        break;
      }
      default:
        comparison = a.name.localeCompare(b.name);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });
}
