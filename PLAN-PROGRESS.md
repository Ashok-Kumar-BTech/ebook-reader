# Implementation Plan: Sub-Directory Navigation & Scroll View Engine Overhaul

## Overview
This plan addresses two critical user requirements:
1. **Directory Navigation Trapping**: Lack of back/up navigation when traversing into sub-directories (e.g. `Books -> personal` with no way to return `personal -> Books`).
2. **Scroll View Severe Lag & Malfunction**: Continuous scroll view (`viewMode === "scroll"`) takes excessive rendering time (freezes/hangs) and does not work due to eager rendering of all book pages, canvas memory exhaustion, and re-render loops on page state updates.

---

## Technical Tasks & Progress

### Phase 1: Directory Navigation & Breadcrumbs in Library (`src/App.tsx`, `src/stores/uiStore.ts`)
- [x] **1.1 Directory Navigation State & History Stack**
  - Add navigation history stack (`dirHistory: string[]`, `dirHistoryIndex: number`) in `uiStore` or `App.tsx`
  - Implement path normalization and parent directory resolution helper (`getParentPath(path: string): string | null`)
  - Add `navigateBack()`, `navigateForward()`, and `navigateToDir(path: string)` functions
- [x] **1.2 Library Navigation Header & Breadcrumbs Toolbar**
  - Add `[← Back]` and `[→ Forward]` buttons to the library toolbar with disabled states
  - Add `[↑ Up / Parent Directory]` button to quickly jump to the immediate parent directory
  - Add clickable Breadcrumb Trail component (e.g., `📁 Library / Books / personal`) allowing instant jump to any ancestor
- [x] **1.3 Parent Directory Item in Grid & List Views**
  - When viewing any sub-directory (`getParentPath(currentRoot)` is valid), insert a prominent `📁 .. (Parent Directory)` card/row at the top of the file entries
  - Enable keyboard Enter and click to navigate up
- [x] **1.4 FileTree Active Root Sync**
  - Ensure clicking folder nodes in `FileTree.tsx` syncs with `currentRoot` and updates navigation history

### Phase 2: High-Performance Virtualized Scroll View Engine (`src/components/ReaderView.tsx`)
- [x] **2.1 Decouple Scroll View from `currentPage` Re-render Loop**
  - Separate scroll view initialization from page change triggers
  - Prevent `renderPages` from clearing `scrollContainerRef.innerHTML = ""` when `currentPage` updates in scroll mode
  - Make scrubber, TOC jumps, and arrow navigation call `scrollIntoView()` on target page elements rather than re-rendering
- [x] **2.2 Lazy-Loaded Page Slot Architecture & IntersectionObserver**
  - In scroll view mode, immediately generate lightweight page slot containers (`<div id="reader-page-${n}" ...>`) with estimated height and page number badges
  - Implement `IntersectionObserver` with a viewport root margin (e.g., `400px 0px`) to lazily call `adapter.renderPage(pageNum, slotElement)` ONLY when pages approach the viewport
  - Unload off-screen canvases/DOM when far out of view to avoid browser/WebView2 memory limits and blank-screen canvas crashes
- [x] **2.3 Bidirectional Scroll Tracking**
  - Use `IntersectionObserver` or debounced scroll listener to update `currentPage` and persisted reading position in real-time as the user scrolls
  - Prevent scroll listener updates from triggering full component re-renders
- [x] **2.4 Fix Scroll View Container Styling**
  - Ensure `scrollContainerRef` properly handles vertical scrolling without flex alignment clipping
  - Provide smooth scrolling and responsive zoom/font-size scaling

### Phase 3: Format Adapters Scroll Support Optimization (`src/adapters/`)
- [x] **3.1 Optimize `pdfAdapter.ts`**
  - Ensure single-page rendering into slotted containers is fast and cancels previous render tasks if page scrolls away
  - Provide fallback in `renderPageRange` for bounded windowed rendering
- [x] **3.2 Optimize `txtAdapter.ts` & `cbzAdapter.ts`**
  - Fix 1-based indexing in `cbzAdapter` scroll rendering so first image (page 1) is never skipped
  - Ensure proper object URL cleanup and avoid batch image extraction freezes
- [x] **3.3 Optimize `epubAdapter.ts` & `htmlAdapter.ts`**
  - Fix continuous scroll rendering in `epubAdapter` using proper scrolled-doc continuous flow or section streaming
  - Ensure `htmlAdapter` renders cleanly in continuous scroll containers

### Phase 4: Verification & Validation
- [x] **4.1 TypeScript & Build Validation**
  - Run `npm run build` (`tsc && vite build`) to ensure 0 errors and clean type checking
- [x] **4.2 End-to-End Browser UI Testing**
  - Test sub-directory traversal: navigate into subfolders, click `[← Back]`, click `[↑ Up]`, click breadcrumbs, and click `..` parent item
  - Test scroll view: open books, switch to `Scroll` view, verify instant loading (<100ms), smooth scrolling, scrubber sync, and no lag
- [x] **4.3 Documentation & Logs**
  - Update `PLAN-PROGRESS.md` in-place
  - Append timestamped entries to `DEV-LOG.md`