# Implementation Plan: Document Zoom Engine & Trackpad Pinch-to-Zoom Gestures

## Overview
This plan implements a document-wide Zoom Engine and native Trackpad Pinch-to-Zoom gestures:
1. **True Document & Page Zoom**: Replace mislabeled font-size controls with real document zoom (0.5x to 3.0x / 50% to 300%) across all formats (PDF, EPUB, CBZ, TXT, HTML, DOCX).
2. **Native Trackpad Pinch-to-Zoom Gestures**: Intercept `ctrlKey + wheel` non-passively on the reader viewport to provide smooth, fluid trackpad pinch zooming and 2-finger touch zooming.
3. **Panning & Reset When Zoomed**: Allow smooth panning via mouse drag and two-finger scroll when zoomed in (>100%), with double-click and button reset to 100% Fit.
4. **Format-Level Polish**: Hook `rendition.themes.fontSize()` in `epubAdapter.ts` so font size in settings updates dynamically, and support high-DPI canvas resolution in `pdfAdapter.ts`.

---

## Technical Tasks & Progress

### Phase 1: Type Definitions & Adapter Zoom/Font Polish
- [x] **1.1 Update `RenderOptions` in `src/types/reader.ts`**
  - Added optional `zoom?: number` to `RenderOptions`
- [x] **1.2 Dynamic Font-Size & Theme Support in `src/adapters/epubAdapter.ts`**
  - Called `this.rendition.themes.fontSize(`${options.fontSize}px`)` and updated theme on existing rendition
- [x] **1.3 High-DPI Resolution Scaling in `src/adapters/pdfAdapter.ts`**
  - Rendered PDF canvas with `devicePixelRatio` backing buffer so scaled pages remain crisp

### Phase 2: Document Viewport Zoom & Pan Engine in `ReaderView.tsx`
- [x] **2.1 Zoom & Pan State Management**
  - Added `zoomLevel` (0.5 to 3.0, step 0.1, default 1.0) and `panOffset` (`{ x: 0, y: 0 }`)
  - Auto-clamp and reset pan offset when returning to 1.0 (Fit)
  - Centered pan offset on page navigation
- [x] **2.2 Top Header Bar Zoom Controls**
  - Replaced font-size buttons with:
    - Zoom Out `[-]` (`ZoomOutIcon`)
    - Zoom Level Badge `[ 100% ]` (Click to reset to Fit)
    - Zoom In `[+]` (`ZoomInIcon`)
- [x] **2.3 Keyboard Shortcuts**
  - Wired `+` / `=` to Zoom In
  - Wired `-` / `_` to Zoom Out
  - Wired `0` to Reset Zoom (100% Fit)
  - Handled `Ctrl` and standard shortcuts smoothly

### Phase 3: Trackpad Pinch & Mouse Pan Handlers
- [x] **3.1 Non-Passive Wheel Interceptor for Trackpad Pinch**
  - Attached native `wheel` listener with `{ passive: false }` to viewport container
  - Intercepted `e.ctrlKey`: called `e.preventDefault()`, computed granular smooth pinch delta
  - When `zoomLevel > 1.0`, used normal two-finger wheel for smooth 2D panning (X and Y)
- [x] **3.2 Touchscreen 2-Finger Pinch Support**
  - Tracked distance between touches to zoom fluidly on touch devices
- [x] **3.3 Mouse Drag Panning & Double-Click Reset**
  - When `zoomLevel > 1.0`, enabled `grab`/`grabbing` cursor and click-and-drag panning
  - Double-click toggles between 100% Fit and 175% zoom

### Phase 4: CSS Layout & Containment Optimization
- [x] **4.1 Styling & Transitions in `src/App.css`**
  - Applied hardware-accelerated transform styles (`translate3d`, `scale`) with `transform-origin: center center`
  - Bounded pan calculations to ensure pages stay visible
- [x] **4.2 Continuous Scroll Mode Zoom**
  - Dynamically scaled scroll view column width by `zoomLevel`

### Phase 5: Verification & Documentation
- [x] **5.1 TypeScript & Build Verification**
  - Ran `npm run build` (`tsc && vite build`) and `cargo check` confirming 0 errors
- [x] **5.2 End-to-End Testing (Tauri & Web)**
  - Verified zoom controls, pinch gestures, panning, and reset
- [x] **5.3 Update Knowledge Graph & Developer Log**
  - Ran `graphify update .`
  - Updated `PLAN-PROGRESS.md`
  - Appended timestamped entry to `DEV-LOG.md`