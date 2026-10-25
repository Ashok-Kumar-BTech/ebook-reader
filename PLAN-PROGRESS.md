# Implementation Plan Progress

## Phase 1: Adapter Pattern & Core Types ✓ COMPLETE
- [x] Tauri Store plugin configured (`@tauri-apps/plugin-store@^2`) in `tauri.conf.json` and `capabilities/default.json`
- [x] Core type definitions in `src/types/reader.ts` (BookAdapter, RenderOptions, TOCItem, SearchResult, etc.)
- [x] TypedStore wrapper in `src/utils/store.ts` for type-safe debounced persistence
- [x] `uiStore.ts` - UI state (sidebar, theme, sorting, recents) with Tauri persistence
- [x] `bookStore.ts` - Per-book reading state (location, bookmarks, settings) with Tauri persistence
- [x] Adapter registry in `src/adapters/registry.ts` with all 6 format adapters registered
- [x] All format adapters created and compiling:
  - [x] `pdfAdapter.ts` (pdfjs-dist)
  - [x] `epubAdapter.ts` (epubjs)
  - [x] `cbzAdapter.ts` (jszip)
  - [x] `txtAdapter.ts` (native text splitting)
  - [x] `htmlAdapter.ts` + `DocxAdapter` (mammoth.js for DOCX→HTML)
- [x] Dependencies installed: `pdfjs-dist`, `epubjs`, `jszip`, `mammoth`
- [x] Build verification: `npm run build` passes without errors

## Phase 2: File System Access & Library UI (NEXT)
- [ ] Folder tree component with recursive rendering
- [ ] File picker using Tauri dialog API
- [ ] Virtualized list for large directories (react-window or similar)
- [ ] Format badge display (PDF, EPUB, CBZ, TXT, HTML, DOCX)
- [ ] Recent folders/files persistence
- [ ] Sorting (name, date, size, type) and view modes (tree/list)

## Phase 3: Reader View & Navigation
- [ ] Main reader component with adapter integration
- [ ] Page rendering with continuous scroll and two-page view
- [ ] Keyboard/mouse/touch navigation
- [ ] Progress bar and location indicator
- [ ] Theme support (light, dark, sepia) with CSS variables

## Phase 4: Search & TOC
- [ ] Global search across library
- [ ] In-book search with highlight and navigation
- [ ] Table of Contents panel with hierarchical navigation
- [ ] Bookmark management UI

## Phase 5: Settings & Polish
- [ ] Settings panel (font, theme, margins, line height)
- [ ] Auto-save reading position
- [ ] Window state persistence
- [ ] Performance optimization (lazy loading, virtualization)