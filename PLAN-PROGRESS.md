# Implementation Plan: Large File (>40MB) Performance, Smart Auto-Hiding Top Panel & Fullscreen View Mode

## Overview
This plan implements the 3 user-requested performance and UI features:
1. **Large File (>40MB) Performance & Concurrency Guard**: Eliminate the >3s delay when opening and rendering large files (>40MB PDFs, EPUBs, CBZ). Unblock initial render, eliminate duplicate render cycles, and ensure Page 1 renders in <500ms.
2. **Smart Auto-Hiding Top Panel with Hover Sensor**: Replace persistent fixed header with a smooth floating overlay that automatically slides out of view after 3.5s of inactivity and reappears when hovering near the top edge (24px sensor) or on mouse interaction. Include a pin toggle (`PinIcon`/`PinSlashIcon`) and pause auto-hide when TOC/Search/Settings drawers are open.
3. **Fullscreen View Mode**: Add true edge-to-edge fullscreen support via desktop Tauri `appWindow.setFullscreen()` (with HTML5 Fullscreen API fallback), `F11` keyboard shortcut, and top panel toggle button (`MaximizeIcon`/`MinimizeIcon`).

---

## Technical Tasks & Progress

### Phase 1: Large File (>40MB) Performance Optimization
- [x] **1.1 Defer Synchronous TOC in `src/adapters/epubAdapter.ts`**
  - Removed `await this.parseTOC()` from `load()`; resolved on-demand inside `getTOC()`
  - Prevented 1–2s spine navigation parsing stalls on initial open
- [x] **1.2 Streamline Viewport & Metadata in `src/adapters/pdfAdapter.ts`**
  - Made metadata parsing non-blocking and computed viewport scale in a single pass from base 1.0 viewport
  - Prevented redundant `page.getViewport` allocations on large PDF documents
- [x] **1.3 Reader State Batching & Render Lock in `src/components/ReaderView.tsx`**
  - Batched restored state changes to prevent multiple cascading `renderPages` calls before `loading` finishes
  - Added `isRenderingRef` concurrency lock to guarantee Page 1 renders exactly once without canvas collision

### Phase 2: Smart Auto-Hiding Top Panel & Hover Sensor
- [x] **2.1 CSS Floating Transitions & Sensor in `src/App.css`**
  - Styled `.reader-header-floating` with cubic-bezier slide up/down and opacity transitions
  - Styled `.reader-top-hover-zone` (height: 24px) at top edge to detect mouse hover when header is hidden
  - Expanded reader main viewport to 100% full height for edge-to-edge document visibility
- [x] **2.2 Auto-Hide Timer & Drawer Awareness in `src/components/ReaderView.tsx`**
  - Implemented 3.5s inactivity timer on mouse move
  - Paused auto-hide while TOC/Search drawer or Settings drawer is open or when header is hovered
  - Added pin lock toggle (`PinIcon` / `PinSlashIcon`) to allow user to keep header permanently visible

### Phase 3: Desktop & Web Fullscreen View Mode
- [x] **3.1 Fullscreen Window Helper in `src/utils/windowState.ts`**
  - Exported `toggleFullscreen(): Promise<boolean>` and `isFullscreen(): Promise<boolean>`
  - Wired Tauri `getCurrentWindow().setFullscreen()` with HTML5 Fullscreen API fallback
- [x] **3.2 Fullscreen Controls & Keyboard Shortcut in `src/components/ReaderView.tsx`**
  - Added Fullscreen button to header with `MaximizeIcon` / `MinimizeIcon`
  - Bound `F11` key listener to toggle fullscreen across both reader and browse modes
  - Synced fullscreen state with window events

### Phase 4: Verification & Documentation
- [x] **4.1 TypeScript & Build Verification**
  - Ran `npm run build` (`tsc && vite build`) and confirmed 0 compilation or type errors
- [x] **4.2 End-to-End Testing via Browser Subagent**
  - Verified fast book opening (<500ms), auto-hiding header sliding out on idle and sliding in on top hover, pin toggle behavior, and fullscreen toggle
- [x] **4.3 Documentation & Logs**
  - Updated `PLAN-PROGRESS.md` in-place
  - Appended timestamped entry to `DEV-LOG.md`