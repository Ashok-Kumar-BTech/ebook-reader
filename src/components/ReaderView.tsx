import { useState, useEffect, useRef, useCallback } from "react";
import { useBookStore } from "../stores/bookStore";
import { useUiStore } from "../stores/uiStore";
import { getAdapterForPath } from "../adapters/registry";
import { readFileData } from "../utils/tauriApi";
import { useLogger } from "../utils/logger";
import { FormatBadge } from "./FormatBadge";
import type { BookAdapter, BookInstance, RenderOptions } from "../types/reader";

interface ReaderViewProps {
  onClose: () => void;
}

export function ReaderView({ onClose }: ReaderViewProps) {
  const logger = useLogger("ReaderView");
  const { currentBookPath, getBookState, updateLocation, updateSettings } = useBookStore();
  const { toggleSidebar, sidebarVisible } = useUiStore();

  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookInstance, setBookInstance] = useState<BookInstance | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "two-page" | "scroll">("single");
  const [readerTheme, setReaderTheme] = useState<"light" | "dark" | "sepia">("dark");
  const [fontSize, setFontSize] = useState<number>(16);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<BookAdapter | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Load Book Adapter and File Data
  useEffect(() => {
    if (!currentBookPath) {
      setError("No book selected");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadBook() {
      try {
        const adapter = getAdapterForPath(currentBookPath!);
        if (!adapter) {
          throw new Error("No compatible format adapter found for this file.");
        }
        adapterRef.current = adapter;

        const fileBytes = await readFileData(currentBookPath!);
        if (!fileBytes || fileBytes.length === 0) {
          throw new Error("Unable to read book content from filesystem.");
        }

        const instance = await adapter.load(currentBookPath!, fileBytes);
        if (!isMounted) return;

        setBookInstance(instance);
        const count = Math.max(1, adapter.getPageCount());
        setTotalPages(count);

        // Restore saved book state
        const savedState = getBookState(currentBookPath!);
        if (savedState) {
          if (savedState.currentLocation) {
            const locNum = typeof savedState.currentLocation === 'number'
              ? savedState.currentLocation
              : parseInt(savedState.currentLocation, 10);
            if (!isNaN(locNum) && locNum >= 1 && locNum <= count) {
              setCurrentPage(locNum);
            }
          }
          if (savedState.settings) {
            setReaderTheme(savedState.settings.theme);
            setFontSize(savedState.settings.fontSize);
            if (savedState.settings.continuousScroll) {
              setViewMode("scroll");
            } else if (savedState.settings.twoPageView) {
              setViewMode("two-page");
            } else {
              setViewMode("single");
            }
          }
        } else {
          // Default view mode based on format
          if (['txt', 'html', 'docx'].includes(instance.format)) {
            setViewMode("scroll");
          } else {
            setViewMode("single");
          }
        }

        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        logger.error("LOAD_BOOK_ERROR", { currentBookPath }, err as Error);
        setError(err instanceof Error ? err.message : "Failed to load ebook.");
        setLoading(false);
      }
    }

    loadBook();

    return () => {
      isMounted = false;
      if (adapterRef.current) {
        try {
          adapterRef.current.unload();
        } catch {
          // Ignore unload errors
        }
      }
    };
  }, [currentBookPath, getBookState, logger]);

  // Render current page content
  const renderPages = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter || loading || !containerRef.current) return;

    setRendering(true);
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const baseOptions: RenderOptions = {
      width,
      height: height - 40,
      theme: readerTheme,
      fontSize,
      lineHeight: 1.6,
      margin: 32,
      fontFamily: 'serif',
      twoPageView: viewMode === "two-page",
      continuousScroll: viewMode === "scroll",
    };

    try {
      if (viewMode === "single" && pageContainerRef.current) {
        await adapter.renderPage(currentPage, pageContainerRef.current, baseOptions);
      } else if (viewMode === "two-page" && leftPageRef.current && rightPageRef.current) {
        const spreadOptions: RenderOptions = {
          ...baseOptions,
          width: Math.floor((width - 64) / 2),
          margin: 20,
        };
        await adapter.renderPage(currentPage, leftPageRef.current, spreadOptions);
        if (currentPage + 1 <= totalPages) {
          rightPageRef.current.style.display = "block";
          await adapter.renderPage(currentPage + 1, rightPageRef.current, spreadOptions);
        } else {
          rightPageRef.current.innerHTML = "";
          rightPageRef.current.style.display = "none";
        }
      } else if (viewMode === "scroll" && scrollContainerRef.current) {
        if (adapter.renderPageRange) {
          await adapter.renderPageRange(1, totalPages, scrollContainerRef.current, baseOptions);
        } else {
          // Render current page into scroll container
          await adapter.renderPage(currentPage, scrollContainerRef.current, baseOptions);
        }
      }
    } catch (err) {
      logger.warn("RENDER_PAGE_ERROR", { currentPage, viewMode, error: String(err) });
    } finally {
      setRendering(false);
    }
  }, [loading, viewMode, currentPage, totalPages, readerTheme, fontSize, logger]);

  // Re-render when layout parameters change
  useEffect(() => {
    if (!loading && !error) {
      renderPages();
    }
  }, [loading, error, renderPages]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      renderPages();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderPages]);

  // Navigation handlers
  const goToPage = useCallback((pageNum: number) => {
    const clamped = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(clamped);
    if (currentBookPath) {
      updateLocation(currentBookPath, clamped, totalPages);
    }
  }, [totalPages, currentBookPath, updateLocation]);

  const prevPage = useCallback(() => {
    const step = viewMode === "two-page" ? 2 : 1;
    goToPage(currentPage - step);
  }, [currentPage, viewMode, goToPage]);

  const nextPage = useCallback(() => {
    const step = viewMode === "two-page" ? 2 : 1;
    goToPage(currentPage + step);
  }, [currentPage, viewMode, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          nextPage();
          break;
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prevPage();
          break;
        case "Home":
          e.preventDefault();
          goToPage(1);
          break;
        case "End":
          e.preventDefault();
          goToPage(totalPages);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "+":
        case "=":
          e.preventDefault();
          setFontSize(s => Math.min(36, s + 2));
          break;
        case "-":
          e.preventDefault();
          setFontSize(s => Math.max(12, s - 2));
          break;
        case "0":
          e.preventDefault();
          setFontSize(16);
          break;
        case "t":
        case "T":
          e.preventDefault();
          setReaderTheme(curr => curr === "dark" ? "light" : curr === "light" ? "sepia" : "dark");
          break;
        case "v":
        case "V":
          e.preventDefault();
          setViewMode(curr => curr === "single" ? "two-page" : curr === "two-page" ? "scroll" : "single");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, goToPage, totalPages, onClose]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(diff) > 50) {
      if (diff < 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
  };

  // Theme styling constants
  const getThemeStyles = () => {
    switch (readerTheme) {
      case "dark":
        return {
          bg: "#111827",
          text: "#f9fafb",
          barBg: "#1f2937",
          border: "#374151",
          pageBg: "#111827",
        };
      case "sepia":
        return {
          bg: "#fbf0d9",
          text: "#5f4b32",
          barBg: "#f4e8ce",
          border: "#e2d3b5",
          pageBg: "#fbf0d9",
        };
      case "light":
      default:
        return {
          bg: "#ffffff",
          text: "#111827",
          barBg: "#f6f6f6",
          border: "#e5e7eb",
          pageBg: "#ffffff",
        };
    }
  };

  const themeStyle = getThemeStyles();

  // Progress percentage
  const progressPercent = totalPages > 1
    ? Math.round(((currentPage - 1) / (totalPages - 1)) * 100)
    : 100;

  // Persist settings changes
  useEffect(() => {
    if (currentBookPath) {
      updateSettings(currentBookPath, {
        theme: readerTheme,
        fontSize,
        twoPageView: viewMode === "two-page",
        continuousScroll: viewMode === "scroll",
      });
    }
  }, [readerTheme, fontSize, viewMode, currentBookPath, updateSettings]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-background)]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">Opening Document...</h3>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md text-center truncate">
          {currentBookPath?.split("/").pop()}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-background)]">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[var(--color-text)] mb-2">Failed to Open Book</h3>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md text-center mb-6">{error}</p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden select-none"
      style={{ backgroundColor: themeStyle.bg, color: themeStyle.text }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Navigation Bar */}
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b z-20 flex-shrink-0"
        style={{ backgroundColor: themeStyle.barBg, borderColor: themeStyle.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            title={sidebarVisible ? "Hide Library Sidebar (M)" : "Show Library Sidebar (M)"}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1 text-sm rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium"
            title="Return to library browse view (Esc)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Library</span>
          </button>

          <div className="flex items-center gap-2 truncate ml-2">
            <span className="font-semibold text-sm truncate max-w-xs md:max-w-md">
              {bookInstance?.title || "Ebook Reader"}
            </span>
            {currentBookPath && <FormatBadge path={currentBookPath} />}
          </div>
        </div>

        {/* View Mode & Theme Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View Mode Selectors */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={() => setViewMode("single")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "single"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Single Page View"
            >
              Single
            </button>
            <button
              onClick={() => setViewMode("two-page")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                viewMode === "two-page"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Two-Page Spread View"
            >
              Spread
            </button>
            <button
              onClick={() => setViewMode("scroll")}
              className={`px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                viewMode === "scroll"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Continuous Scroll View"
            >
              Scroll
            </button>
          </div>

          {/* Theme Quick Toggle */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={() => setReaderTheme("light")}
              className={`px-2 py-1 text-xs font-medium transition-colors ${
                readerTheme === "light"
                  ? "bg-amber-100 text-amber-900 font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Light Theme"
            >
              ☀️
            </button>
            <button
              onClick={() => setReaderTheme("sepia")}
              className={`px-2 py-1 text-xs font-medium transition-colors border-l ${
                readerTheme === "sepia"
                  ? "bg-[#ecd5b3] text-[#5f4b32] font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Sepia Theme"
            >
              📜
            </button>
            <button
              onClick={() => setReaderTheme("dark")}
              className={`px-2 py-1 text-xs font-medium transition-colors border-l ${
                readerTheme === "dark"
                  ? "bg-gray-800 text-white font-bold"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Dark Theme"
            >
              🌙
            </button>
          </div>

          {/* Font Size Zoom Controls */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={() => setFontSize(s => Math.max(12, s - 2))}
              className="px-2 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5"
              title="Decrease Font Size (-)"
            >
              A-
            </button>
            <span className="px-2 py-1 text-xs border-l border-r" style={{ borderColor: themeStyle.border }}>
              {fontSize}px
            </span>
            <button
              onClick={() => setFontSize(s => Math.min(36, s + 2))}
              className="px-2 py-1 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5"
              title="Increase Font Size (+)"
            >
              A+
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-1"
            title="Close Book (Esc)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Reading Viewport */}
      <main
        className="flex-1 overflow-auto relative flex items-center justify-center p-4"
        ref={containerRef}
        style={{ backgroundColor: themeStyle.pageBg }}
      >
        {rendering && (
          <div className="absolute top-4 right-4 z-30">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Single Page View */}
        {viewMode === "single" && (
          <div
            ref={pageContainerRef}
            className="w-full h-full flex items-center justify-center overflow-auto shadow-md rounded p-2"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        )}

        {/* Two-Page Spread View */}
        {viewMode === "two-page" && (
          <div className="w-full h-full flex items-center justify-center gap-4 overflow-auto p-2">
            <div
              ref={leftPageRef}
              className="flex-1 h-full flex items-center justify-center overflow-auto border-r shadow-sm p-4 rounded-l"
              style={{ borderColor: themeStyle.border }}
            />
            <div
              ref={rightPageRef}
              className="flex-1 h-full flex items-center justify-center overflow-auto shadow-sm p-4 rounded-r"
            />
          </div>
        )}

        {/* Continuous Scroll View */}
        {viewMode === "scroll" && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden p-6 max-w-4xl mx-auto"
          />
        )}
      </main>

      {/* Bottom Navigation & Scrubber Bar */}
      <footer
        className="flex items-center justify-between px-6 py-2 border-t z-20 flex-shrink-0 gap-4"
        style={{ backgroundColor: themeStyle.barBg, borderColor: themeStyle.border }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
            title="Previous Page (Left Arrow)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Prev</span>
          </button>
        </div>

        {/* Center Scrubber and Location */}
        <div className="flex-1 max-w-xl flex items-center gap-4">
          <input
            type="range"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--color-primary)] cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg"
          />

          <button
            onClick={() => {
              setJumpPageInput(String(currentPage));
              setIsJumpModalOpen(true);
            }}
            className="text-xs font-semibold whitespace-nowrap px-2.5 py-1 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            style={{ borderColor: themeStyle.border }}
            title="Click to jump to page"
          >
            Page {currentPage} of {totalPages}
          </button>

          <span className="text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded flex items-center gap-1 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
            title="Next Page (Right Arrow)"
          >
            <span>Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </footer>

      {/* Jump to Page Dialog */}
      {isJumpModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div
            className="p-6 rounded-xl shadow-2xl border max-w-xs w-full"
            style={{ backgroundColor: themeStyle.barBg, borderColor: themeStyle.border }}
          >
            <h4 className="text-base font-semibold mb-2">Jump to Page</h4>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              Enter page number between 1 and {totalPages}:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const page = parseInt(jumpPageInput, 10);
                if (!isNaN(page)) {
                  goToPage(page);
                }
                setIsJumpModalOpen(false);
              }}
            >
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded border bg-transparent mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                style={{ borderColor: themeStyle.border }}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJumpModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Go
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

