import { create } from 'zustand';
import { createStore } from '../utils/store';
import { createLoggedStore, logManager } from '../utils/logger';
import { extractDocumentTitle } from '../utils/pathUtils';

const logger = logManager.getLogger('store:bookStore');

export interface Bookmark {
  id: string;
  location: string | number;
  label?: string;
  note?: string;
  createdAt: number;
}

export interface BookSettings {
  fontSize: number;
  lineHeight: number;
  margin: number;
  theme: 'light' | 'dark' | 'sepia';
  twoPageView: boolean;
  continuousScroll: boolean;
}

export interface BookState {
  currentLocation: string | number;
  totalLocations: number;
  bookmarks: Bookmark[];
  settings: BookSettings;
  lastOpened: number;
}

export interface BookStoreState {
  bookStates: Record<string, BookState>;
  currentBookPath: string | null;
  currentBookTitle: string | null;
  setCurrentBookPath: (path: string | null, title?: string | null) => void;
  getBookState: (path: string) => BookState | undefined;
  setBookState: (path: string, state: Partial<BookState>) => void;
  updateLocation: (path: string, location: string | number, totalLocations?: number) => void;
  addBookmark: (path: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (path: string, bookmarkId: string) => void;
  updateBookmark: (path: string, bookmarkId: string, updates: Partial<Bookmark>) => void;
  updateSettings: (path: string, settings: Partial<BookSettings>) => void;
  clearBookState: (path: string) => void;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
}

// Default settings per PRD Section 8
const DEFAULT_BOOK_SETTINGS: BookSettings = {
  fontSize: 16,
  lineHeight: 1.6,
  margin: 48,
  theme: 'dark',
  twoPageView: false,
  continuousScroll: true,
};

const EMPTY_BOOK_STATE: BookState = {
  currentLocation: 0,
  totalLocations: 0,
  bookmarks: [],
  settings: DEFAULT_BOOK_SETTINGS,
  lastOpened: Date.now(),
};

// Tauri store for persistence
const bookStorePersist = createStore<Record<string, BookState>>('book-states', {});

const loggedStoreCreator = createLoggedStore<BookStoreState>(
  {
    name: 'bookStore',
    logLevel: 'debug',
    logStateDiff: true,
    excludeKeys: ['bookStates'],
  },
  (set, get) => ({
    bookStates: {},
    currentBookPath: null,
    currentBookTitle: null,
    isHydrated: false,

    setCurrentBookPath: (path: string | null, title?: string | null) =>
      set({
        currentBookPath: path,
        currentBookTitle: title ? extractDocumentTitle(title) : (path ? extractDocumentTitle(path) : null),
      }),

    getBookState: (path: string) => get().bookStates[path],

    setBookState: (path: string, state: Partial<BookState>) => set((s) => ({
      bookStates: {
        ...s.bookStates,
        [path]: { ...(s.bookStates[path] ?? EMPTY_BOOK_STATE), ...state, lastOpened: Date.now() }
      }
    })),

    updateLocation: (path: string, location: string | number, totalLocations?: number) => set((s) => ({
      bookStates: {
        ...s.bookStates,
        [path]: {
          ...(s.bookStates[path] ?? EMPTY_BOOK_STATE),
          currentLocation: location,
          totalLocations: totalLocations ?? s.bookStates[path]?.totalLocations ?? 0,
          lastOpened: Date.now()
        }
      }
    })),

    addBookmark: (path: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => set((s) => {
      const newBookmark: Bookmark = {
        ...bookmark,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      return {
        bookStates: {
          ...s.bookStates,
          [path]: {
            ...(s.bookStates[path] ?? EMPTY_BOOK_STATE),
            bookmarks: [...(s.bookStates[path]?.bookmarks ?? []), newBookmark].sort((a, b) =>
              String(a.location).localeCompare(String(b.location), undefined, { numeric: true })
            ),
            lastOpened: Date.now()
          }
        }
      };
    }),

    removeBookmark: (path: string, bookmarkId: string) => set((s) => {
      const bookState = s.bookStates[path];
      if (!bookState) return s;
      return {
        bookStates: {
          ...s.bookStates,
          [path]: {
            ...bookState,
            bookmarks: bookState.bookmarks.filter((b) => b.id !== bookmarkId),
            lastOpened: Date.now()
          }
        }
      };
    }),

    updateBookmark: (path: string, bookmarkId: string, updates: Partial<Bookmark>) => set((s) => {
      const bookState = s.bookStates[path];
      if (!bookState) return s;
      return {
        bookStates: {
          ...s.bookStates,
          [path]: {
            ...bookState,
            bookmarks: bookState.bookmarks.map((b) => b.id === bookmarkId ? { ...b, ...updates } : b),
            lastOpened: Date.now()
          }
        }
      };
    }),

    updateSettings: (path: string, settings: Partial<BookSettings>) => set((s) => {
      const bookState = s.bookStates[path] ?? EMPTY_BOOK_STATE;
      return {
        bookStates: {
          ...s.bookStates,
          [path]: {
            ...bookState,
            settings: { ...bookState.settings, ...settings },
            lastOpened: Date.now()
          }
        }
      };
    }),

    clearBookState: (path: string) => set((s) => {
      const { [path]: _, ...rest } = s.bookStates;
      return { bookStates: rest };
    }),

    hydrate: async () => {
      try {
        await bookStorePersist.load();
        const stored = bookStorePersist.get();
        if (stored && Object.keys(stored).length > 0) {
          set({ bookStates: stored, isHydrated: true });
        } else {
          set({ isHydrated: true });
        }
      } catch (err) {
        logger.warn('BOOK_STORE_HYDRATE_ERROR', { error: err instanceof Error ? err.message : String(err) });
        set({ isHydrated: true });
      }
    },
  })
);

export const useBookStore = create<BookStoreState>()(loggedStoreCreator);

// Subscribe to changes and persist to Tauri store (only after initial hydration)
useBookStore.subscribe(
  (newState: BookStoreState, _oldState: BookStoreState) => {
    if (newState.isHydrated) {
      bookStorePersist.set(newState.bookStates);
    }
  }
);
