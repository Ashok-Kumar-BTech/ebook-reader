import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createStore } from '../utils/store';

export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'tree' | 'list';
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
  
  // Actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setCurrentRoot: (path: string | null) => void;
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

const MAX_RECENTS = 10;

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Initial state (will be overwritten by persist/hydrate)
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

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      
      setSidebarWidth: (width: number) => set({ sidebarWidth: Math.max(200, Math.min(600, width)) }),
      
      setCurrentRoot: (path: string | null) => set({ currentRoot: path }),
      
      toggleExpandedPath: (path: string) => set((state) => ({
        expandedPaths: state.expandedPaths.includes(path)
          ? state.expandedPaths.filter((p) => p !== path)
          : [...state.expandedPaths, path]
      })),
      
      setSort: (field: SortBy) => set((state) => ({
        sortBy: field,
        sortOrder: state.sortBy === field && state.sortOrder === 'asc' ? 'desc' : 'asc'
      })),
      
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
        set((state) => ({ ...state, ...stored }));
      },
    }),
    {
      name: 'ui-state-zustand', // fallback key for zustand persist (not used, we use Tauri store)
      storage: createJSONStorage(() => ({
        getItem: () => null, // We handle persistence via Tauri store
        setItem: () => {},
        removeItem: () => {},
      })),
      // Only persist these fields to Tauri store (not actions)
      partialize: (state) => ({
        sidebarVisible: state.sidebarVisible,
        sidebarWidth: state.sidebarWidth,
        currentRoot: state.currentRoot,
        expandedPaths: state.expandedPaths,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        viewMode: state.viewMode,
        appTheme: state.appTheme,
        recentFolders: state.recentFolders,
        recentFiles: state.recentFiles,
      }),
      // Sync with Tauri store on changes
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Initial hydration from Tauri store
          uiStorePersist.load().then((stored) => {
            if (stored) {
              state.sidebarVisible = stored.sidebarVisible ?? state.sidebarVisible;
              state.sidebarWidth = stored.sidebarWidth ?? state.sidebarWidth;
              state.currentRoot = stored.currentRoot ?? state.currentRoot;
              state.expandedPaths = stored.expandedPaths ?? state.expandedPaths;
              state.sortBy = stored.sortBy ?? state.sortBy;
              state.sortOrder = stored.sortOrder ?? state.sortOrder;
              state.viewMode = stored.viewMode ?? state.viewMode;
              state.appTheme = stored.appTheme ?? state.appTheme;
              state.recentFolders = stored.recentFolders ?? state.recentFolders;
              state.recentFiles = stored.recentFiles ?? state.recentFiles;
            }
          });
        }
      },
    }
  )
);

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