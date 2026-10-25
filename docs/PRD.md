# Ebook Reader — Product & Technical Requirements Document

**Version:** 1.0
**Status:** Consolidated
**Platforms:** Windows, Linux (primary) · Android (future)
**Distribution:** GitHub Releases · F-Droid (Android, future)
**Architecture:** Local-first, offline, no backend, no cloud, no accounts

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Tech Stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Application Shell & UI/UX](#5-application-shell--uiux)
6. [File Navigation System](#6-file-navigation-system)
7. [Reader Views](#7-reader-views)
8. [Book-Level Configuration](#8-book-level-configuration)
9. [Format Support](#9-format-support)
10. [Error Reporting](#10-error-reporting)
11. [Persistence Model](#11-persistence-model)
12. [Functional Requirements](#12-functional-requirements)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Platform Matrix](#14-platform-matrix)
15. [Build & Distribution](#15-build--distribution)
16. [Testing Strategy](#16-testing-strategy)
17. [Risks & Mitigations](#17-risks--mitigations)
18. [Roadmap](#18-roadmap)
19. [Open Decisions](#19-open-decisions)
20. [Glossary](#20-glossary)

---

## 1. Project Overview

A cross-platform, local-first ebook reader that opens books stored on the user's own device. The application browses the local filesystem, opens books in a rich reader, and stores all state locally. There is no account, no cloud, no backend, and no tracking.

The application targets **Windows and Linux** as primary platforms, with **Android** as a future scope. macOS and iOS are intentionally out of scope due to cost and distribution complexity.

### 1.1 Core Principles

| Principle | Meaning |
|---|---|
| Local-first | All data stays on the user's device |
| Offline | Fully functional without internet |
| No accounts | No login, no signup, no cloud identity |
| No backend | No hosted API, no DB, no S3, no Redis |
| No tracking | No analytics, no telemetry, no ads |
| FOSS-friendly | Core is open source; F-Droid compatible build available |
| Native | Packaged as a real desktop/mobile app, not a website |

---

## 2. Goals & Non-Goals

### 2.1 Goals

- Open common book formats from the local filesystem.
- Provide a fast, clean, PotPlayer/VS-Code-style file navigation experience.
- Provide a comfortable reading experience with single-page and two-page views.
- Provide a single, discoverable configuration surface for book-level settings.
- Report errors in plain, human-readable language.
- Work offline, forever, with no account.
- Ship on Windows and Linux for free via GitHub Releases.
- Keep the architecture ready for Android via SAF.

### 2.2 Non-Goals

- No online library, no cloud sync, no user accounts.
- No DRM circumvention. DRM-protected books are explicitly unsupported.
- No social features, no sharing, no collaboration.
- No macOS or iOS builds.
- No server-side rendering or hosted backend.
- No library indexing or background scanning.

---

## 3. Tech Stack

### 3.1 Final Stack

| Layer | Choice |
|---|---|
| UI framework | React 18+ with TypeScript |
| Build tool | Vite |
| Native shell | Tauri 2.x |
| Native core | Rust |
| Styling | Tailwind CSS + CSS Modules / Vanilla Extract + CSS variables |
| State | Zustand |
| Local persistence | Tauri Store (JSON) or embedded SQLite |
| PDF rendering | pdf.js |
| EPUB rendering | epub.js or foliate-js |
| CBZ rendering | JSZip + image viewer |
| CBR rendering | libarchive via Rust (Phase 2) |
| FB2 rendering | XML parser → HTML |
| DOCX rendering | mammoth.js |
| TXT / HTML rendering | Webview + DOMPurify |
| File picking | Tauri dialog plugin |
| Filesystem | Rust commands (`std::fs`, `walkdir`, `notify`) |
| Packaging | Tauri CLI |
| CI/CD | GitHub Actions matrix |
| Distribution | GitHub Releases; F-Droid for Android |

### 3.2 Why Tauri 2.x

- Uses React + Vite as the frontend.
- Produces native Windows, Linux, and Android builds.
- Rust backend gives native filesystem, process, and OS integration.
- Small binary size compared to Electron.
- Free and open source.
- One project targets desktop and mobile.

### 3.3 Explicit Rejections

| Rejected | Reason |
|---|---|
| React Native + Vite | React Native uses Metro, not Vite. Not a valid pairing. |
| Electron | Desktop-only, heavy, no mobile path. |
| Capacitor-only | Mobile-first, weak native desktop story. |
| Hosted backend (Node/Flask) | Not needed for a local-first app. |
| S3 / Redis / Postgres | No server, no cloud, no DB engine. |
| Firebase / Supabase / Auth0 | No accounts, no cloud identity. |

---

## 4. Architecture

### 4.1 High-Level

```text
┌─────────────────────────────────────────────────────────┐
│                React + Vite UI (WebView)                │
│  ┌──────────────┐  ┌─────────────────────────────────┐  │
│  │ Directory    │  │ Reader viewport                 │  │
│  │ Panel        │  │ (single / two-page / scroll)    │  │
│  └──────────────┘  └─────────────────────────────────┘  │
│         │                       │                        │
│         └───────────┬───────────┘                        │
│                     ▼                                    │
│             FileSystemProvider (TS interface)            │
└─────────────────────┬───────────────────────────────────┘
                      │ Tauri IPC
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  Tauri Rust Core                        │
│  - File system commands                                 │
│  - Dialog (file/folder picker)                          │
│  - Window management                                    │
│  - File associations                                    │
│  - Local store (JSON / SQLite)                          │
│  - Sidecar manager (optional)                           │
└─────────────────────┬───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│           Optional Sidecars (GitHub build only)         │
│  - Calibre ebook-convert (MOBI/AZW3)                    │
│  - Pandoc (DOCX/RTF)                                    │
│  - libarchive / 7z (CBR)                                │
└─────────────────────────────────────────────────────────┘
```

### 4.2 FileSystemProvider Abstraction

All file access goes through one interface, so desktop and Android differ cleanly.

```ts
interface FileSystemProvider {
  pickFile(): Promise<FileRef | null>;
  pickDirectory(): Promise<DirRef | null>;
  listChildren(dir: DirRef): Promise<Entry[]>;
  readFile(entry: Entry): Promise<ArrayBuffer>;
  metadata(entry: Entry): Promise<EntryMeta>;
  revealInOS?(entry: Entry): Promise<void>; // desktop only
  breadcrumb(dir: DirRef): Promise<BreadcrumbItem[]>;
}
```

- `DesktopFileSystemProvider` → Tauri Rust commands, real paths.
- `AndroidFileSystemProvider` → SAF tree URIs, `content://` references.

### 4.3 Reader Adapter Pattern

```ts
interface BookAdapter {
  open(file: ArrayBuffer): Promise<void>;
  getMetadata(): Promise<BookMetadata>;
  getToc(): Promise<TocItem[]>;
  render(container: HTMLElement): Promise<void>;
  goTo(location: string): Promise<void>;
  getCurrentLocation(): string;
  nextPage(): Promise<void>;
  prevPage(): Promise<void>;
  setViewMode(mode: ViewMode): Promise<void>;
  setZoom(level: number): Promise<void>;
  search(query: string): Promise<SearchResult[]>;
  destroy(): void;
}
```

Adapters: `PdfAdapter`, `EpubAdapter`, `ComicAdapter`, `TextAdapter`, `Fb2Adapter`, `DocxAdapter`.

---

## 5. Application Shell & UI/UX

### 5.1 Two Modes

The app has exactly two top-level modes.

| Mode | Purpose | Sidebar |
|---|---|---|
| **Browse** | Navigate folders and pick books | Visible by default |
| **Reading** | Read the open book | Hidden by default |

### 5.2 Browse Mode

```text
┌──────────────────────────────────────────────────────┐
│  Top bar: [☰]  Breadcrumb / Path        [Search] [?] │
├───────────────┬──────────────────────────────────────┤
│               │                                      │
│  Directory    │   Main pane                          │
│  Panel        │   (contents of current folder)       │
│  (left)       │                                      │
│               │   Folders + files, as-is             │
│               │   Double-click to enter / open       │
│               │                                      │
└───────────────┴──────────────────────────────────────┘
```

### 5.3 Reading Mode

```text
┌──────────────────────────────────────────────────────┐
│  [☰]  Book Title — Author        [⚙ Configure] [✕]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│                  Reader viewport                     │
│              (single-page or two-page)               │
│                                                      │
├──────────────────────────────────────────────────────┤
│  ◀  Page 42 / 318  ▶        [⌂ TOC]  [🔖 Bookmark]   │
└──────────────────────────────────────────────────────┘
```

### 5.4 Sidebar Behavior Rules

1. Default state in Browse mode: **visible**.
2. Default state in Reading mode: **hidden**.
3. Opening a book auto-hides the sidebar and enters Reading mode.
4. Closing a book returns to Browse mode and restores the sidebar's previous state.
5. The user can manually toggle the sidebar at any time.
6. A manual toggle while reading persists until the book is closed.
7. The user's last manual toggle preference is persisted.

### 5.5 UX Requirements

| ID | Requirement |
|---|---|
| UX-1 | Consistent visual language across Browse and Reading modes |
| UX-2 | App-level themes: light, dark, sepia |
| UX-3 | Reader theme independent of app theme |
| UX-4 | Full keyboard navigation everywhere |
| UX-5 | Visible focus indicators |
| UX-6 | Mode transitions under 150 ms |
| UX-7 | No layout shift when toggling sidebar |
| UX-8 | Loading states for slow operations |
| UX-9 | Empty states with a clear next action |
| UX-10 | Responsive to window resizing |
| UX-11 | Tooltips on all icon-only buttons |
| UX-12 | Single consistent icon set |
| UX-13 | Reduced-motion support |
| UX-14 | Screen reader labels on interactive elements |

---

## 6. File Navigation System

### 6.1 Model — Option A (Locked)

- "Open Directory" replaces the current root with the chosen folder.
- Only immediate children are listed.
- Subfolders are expanded lazily on click.
- No recursion. No background scan. No index. No library DB.
- Files and folders appear exactly as they exist on disk.

This mirrors the PotPlayer and VS Code Explorer experience.

### 6.2 Sidebar Contents

| Element | Description |
|---|---|
| Open Directory button | Native folder picker |
| Tree / list toggle | Switch view mode |
| Breadcrumb | Current root path |
| Back / Forward / Up | Navigation history |
| Refresh | Re-list current directory |
| Entry list | Folders and files, lazy-loaded |
| Context menu | Open, Open with, Reveal in OS, Copy path |
| Recent folders | Quick re-open |

### 6.3 Entry Display Rules

- Folders shown before files by default.
- Sortable by name, date, size, type.
- Supported book files visually highlighted.
- Unsupported files visible but muted (never hidden).
- File/folder icons by type.
- Permission-denied entries shown inline with a muted icon.
- Symlinks followed only when the user navigates into them.

### 6.4 Open File(s)

- Native file picker, single or multi-select.
- Picker filtered by supported formats, with "All files" allowed.
- Drag-and-drop files onto the window opens them.
- Drag-and-drop folders onto the window opens them in the nav view.
- OS "Open with" supported for associated formats.

---

## 7. Reader Views

### 7.1 View Modes

| Mode | Description |
|---|---|
| **Single-page** | One page at a time |
| **Two-page** | Spread (book-like), for formats that support it |
| **Scroll** | Continuous vertical scroll |

### 7.2 View Rules (Locked)

- Every format supports **single-page** (where paginated) or **scroll**.
- Formats that **do not support two-page view are scroll-only**.
- Two-page view is only enabled for formats where it is meaningful.
- Switching views preserves the current reading location.
- Switching views preserves zoom.
- View mode is persisted per book and as a global default.

### 7.3 View Applicability by Format

| Format | Single-page | Two-page | Scroll |
|---|---|---|---|
| PDF | Yes | Yes | Yes |
| EPUB | Yes | Yes | Yes |
| CBZ | Yes | Yes | Yes |
| CBR (Phase 2) | Yes | Yes | Yes |
| FB2 (Phase 2) | Yes | Yes | Yes |
| TXT | — | No | Yes (default) |
| HTML | — | No | Yes (default) |
| DOCX (Phase 2) | — | No | Yes (default) |
| MOBI/AZW3 (Phase 3) | Yes | Yes | Yes |

If a view is unavailable, its option is disabled with a tooltip explaining why. The app never silently ignores a view request.

---

## 8. Book-Level Configuration

### 8.1 The Configure Button

- A single **Configure** button lives in the Reading-mode top bar.
- Icon only (`⚙`) or icon + label.
- Opens a side drawer (recommended) or popover.
- Keyboard accessible; `Esc` closes.
- Settings apply instantly; no "Apply" button.
- Settings persist per book.
- Reset-to-default action available.

### 8.2 Settings Groups

| Group | Settings | Applies to |
|---|---|---|
| **View** | Single-page, two-page, scroll, page fit, zoom | All |
| **Layout** | Margins, page gap, spread direction (LTR/RTL), cover-alone toggle | Paginated formats |
| **Typography** | Font family, font size, line height, letter spacing, justify, hyphenation | Reflowable only |
| **Theme** | Light, dark, sepia, custom; background and text color | All |
| **Navigation** | TOC access, bookmark list, jump to page | All |
| **Annotations** | Highlight color, note visibility (Phase 2) | Reflowable |
| **Info** | Title, author, format, file path, page count | All |

Groups that do not apply to the current format are hidden or disabled with a short explanation.

---

## 9. Format Support

### 9.1 Support Matrix

| Format | MVP | Phase 2 | Phase 3 | Notes |
|---|---|---|---|---|
| PDF | ✅ | | | pdf.js |
| EPUB 2 / 3 | ✅ | | | epub.js / foliate-js |
| CBZ | ✅ | | | JSZip + image viewer |
| TXT | ✅ | | | Native, scroll-only |
| HTML / XHTML | ✅ | | | DOMPurify + sandboxed iframe |
| CBR | | ✅ | | libarchive / 7z sidecar |
| FB2 | | ✅ | | XML parser |
| DOCX | | ✅ | | mammoth.js |
| RTF | | ✅ | | Pandoc sidecar |
| Markdown | | ✅ | | Native renderer |
| MOBI / AZW3 | | | ✅ | Calibre sidecar (GitHub build only) |
| DJVU | | | ✅ | Deferred — see 9.2 |
| DRM-protected | ❌ | ❌ | ❌ | Explicitly unsupported |

### 9.2 DJVU Decision

DJVU is **deferred to Phase 3**. It requires a WASM decoder or a conversion sidecar, both of which add complexity and risk for a small user base. The safest option is to ship without DJVU in the MVP and revisit later if demand justifies it. The format registry will mark it as `future` so the UI can inform users cleanly.

### 9.3 Format Registry

One source of truth drives picker filters, icons, view availability, and error messages.

```ts
type FormatSupport = "native" | "converted" | "future" | "unsupported";

interface FormatEntry {
  extensions: string[];
  mimeTypes?: string[];
  support: FormatSupport;
  views: ("single" | "two-page" | "scroll")[];
  reflowable: boolean;
  adapter: string;
}
```

---

## 10. Error Reporting

### 10.1 Principles

1. Never show raw exception text, stack traces, or Rust panics.
2. Always show a short, human-readable message.
3. Always show one actionable next step where possible.
4. Offer a "Details" disclosure for power users.
5. Errors never crash the app. The reader returns to Browse mode safely.

### 10.2 Error Taxonomy

| Code | User-facing message | Suggested next step |
|---|---|---|
| `INVALID_FORMAT` | This file isn't a supported book format. | Supported: PDF, EPUB, CBZ, TXT, HTML… |
| `CORRUPTED_FILE` | This file appears to be damaged and can't be opened. | Try re-downloading or re-copying it. |
| `PASSWORD_PROTECTED` | This book is password-protected and can't be opened. | — |
| `DRM_PROTECTED` | This book is DRM-protected and isn't supported. | — |
| `UNSUPPORTED_VERSION` | This book uses an unsupported version of the format. | — |
| `FILE_NOT_FOUND` | This file no longer exists at its original location. | Reopen the folder or locate the file again. |
| `PERMISSION_DENIED` | You don't have permission to read this file. | Check file permissions. |
| `FILE_IN_USE` | This file is locked by another program. | Close the other program and try again. |
| `TOO_LARGE` | This file is too large to open. | — |
| `PARSE_FAILED` | This book couldn't be read. It may be damaged. | Try another file. |
| `RENDER_FAILED` | This book couldn't be displayed. | Try switching view or restarting the app. |
| `CONVERSION_FAILED` | This book couldn't be prepared for reading. | — |
| `MISSING_COMPONENT` | A required component for this format isn't installed. | See setup instructions. |
| `UNKNOWN` | Something went wrong while opening this book. | Details available below. |

### 10.3 Error Surface Rules

- Errors shown as inline banners or modals, never browser-style alerts.
- Raw details hidden behind a "Details" toggle.
- Details copyable to clipboard.
- Per-entry errors in the sidebar shown inline.
- App never crashes on malformed input.
- Errors logged locally, never transmitted.
- Local log file available for troubleshooting.
- No error message ever contains a stack trace by default.

---

## 11. Persistence Model

No index. No library DB. Only UI state, bookmarks, and per-book config.

```ts
// Application UI state
UiState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  lastRootFolder?: string;
  expandedNodes: string[];
  sortBy: "name" | "date" | "size" | "type";
  sortOrder: "asc" | "desc";
  viewMode: "tree" | "list";
  recentFolders: string[];
  recentFiles: string[];
  appTheme: "light" | "dark" | "sepia";
}

// Per-book state
BookState {
  bookId: string;        // hash of path + size + mtime
  viewMode: "single" | "two-page" | "scroll";
  zoom: number;
  theme: string;
  typography: {
    font: string;
    size: number;
    lineHeight: number;
    spacing: number;
    justify: boolean;
  };
  layout: {
    margins: number;
    pageGap: number;
    rtl: boolean;
    coverAlone: boolean;
  };
  lastLocation: string;
  bookmarks: Bookmark[];
}

Bookmark {
  id: string;
  bookId: string;
  type: "manual" | "last-read";
  location: string;      // PDF page, EPUB CFI, scroll %, CBZ index
  label?: string;
  createdAt: number;
}
```

`bookId` is derived, not an index. If a file is gone, its state is orphaned and cleaned lazily.

Progress is calculated at runtime:

| Format | Progress source |
|---|---|
| PDF | `currentPage / totalPages` |
| EPUB | CFI location / generated locations |
| Scroll formats | `scrollOffset / totalHeight` |
| CBZ | `imageIndex / totalImages` |

The "last-read" bookmark is a special bookmark. Opening a book navigates to it.

---

## 12. Functional Requirements

### 12.1 Application Shell

| ID | Requirement | Priority |
|---|---|---|
| FR-SHELL-1 | Two modes: Browse and Reading | Must |
| FR-SHELL-2 | Browse mode: left directory panel + main pane | Must |
| FR-SHELL-3 | Reading mode: full-window reader, sidebar hidden | Must |
| FR-SHELL-4 | Sidebar toggles via hamburger (☰) button | Must |
| FR-SHELL-5 | Sidebar toggle is user-overridable at any time | Must |
| FR-SHELL-6 | Opening a book auto-hides the sidebar | Must |
| FR-SHELL-7 | Closing a book restores the sidebar's previous state | Must |
| FR-SHELL-8 | Top bar adapts to the current mode | Must |
| FR-SHELL-9 | Window resize reflows without layout breakage | Must |
| FR-SHELL-10 | Fullscreen mode available in Reading mode | Should |
| FR-SHELL-11 | Keyboard shortcut to toggle sidebar | Should |
| FR-SHELL-12 | Keyboard shortcut to toggle fullscreen | Should |

### 12.2 Directory Panel

| ID | Requirement | Priority |
|---|---|---|
| FR-DIR-1 | Sidebar provides "Open Directory" action | Must |
| FR-DIR-2 | Picking a folder replaces the current root (Option A) | Must |
| FR-DIR-3 | List immediate children only | Must |
| FR-DIR-4 | Subfolders expand lazily on click | Must |
| FR-DIR-5 | Tree view and flat list view | Should |
| FR-DIR-6 | Folders and files shown exactly as on disk | Must |
| FR-DIR-7 | Unsupported files remain visible, visually muted | Must |
| FR-DIR-8 | Supported book files visually highlighted | Should |
| FR-DIR-9 | File and folder icons by type | Should |
| FR-DIR-10 | Breadcrumb reflects the current root path | Must |
| FR-DIR-11 | Back / Forward / Up within the root | Must |
| FR-DIR-12 | Refresh current directory | Should |
| FR-DIR-13 | Recent folders list | Should |
| FR-DIR-14 | No recursive scan, no background indexing | Must |
| FR-DIR-15 | Resizable sidebar by dragging its edge | Should |
| FR-DIR-16 | Sidebar width persisted | Should |
| FR-DIR-17 | Permission-denied entries shown inline | Must |
| FR-DIR-18 | Context menu: open, open with, reveal in OS, copy path | Should |

### 12.3 Open File(s)

| ID | Requirement | Priority |
|---|---|---|
| FR-FILE-1 | Native file picker, single or multi-select | Must |
| FR-FILE-2 | Picker filtered by supported formats, "All files" allowed | Must |
| FR-FILE-3 | Drag-and-drop files onto the window | Must |
| FR-FILE-4 | Drag-and-drop folders opens them in nav view | Should |
| FR-FILE-5 | OS "Open with" for associated formats | Should |

### 12.4 Reader Views

| ID | Requirement | Priority |
|---|---|---|
| FR-VIEW-1 | Single-page view | Must |
| FR-VIEW-2 | Two-page (spread) view | Must |
| FR-VIEW-3 | Scroll mode | Must |
| FR-VIEW-4 | Formats without two-page support are scroll-only | Must |
| FR-VIEW-5 | View switchable at runtime, no reload | Must |
| FR-VIEW-6 | View mode persisted per book | Should |
| FR-VIEW-7 | View mode persisted as global default | Should |
| FR-VIEW-8 | Two-page respects RTL for RTL books | Should |
| FR-VIEW-9 | Two-page handles covers and blank pages correctly | Should |
| FR-VIEW-10 | View switching preserves reading location | Must |
| FR-VIEW-11 | View switching preserves zoom | Should |
| FR-VIEW-12 | Unavailable views disabled with a tooltip | Must |

### 12.5 Book-Level Configuration

| ID | Requirement | Priority |
|---|---|---|
| FR-CONFIG-1 | Single Configure button in Reading mode | Must |
| FR-CONFIG-2 | Opens a side drawer or popover | Should |
| FR-CONFIG-3 | Keyboard accessible; Esc closes | Must |
| FR-CONFIG-4 | Settings apply instantly | Should |
| FR-CONFIG-5 | Settings persisted per book | Must |
| FR-CONFIG-6 | Reset-to-default action | Should |
| FR-CONFIG-7 | Panel grouped into sections | Should |
| FR-CONFIG-8 | Inapplicable groups hidden or disabled | Must |

### 12.6 Format Support

| ID | Requirement | Priority |
|---|---|---|
| FR-FMT-1 | PDF | Must |
| FR-FMT-2 | EPUB 2 / 3 | Must |
| FR-FMT-3 | CBZ | Must |
| FR-FMT-4 | TXT | Must |
| FR-FMT-5 | HTML / XHTML | Must |
| FR-FMT-6 | CBR | Should |
| FR-FMT-7 | FB2 | Should |
| FR-FMT-8 | DOCX | Should |
| FR-FMT-9 | RTF | Could |
| FR-FMT-10 | Markdown | Could |
| FR-FMT-11 | MOBI / AZW3 | Could (Phase 3) |
| FR-FMT-12 | DJVU | Future |
| FR-FMT-13 | DRM-protected files | Explicitly unsupported |
| FR-FMT-14 | Central format registry | Must |
| FR-FMT-15 | Registry drives picker, icons, errors | Must |

### 12.7 Error Reporting

| ID | Requirement | Priority |
|---|---|---|
| FR-ERR-1 | All user-facing errors use the taxonomy | Must |
| FR-ERR-2 | Inline banners or modals, never alerts | Must |
| FR-ERR-3 | Raw details behind a "Details" toggle | Must |
| FR-ERR-4 | Details copyable to clipboard | Should |
| FR-ERR-5 | Per-entry errors shown inline | Must |
| FR-ERR-6 | App never crashes on bad input | Must |
| FR-ERR-7 | Errors logged locally, never transmitted | Must |
| FR-ERR-8 | Local log file for troubleshooting | Should |
| FR-ERR-9 | No stack trace in default messages | Must |

### 12.8 Persistence

| ID | Requirement | Priority |
|---|---|---|
| FR-PERS-1 | Persist UI state only | Must |
| FR-PERS-2 | Persist bookmarks per book | Must |
| FR-PERS-3 | Persist per-book config | Must |
| FR-PERS-4 | Persist global defaults | Should |
| FR-PERS-5 | Never persist a file index | Must |
| FR-PERS-6 | Orphaned book state cleaned lazily | Should |

---

## 13. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Directory listing | < 100 ms for 1,000 entries on desktop |
| Folder open | Immediate, no scan |
| EPUB open | < 1 s |
| PDF first page | < 2–3 s |
| View switch | < 200 ms, preserves position |
| Sidebar toggle | < 100 ms, no reflow jank |
| Memory | Only current directory + open book in memory |
| Persistence | UI state, bookmarks, per-book config only |
| Privacy | No file content leaves the device |
| Offline | Fully offline |
| Crash safety | Malformed input never crashes the app |
| Error clarity | Every user-facing error is human-readable |
| Accessibility | WCAG 2.1 AA, keyboard nav, screen reader labels |
| Compatibility | Windows 10+, modern Linux distros |
| Maintainability | TypeScript, Rust, tests, CI/CD |
| Observability | Local logs only; no telemetry |

---

## 14. Platform Matrix

| Feature | Windows | Linux | Android (future) |
|---|---|---|---|
| Open Directory | Native picker, real path | Native picker, real path | SAF tree URI |
| Lazy child listing | `std::fs::read_dir` | `std::fs::read_dir` | `DocumentsContract` |
| Persisted access | Path-based | Path-based | `takePersistableUriPermission` |
| Reveal in OS | `explorer /select,` | `xdg-open` | Not available |
| File associations | Supported | Supported | Intent filters (limited) |
| Watch folder | `notify` crate | `notify` crate | Not available |
| Raw filesystem paths | Yes | Yes | No (SAF only) |
| `MANAGE_EXTERNAL_STORAGE` | N/A | N/A | Not used |

---

## 15. Build & Distribution

### 15.1 Channels

| Channel | Platforms | Cost |
|---|---|---|
| GitHub Releases | Windows, Linux, Android | Free |
| F-Droid | Android | Free |
| Google Play | Android | Optional, $25 one-time |
| Microsoft Store | Windows | Optional, free-ish |
| Flathub | Linux | Optional, free |
| AUR / Homebrew | Linux / macOS | Optional, free |

### 15.2 Artifacts

| Platform | Artifacts |
|---|---|
| Windows | `.exe`, `.msi`, portable `.zip` |
| Linux | `.AppImage`, `.deb`, `.rpm` |
| Android | `.apk` (GitHub flavor), F-Droid build |

### 15.3 CI/CD

GitHub Actions matrix:

| Job | Runner |
|---|---|
| Windows build | `windows-latest` |
| Linux build | `ubuntu-latest` |
| Android build | `ubuntu-latest` |

### 15.4 Two Android Flavors

| Aspect | GitHub flavor | F-Droid flavor |
|---|---|---|
| License | FOSS core | Pure FOSS only |
| Auto-update | Tauri Updater enabled | Disabled |
| Sidecars | Optional bundled | None bundled |
| Network | None required | None required |
| Tracking | None | None |
| Anti-features | Declared if any | None |

### 15.5 Update Strategy

- Tauri Updater via GitHub Releases manifest.
- Enabled only in the GitHub flavor.
- Disabled in the F-Droid flavor (F-Droid handles updates).

---

## 16. Testing Strategy

| Layer | Tool |
|---|---|
| React components | Vitest + React Testing Library |
| Rust commands | `cargo test` |
| Desktop E2E | `tauri-driver` + WebdriverIO |
| Android E2E | Appium (Phase 3) |
| Format matrix | Open each supported format on each platform |
| Performance | Large PDF, large EPUB, CBZ with many images |
| Accessibility | axe-core + manual keyboard testing |
| Error paths | Inject corrupted files, missing files, permission errors |

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| DJVU renderer complexity | High | Defer to Phase 3 |
| Android SAF differs from desktop | High | Build `FileSystemProvider` from day one |
| CBR/RAR licensing | Medium | Prefer CBZ; use libarchive; avoid unRAR |
| Sidecar bundling size | Medium | Optional sidecars; detect external Calibre/Pandoc |
| PDF performance on mobile | Medium | pdf.js workers, lazy rendering |
| Large directory listing | Low | Lazy listing, virtualized list |
| Symlink loops | Low | Follow only on user navigation |
| Permission errors mid-browse | Low | Inline per-entry errors, never crash |
| Tauri mobile maturity | Medium | Keep Android scope minimal initially |
| iOS/macOS cost | N/A | Out of scope by decision |

---

## 18. Roadmap

### MVP — Windows / Linux

- App shell: Browse and Reading modes
- Sidebar with Open Directory, lazy tree/list, breadcrumb, back/forward/up
- Sidebar toggle (☰), auto-hide on book open, restore on close
- Reader: PDF, EPUB, CBZ, TXT, HTML
- Single-page and two-page views (scroll-only where two-page is unsupported)
- Configure button with grouped book-level settings
- Error taxonomy and friendly error UI
- Recent folders and files
- Per-book and global config persistence
- Reveal in OS
- File associations
- Drag-and-drop files and folders
- GitHub Releases pipeline for Windows and Linux

### Phase 2 — Windows / Linux

- CBR, FB2, DOCX, RTF, Markdown
- Continuous scroll refinements
- Annotations: highlights, notes
- In-book search
- TOC panel
- Bookmark manager
- Optional sidecars (Calibre, Pandoc, libarchive)
- Multi-root sidebar (deferred Option C)

### Phase 3 — Android & Extras

- Android builds with SAF
- F-Droid submission
- MOBI / AZW3 via optional sidecar
- DJVU (revisit)
- Annotation export
- Text-to-speech

---

## 19. Open Decisions

1. **TXT/HTML two-page view** — currently scroll-only. Confirm final.
2. **Configure panel style** — side drawer vs popover. Recommendation: side drawer.
3. **Sidebar in Reading mode** — confirm it is re-openable for quick file switching without leaving the book. Recommendation: yes, non-persistent.
4. **App theme vs reader theme** — two settings or one. Recommendation: two.
5. **Continuous scroll as MVP or Phase 2** — currently MVP for scroll-only formats.
6. **License** — GPLv3 vs AGPLv3 vs MIT. Recommendation: GPLv3 for core, with a commercial dual-license path.
7. **DJVU** — confirm deferral to Phase 3. Recommendation: defer.

---

## 20. Glossary

| Term | Meaning |
|---|---|
| **Browse mode** | The file navigation mode with sidebar + main pane |
| **Reading mode** | The full-window reader mode |
| **Option A** | Single-root replace view for Open Directory |
| **SAF** | Android Storage Access Framework |
| **Sidecar** | An external binary invoked by Tauri for conversion or parsing |
| **Adapter** | A per-format rendering implementation |
| **FileSystemProvider** | The abstraction over desktop and Android filesystem access |
| **Format registry** | Central source of truth for format support metadata |
| **BookState** | Persisted per-book reader configuration and bookmarks |
| **UiState** | Persisted application UI state |

---

*End of document.*