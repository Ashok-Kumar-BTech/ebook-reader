import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ListUnorderedIcon,
  SearchIcon,
  BookmarkIcon,
  BookmarkFillIcon,
  RowsIcon,
  ColumnsIcon,
  ThreeBarsIcon,
  SunIcon,
  MoonIcon,
  GearIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  PinIcon,
  PinSlashIcon,
} from "@primer/octicons-react";
import { useBookStore } from "../stores/bookStore";
import { useUiStore } from "../stores/uiStore";
import { getAdapterForPath } from "../adapters/registry";
import { readFileData } from "../utils/tauriApi";
import { useLogger } from "../utils/logger";
import { toggleFullscreen, isFullscreen } from "../utils/windowState";
import { FormatBadge } from "./FormatBadge";
import { TableOfContentsDrawer } from "./TableOfContentsDrawer";
import { SearchAndBookmarksDrawer, type SearchBookmarksTab } from "./SearchAndBookmarksDrawer";
import { SettingsDrawer } from "./SettingsDrawer";
import type { BookSettings } from "../stores/bookStore";
import type { BookAdapter, BookInstance, RenderOptions, TOCItem } from "../types/reader";

interface ReaderViewProps {
  onClose: () => void;
}

export function ReaderView({ onClose }: ReaderViewProps) {
  const logger = useLogger("ReaderView");
  const { currentBookPath, bookStates, getBookState, updateLocation, updateSettings, addBookmark, removeBookmark } = useBookStore();
  const { toggleSidebar, sidebarVisible } = useUiStore();

  const bookBookmarks = useMemo(() => {
    if (!currentBookPath) return [];
    return bookStates[currentBookPath]?.bookmarks ?? [];
  }, [currentBookPath, bookStates]);

  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookInstance, setBookInstance] = useState<BookInstance | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "two-page" | "scroll">("scroll");
  const [readerTheme, setReaderTheme] = useState<"light" | "dark" | "sepia">("dark");
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [margin, setMargin] = useState<number>(32);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Smart Auto-Hiding Top Header & Fullscreen state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHeaderHoveredRef = useRef<boolean>(false);
  const isRenderingRef = useRef<boolean>(false);
  const renderPendingRef = useRef<boolean>(false);

  // Independent Drawers state
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isSearchBookmarksOpen, setIsSearchBookmarksOpen] = useState(false);
  const [searchBookmarksTab, setSearchBookmarksTab] = useState<SearchBookmarksTab>("search");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const leftPageRef = useRef<HTMLDivElement>(null);
  const rightPageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<BookAdapter | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const isScrollingToPageRef = useRef<boolean>(false);
  const bookPathRef = useRef<string | null>(currentBookPath);

  useEffect(() => {
    if (currentBookPath) bookPathRef.current = currentBookPath;
  }, [currentBookPath]);

  // Zoom & Pan Engine state (0.5x to 3.0x, default 1.0x / Fit)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const zoomLevelRef = useRef<number>(1.0);
  zoomLevelRef.current = zoomLevel;
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panOffsetRef.current = panOffset;
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  const scrollPages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

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

        // Ensure bookStore is hydrated before restoring saved state (non-fatal)
        try {
          await useBookStore.getState().hydrate();
        } catch (hydrateErr) {
          logger.warn("BOOK_STORE_HYDRATE_FAILED", { error: String(hydrateErr) });
        }
        const savedState = useBookStore.getState().getBookState(currentBookPath!);
        let initialPage = 1;
        let initialTheme: "light" | "dark" | "sepia" = "dark";
        let initialFontSize = 16;
        let initialLineHeight = 1.6;
        let initialMargin = 32;
        let initialViewMode: "single" | "two-page" | "scroll" = "scroll";

        if (savedState) {
          if (savedState.currentLocation) {
            const locNum = typeof savedState.currentLocation === 'number'
              ? savedState.currentLocation
              : parseInt(savedState.currentLocation, 10);
            if (!isNaN(locNum) && locNum >= 1 && locNum <= count) {
              initialPage = locNum;
            }
          }
          if (savedState.settings) {
            initialTheme = savedState.settings.theme;
            initialFontSize = savedState.settings.fontSize;
            if (savedState.settings.lineHeight) initialLineHeight = savedState.settings.lineHeight;
            if (savedState.settings.margin) initialMargin = savedState.settings.margin;
            if (savedState.settings.twoPageView) {
              initialViewMode = "two-page";
            } else if (savedState.settings.continuousScroll === false) {
              initialViewMode = "single";
            } else {
              initialViewMode = "scroll";
            }
          }
        }

        // Apply all restored state together before releasing loading lock
        setCurrentPage(initialPage);
        setReaderTheme(initialTheme);
        setFontSize(initialFontSize);
        setLineHeight(initialLineHeight);
        setMargin(initialMargin);
        setViewMode(initialViewMode);

        // Unblock reader immediately so Page 1 renders without latency
        setLoading(false);

        // Load Table of Contents asynchronously in background
        adapter.getTOC().then((loadedToc) => {
          if (isMounted) {
            setToc(loadedToc);
          }
        }).catch((tocErr) => {
          logger.warn("FAILED_TO_LOAD_TOC", { error: String(tocErr) });
        });
      } catch (err) {
        if (!isMounted) return;
        logger.error("LOAD_BOOK_ERROR", { currentBookPath }, err as Error);
        const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : "Failed to load ebook.");
        setError(errorMsg);
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

  // Render current page content (for single and two-page views)
  const renderPages = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter || loading || !containerRef.current) return;
    if (viewMode === "scroll") {
      // Continuous scroll mode is handled via virtualized page slots and IntersectionObserver
      return;
    }

    if (isRenderingRef.current) {
      renderPendingRef.current = true;
      return;
    }

    isRenderingRef.current = true;
    setRendering(true);
    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Target sizing: Single view and Spread view zoom size approx 70% to 85% of Scroll view (baseline 860px)
    const scrollBaselineWidth = 860;

    // Single view targets ~80-82% of Scroll view (approx 690px-705px)
    const idealSingleWidth = Math.floor(scrollBaselineWidth * 0.81);
    const targetSingleWidth = Math.min(width - 32, idealSingleWidth);
    const targetSingleHeight = Math.max(height - 32, Math.floor(targetSingleWidth * 1.35));
    const singleWidth = Math.floor(targetSingleWidth / 2) * 2;
    const singleHeight = Math.floor(targetSingleHeight / 2) * 2;

    // Spread view targets ~70-75% of Scroll view per page (approx 600px-645px)
    const idealSpreadPageWidth = Math.floor(scrollBaselineWidth * 0.74);
    const targetSpreadPageWidth = Math.min(Math.floor((width - 32) / 2), idealSpreadPageWidth);
    const targetSpreadPageHeight = Math.max(height - 32, Math.floor(targetSpreadPageWidth * 1.35));
    const spreadWidth = Math.floor(targetSpreadPageWidth / 2) * 2;
    const spreadHeight = Math.floor(targetSpreadPageHeight / 2) * 2;

    const baseOptions: RenderOptions = {
      width: viewMode === "two-page" ? spreadWidth : singleWidth,
      height: viewMode === "two-page" ? spreadHeight : singleHeight,
      theme: readerTheme,
      fontSize,
      lineHeight,
      margin: Math.min(margin, 16),
      twoPageView: viewMode === "two-page",
      continuousScroll: false,
      zoom: zoomLevel,
    };

    try {
      if (viewMode === "single" && pageContainerRef.current) {
        await adapter.renderPage(currentPage, pageContainerRef.current, baseOptions);
      } else if (viewMode === "two-page" && leftPageRef.current && rightPageRef.current) {
        await adapter.renderPage(currentPage, leftPageRef.current, baseOptions);
        if (currentPage + 1 <= totalPages) {
          rightPageRef.current.style.display = "flex";
          await adapter.renderPage(currentPage + 1, rightPageRef.current, baseOptions);
        } else {
          rightPageRef.current.innerHTML = "";
          rightPageRef.current.style.display = "none";
        }
      }
    } catch (err) {
      logger.warn("RENDER_PAGE_ERROR", { currentPage, viewMode, error: String(err) });
    } finally {
      isRenderingRef.current = false;
      setRendering(false);
      if (renderPendingRef.current) {
        renderPendingRef.current = false;
        renderPages();
      }
    }
  }, [loading, viewMode, currentPage, totalPages, readerTheme, fontSize, lineHeight, margin, zoomLevel, logger]);

  // Re-render when layout parameters change
  useEffect(() => {
    if (!loading && !error && viewMode !== "scroll") {
      renderPages();
    }
  }, [loading, error, viewMode, renderPages]);

  // Debounced re-render when zoomLevel stabilizes to ensure vector clarity on canvas
  useEffect(() => {
    if (loading || error || viewMode === "scroll") return;
    const timer = setTimeout(() => {
      renderPages();
    }, 180);
    return () => clearTimeout(timer);
  }, [zoomLevel, loading, error, viewMode, renderPages]);

  // Lazy-loaded page slots IntersectionObserver for Continuous Scroll View
  useEffect(() => {
    if (viewMode !== "scroll" || !scrollContainerRef.current || !adapterRef.current || loading) {
      return;
    }

    const adapter = adapterRef.current;
    const container = containerRef.current;
    const height = container?.clientHeight || 600;

    const baseOptions: RenderOptions = {
      width: Math.floor(860 * zoomLevel),
      height: height - 40,
      theme: readerTheme,
      fontSize,
      lineHeight,
      margin,
      twoPageView: false,
      continuousScroll: true,
      zoom: zoomLevel,
    };

    // Invalidate cached renders when layout/theme/font settings change so slots re-render
    renderedPagesRef.current.clear();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute("data-page-num") || "0", 10);
            if (pageNum && !renderedPagesRef.current.has(pageNum)) {
              renderedPagesRef.current.add(pageNum);
              const contentEl = document.getElementById(`reader-page-content-${pageNum}`);
              if (contentEl) {
                adapter.renderPage(pageNum, contentEl, baseOptions).catch((err) => {
                  logger.warn("LAZY_RENDER_PAGE_ERROR", { pageNum, error: String(err) });
                });
              }
            }
          }
        });
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "600px 0px",
      }
    );

    const slots = scrollContainerRef.current.querySelectorAll(".reader-page-slot");
    slots.forEach((slot) => observer.observe(slot));

    return () => {
      observer.disconnect();
    };
  }, [viewMode, totalPages, loading, readerTheme, fontSize, lineHeight, margin, zoomLevel, logger]);

  // Initial scroll position restoration in scroll view
  useEffect(() => {
    if (viewMode === "scroll" && scrollContainerRef.current && currentPage > 1) {
      const timer = setTimeout(() => {
        const targetSlot = document.getElementById(`reader-page-${currentPage}`);
        if (targetSlot) {
          targetSlot.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Bidirectional scroll position tracking for Continuous Scroll View
  useEffect(() => {
    if (viewMode !== "scroll" || !scrollContainerRef.current) return;

    const scrollEl = scrollContainerRef.current;
    let ticking = false;

    const handleScroll = () => {
      if (isScrollingToPageRef.current) return;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
          if (!scrollEl) return;
          const containerRect = scrollEl.getBoundingClientRect();
          const anchorY = containerRect.top + Math.min(120, containerRect.height * 0.25);

          const slots = scrollEl.querySelectorAll(".reader-page-slot");
          let anchorPage: number | null = null;
          let maxVisibleHeight = -1;
          let mostVisiblePage = currentPage;

          slots.forEach((slot) => {
            const rect = slot.getBoundingClientRect();
            // Check reading eye-level anchor
            if (rect.top <= anchorY && rect.bottom >= anchorY) {
              const p = parseInt(slot.getAttribute("data-page-num") || "0", 10);
              if (p) anchorPage = p;
            }
            // Check largest visible height
            const visibleTop = Math.max(containerRect.top, rect.top);
            const visibleBottom = Math.min(containerRect.bottom, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            if (visibleHeight > maxVisibleHeight) {
              maxVisibleHeight = visibleHeight;
              const p = parseInt(slot.getAttribute("data-page-num") || "0", 10);
              if (p) mostVisiblePage = p;
            }
          });

          const activePage = anchorPage ?? mostVisiblePage;
          if (activePage !== currentPage && activePage >= 1 && activePage <= totalPages) {
            setCurrentPage(activePage);
            if (currentBookPath) {
              updateLocation(currentBookPath, activePage, totalPages);
            }
          }
        });
        ticking = true;
      }
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [viewMode, currentPage, totalPages, currentBookPath, updateLocation]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (viewMode !== "scroll") {
        renderPages();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderPages, viewMode]);

  // Navigation handlers
  const goToPage = useCallback((pageNum: number) => {
    const clamped = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(clamped);
    setPanOffset({ x: 0, y: 0 });
    if (currentBookPath) {
      updateLocation(currentBookPath, clamped, totalPages);
    }

    if (viewMode === "scroll" && scrollContainerRef.current) {
      const targetEl = document.getElementById(`reader-page-${clamped}`);
      if (targetEl) {
        isScrollingToPageRef.current = true;
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => {
          isScrollingToPageRef.current = false;
        }, 500);
      }
    }
  }, [totalPages, currentBookPath, updateLocation, viewMode]);

  const prevPage = useCallback(() => {
    const step = viewMode === "two-page" ? 2 : 1;
    goToPage(currentPage - step);
  }, [currentPage, viewMode, goToPage]);

  const nextPage = useCallback(() => {
    const step = viewMode === "two-page" ? 2 : 1;
    goToPage(currentPage + step);
  }, [currentPage, viewMode, goToPage]);

  // Zoom & Pan handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(3.0, +(prev + 0.1).toFixed(2)));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const next = Math.max(0.5, +(prev - 0.1).toFixed(2));
      if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1.0 && e.button === 0) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    }
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    resetAutoHideTimer();
    if (isDragging && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      const container = containerRef.current;
      const w = container?.clientWidth || 800;
      const h = container?.clientHeight || 600;
      const maxPanX = Math.max(80, (w * (zoomLevel - 1)) / 2 + 100);
      const maxPanY = Math.max(80, (h * (zoomLevel - 1)) / 2 + 100);

      setPanOffset({
        x: Math.min(maxPanX, Math.max(-maxPanX, dragStartRef.current.panX + dx)),
        y: Math.min(maxPanY, Math.max(-maxPanY, dragStartRef.current.panY + dy)),
      });
    }
  };

  const handleViewportMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleDoubleClick = () => {
    if (zoomLevel > 1.0) {
      handleResetZoom();
    } else {
      setZoomLevel(1.75);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Sync window fullscreen state
  useEffect(() => {
    isFullscreen().then(setIsWindowFullscreen).catch(() => {});
    const handleFullscreenChange = () => {
      isFullscreen().then(setIsWindowFullscreen).catch(() => {});
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const next = await toggleFullscreen();
    setIsWindowFullscreen(next);
  }, []);

  // Auto-hide top navigation bar timer (3.5s inactivity)
  const resetAutoHideTimer = useCallback(() => {
    setIsHeaderVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (!isHeaderPinned && !isTocOpen && !isSearchBookmarksOpen && !isSettingsOpen && !isJumpModalOpen) {
      hideTimerRef.current = setTimeout(() => {
        if (!isHeaderHoveredRef.current && !isHeaderPinned && !isTocOpen && !isSearchBookmarksOpen && !isSettingsOpen && !isJumpModalOpen) {
          setIsHeaderVisible(false);
        }
      }, 3500);
    }
  }, [isHeaderPinned, isTocOpen, isSearchBookmarksOpen, isSettingsOpen, isJumpModalOpen]);

  const handleMouseMove = useCallback(() => {
    resetAutoHideTimer();
  }, [resetAutoHideTimer]);

  // Keep header visible when drawers/settings/modals are active or header is pinned
  useEffect(() => {
    if (isHeaderPinned || isTocOpen || isSearchBookmarksOpen || isSettingsOpen || isJumpModalOpen) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setIsHeaderVisible(true);
    } else {
      resetAutoHideTimer();
    }
  }, [isHeaderPinned, isTocOpen, isSearchBookmarksOpen, isSettingsOpen, isJumpModalOpen, resetAutoHideTimer]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case "F11":
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case "p":
        case "P":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsHeaderPinned(curr => !curr);
          }
          break;
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
          if (isJumpModalOpen) {
            setIsJumpModalOpen(false);
          } else if (isSettingsOpen) {
            setIsSettingsOpen(false);
          } else if (isTocOpen) {
            setIsTocOpen(false);
          } else if (isSearchBookmarksOpen) {
            setIsSearchBookmarksOpen(false);
          } else if (isWindowFullscreen) {
            handleToggleFullscreen();
          } else {
            onClose();
          }
          break;
        case "s":
        case "S":
          e.preventDefault();
          setIsSettingsOpen(curr => !curr);
          break;
        case "f":
        case "F":
          e.preventDefault();
          setSearchBookmarksTab("search");
          setIsSearchBookmarksOpen(true);
          break;
        case "c":
        case "C":
          e.preventDefault();
          setIsTocOpen(curr => !curr);
          break;
        case "b":
        case "B":
          e.preventDefault();
          setSearchBookmarksTab("bookmarks");
          setIsSearchBookmarksOpen(curr => (searchBookmarksTab === "bookmarks" ? !curr : true));
          break;
        case "+":
        case "=":
          e.preventDefault();
          handleZoomIn();
          break;
        case "-":
        case "_":
          e.preventDefault();
          handleZoomOut();
          break;
        case "0":
          e.preventDefault();
          handleResetZoom();
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
  }, [
    nextPage,
    prevPage,
    goToPage,
    totalPages,
    onClose,
    isJumpModalOpen,
    isSettingsOpen,
    isTocOpen,
    isSearchBookmarksOpen,
    searchBookmarksTab,
    isWindowFullscreen,
    handleToggleFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  ]);

  // Multi-Touch Pinch & Swipe Listeners (Pointer Events & Touch Events with touch-action: none)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Pointer-events tracking map for reliable multi-touch gestures on Chromium / WebView2
    const activeTouches = new Map<number, { x: number; y: number }>();
    let initialPinchDist: number | null = null;
    let initialPinchZoom = 1.0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2) {
          e.preventDefault();
          const pts = Array.from(activeTouches.values());
          initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          initialPinchZoom = zoomLevelRef.current;
        } else if (activeTouches.size === 1) {
          touchStartXRef.current = e.clientX;
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" && activeTouches.has(e.pointerId)) {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2 && initialPinchDist && initialPinchDist > 0) {
          e.preventDefault();
          const pts = Array.from(activeTouches.values());
          const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const ratio = currentDist / initialPinchDist;
          const nextZoom = Math.min(3.0, Math.max(0.5, +(initialPinchZoom * ratio).toFixed(2)));
          setZoomLevel(nextZoom);
          if (nextZoom <= 1.0) {
            setPanOffset({ x: 0, y: 0 });
          }
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        activeTouches.delete(e.pointerId);
        if (activeTouches.size < 2) {
          initialPinchDist = null;
        }
        if (activeTouches.size === 0 && touchStartXRef.current !== null) {
          const diff = e.clientX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (zoomLevelRef.current <= 1.0 && Math.abs(diff) > 60) {
            if (diff < 0) {
              nextPage();
            } else {
              prevPage();
            }
          }
        }
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      activeTouches.delete(e.pointerId);
      if (activeTouches.size < 2) {
        initialPinchDist = null;
      }
      touchStartXRef.current = null;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Multi-touch pinch gesture - prevent browser from stealing touch
        e.preventDefault();
        touchStartXRef.current = null;
        touchDistanceRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartZoomRef.current = zoomLevelRef.current;
      } else if (e.touches.length === 1) {
        touchStartXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchDistanceRef.current !== null && touchDistanceRef.current > 0) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scaleRatio = currentDist / touchDistanceRef.current;
        const nextZoom = Math.min(3.0, Math.max(0.5, +(touchStartZoomRef.current * scaleRatio).toFixed(2)));
        setZoomLevel(nextZoom);
        if (nextZoom <= 1.0) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && touchDistanceRef.current !== null) {
        touchDistanceRef.current = null;
        touchStartXRef.current = null;
      }
      if (e.touches.length === 0 && touchStartXRef.current !== null) {
        if (e.changedTouches.length > 0) {
          const diff = e.changedTouches[0].clientX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (zoomLevelRef.current <= 1.0 && Math.abs(diff) > 50) {
            if (diff < 0) {
              nextPage();
            } else {
              prevPage();
            }
          }
        } else {
          touchStartXRef.current = null;
        }
      }
    };

    const onTouchCancel = () => {
      touchDistanceRef.current = null;
      touchStartXRef.current = null;
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerCancel);

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerCancel);

      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [nextPage, prevPage]);

  // Native Trackpad Pinch-to-Zoom & Two-Finger Panning listener (passive: false, window-captured)
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Trackpad pinch-to-zoom gesture or Ctrl + MouseWheel
        e.preventDefault();
        const delta = e.deltaY;
        const zoomDelta = -delta * 0.005;
        setZoomLevel(prev => {
          const next = Math.min(3.0, Math.max(0.5, +(prev * (1 + zoomDelta)).toFixed(3)));
          if (next <= 1.0) {
            setPanOffset({ x: 0, y: 0 });
          }
          return next;
        });
      } else if (zoomLevelRef.current > 1.0 && viewMode !== "scroll") {
        // Two-finger trackpad panning across zoomed document
        e.preventDefault();
        setPanOffset(prev => {
          const c = containerRef.current;
          const w = c?.clientWidth || 800;
          const h = c?.clientHeight || 600;
          const maxPanX = Math.max(80, (w * (zoomLevelRef.current - 1)) / 2 + 100);
          const maxPanY = Math.max(80, (h * (zoomLevelRef.current - 1)) / 2 + 100);
          return {
            x: Math.min(maxPanX, Math.max(-maxPanX, prev.x - e.deltaX)),
            y: Math.min(maxPanY, Math.max(-maxPanY, prev.y - e.deltaY)),
          };
        });
      }
    };

    // WebKit GestureEvent support (macOS trackpad parity)
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      touchStartZoomRef.current = zoomLevelRef.current;
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scale = (e as unknown as { scale: number }).scale;
      if (typeof scale === "number") {
        const next = Math.min(3.0, Math.max(0.5, +(touchStartZoomRef.current * scale).toFixed(2)));
        setZoomLevel(next);
        if (next <= 1.0) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    };

    const onGestureEnd = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("gesturestart", onGestureStart, { passive: false });
    window.addEventListener("gesturechange", onGestureChange, { passive: false });
    window.addEventListener("gestureend", onGestureEnd, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("gesturestart", onGestureStart);
      window.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("gestureend", onGestureEnd);
    };
  }, [viewMode]);

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
        lineHeight,
        margin,
        twoPageView: viewMode === "two-page",
        continuousScroll: viewMode === "scroll",
      });
    }
  }, [readerTheme, fontSize, lineHeight, margin, viewMode, currentBookPath, updateSettings]);

  // Auto-save reading position on unmount / window beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const pathToSave = currentBookPath || bookPathRef.current;
      if (pathToSave) {
        updateLocation(pathToSave, currentPage, totalPages);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const pathToSave = currentBookPath || bookPathRef.current;
      if (pathToSave) {
        updateLocation(pathToSave, currentPage, totalPages);
      }
    };
  }, [currentBookPath, currentPage, totalPages, updateLocation]);

  // Settings helpers
  const handleUpdateSettings = (updates: Partial<BookSettings>) => {
    if (updates.fontSize !== undefined) setFontSize(updates.fontSize);
    if (updates.lineHeight !== undefined) setLineHeight(updates.lineHeight);
    if (updates.margin !== undefined) setMargin(updates.margin);
    if (updates.theme !== undefined) setReaderTheme(updates.theme);
    if (updates.continuousScroll !== undefined && updates.continuousScroll) {
      setViewMode("scroll");
    } else if (updates.twoPageView !== undefined && updates.twoPageView) {
      setViewMode("two-page");
    } else if (updates.continuousScroll === false || updates.twoPageView === false) {
      setViewMode("single");
    }
    const pathToSave = currentBookPath || bookPathRef.current;
    if (pathToSave) {
      updateSettings(pathToSave, updates);
    }
  };

  const handleResetSettings = () => {
    setFontSize(16);
    setLineHeight(1.6);
    setMargin(32);
    setReaderTheme("dark");
    setViewMode("single");
  };

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
      className="flex-1 flex flex-col h-full overflow-hidden select-none relative"
      style={{ backgroundColor: themeStyle.bg, color: themeStyle.text }}
      onMouseMove={handleMouseMove}
    >
      {/* Top Hover Sensor Zone: hovering within top 24px reveals top header */}
      <div
        className="reader-top-hover-zone"
        onMouseEnter={() => {
          setIsHeaderVisible(true);
          resetAutoHideTimer();
        }}
      />

      {/* Floating Smart Auto-Hiding Top Navigation Bar */}
      <header
        className={`reader-header-floating flex items-center justify-between px-4 py-2 border-b z-50 ${
          isHeaderVisible || isHeaderPinned ? "reader-header-visible" : "reader-header-hidden"
        }`}
        style={{ backgroundColor: themeStyle.barBg, borderColor: themeStyle.border }}
        onMouseEnter={() => {
          isHeaderHoveredRef.current = true;
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          setIsHeaderVisible(true);
        }}
        onMouseLeave={() => {
          isHeaderHoveredRef.current = false;
          resetAutoHideTimer();
        }}
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
          {/* Search & Bookmarks Top Bar Buttons */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={() => {
                setSearchBookmarksTab("search");
                setIsSearchBookmarksOpen(curr => (searchBookmarksTab === "search" ? !curr : true));
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors ${
                isSearchBookmarksOpen && searchBookmarksTab === "search"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Search Book (Ctrl+F)"
            >
              <SearchIcon size={14} />
              <span>Search</span>
            </button>
            <button
              onClick={() => {
                setSearchBookmarksTab("bookmarks");
                setIsSearchBookmarksOpen(curr => (searchBookmarksTab === "bookmarks" ? !curr : true));
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                isSearchBookmarksOpen && searchBookmarksTab === "bookmarks"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Bookmarks (B)"
            >
              <BookmarkIcon size={14} />
              <span>Bookmarks</span>
              {bookBookmarks.length > 0 && (
                <span className="opacity-75 text-[10px] px-1 py-0.2 bg-amber-500 text-white rounded-full font-bold">
                  {bookBookmarks.length}
                </span>
              )}
            </button>
          </div>

          {/* View Mode Selectors */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={() => setViewMode("single")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "single"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Single Page View"
            >
              <RowsIcon size={13} />
              <span className="hidden sm:inline">Single</span>
            </button>
            <button
              onClick={() => setViewMode("two-page")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                viewMode === "two-page"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Two-Page Spread View"
            >
              <ColumnsIcon size={13} />
              <span className="hidden sm:inline">Spread</span>
            </button>
            <button
              onClick={() => setViewMode("scroll")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors border-l ${
                viewMode === "scroll"
                  ? "bg-[var(--color-primary)] text-white"
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              style={{ borderColor: themeStyle.border }}
              title="Continuous Scroll View"
            >
              <ThreeBarsIcon size={13} />
              <span className="hidden sm:inline">Scroll</span>
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
              <SunIcon size={13} />
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
              <span className="text-xs leading-none">📜</span>
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
              <MoonIcon size={13} />
            </button>
          </div>

          {/* Document Zoom Controls */}
          <div className="flex items-center rounded border overflow-hidden" style={{ borderColor: themeStyle.border }}>
            <button
              onClick={handleZoomOut}
              className="px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
              title="Zoom Out (- / Pinch In)"
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOutIcon size={13} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-semibold border-l border-r hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
              style={{ borderColor: themeStyle.border }}
              title="Reset Zoom to 100% Fit (0 / Double Click)"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30"
              title="Zoom In (+ / Pinch Out)"
              disabled={zoomLevel >= 3.0}
            >
              <ZoomInIcon size={13} />
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(curr => !curr)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
              isSettingsOpen
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={{ borderColor: themeStyle.border }}
            title="Configure book settings (S)"
          >
            <GearIcon size={14} />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* Header Pin Toggle Button */}
          <button
            onClick={() => setIsHeaderPinned(curr => !curr)}
            className={`p-1.5 rounded border transition-colors ${
              isHeaderPinned
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100"
            }`}
            style={{ borderColor: themeStyle.border }}
            title={isHeaderPinned ? "Unpin Top Panel (auto-hides after 3.5s of inactivity) (P)" : "Pin Top Panel (keep visible) (P)"}
          >
            {isHeaderPinned ? <PinIcon size={14} /> : <PinSlashIcon size={14} />}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={handleToggleFullscreen}
            className={`p-1.5 rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
              isWindowFullscreen
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/40 font-bold"
                : "opacity-80 hover:opacity-100"
            }`}
            style={{ borderColor: themeStyle.border }}
            title={isWindowFullscreen ? "Exit Fullscreen (F11 / Esc)" : "Enter Fullscreen Mode (F11)"}
          >
            {isWindowFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ml-1"
            title="Close Book (Esc)"
          >
            <XIcon size={18} />
          </button>
        </div>
      </header>

      {/* Left-Side Content / Table of Contents Button (just below top panel menu) */}
      <div
        className={`absolute left-4 z-40 transition-all duration-300 pointer-events-auto ${
          isHeaderVisible || isHeaderPinned ? "top-14" : "top-4"
        }`}
      >
        <button
          onClick={() => {
            setIsTocOpen(curr => !curr);
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-md backdrop-blur-md text-xs font-medium transition-all ${
            isTocOpen
              ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg scale-105"
              : "hover:scale-105 hover:bg-black/5 dark:hover:bg-white/10"
          }`}
          style={{
            backgroundColor: isTocOpen ? undefined : themeStyle.barBg,
            borderColor: themeStyle.border,
          }}
          title="Table of Contents (C)"
        >
          <ListUnorderedIcon size={14} />
          <span>Contents</span>
          {toc.length > 0 && (
            <span className="opacity-80 text-[10px] px-1.5 py-0.2 bg-black/10 dark:bg-white/10 rounded-full font-bold">
              {toc.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Reading Viewport */}
      <main
        className={`flex-1 relative reader-viewport-main ${
          viewMode === "scroll"
            ? "overflow-hidden flex flex-col"
            : "overflow-hidden flex items-center justify-center p-2"
        }`}
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
            className="relative w-full h-full flex overflow-auto p-4"
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: zoomLevel > 1.0 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            {bookBookmarks.some(b => b.location === currentPage) && (
              <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage}`}>
                <div className="bookmark-corner-ribbon-badge">
                  <BookmarkFillIcon size={14} />
                </div>
              </div>
            )}
            <div
              className={`reader-zoom-wrapper m-auto flex items-center justify-center ${zoomLevel > 1.0 ? "is-zoomed" : ""}`}
              style={{
                transform:
                  zoomLevel === 1.0 && panOffset.x === 0 && panOffset.y === 0
                    ? "none"
                    : `translate3d(${Math.round(panOffset.x)}px, ${Math.round(panOffset.y)}px, 0) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 100ms ease-out",
              }}
            >
              <div
                ref={pageContainerRef}
                className="reader-page-fit-container shadow-md rounded"
              />
            </div>
          </div>
        )}

        {/* Two-Page Spread View */}
        {viewMode === "two-page" && (
          <div
            className="w-full h-full flex overflow-auto p-4 relative"
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: zoomLevel > 1.0 ? (isDragging ? "grabbing" : "grab") : "default" }}
          >
            <div
              className={`reader-zoom-wrapper m-auto flex items-center justify-center gap-0 reader-spread-book ${zoomLevel > 1.0 ? "is-zoomed" : ""}`}
              style={{
                transform:
                  zoomLevel === 1.0 && panOffset.x === 0 && panOffset.y === 0
                    ? "none"
                    : `translate3d(${Math.round(panOffset.x)}px, ${Math.round(panOffset.y)}px, 0) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 100ms ease-out",
              }}
            >
              <div
                className="relative flex items-center justify-end overflow-hidden border-r"
                style={{ borderColor: themeStyle.border }}
              >
                {bookBookmarks.some(b => b.location === currentPage) && (
                  <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage}`}>
                    <div className="bookmark-corner-ribbon-badge">
                      <BookmarkFillIcon size={14} />
                    </div>
                  </div>
                )}
                <div ref={leftPageRef} className="reader-page-fit-container flex items-center justify-end overflow-hidden" />
              </div>
              <div
                className="relative flex items-center justify-start overflow-hidden"
              >
                {bookBookmarks.some(b => b.location === currentPage + 1) && (
                  <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage + 1}`}>
                    <div className="bookmark-corner-ribbon-badge">
                      <BookmarkFillIcon size={14} />
                    </div>
                  </div>
                )}
                <div ref={rightPageRef} className="reader-page-fit-container flex items-center justify-start overflow-hidden" />
              </div>
            </div>
          </div>
        )}

        {/* Continuous Scroll View */}
        {viewMode === "scroll" && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-auto p-6 transition-all duration-150"
          >
            <div
              className="mx-auto flex flex-col items-center"
              style={{
                width: `${Math.floor(860 * zoomLevel)}px`,
                minWidth: `${Math.floor(860 * zoomLevel)}px`,
              }}
            >
              {scrollPages.map((pageNum: number) => {
                const isBookmarked = bookBookmarks.some(b => b.location === pageNum);
                return (
                  <div
                    key={pageNum}
                    id={`reader-page-${pageNum}`}
                    data-page-num={pageNum}
                    className="reader-page-slot my-6 rounded shadow-sm border relative transition-all"
                    style={{
                      width: `${Math.floor(860 * zoomLevel)}px`,
                      minHeight: "700px",
                      backgroundColor: themeStyle.pageBg,
                      borderColor: themeStyle.border,
                    }}
                  >
                    {isBookmarked && (
                      <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${pageNum}`}>
                        <div className="bookmark-corner-ribbon-badge">
                          <BookmarkFillIcon size={14} />
                        </div>
                      </div>
                    )}
                    <div
                      id={`reader-page-content-${pageNum}`}
                      className="w-full h-full min-h-[700px] flex items-center justify-center p-2"
                    >
                      <div className="text-xs text-[var(--color-text-muted)] opacity-50 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                        Page {pageNum} of {totalPages}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
            className="px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeftIcon size={16} />
            <span>Prev</span>
          </button>
        </div>

        {/* Center Scrubber and Location */}
        <div className="flex-1 max-w-xl flex items-center gap-3">
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--color-primary)] cursor-pointer h-2 bg-black/10 dark:bg-white/10 rounded-lg relative z-0"
            />
            {/* Scrubber Timeline Bookmark Pin Markers */}
            {totalPages > 1 && bookBookmarks.map((bm) => {
              const loc = typeof bm.location === 'number' ? bm.location : parseInt(String(bm.location), 10);
              if (isNaN(loc) || loc < 1 || loc > totalPages) return null;
              const percent = ((loc - 1) / (totalPages - 1)) * 100;
              return (
                <div
                  key={bm.id}
                  className="scrubber-bookmark-pin"
                  style={{ left: `${percent}%` }}
                  title={`Bookmark on Page ${loc}${bm.label ? `: ${bm.label}` : ''} (Click to jump)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPage(loc);
                  }}
                />
              );
            })}
          </div>

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

          {/* Quick Bookmark Toggle with Octicon */}
          <button
            onClick={() => {
              if (currentBookPath) {
                const existing = bookBookmarks.find(b => b.location === currentPage);
                if (existing) {
                  removeBookmark(currentBookPath, existing.id);
                } else {
                  addBookmark(currentBookPath, {
                    location: currentPage,
                    label: `Page ${currentPage}`,
                  });
                }
              }
            }}
            title={
              bookBookmarks.some(b => b.location === currentPage)
                ? "Remove bookmark for this page"
                : "Bookmark this page"
            }
            className={`p-1.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${
              bookBookmarks.some(b => b.location === currentPage)
                ? "text-amber-500"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {bookBookmarks.some(b => b.location === currentPage) ? (
              <BookmarkFillIcon size={16} />
            ) : (
              <BookmarkIcon size={16} />
            )}
          </button>

          {/* Quick Resume/Next Bookmark Jump button */}
          {bookBookmarks.length > 0 && (
            <button
              onClick={() => {
                const nextBm = bookBookmarks.find(b => Number(b.location) > currentPage) || bookBookmarks[0];
                if (nextBm) {
                  goToPage(typeof nextBm.location === 'number' ? nextBm.location : parseInt(String(nextBm.location), 10));
                }
              }}
              className="px-2 py-1 text-xs font-medium rounded border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
              title="Resume reading at next bookmark"
            >
              <BookmarkFillIcon size={12} />
              <span className="hidden sm:inline">Resume</span>
            </button>
          )}

          <span className="text-xs font-medium text-[var(--color-text-muted)] whitespace-nowrap">
            {progressPercent}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/10 dark:hover:bg-white/10"
            title="Next Page (Right Arrow)"
          >
            <span>Next</span>
            <ChevronRightIcon size={16} />
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

      {/* Table of Contents Drawer (Left-Docked) */}
      <TableOfContentsDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        toc={toc}
        currentPage={currentPage}
        onNavigateToPage={(page) => {
          goToPage(page);
          setIsTocOpen(false);
        }}
        theme={readerTheme}
      />

      {/* Search and Bookmarks Drawer (Right-Docked) */}
      <SearchAndBookmarksDrawer
        isOpen={isSearchBookmarksOpen}
        onClose={() => setIsSearchBookmarksOpen(false)}
        activeTab={searchBookmarksTab}
        onTabChange={setSearchBookmarksTab}
        currentPage={currentPage}
        onNavigateToPage={(page) => {
          goToPage(page);
        }}
        onSearch={async (query) => {
          if (!adapterRef.current) return [];
          return adapterRef.current.search(query);
        }}
        bookmarks={bookBookmarks}
        onAddBookmark={(page, label) => {
          if (currentBookPath) {
            addBookmark(currentBookPath, { location: page, label });
          }
        }}
        onRemoveBookmark={(id) => {
          if (currentBookPath) {
            removeBookmark(currentBookPath, id);
          }
        }}
        theme={readerTheme}
      />

      {/* Settings Drawer (Right-Docked) */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={{
          fontSize,
          lineHeight,
          margin,
          theme: readerTheme,
          twoPageView: viewMode === "two-page",
          continuousScroll: viewMode === "scroll",
        }}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
        bookInstance={bookInstance}
        currentPage={currentPage}
        totalPages={totalPages}
        theme={readerTheme}
      />
    </div>
  );
}

