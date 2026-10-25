import { create } from 'zustand';
import { createStore } from '../utils/store';

export interface Bookmark {
  id: string;
  location: number;
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
  fontFamily: 'serif' | 'sans' | 'mono';
}

export interface BookState {
  currentLocation: number;
  totalLocations: number;
  bookmarks: Bookmark[];
  settings: BookSettings;
  lastOpened: number;
}

export interface BookStoreState {
  bookStates: Record<string, BookState>;
  getBookState: (path: string) => BookState | undefined;
  setBookState: (path: string, state: Partial<BookState>) => void;
  updateLocation: (path: string, location: number, totalLocations?: number) => void;
  addBookmark: (path: string, bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (path: string, bookmarkId: string) => void;
  updateBookmark: (path: string, bookmarkId: string, updates: Partial<Bookmark>) => void;
  updateSettings: (path: string, settings: Partial<BookSettings>) => void;
  clearBookState: (path: string) => void;
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
  fontFamily: 'serif',
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

export const useBookStore = create<BookStoreState>()((set, get) => ({
  bookStates: {},

  getBookState: (path: string) => get().bookStates[path],

  setBookState: (path: string, state: Partial<BookState>) => set((s) => ({
    bookStates: {
      ...s.bookStates,
      [path]: { ...(s.bookStates[path] ?? EMPTY_BOOK_STATE), ...state, lastOpened: Date.now() }
    }
  })),

  updateLocation: (path: string, location: number, totalLocations?: number) => set((s) => ({
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
          bookmarks: [...(s.bookStates[path]?.bookmarks ?? []), newBookmark].sort((a, b) => a.location - b.location),
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
    await bookStorePersist.load();
    const stored = bookStorePersist.get();
    if (stored && Object.keys(stored).length > 0) {
      set({ bookStates: stored });
    }
  },
}));

// Subscribe to changes and persist to Tauri store
useBookStore.subscribe(
  (newState: BookStoreState, _oldState: BookStoreState) => {
    bookStorePersist.set(newState.bookStates);
  }
);