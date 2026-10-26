import { create } from 'zustand';
import { createStore } from '../utils/store';
import { createLoggedStore } from '../utils/logger';

export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list' | 'tree';
export type AppTheme = 'light' | 'dark' | 'sepia';

export interface UiState {
  // Sidebar
  sidebarVisible: boolean;
  sidebarWidth: number;
  currentRoot: string | null;
  expandedPaths: string[];
  
  // Sorting & View
  sortBy: SortBy;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  
  // Theme
  appTheme: AppTheme;
  
  // Recents (max 10 each)
  recentFolders: string[];
  recentFiles: string[];
  
  // Directory Navigation History
  dirHistory: string[];
  dirHistoryIndex: number;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setCurrentRoot: (path: string | null) => void;
  navigateToDir: (path: string | null) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  toggleExpandedPath: (path: string) => void;
  setSort: (field: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: AppTheme) => void;
  addRecentFolder: (path: string) => void;
  addRecentFile: (path: string) => void;
  clearRecents: () => void;
  hydrate: () => Promise<void>;
}

const MAX_RECENTS = 10;

// Tauri store for persistence
const uiStorePersist = createStore<Partial<UiState>>('ui-state', {
  sidebarVisible: true,
  sidebarWidth: 280,
  currentRoot: null,
  expandedPaths: [],
  sortBy: 'name',
  sortOrder: 'asc',
  viewMode: 'list',
  appTheme: 'dark',
  recentFolders: [],
  recentFiles: [],
});

const loggedStoreCreator = createLoggedStore<UiState>(
  {
    name: 'uiStore',
    logLevel: 'debug',
    logStateDiff: true,
    excludeKeys: ['expandedPaths', 'recentFolders', 'recentFiles'],
  },
  (set) => ({
    // Initial state
    sidebarVisible: true,
    sidebarWidth: 280,
    currentRoot: null,
    expandedPaths: [],
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: 'list',
    appTheme: 'dark',
    recentFolders: [],
    recentFiles: [],
    dirHistory: [],
    dirHistoryIndex: -1,

    // Actions
    toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

    setSidebarVisible: (visible: boolean) => set({ sidebarVisible: visible }),

    setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(600, width)) }),

    setCurrentRoot: (path: string | null) => set((state) => {
      if (!path) {
        return { currentRoot: null, dirHistory: [], dirHistoryIndex: -1 };
      }
      if (path === state.currentRoot) return {};
      const newHistory = state.dirHistory.slice(0, state.dirHistoryIndex + 1);
      newHistory.push(path);
      return {
        currentRoot: path,
        dirHistory: newHistory,
        dirHistoryIndex: newHistory.length - 1,
      };
    }),

    navigateToDir: (path: string | null) => set((state) => {
      if (!path) {
        return { currentRoot: null, dirHistory: [], dirHistoryIndex: -1 };
      }
      if (path === state.currentRoot) return {};
      const newHistory = state.dirHistory.slice(0, state.dirHistoryIndex + 1);
      newHistory.push(path);
      return {
        currentRoot: path,
        dirHistory: newHistory,
        dirHistoryIndex: newHistory.length - 1,
      };
    }),

    navigateBack: () => set((state) => {
      if (state.dirHistoryIndex > 0) {
        const newIndex = state.dirHistoryIndex - 1;
        return {
          dirHistoryIndex: newIndex,
          currentRoot: state.dirHistory[newIndex],
        };
      }
      return {};
    }),

    navigateForward: () => set((state) => {
      if (state.dirHistoryIndex < state.dirHistory.length - 1) {
        const newIndex = state.dirHistoryIndex + 1;
        return {
          dirHistoryIndex: newIndex,
          currentRoot: state.dirHistory[newIndex],
        };
      }
      return {};
    }),

    toggleExpandedPath: (path: string) => set((state) => ({
      expandedPaths: state.expandedPaths.includes(path)
        ? state.expandedPaths.filter((p) => p !== path)
        : [...state.expandedPaths, path]
    })),

    setSort: (field: SortBy) => set({ sortBy: field }),

    setSortOrder: (order: SortOrder) => set({ sortOrder: order }),

    setViewMode: (mode: ViewMode) => set({ viewMode: mode }),

    setTheme: (theme: AppTheme) => set({ appTheme: theme }),

    addRecentFolder: (path: string) => set((state) => {
      const filtered = state.recentFolders.filter((p) => p !== path);
      return { recentFolders: [path, ...filtered].slice(0, MAX_RECENTS) };
    }),

    addRecentFile: (path: string) => set((state) => {
      const filtered = state.recentFiles.filter((p) => p !== path);
      return { recentFiles: [path, ...filtered].slice(0, MAX_RECENTS) };
    }),

    clearRecents: () => set({ recentFolders: [], recentFiles: [] }),

    hydrate: async () => {
      await uiStorePersist.load();
      const stored = uiStorePersist.get();
      if (stored) {
        set((state) => ({
          ...state,
          ...stored,
          dirHistory: stored.currentRoot ? [stored.currentRoot] : [],
          dirHistoryIndex: stored.currentRoot ? 0 : -1,
        }));
      }
    },
  })
);

export const useUiStore = create<UiState>()(loggedStoreCreator);

// Subscribe to changes and persist to Tauri store
useUiStore.subscribe(
  (newState: UiState, _oldState: UiState) => {
    uiStorePersist.set({
      sidebarVisible: newState.sidebarVisible,
      sidebarWidth: newState.sidebarWidth,
      currentRoot: newState.currentRoot,
      expandedPaths: newState.expandedPaths,
      sortBy: newState.sortBy,
      sortOrder: newState.sortOrder,
      viewMode: newState.viewMode,
      appTheme: newState.appTheme,
      recentFolders: newState.recentFolders,
      recentFiles: newState.recentFiles,
    });
  }
);
