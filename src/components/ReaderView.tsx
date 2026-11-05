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
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckCircleFillIcon,
} from "@primer/octicons-react";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useBookStore } from "../stores/bookStore";
import { useUiStore } from "../stores/uiStore";
import { getAdapterForPath } from "../adapters/registry";
import { getFileSystemProvider } from "../platform/fs";
import { registerBackHandler } from "../utils/backNavigation";
import { useLogger } from "../utils/logger";
import { toggleFullscreen, isFullscreen } from "../utils/windowState";
import { extractDocumentTitle } from "../utils/pathUtils";
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
  const { isCompact } = useBreakpoint();
  const { currentBookPath, currentBookTitle, bookStates, getBookState, updateLocation, updateSettings, addBookmark, removeBookmark, toggleBookCompleted, setBookCompleted } = useBookStore();
  const { toggleSidebar, sidebarVisible } = useUiStore();

  const isCompleted = useMemo(() => {
    if (!currentBookPath) return false;
    return Boolean(bookStates[currentBookPath]?.isCompleted);
  }, [currentBookPath, bookStates]);

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  const minZoom = isCompact || isMobile ? 1.0 : 0.6;
  const maxZoom = 3.0;

  const bookBookmarks = useMemo(() => {
    if (!currentBookPath) return [];
    return bookStates[currentBookPath]?.bookmarks ?? [];
  }, [currentBookPath, bookStates]);

  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookInstance, setBookInstance] = useState<BookInstance | null>(null);

  const displayTitle = useMemo(() => {
    if (bookInstance?.title) {
      const candidate = extractDocumentTitle(bookInstance.title);
      if (candidate && candidate !== "Document") return candidate;
    }
    if (currentBookTitle) {
      const candidate = extractDocumentTitle(currentBookTitle);
      if (candidate && candidate !== "Document") return candidate;
    }
    if (currentBookPath) {
      return extractDocumentTitle(currentBookPath);
    }
    return "Ebook Reader";
  }, [bookInstance?.title, currentBookTitle, currentBookPath]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "two-page" | "scroll">("scroll");
  const [readerTheme, setReaderTheme] = useState<"light" | "dark" | "sepia">("dark");
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [margin, setMargin] = useState<number>(32);
  const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Panel behavior mode — loaded from saved settings, default 'smart'
  const [panelMode, setPanelMode] = useState<'smart' | 'persistent'>('smart');

  // Smart Auto-Hiding Top & Bottom Panels & Fullscreen state
  const [arePanelsVisible, setArePanelsVisible] = useState(true);
  const [isHeaderPinned, setIsHeaderPinned] = useState(false);
  const [isWindowFullscreen, setIsWindowFullscreen] = useState(false);
  const panelsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTopHoveredRef = useRef<boolean>(false);
  const isBottomHoveredRef = useRef<boolean>(false);
  const isRenderingRef = useRef<boolean>(false);
  const renderPendingRef = useRef<boolean>(false);

  // Exact page dimensions for Single and Spread views to prevent layout clipping
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 800 });
  const [spreadDimensions, setSpreadDimensions] = useState<{ width: number; height: number }>({ width: 500, height: 700 });

  // EPUB scroll-view container ref — used for single-rendition EPUB scroll mode
  const epubScrollContainerRef = useRef<HTMLDivElement>(null);

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
  const scrollPagesWrapperRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<BookAdapter | null>(null);
  const gestureStartZoomRef = useRef<number>(1.0);
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const isScrollingToPageRef = useRef<boolean>(false);
  const isPinchingRef = useRef<boolean>(false);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const bookPathRef = useRef<string | null>(currentBookPath);

  useEffect(() => {
    if (currentBookPath) bookPathRef.current = currentBookPath;
  }, [currentBookPath]);

  // Zoom & Pan Engine state (0.5x to 3.0x, default 1.0x / Fit)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [debouncedZoomLevel, setDebouncedZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const zoomLevelRef = useRef<number>(1.0);
  zoomLevelRef.current = zoomLevel;
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  panOffsetRef.current = panOffset;
  const currentPageRef = useRef<number>(currentPage);
  currentPageRef.current = currentPage;
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  // Debounce zoom level updates so continuous scroll observer doesn't flush canvases at 60fps
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedZoomLevel(zoomLevel);
    }, 250);
    return () => clearTimeout(timer);
  }, [zoomLevel]);

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

        const provider = await getFileSystemProvider();
        const fileBytes = await provider.readFile({ id: currentBookPath!, name: currentBookPath! });
        if (!fileBytes || fileBytes.length === 0) {
          throw new Error("Unable to read book content from filesystem.");
        }

        const instance = await adapter.load(currentBookPath!, fileBytes);
        if (!isMounted) return;

        setBookInstance(instance);
        const count = Math.max(1, adapter.getPageCount());
        setTotalPages(count);

        // Wire adapter location change callback (e.g. EPUB continuous scroll / CFI relocation)
        adapter.onLocationChange = (newPage: number) => {
          if (!isMounted) return;
          setCurrentPage(newPage);
          if (bookPathRef.current) {
            updateLocation(bookPathRef.current, newPage, count);
            if (newPage >= count && count > 0) {
              setBookCompleted(bookPathRef.current, true);
            }
          }
        };

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
            // Restore panel mode preference
            if (savedState.settings.panelMode) {
              setPanelMode(savedState.settings.panelMode);
            }
            // Restore per-book zoom level
            if (typeof savedState.settings.zoom === 'number') {
              const restoredZoom = Math.min(maxZoom, Math.max(minZoom, savedState.settings.zoom));
              setZoomLevel(restoredZoom);
              setDebouncedZoomLevel(restoredZoom);
              zoomLevelRef.current = restoredZoom;
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

    // In smart panel mode both header & footer float over the viewport, so subtract
    // their heights from the available rendering area to prevent content being clipped.
    // In persistent mode they are in-flow and already excluded from container height.
    const HEADER_H = 48;
    const FOOTER_H = 52;
    const floatingOffset = panelMode === 'smart' ? HEADER_H + FOOTER_H : 0;
    const effectiveHeight = Math.max(200, height - floatingOffset);

    // Available space for page rendering
    const availableWidth = width;
    const availableHeight = effectiveHeight;

    // Responsive baseline width: on mobile, fill available screen width; on desktop, center column
    const scrollBaselineWidth = isCompact ? Math.max(300, availableWidth - 8) : 860;

    // Single view: fit page within viewport bounds without vertical or horizontal clipping
    const maxSingleWidth = isCompact ? Math.max(280, availableWidth - 8) : Math.min(availableWidth - 32, Math.floor(scrollBaselineWidth * 0.81));
    const maxSingleHeight = isCompact ? Math.max(200, availableHeight - 16) : Math.max(200, availableHeight - 32);

    // Maintain aspect ratio (~1.41) so the full page is visible
    const targetSingleWidth = Math.min(maxSingleWidth, Math.floor(maxSingleHeight / 1.41));
    const targetSingleHeight = Math.min(maxSingleHeight, Math.floor(targetSingleWidth * 1.41));
    const singleWidth = Math.floor(targetSingleWidth / 2) * 2;
    const singleHeight = Math.floor(targetSingleHeight / 2) * 2;

    // Spread view: two pages side by side, fitting within available viewport
    const maxSpreadPageWidth = Math.min(Math.floor((availableWidth - 48) / 2), Math.floor(scrollBaselineWidth * 0.74));
    const maxSpreadPageHeight = isCompact ? Math.max(200, availableHeight - 16) : Math.max(200, availableHeight - 32);

    const targetSpreadPageWidth = Math.min(maxSpreadPageWidth, Math.floor(maxSpreadPageHeight / 1.41));
    const targetSpreadPageHeight = Math.min(maxSpreadPageHeight, Math.floor(targetSpreadPageWidth * 1.41));
    const spreadWidth = Math.floor(targetSpreadPageWidth / 2) * 2;
    const spreadHeight = Math.floor(targetSpreadPageHeight / 2) * 2;

    // Keep page dimensions state synchronized to enforce strictly bounded wrapper containers
    setPageDimensions({ width: singleWidth, height: singleHeight });
    setSpreadDimensions({ width: spreadWidth, height: spreadHeight });

    const baseOptions: RenderOptions = {
      width: viewMode === "two-page" ? spreadWidth : singleWidth,
      height: viewMode === "two-page" ? spreadHeight : singleHeight,
      theme: readerTheme,
      fontSize,
      lineHeight,
      margin: isCompact ? 0 : Math.min(margin, 16),
      twoPageView: viewMode === "two-page",
      continuousScroll: false,
      zoom: zoomLevel,
    };

    try {
      if (viewMode === "single" && pageContainerRef.current) {
        await adapter.renderPage(currentPage, pageContainerRef.current, baseOptions);
      } else if (viewMode === "two-page" && leftPageRef.current && rightPageRef.current) {
        if (bookInstance?.format === 'epub') {
          // For reflowable EPUB, a single container renders the entire 2-page spread
          rightPageRef.current.innerHTML = "";
          rightPageRef.current.style.display = "none";
          const epubSpreadOptions: RenderOptions = {
            ...baseOptions,
            width: spreadWidth * 2,
            twoPageView: true,
          };
          await adapter.renderPage(currentPage, leftPageRef.current, epubSpreadOptions);
        } else {
          await adapter.renderPage(currentPage, leftPageRef.current, baseOptions);
          if (currentPage + 1 <= totalPages) {
            rightPageRef.current.style.display = "flex";
            await adapter.renderPage(currentPage + 1, rightPageRef.current, baseOptions);
          } else {
            rightPageRef.current.innerHTML = "";
            rightPageRef.current.style.display = "none";
          }
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

  // Lazy-loaded page slots IntersectionObserver for Continuous Scroll View (paged formats: PDF, CBZ, TXT, HTML)
  useEffect(() => {
    if (viewMode !== "scroll" || !scrollContainerRef.current || !adapterRef.current || loading || bookInstance?.format === "epub") {
      return;
    }

    const adapter = adapterRef.current;
    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;
    const baselineWidth = isCompact ? Math.max(300, width - 8) : 860;

    const baseOptions: RenderOptions = {
      width: Math.floor(baselineWidth * debouncedZoomLevel),
      height: height - 40,
      theme: readerTheme,
      fontSize,
      lineHeight,
      margin: isCompact ? 0 : Math.min(margin, 16),
      twoPageView: false,
      continuousScroll: true,
      zoom: debouncedZoomLevel,
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
  }, [viewMode, totalPages, loading, readerTheme, fontSize, lineHeight, margin, debouncedZoomLevel, logger, bookInstance?.format]);

  // EPUB Continuous Scroll View Rendering
  useEffect(() => {
    if (viewMode !== "scroll" || !epubScrollContainerRef.current || !adapterRef.current || loading || bookInstance?.format !== "epub") {
      return;
    }

    const adapter = adapterRef.current;
    const container = containerRef.current;
    const width = container?.clientWidth || 800;
    const height = container?.clientHeight || 600;
    const baselineWidth = isCompact ? Math.max(300, width - 8) : 860;

    const baseOptions: RenderOptions = {
      width: Math.floor(baselineWidth * debouncedZoomLevel),
      height: Math.max(400, height - 40),
      theme: readerTheme,
      fontSize,
      lineHeight,
      margin: isCompact ? 0 : Math.min(margin, 16),
      twoPageView: false,
      continuousScroll: true,
      zoom: debouncedZoomLevel,
    };

    if (typeof adapter.renderScrollView === "function") {
      adapter.renderScrollView(epubScrollContainerRef.current, baseOptions).catch((err) => {
        logger.warn("EPUB_SCROLL_RENDER_ERROR", { error: String(err) });
      });
    } else {
      adapter.renderPage(currentPage, epubScrollContainerRef.current, baseOptions).catch((err) => {
        logger.warn("EPUB_SCROLL_RENDER_ERROR", { error: String(err) });
      });
    }
  }, [viewMode, loading, bookInstance?.format, debouncedZoomLevel, readerTheme, fontSize, lineHeight, margin, isCompact, logger]);

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
    if (viewMode !== "scroll" || !scrollContainerRef.current || loading) return;

    const scrollEl = scrollContainerRef.current;
    let ticking = false;

    const handleScroll = (isUserScroll = true) => {
      if (isScrollingToPageRef.current || isPinchingRef.current) return;
      if (isUserScroll) {
        resetPanelsAutoHideTimerRef.current(2000);
      }
      if (!ticking) {
        window.requestAnimationFrame(() => {
          ticking = false;
          if (!scrollEl) return;

          // For EPUB continuous scroll view: location is tracked via adapter.onLocationChange (relocated event),
          // avoiding linear pixel-ratio resets across variable chapter lengths.
          if (bookInstance?.format === "epub") {
            return;
          }

          const containerRect = scrollEl.getBoundingClientRect();
          const centerY = containerRect.top + containerRect.height / 2;

          const slots = scrollEl.querySelectorAll(".reader-page-slot");
          let centerPage: number | null = null;
          let maxVisibleHeight = -1;
          let mostVisiblePage = currentPageRef.current;

          slots.forEach((slot) => {
            const rect = slot.getBoundingClientRect();
            // Check reading eye-level anchor at viewport center
            if (rect.top <= centerY && rect.bottom >= centerY) {
              const p = parseInt(slot.getAttribute("data-page-num") || "0", 10);
              if (p) centerPage = p;
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

          const activePage = centerPage ?? mostVisiblePage;
          if (activePage !== currentPageRef.current && activePage >= 1 && activePage <= totalPages) {
            setCurrentPage(activePage);
            if (currentBookPath) {
              updateLocation(currentBookPath, activePage, totalPages);
              if (activePage >= totalPages && totalPages > 0) {
                setBookCompleted(currentBookPath, true);
              }
            }
          }

          // Check if scrolled to the end of the continuous scroll document
          const isAtBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 30;
          if (isAtBottom && currentBookPath && totalPages > 0) {
            setBookCompleted(currentBookPath, true);
          }
        });
        ticking = true;
      }
    };

    // Immediately evaluate active page on mount without triggering user-scroll panel reveal
    handleScroll(false);

    const onScrollListener = () => handleScroll(true);
    scrollEl.addEventListener("scroll", onScrollListener, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScrollListener);
  }, [viewMode, loading, totalPages, currentBookPath, updateLocation, setBookCompleted, bookInstance?.format]);

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
      if ((clamped >= totalPages || (viewMode === "two-page" && clamped >= totalPages - 1)) && totalPages > 0) {
        setBookCompleted(currentBookPath, true);
      }
    }

    if (viewMode === "scroll") {
      if (bookInstance?.format === "epub") {
        if (adapterRef.current) {
          adapterRef.current.goToLocation(clamped - 1);
        }
      } else if (scrollContainerRef.current) {
        const targetEl = document.getElementById(`reader-page-${clamped}`);
        if (targetEl) {
          isScrollingToPageRef.current = true;
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            isScrollingToPageRef.current = false;
          }, 500);
        }
      }
    }
  }, [totalPages, currentBookPath, updateLocation, setBookCompleted, viewMode, bookInstance?.format]);

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
    setZoomLevel(prev => Math.min(maxZoom, +(prev + 0.1).toFixed(2)));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const next = Math.max(minZoom, +(prev - 0.1).toFixed(2));
      if (next <= 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, [minZoom]);

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

  // Panels auto-hide timer (in smart mode: 2s inactivity when user stops interacting)
  const resetPanelsAutoHideTimer = useCallback((durationMs = 2000) => {
    if (panelMode === "persistent") {
      setArePanelsVisible(true);
      return;
    }
    setArePanelsVisible(true);
    if (panelsTimerRef.current) {
      clearTimeout(panelsTimerRef.current);
    }
    if (!isHeaderPinned && !isTocOpen && !isSearchBookmarksOpen && !isSettingsOpen && !isJumpModalOpen) {
      panelsTimerRef.current = setTimeout(() => {
        if (!isTopHoveredRef.current && !isBottomHoveredRef.current && !isHeaderPinned && !isTocOpen && !isSearchBookmarksOpen && !isSettingsOpen && !isJumpModalOpen) {
          setArePanelsVisible(false);
        }
      }, durationMs);
    }
  }, [panelMode, isHeaderPinned, isTocOpen, isSearchBookmarksOpen, isSettingsOpen, isJumpModalOpen]);

  const resetPanelsAutoHideTimerRef = useRef(resetPanelsAutoHideTimer);
  resetPanelsAutoHideTimerRef.current = resetPanelsAutoHideTimer;

  const handlePanelMouseEnter = useCallback((panel: "top" | "bottom") => {
    if (panel === "top") isTopHoveredRef.current = true;
    if (panel === "bottom") isBottomHoveredRef.current = true;
    if (panelsTimerRef.current) clearTimeout(panelsTimerRef.current);
    setArePanelsVisible(true);
  }, []);

  const handlePanelMouseLeave = useCallback((panel: "top" | "bottom") => {
    if (panel === "top") isTopHoveredRef.current = false;
    if (panel === "bottom") isBottomHoveredRef.current = false;
    resetPanelsAutoHideTimer(2000);
  }, [resetPanelsAutoHideTimer]);

  // Unified panel visibility flag: true if in persistent mode, drawer/modal open, pinned, or hovered
  const isPanelVisible =
    panelMode === "persistent" ||
    arePanelsVisible ||
    isHeaderPinned ||
    isTocOpen ||
    isSearchBookmarksOpen ||
    isSettingsOpen ||
    isJumpModalOpen;

  // Keep panels visible when drawers/settings/modals are active or header is pinned or mode is persistent
  useEffect(() => {
    if (panelMode === "persistent") {
      if (panelsTimerRef.current) clearTimeout(panelsTimerRef.current);
      setArePanelsVisible(true);
    } else {
      if (isHeaderPinned || isTocOpen || isSearchBookmarksOpen || isSettingsOpen || isJumpModalOpen) {
        if (panelsTimerRef.current) clearTimeout(panelsTimerRef.current);
        setArePanelsVisible(true);
      } else if (!isTopHoveredRef.current && !isBottomHoveredRef.current) {
        resetPanelsAutoHideTimer(2000);
      }
    }
  }, [panelMode, isHeaderPinned, isTocOpen, isSearchBookmarksOpen, isSettingsOpen, isJumpModalOpen, resetPanelsAutoHideTimer]);

  useEffect(() => {
    return () => {
      if (panelsTimerRef.current) clearTimeout(panelsTimerRef.current);
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

  // Multi-Touch Pinch, Pan, Swipe & Double-Tap Controller
  useEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;

    const track = {
      mode: "none" as "none" | "pan" | "pinch" | "swipe",
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      initialDist: 0,
      initialZoom: 1.0,
      focalX: 0,
      focalY: 0,
      focalLocalX: 0,
      focalLocalY: 0,
      currentScaleRatio: 1.0,
      lastTapTime: 0,
      lastTapX: 0,
      lastTapY: 0,
    };

    const onTouchStart = (e: TouchEvent) => {
      resetPanelsAutoHideTimerRef.current(2000);
      const now = Date.now();

      if (e.touches.length === 2) {
        // Multi-touch pinch gesture
        e.preventDefault();
        isPinchingRef.current = true;
        setIsPinching(true);
        track.mode = "pinch";
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        track.initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        track.initialZoom = zoomLevelRef.current;
        track.focalX = (t1.clientX + t2.clientX) / 2;
        track.focalY = (t1.clientY + t2.clientY) / 2;
        track.startX = track.focalX;
        track.startY = track.focalY;
        track.lastX = track.focalX;
        track.lastY = track.focalY;
        track.currentScaleRatio = 1.0;

        if (viewMode === "scroll" && scrollContainerRef.current) {
          const rect = scrollContainerRef.current.getBoundingClientRect();
          track.focalLocalX = track.focalX - rect.left;
          track.focalLocalY = track.focalY - rect.top;
        }
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const timeDiff = now - track.lastTapTime;
        const distDiff = Math.hypot(touch.clientX - track.lastTapX, touch.clientY - track.lastTapY);

        // Check for double-tap (< 300ms, < 24px)
        if (timeDiff < 300 && distDiff < 24) {
          e.preventDefault();
          track.lastTapTime = 0;
          if (zoomLevelRef.current > 1.05) {
            setZoomLevel(minZoom);
            setPanOffset({ x: 0, y: 0 });
          } else {
            const targetZoom = 1.75;
            setZoomLevel(targetZoom);
            if (viewMode !== "scroll") {
              const c = containerRef.current;
              const rect = c?.getBoundingClientRect() || { left: 0, top: 0, width: 800, height: 600 };
              const relX = touch.clientX - (rect.left + rect.width / 2);
              const relY = touch.clientY - (rect.top + rect.height / 2);
              setPanOffset({ x: -relX * 0.75, y: -relY * 0.75 });
            } else if (scrollContainerRef.current) {
              const scrollEl = scrollContainerRef.current;
              const rect = scrollEl.getBoundingClientRect();
              const tapFocalX = touch.clientX - rect.left;
              const tapFocalY = touch.clientY - rect.top;
              const ratio = targetZoom / zoomLevelRef.current;
              scrollEl.scrollLeft = Math.max(0, (scrollEl.scrollLeft + tapFocalX) * ratio - tapFocalX);
              scrollEl.scrollTop = Math.max(0, (scrollEl.scrollTop + tapFocalY) * ratio - tapFocalY);
            }
          }
          return;
        }

        track.lastTapTime = now;
        track.lastTapX = touch.clientX;
        track.lastTapY = touch.clientY;
        track.startX = touch.clientX;
        track.startY = touch.clientY;
        track.lastX = touch.clientX;
        track.lastY = touch.clientY;

        if (zoomLevelRef.current > 1.05) {
          track.mode = "pan";
          if (viewMode !== "scroll") {
            e.preventDefault();
          }
        } else {
          track.mode = "swipe";
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      resetPanelsAutoHideTimerRef.current(2000);
      if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        // Safety initialization if finger 2 landed during move or mode wasn't set to pinch yet
        if (track.mode !== "pinch" || track.initialDist <= 0) {
          isPinchingRef.current = true;
          setIsPinching(true);
          track.mode = "pinch";
          track.initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          track.initialZoom = zoomLevelRef.current;
          track.focalX = (t1.clientX + t2.clientX) / 2;
          track.focalY = (t1.clientY + t2.clientY) / 2;
          track.startX = track.focalX;
          track.startY = track.focalY;
          track.lastX = track.focalX;
          track.lastY = track.focalY;
          track.currentScaleRatio = 1.0;
          if (viewMode === "scroll" && scrollContainerRef.current) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            track.focalLocalX = track.focalX - rect.left;
            track.focalLocalY = track.focalY - rect.top;
          }
          return;
        }

        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scaleRatio = currentDist / track.initialDist;
        const targetZoom = Math.min(maxZoom, Math.max(minZoom, track.initialZoom * scaleRatio));
        const effectiveRatio = targetZoom / track.initialZoom;
        track.currentScaleRatio = effectiveRatio;

        const currentFocalX = (t1.clientX + t2.clientX) / 2;
        const currentFocalY = (t1.clientY + t2.clientY) / 2;

        if (viewMode === "scroll") {
          // Hardware GPU transform during active pinch gesture (zero layout reflow & zero shake)
          if (scrollPagesWrapperRef.current) {
            const wrapper = scrollPagesWrapperRef.current;
            const focalX = track.focalLocalX || (currentFocalX - (scrollContainerRef.current?.getBoundingClientRect().left || 0));
            const focalY = track.focalLocalY || (currentFocalY - (scrollContainerRef.current?.getBoundingClientRect().top || 0));
            wrapper.style.transformOrigin = `${focalX}px ${focalY}px`;
            wrapper.style.transform = `scale(${effectiveRatio})`;
            wrapper.style.transition = "none";
          }
        } else {
          // Single / Two-Page view: adjust pan offset smoothly
          const prevZoom = zoomLevelRef.current;
          if (targetZoom <= 1.0) {
            setPanOffset({ x: 0, y: 0 });
          } else if (prevZoom > 0 && Math.abs(targetZoom - prevZoom) > 0.005) {
            const c = containerRef.current;
            const rect = c?.getBoundingClientRect() || { left: 0, top: 0, width: 800, height: 600 };
            const focalCenterX = currentFocalX - (rect.left + rect.width / 2);
            const focalCenterY = currentFocalY - (rect.top + rect.height / 2);
            const ratio = targetZoom / prevZoom;
            setPanOffset(prev => ({
              x: (prev.x - focalCenterX) * ratio + focalCenterX,
              y: (prev.y - focalCenterY) * ratio + focalCenterY,
            }));
          }
          setZoomLevel(+targetZoom.toFixed(2));
        }
      } else if (e.touches.length === 1 && track.mode === "pan" && zoomLevelRef.current > 1.05) {
        const touch = e.touches[0];
        const dx = touch.clientX - track.lastX;
        const dy = touch.clientY - track.lastY;
        track.lastX = touch.clientX;
        track.lastY = touch.clientY;

        if (viewMode === "scroll" && scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft -= dx;
          scrollContainerRef.current.scrollTop -= dy;
        } else if (viewMode !== "scroll") {
          e.preventDefault();
          const c = containerRef.current;
          const w = c?.clientWidth || 800;
          const h = c?.clientHeight || 600;
          const maxPanX = Math.max(80, (w * (zoomLevelRef.current - 1)) / 2 + 100);
          const maxPanY = Math.max(80, (h * (zoomLevelRef.current - 1)) / 2 + 100);

          setPanOffset(prev => ({
            x: Math.min(maxPanX, Math.max(-maxPanX, prev.x + dx)),
            y: Math.min(maxPanY, Math.max(-maxPanY, prev.y + dy)),
          }));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      resetPanelsAutoHideTimerRef.current(2000);
      if (e.touches.length === 0) {
        if (track.mode === "pinch") {
          isPinchingRef.current = false;
          setIsPinching(false);

          if (viewMode === "scroll" && scrollPagesWrapperRef.current && scrollContainerRef.current) {
            const finalRatio = track.currentScaleRatio || 1.0;
            const finalZoom = Math.min(maxZoom, Math.max(minZoom, +(track.initialZoom * finalRatio).toFixed(2)));

            // Reset transform cleanly before committing new layout
            const wrapper = scrollPagesWrapperRef.current;
            wrapper.style.transform = "none";
            wrapper.style.transformOrigin = "center top";

            const scrollEl = scrollContainerRef.current;
            const focalLocalX = track.focalLocalX || 0;
            const focalLocalY = track.focalLocalY || 0;

            const ratio = finalZoom / track.initialZoom;
            if (track.initialZoom > 0 && Math.abs(ratio - 1) > 0.01) {
              scrollEl.scrollLeft = Math.max(0, (scrollEl.scrollLeft + focalLocalX) * ratio - focalLocalX);
              scrollEl.scrollTop = Math.max(0, (scrollEl.scrollTop + focalLocalY) * ratio - focalLocalY);
            }

            setZoomLevel(finalZoom);
          }
        }

        if (track.mode === "swipe" && viewMode !== "scroll" && zoomLevelRef.current <= 1.05) {
          if (e.changedTouches.length > 0) {
            const diffX = e.changedTouches[0].clientX - track.startX;
            const diffY = e.changedTouches[0].clientY - track.startY;
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
              if (diffX < 0) {
                nextPage();
              } else {
                prevPage();
              }
            }
          }
        }

        if (zoomLevelRef.current <= 1.0) {
          setPanOffset({ x: 0, y: 0 });
        }

        track.mode = "none";
        track.initialDist = 0;
      } else if (e.touches.length === 1 && track.mode === "pinch") {
        isPinchingRef.current = false;
        setIsPinching(false);
        if (viewMode === "scroll" && scrollPagesWrapperRef.current && scrollContainerRef.current) {
          const finalRatio = track.currentScaleRatio || 1.0;
          const finalZoom = Math.min(maxZoom, Math.max(minZoom, +(track.initialZoom * finalRatio).toFixed(2)));
          const wrapper = scrollPagesWrapperRef.current;
          wrapper.style.transform = "none";
          wrapper.style.transformOrigin = "center top";

          const scrollEl = scrollContainerRef.current;
          const focalLocalX = track.focalLocalX || 0;
          const focalLocalY = track.focalLocalY || 0;
          const ratio = finalZoom / track.initialZoom;
          if (track.initialZoom > 0 && Math.abs(ratio - 1) > 0.01) {
            scrollEl.scrollLeft = Math.max(0, (scrollEl.scrollLeft + focalLocalX) * ratio - focalLocalX);
            scrollEl.scrollTop = Math.max(0, (scrollEl.scrollTop + focalLocalY) * ratio - focalLocalY);
          }
          setZoomLevel(finalZoom);
        }
        track.mode = "pan";
        track.lastX = e.touches[0].clientX;
        track.lastY = e.touches[0].clientY;
      }
    };

    const onTouchCancel = () => {
      resetPanelsAutoHideTimerRef.current(2000);
      if (track.mode === "pinch") {
        isPinchingRef.current = false;
        setIsPinching(false);
        if (scrollPagesWrapperRef.current) {
          scrollPagesWrapperRef.current.style.transform = "none";
          scrollPagesWrapperRef.current.style.transformOrigin = "center top";
        }
      }
      track.mode = "none";
      track.initialDist = 0;
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [loading, nextPage, prevPage, viewMode, minZoom, maxZoom]);

  // Native Trackpad Pinch-to-Zoom & Two-Finger Panning listener (passive: false, window-captured)
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Trackpad pinch-to-zoom gesture or Ctrl + MouseWheel
        e.preventDefault();
        const delta = e.deltaY;
        const zoomDelta = -delta * 0.005;
        setZoomLevel(prev => {
          const next = Math.min(maxZoom, Math.max(minZoom, +(prev * (1 + zoomDelta)).toFixed(3)));
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
      gestureStartZoomRef.current = zoomLevelRef.current;
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scale = (e as unknown as { scale: number }).scale;
      if (typeof scale === "number") {
        const next = Math.min(maxZoom, Math.max(minZoom, +(gestureStartZoomRef.current * scale).toFixed(2)));
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
  }, [viewMode, minZoom, maxZoom]);

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
        panelMode,
        zoom: debouncedZoomLevel,
      });
    }
  }, [readerTheme, fontSize, lineHeight, margin, viewMode, panelMode, debouncedZoomLevel, currentBookPath, updateSettings]);

  // Android System Back Gesture & Platform Back Handler
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (isJumpModalOpen) {
        setIsJumpModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isTocOpen) {
        setIsTocOpen(false);
        return true;
      }
      if (isSearchBookmarksOpen) {
        setIsSearchBookmarksOpen(false);
        return true;
      }
      if (isWindowFullscreen) {
        handleToggleFullscreen();
        return true;
      }
      onClose();
      return true;
    }, 10); // Priority 10 (higher than browse mode)

    (window as any).__handleAndroidBack = () => {
      if (isJumpModalOpen) {
        setIsJumpModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isTocOpen) {
        setIsTocOpen(false);
        return true;
      }
      if (isSearchBookmarksOpen) {
        setIsSearchBookmarksOpen(false);
        return true;
      }
      if (isWindowFullscreen) {
        handleToggleFullscreen();
        return true;
      }
      onClose();
      return true;
    };

    return () => {
      unregister();
      delete (window as any).__handleAndroidBack;
    };
  }, [isJumpModalOpen, isSettingsOpen, isTocOpen, isSearchBookmarksOpen, isWindowFullscreen, onClose]);

  // Auto-save reading position on unmount / window beforeunload / mobile visibilitychange & pagehide
  useEffect(() => {
    const handleSave = () => {
      const pathToSave = currentBookPath || bookPathRef.current;
      if (pathToSave) {
        updateLocation(pathToSave, currentPage, totalPages);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleSave();
      }
    };

    window.addEventListener("beforeunload", handleSave);
    window.addEventListener("pagehide", handleSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleSave);
      window.removeEventListener("pagehide", handleSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      handleSave();
    };
  }, [currentBookPath, currentPage, totalPages, updateLocation]);

  // Settings helpers
  const handleUpdateSettings = (updates: Partial<BookSettings>) => {
    if (updates.fontSize !== undefined) setFontSize(updates.fontSize);
    if (updates.lineHeight !== undefined) setLineHeight(updates.lineHeight);
    if (updates.margin !== undefined) setMargin(updates.margin);
    if (updates.theme !== undefined) setReaderTheme(updates.theme);
    if (updates.panelMode !== undefined) {
      setPanelMode(updates.panelMode);
      if (updates.panelMode === "smart") {
        setIsHeaderPinned(false);
        resetPanelsAutoHideTimer();
      }
    }
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
    setPanelMode("smart");
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--color-background)]">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">Opening Document...</h3>
        <p className="text-sm text-[var(--color-text-muted)] max-w-md text-center truncate">
          {currentBookTitle || (currentBookPath ? extractDocumentTitle(currentBookPath) : "")}
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
    >
      {/* Top Hover Sensor Zone: hovering or touching reveals both panels in smart mode */}
      {panelMode === "smart" && (
        <div
          className="reader-top-hover-zone"
          onMouseEnter={() => handlePanelMouseEnter("top")}
          onTouchStart={() => handlePanelMouseEnter("top")}
        />
      )}

      {/* Top Navigation Bar: in-flow in persistent mode, floating in smart mode */}
      <header
        className={`flex items-center justify-between px-3 sm:px-4 py-2 border-b ${
          panelMode === "persistent"
            ? "reader-header-inflow z-30 flex-shrink-0"
            : `reader-header-floating z-50 ${isPanelVisible ? "reader-header-visible" : "reader-header-hidden"}`
        }`}
        style={{ backgroundColor: themeStyle.barBg, borderColor: themeStyle.border }}
        onMouseEnter={() => handlePanelMouseEnter("top")}
        onMouseLeave={() => handlePanelMouseLeave("top")}
        onTouchStart={() => handlePanelMouseEnter("top")}
        onTouchEnd={() => handlePanelMouseLeave("top")}
      >
        {isCompact ? (
          <>
            {/* Compact Mobile Top Navigation: < 600px */}
            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
              <button
                onClick={onClose}
                className="p-1.5 -ml-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 active:scale-95 cursor-pointer"
                title="Return to library (Esc)"
                aria-label="Return to library"
              >
                <ArrowLeftIcon size={18} />
              </button>
              <span className="font-semibold text-xs sm:text-sm truncate text-[var(--color-text)]">
                {displayTitle}
              </span>
              {currentBookPath && <FormatBadge path={currentBookPath} />}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => {
                  setSearchBookmarksTab("search");
                  setIsSearchBookmarksOpen(curr => (searchBookmarksTab === "search" ? !curr : true));
                }}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  isSearchBookmarksOpen && searchBookmarksTab === "search"
                    ? "bg-[var(--color-primary)] text-white"
                    : "hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="Search Book"
                aria-label="Search Book"
              >
                <SearchIcon size={16} />
              </button>

              <button
                onClick={() => {
                  setSearchBookmarksTab("bookmarks");
                  setIsSearchBookmarksOpen(curr => (searchBookmarksTab === "bookmarks" ? !curr : true));
                }}
                className={`relative p-1.5 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  isSearchBookmarksOpen && searchBookmarksTab === "bookmarks"
                    ? "bg-[var(--color-primary)] text-white"
                    : "hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="Bookmarks"
                aria-label="Bookmarks"
              >
                <BookmarkIcon size={16} />
                {bookBookmarks.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] text-[9px] px-0.5 bg-amber-500 text-white rounded-full font-bold flex items-center justify-center leading-none">
                    {bookBookmarks.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => currentBookPath && toggleBookCompleted(currentBookPath)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  isCompleted
                    ? "text-emerald-500 bg-emerald-500/15"
                    : "hover:bg-black/10 dark:hover:bg-white/10 opacity-70"
                }`}
                title={isCompleted ? "Completed (Tap to toggle)" : "Not Completed (Tap to mark completed)"}
                aria-label={isCompleted ? "Completed" : "Not Completed"}
              >
                {isCompleted ? <CheckCircleFillIcon size={16} /> : <CheckCircleIcon size={16} />}
              </button>

              <button
                onClick={() => setIsSettingsOpen(curr => !curr)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer active:scale-95 ${
                  isSettingsOpen
                    ? "bg-[var(--color-primary)] text-white"
                    : "hover:bg-black/10 dark:hover:bg-white/10"
                }`}
                title="Settings"
                aria-label="Settings"
              >
                <GearIcon size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
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
                  {displayTitle}
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

              {/* Completed / Not Completed Toggle Button */}
              <button
                onClick={() => currentBookPath && toggleBookCompleted(currentBookPath)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer select-none active:scale-95 ${
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/25"
                    : "hover:bg-black/5 dark:hover:bg-white/5 opacity-80"
                }`}
                style={isCompleted ? undefined : { borderColor: themeStyle.border }}
                title={isCompleted ? "Click to mark as Not Completed" : "Click to mark as Completed"}
              >
                {isCompleted ? (
                  <CheckCircleFillIcon size={14} className="text-emerald-500" />
                ) : (
                  <CheckCircleIcon size={14} />
                )}
                <span>{isCompleted ? "Completed" : "Not Completed"}</span>
              </button>

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
                  disabled={zoomLevel <= minZoom}
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
                  disabled={zoomLevel >= maxZoom}
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
          </>
        )}
      </header>

      {/* Reader Main Workspace: Docked Left TOC Sidebar (Desktop) + Main Reading Viewport */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden relative">
        {/* Left-Side Floating Table of Contents Button (Desktop) when TOC is collapsed */}
        {!isCompact && !isTocOpen && (
          <div
            className={`absolute left-4 z-40 transition-all duration-300 pointer-events-auto ${
              panelMode === "persistent" ? "top-3" : "top-14"
            }`}
          >
            <button
              onClick={() => {
                setIsTocOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-md backdrop-blur-md text-xs font-medium transition-all hover:scale-105 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{
                backgroundColor: themeStyle.barBg,
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
        )}

        {/* On Desktop: In-Flow Left-Docked Table of Contents Sidebar */}
        {!isCompact && isTocOpen && (
          <TableOfContentsDrawer
            isOpen={isTocOpen}
            onClose={() => setIsTocOpen(false)}
            toc={toc}
            currentPage={currentPage}
            onNavigateToPage={(page) => {
              goToPage(page);
              // On desktop: keep TOC sidebar open for simultaneous reading and chapter browsing!
            }}
            theme={readerTheme}
            docked={true}
            panelMode={panelMode}
          />
        )}

        {/* Main Reading Viewport */}
        <main
          className={`flex-1 relative reader-viewport-main ${
            viewMode === "scroll"
              ? "overflow-hidden flex flex-col"
              : `overflow-hidden flex items-center justify-center ${isCompact ? "p-0" : "p-2"}`
          }`}
          ref={containerRef}
          onClick={() => resetPanelsAutoHideTimer(2000)}
          style={{
            backgroundColor: themeStyle.pageBg,
            touchAction: (viewMode !== "scroll" || zoomLevel > 1.05) ? "none" : "pan-y",
          }}
        >
        {rendering && (
          <div className="absolute top-4 right-4 z-30">
            <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Single Page View */}
        {viewMode === "single" && (
          <div
            className={`relative w-full h-full flex overflow-hidden ${isCompact ? "p-0" : "p-4"}`}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: zoomLevel > 1.05 ? (isDragging ? "grabbing" : "grab") : "default",
              touchAction: "none",
            }}
          >
            {bookBookmarks.some(b => b.location === currentPage) && (
              <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage}`}>
                <div className="bookmark-corner-ribbon-badge">
                  <BookmarkFillIcon size={14} />
                </div>
              </div>
            )}
            <div
              className={`reader-zoom-wrapper m-auto flex items-center justify-center ${zoomLevel > 1.05 ? "is-zoomed" : ""}`}
              style={{
                transform:
                  zoomLevel === 1.0 && panOffset.x === 0 && panOffset.y === 0
                    ? "none"
                    : `translate3d(${Math.round(panOffset.x)}px, ${Math.round(panOffset.y)}px, 0) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: (isDragging || isPinching) ? "none" : "transform 100ms ease-out",
              }}
            >
              <div
                ref={pageContainerRef}
                className={`reader-page-fit-container ${isCompact ? "" : "shadow-md rounded"}`}
                style={{
                  width: `${pageDimensions.width}px`,
                  height: `${pageDimensions.height}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>
          </div>
        )}

        {/* Two-Page Spread View */}
        {viewMode === "two-page" && (
          <div
            className={`w-full h-full flex overflow-hidden relative ${isCompact ? "p-0" : "p-4"}`}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onDoubleClick={handleDoubleClick}
            style={{
              cursor: zoomLevel > 1.05 ? (isDragging ? "grabbing" : "grab") : "default",
              touchAction: "none",
            }}
          >
            <div
              className={`reader-zoom-wrapper m-auto flex items-center justify-center gap-0 reader-spread-book ${zoomLevel > 1.05 ? "is-zoomed" : ""}`}
              style={{
                transform:
                  zoomLevel === 1.0 && panOffset.x === 0 && panOffset.y === 0
                    ? "none"
                    : `translate3d(${Math.round(panOffset.x)}px, ${Math.round(panOffset.y)}px, 0) scale(${zoomLevel})`,
                transformOrigin: "center center",
                transition: (isDragging || isPinching) ? "none" : "transform 100ms ease-out",
              }}
            >
              {bookInstance?.format === "epub" ? (
                <div
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{
                    width: `${spreadDimensions.width * 2}px`,
                    height: `${spreadDimensions.height}px`,
                    maxWidth: "100%",
                    maxHeight: "100%",
                  }}
                >
                  {bookBookmarks.some(b => b.location === currentPage) && (
                    <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage}`}>
                      <div className="bookmark-corner-ribbon-badge">
                        <BookmarkFillIcon size={14} />
                      </div>
                    </div>
                  )}
                  <div
                    ref={leftPageRef}
                    className="reader-page-fit-container flex items-center justify-center overflow-hidden"
                    style={{
                      width: "100%",
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  />
                  {/* Keep rightPageRef in DOM for ref stability */}
                  <div ref={rightPageRef} style={{ display: "none" }} />
                </div>
              ) : (
                <>
                  <div
                    className="relative flex items-center justify-end overflow-hidden border-r"
                    style={{
                      borderColor: themeStyle.border,
                      width: `${spreadDimensions.width}px`,
                      height: `${spreadDimensions.height}px`,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    {bookBookmarks.some(b => b.location === currentPage) && (
                      <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage}`}>
                        <div className="bookmark-corner-ribbon-badge">
                          <BookmarkFillIcon size={14} />
                        </div>
                      </div>
                    )}
                    <div
                      ref={leftPageRef}
                      className="reader-page-fit-container flex items-center justify-end overflow-hidden"
                      style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }}
                    />
                  </div>
                  <div
                    className="relative flex items-center justify-start overflow-hidden"
                    style={{
                      width: `${spreadDimensions.width}px`,
                      height: `${spreadDimensions.height}px`,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    {bookBookmarks.some(b => b.location === currentPage + 1) && (
                      <div className="bookmark-corner-ribbon" title={`Bookmarked: Page ${currentPage + 1}`}>
                        <div className="bookmark-corner-ribbon-badge">
                          <BookmarkFillIcon size={14} />
                        </div>
                      </div>
                    )}
                    <div
                      ref={rightPageRef}
                      className="reader-page-fit-container flex items-center justify-start overflow-hidden"
                      style={{
                        width: "100%",
                        height: "100%",
                        maxWidth: "100%",
                        maxHeight: "100%",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Continuous Scroll View */}
        {viewMode === "scroll" && (() => {
          const slotWidth = Math.floor((isCompact ? Math.max(300, (containerRef.current?.clientWidth || 390) - 8) : 860) * zoomLevel);

          if (bookInstance?.format === "epub") {
            return (
              <div
                ref={scrollContainerRef}
                className={`w-full h-full overflow-y-auto overflow-x-auto ${isCompact ? "p-1" : "p-4 sm:p-6"} flex justify-center`}
                style={{ touchAction: zoomLevel > 1.05 ? "none" : "pan-y" }}
              >
                <div
                  ref={epubScrollContainerRef}
                  className="mx-auto min-h-full"
                  style={{
                    width: `${slotWidth}px`,
                    minWidth: `${slotWidth}px`,
                  }}
                />
              </div>
            );
          }

          return (
            <div
              ref={scrollContainerRef}
              className={`w-full h-full overflow-y-auto overflow-x-auto ${isCompact ? "p-1" : "p-4 sm:p-6"}`}
              style={{ touchAction: zoomLevel > 1.05 ? "none" : "pan-y" }}
            >
              <div
                ref={scrollPagesWrapperRef}
                className="mx-auto flex flex-col items-center"
                style={{
                  width: `${slotWidth}px`,
                  minWidth: `${slotWidth}px`,
                }}
              >
                {scrollPages.map((pageNum: number) => {
                  const isBookmarked = bookBookmarks.some(b => b.location === pageNum);
                  return (
                    <div
                      key={pageNum}
                      id={`reader-page-${pageNum}`}
                      data-page-num={pageNum}
                      className={`reader-page-slot my-2 sm:my-6 relative overflow-hidden ${isCompact ? "" : "rounded shadow-sm border"}`}
                      style={{
                        width: `${slotWidth}px`,
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        minHeight: isCompact ? "380px" : "700px",
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
                        className={`w-full h-full flex flex-col items-center justify-start overflow-hidden ${isCompact ? "min-h-[380px] p-0" : "min-h-[700px] p-2"}`}
                        style={{ maxWidth: "100%", boxSizing: "border-box" }}
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
          );
        })()}
      </main>
      </div>

      {/* Bottom Hover Sensor Zone: hovering or touching reveals both panels in smart mode */}
      {panelMode === "smart" && (
        <div
          className="reader-bottom-hover-zone"
          onMouseEnter={() => handlePanelMouseEnter("bottom")}
          onTouchStart={() => handlePanelMouseEnter("bottom")}
        />
      )}

      {/* Bottom Navigation & Scrubber Bar */}
      <footer
        className={`flex items-center justify-between px-3 sm:px-6 py-2 border-t gap-2 sm:gap-4 ${
          panelMode === "persistent"
            ? "reader-footer-inflow z-20 flex-shrink-0"
            : `reader-footer-floating z-50 ${isPanelVisible ? "reader-footer-visible" : "reader-footer-hidden"}`
        }`}
        style={{
          backgroundColor: themeStyle.barBg,
          borderColor: themeStyle.border,
          paddingBottom: "max(0.5rem, calc(0.5rem + var(--sab)))",
        }}
        onMouseEnter={() => handlePanelMouseEnter("bottom")}
        onMouseLeave={() => handlePanelMouseLeave("bottom")}
        onTouchStart={() => handlePanelMouseEnter("bottom")}
        onTouchEnd={() => handlePanelMouseLeave("bottom")}
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

      {/* Table of Contents Drawer (Mobile Bottom Sheet) */}
      {isCompact && (
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
          docked={false}
          panelMode={panelMode}
        />
      )}

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
          panelMode,
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

