import { describe, it, expect, beforeEach } from "vitest";
import { useBookStore } from "../../src/stores/bookStore";
import { useUiStore } from "../../src/stores/uiStore";

describe("State Stores", () => {
  describe("useBookStore", () => {
    beforeEach(() => {
      useBookStore.setState({
        bookStates: {},
        currentBookPath: null,
        currentBookTitle: null,
      });
    });

    it("sanitizes title when setting book path with raw Android SAF URI and title", () => {
      const safPath = "content://com.android.externalstorage.documents/document/primary%3ADocuments%2FProject%20Analysis.pdf";
      const rawTitle = "primary%3ADocuments%2FProject%20Analysis.pdf";

      useBookStore.getState().setCurrentBookPath(safPath, rawTitle);

      const state = useBookStore.getState();
      expect(state.currentBookPath).toBe(safPath);
      // MUST NOT leak raw encoded URL into the state title!
      expect(state.currentBookTitle).toBe("Project Analysis");
    });

    it("extracts clean title from path when no title is explicitly passed", () => {
      const filePath = "D:/Books/Quantum Mechanics.epub";
      useBookStore.getState().setCurrentBookPath(filePath);

      const state = useBookStore.getState();
      expect(state.currentBookPath).toBe(filePath);
      expect(state.currentBookTitle).toBe("Quantum Mechanics");
    });

    it("handles null when clearing book path", () => {
      useBookStore.getState().setCurrentBookPath(null);
      const state = useBookStore.getState();
      expect(state.currentBookPath).toBeNull();
      expect(state.currentBookTitle).toBeNull();
    });

    it("tracks and persists per-book location updates", () => {
      const bookPath = "/books/sample.pdf";
      useBookStore.getState().updateLocation(bookPath, 5, 20);

      const bookState = useBookStore.getState().getBookState(bookPath);
      expect(bookState).toBeDefined();
      expect(bookState?.currentLocation).toBe(5);
      expect(bookState?.totalLocations).toBe(20);
    });

    it("adds, sorts, and removes bookmarks", () => {
      const bookPath = "/books/sample.epub";
      useBookStore.getState().addBookmark(bookPath, { location: 10, label: "Chapter 2" });
      useBookStore.getState().addBookmark(bookPath, { location: 2, label: "Prologue" });

      let bookState = useBookStore.getState().getBookState(bookPath);
      expect(bookState?.bookmarks).toHaveLength(2);
      // Bookmarks should be sorted by numeric location ascending
      expect(bookState?.bookmarks[0].location).toBe(2);
      expect(bookState?.bookmarks[1].location).toBe(10);

      const bookmarkId = bookState!.bookmarks[0].id;
      useBookStore.getState().removeBookmark(bookPath, bookmarkId);

      bookState = useBookStore.getState().getBookState(bookPath);
      expect(bookState?.bookmarks).toHaveLength(1);
      expect(bookState?.bookmarks[0].location).toBe(10);
    });

    it("updates per-book reader settings", () => {
      const bookPath = "/books/dark-novel.epub";
      useBookStore.getState().updateSettings(bookPath, {
        fontSize: 20,
        theme: "sepia",
        twoPageView: false,
      });

      const bookState = useBookStore.getState().getBookState(bookPath);
      expect(bookState?.settings.fontSize).toBe(20);
      expect(bookState?.settings.theme).toBe("sepia");
      expect(bookState?.settings.twoPageView).toBe(false);
    });

    it("toggles and checks book completed status", () => {
      const bookPath = "/books/finished-book.pdf";
      expect(useBookStore.getState().isBookCompleted(bookPath)).toBe(false);

      useBookStore.getState().toggleBookCompleted(bookPath);
      expect(useBookStore.getState().isBookCompleted(bookPath)).toBe(true);
      expect(useBookStore.getState().getBookState(bookPath)?.isCompleted).toBe(true);

      useBookStore.getState().toggleBookCompleted(bookPath);
      expect(useBookStore.getState().isBookCompleted(bookPath)).toBe(false);
      expect(useBookStore.getState().getBookState(bookPath)?.isCompleted).toBe(false);

      useBookStore.getState().setBookCompleted(bookPath, true);
      expect(useBookStore.getState().isBookCompleted(bookPath)).toBe(true);
    });
  });

  describe("useUiStore", () => {
    beforeEach(() => {
      useUiStore.setState({
        sidebarVisible: true,
        sortBy: "name",
        sortOrder: "asc",
        viewMode: "grid",
        appTheme: "dark",
        recentFolders: [],
        recentFiles: [],
      });
    });

    it("toggles sidebar visibility", () => {
      expect(useUiStore.getState().sidebarVisible).toBe(true);
      useUiStore.getState().toggleSidebar();
      expect(useUiStore.getState().sidebarVisible).toBe(false);
    });

    it("manages sort criteria and order", () => {
      useUiStore.getState().setSort("size");
      expect(useUiStore.getState().sortBy).toBe("size");

      useUiStore.getState().setSortOrder("desc");
      expect(useUiStore.getState().sortOrder).toBe("desc");
    });

    it("updates view modes (grid, list, tree)", () => {
      useUiStore.getState().setViewMode("list");
      expect(useUiStore.getState().viewMode).toBe("list");
    });

    it("caps recent folders and files to maximum of 10 items", () => {
      for (let i = 1; i <= 15; i++) {
        useUiStore.getState().addRecentFolder({ id: `/folder/${i}`, name: `Folder ${i}` });
        useUiStore.getState().addRecentFile(`/books/book_${i}.pdf`);
      }

      const state = useUiStore.getState();
      expect(state.recentFolders.length).toBeLessThanOrEqual(10);
      expect(state.recentFiles.length).toBeLessThanOrEqual(10);
    });

    it("ensures currentRoot is null on startup to always land on Launchpad", () => {
      // currentRoot must start at null so cold starts land cleanly on Home/Launchpad
      expect(useUiStore.getState().currentRoot).toBeNull();
      useUiStore.getState().navigateToDir("D:/Books");
      expect(useUiStore.getState().currentRoot).toBe("D:/Books");
    });
  });
});

