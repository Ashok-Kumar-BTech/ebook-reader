# Graph Report - ebook-reader  (2026-11-05)

## Corpus Check
- 99 files · ~547,007 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 28 file(s) not represented in the graph (top: .xml 12, (none) 8, .properties 2)

## Summary
- 897 nodes · 1837 edges · 67 communities (50 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 99 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `edbb961e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- extractDocumentTitle
- package.json
- storeMiddleware.ts
- lib.rs
- tauri.conf.json
- logManager
- compilerOptions
- PdfAdapter
- EpubAdapter
- RenderOptions
- Ebook Reader — Product & Technical Requirements Document
- dependencies
- formats/registry.ts
- 12. Functional Requirements
- compilerOptions
- 15. Build & Distribution
- 5. Application Shell & UI/UX
- default.json
- 6. File Navigation System
- 10. Error Reporting
- 18. Roadmap
- 3. Tech Stack
- 7. Reader Views
- 9. Format Support
- 2. Goals & Non-Goals
- 8. Book-Level Configuration
- Open Source Licensing & Compliance Plan (GitHub Releases)
- ebook-reader
- logger/index.ts
- BuildTask.kt
- config.ts
- main.tsx
- htmlAdapter.ts
- tauri.dev.conf.json
- App.tsx
- HtmlAdapter
- logger/types.ts
- devDependencies
- LoggerInstance
- mobile.json
- Ebook Reader
- LogViewer.tsx
- ReaderView.tsx
- store.ts
- AppError
- adapters/registry.ts
- bookStore.ts
- RenderOptions
- Ebook Reader: Cross-Platform & Responsive Refactor Plan
- Ebook Reader — Build, Packaging & Deployment Guide
- formatRegistry
- pathUtils.ts
- Features & Capabilities
- scripts
- 4.3 Reader Adapter Pattern
- @vitejs/plugin-react
- setup.ts
- gestures.test.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 34 edges
2. `toAppError()` - 32 edges
3. `logManager` - 32 edges
4. `BookAdapter` - 28 edges
5. `App()` - 25 edges
6. `EpubAdapter` - 23 edges
7. `RenderOptions` - 22 edges
8. `Ebook Reader — Product & Technical Requirements Document` - 22 edges
9. `@tauri-apps/api` - 20 edges
10. `ReaderView()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `5.3 Persistence changes` --references--> `ErrorHost()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/components/ErrorHost.tsx
- `9. PRD updates required (`docs/PRD.md`)` --references--> `AppError`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/errors/appError.ts
- `5.1 `src-tauri/src/lib.rs`` --references--> `toAppError()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/errors/appError.ts
- `4.2 Breakpoints (by **width**, not device type; foldables/split-screen must work)` --references--> `useBreakpoint()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/hooks/useBreakpoint.ts
- `Phase 0: Observability and quick wins (do first)` --references--> `logTauriCall()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/utils/tauriApi.ts

## Import Cycles
- 2-file cycle: `src/utils/logger/index.ts -> src/utils/logger/react.ts -> src/utils/logger/index.ts`

## Communities (67 total, 17 thin omitted)

### Community 0 - "extractDocumentTitle"
Cohesion: 0.14
Nodes (5): jszip, CbzAdapter, createCbzAdapter(), loadJSZip(), SearchResult

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (16): license, name, private, type, version, autoprefixer, jsdom, postcss (+8 more)

### Community 2 - "storeMiddleware.ts"
Cohesion: 0.32
Nodes (7): zustand, computeDiff(), createActionLogger(), createLoggedStore(), shallowEqual(), StoreLogConfig, withActionLogging()

### Community 3 - "lib.rs"
Cohesion: 0.11
Nodes (10): FileEntry, get_file_entry(), get_file_metadata(), is_supported_format(), list_directory(), read_file(), reveal_in_file_manager(), SUPPORTED_EXTENSIONS (+2 more)

### Community 4 - "tauri.conf.json"
Cohesion: 0.10
Nodes (19): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+11 more)

### Community 5 - "logManager"
Cohesion: 0.15
Nodes (8): formatError(), getComponentStack(), logger, logManager, redactContext(), LOG_LEVELS, LoggerConfig, LogLevel

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "PdfAdapter"
Cohesion: 0.18
Nodes (3): pdfjs-dist, loadPdfJs(), PdfAdapter

### Community 8 - "EpubAdapter"
Cohesion: 0.21
Nodes (3): epubjs, EpubAdapter, loadEpubJs()

### Community 10 - "Ebook Reader — Product & Technical Requirements Document"
Cohesion: 0.18
Nodes (10): 11. Persistence Model, 13. Non-Functional Requirements, 14. Platform Matrix, 16. Testing Strategy, 19. Open Decisions, 1.1 Core Principles, 1. Project Overview, 20. Glossary (+2 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, dompurify, epubjs, jszip, mammoth, pdfjs-dist, @primer/octicons-react, react (+9 more)

### Community 12 - "formats/registry.ts"
Cohesion: 0.19
Nodes (8): Phase 2: Single sources of truth, EXT_MAP, extractExtension(), FORMAT_DEFINITIONS, getFormatBadge(), getFormatInfo(), isFormatSupported(), ViewType

### Community 13 - "12. Functional Requirements"
Cohesion: 0.22
Nodes (9): 12.1 Application Shell, 12.2 Directory Panel, 12.3 Open File(s), 12.4 Reader Views, 12.5 Book-Level Configuration, 12.6 Format Support, 12.7 Error Reporting, 12.8 Persistence (+1 more)

### Community 14 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 15 - "15. Build & Distribution"
Cohesion: 0.33
Nodes (6): 15.1 Channels, 15.2 Artifacts, 15.3 CI/CD, 15.4 Two Android Flavors, 15.5 Update Strategy, 15. Build & Distribution

### Community 16 - "5. Application Shell & UI/UX"
Cohesion: 0.33
Nodes (6): 5.1 Two Modes, 5.2 Browse Mode, 5.3 Reading Mode, 5.4 Sidebar Behavior Rules, 5.5 UX Requirements, 5. Application Shell & UI/UX

### Community 17 - "default.json"
Cohesion: 0.29
Nodes (6): description, identifier, permissions, platforms, $schema, windows

### Community 18 - "6. File Navigation System"
Cohesion: 0.40
Nodes (5): 6.1 Model — Option A (Locked), 6.2 Sidebar Contents, 6.3 Entry Display Rules, 6.4 Open File(s), 6. File Navigation System

### Community 19 - "10. Error Reporting"
Cohesion: 0.50
Nodes (4): 10.1 Principles, 10.2 Error Taxonomy, 10.3 Error Surface Rules, 10. Error Reporting

### Community 20 - "18. Roadmap"
Cohesion: 0.50
Nodes (4): 18. Roadmap, MVP — Windows / Linux, Phase 2 — Windows / Linux, Phase 3 — Android & Extras

### Community 21 - "3. Tech Stack"
Cohesion: 0.50
Nodes (4): 3.1 Final Stack, 3.2 Why Tauri 2.x, 3.3 Explicit Rejections, 3. Tech Stack

### Community 22 - "7. Reader Views"
Cohesion: 0.50
Nodes (4): 7.1 View Modes, 7.2 View Rules (Locked), 7.3 View Applicability by Format, 7. Reader Views

### Community 23 - "9. Format Support"
Cohesion: 0.50
Nodes (4): 9.1 Support Matrix, 9.2 DJVU Decision, 9.3 Format Registry, 9. Format Support

### Community 24 - "2. Goals & Non-Goals"
Cohesion: 0.67
Nodes (3): 2.1 Goals, 2.2 Non-Goals, 2. Goals & Non-Goals

### Community 25 - "8. Book-Level Configuration"
Cohesion: 0.67
Nodes (3): 8.1 The Configure Button, 8.2 Settings Groups, 8. Book-Level Configuration

### Community 26 - "Open Source Licensing & Compliance Plan (GitHub Releases)"
Cohesion: 0.15
Nodes (12): 1. Executive Summary, 2. License Selection & Rationale, 3.1 Runtime Frontend Dependencies (`package.json`), 3.2 Runtime Backend Crates (`src-tauri/Cargo.toml`), 3.3 Build-Time & Development Tooling (Not Distributed in Binary), 3.4 Application Logo & Branding Artwork, 3. Dependency License Audit, 4. Implemented Licensing Artifacts (+4 more)

### Community 32 - "logger/index.ts"
Cohesion: 0.27
Nodes (14): correlationIdStack, generateCorrelationId(), getCorrelationId(), popCorrelationId(), pushCorrelationId(), runWithCorrelation(), setCorrelationId(), withCorrelationId() (+6 more)

### Community 33 - "BuildTask.kt"
Cohesion: 0.14
Nodes (3): BuildTask, Config, RustPlugin

### Community 34 - "config.ts"
Cohesion: 0.18
Nodes (11): getLoggerConfig(), getTransports(), initializeLoggerWithTauri(), createConsoleTransport(), createFileTransport(), enqueueWrite(), fileWriteQueue, processQueue() (+3 more)

### Community 35 - "main.tsx"
Cohesion: 0.18
Nodes (5): react-dom, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, loggerConfig

### Community 36 - "htmlAdapter.ts"
Cohesion: 0.15
Nodes (7): dompurify, mammoth, createDocxAdapter(), createHtmlAdapter(), DocxAdapter, TableOfContentsDrawerProps, TOCItem

### Community 37 - "tauri.dev.conf.json"
Cohesion: 0.50
Nodes (3): identifier, productName, $schema

### Community 38 - "App.tsx"
Cohesion: 0.06
Nodes (55): Phase 3: Responsive shell, react-window, App(), AppMode, FileEntry, sortEntries(), AppBar(), AppBarProps (+47 more)

### Community 41 - "logger/types.ts"
Cohesion: 0.29
Nodes (10): RFC-5424, compactFormatter(), jsonFormatter(), formatContext(), formatError(), LEVEL_COLORS, prettyFormatter(), ConsoleTransportOptions (+2 more)

### Community 42 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, autoprefixer, jsdom, postcss, tailwindcss, @tailwindcss/postcss, @tauri-apps/cli, @testing-library/jest-dom (+7 more)

### Community 44 - "mobile.json"
Cohesion: 0.29
Nodes (6): description, identifier, permissions, platforms, $schema, windows

### Community 45 - "Ebook Reader"
Cohesion: 0.11
Nodes (18): Android (ARM64), Architecture & Codebase Map, Architecture Diagram, Checksum Verification, Clone & Install Dependencies, Development Scripts & Commands, Development Setup, Diagnostics & Troubleshooting (+10 more)

### Community 46 - "LogViewer.tsx"
Cohesion: 0.50
Nodes (4): LEVEL_COLORS, LogEntryComponent(), LogViewer(), LogViewerProps

### Community 47 - "ReaderView.tsx"
Cohesion: 0.21
Nodes (19): @primer/octicons-react, react, getAdapterForPath(), FormatBadge(), ReaderView(), loadBook(), ReaderViewProps, escapeRegex() (+11 more)

### Community 48 - "store.ts"
Cohesion: 0.07
Nodes (12): @tauri-apps/plugin-store, createStore(), getStorageKey(), getStoreFileName(), isDevEnvironment(), TypedStoreImpl, UnifiedStore, WebStore (+4 more)

### Community 49 - "AppError"
Cohesion: 0.05
Nodes (58): 2.1 Why folder opening fails on Android (traced through the code), 2.3 Cross-cutting code smells that block a clean port, 2. Findings from the code review, 3.1 Principle, 3.2 Types (new file `src/platform/fs/types.ts`), 3.3 Navigation model (replaces path-string parsing), 3.4 Providers, 3.5 Single sources of truth (+50 more)

### Community 51 - "adapters/registry.ts"
Cohesion: 0.09
Nodes (9): createEpubAdapter(), createPdfAdapter(), getSupportedExtensions(), createTxtAdapter(), FormatInfo, BookAdapter, Bookmark, Format (+1 more)

### Community 55 - "bookStore.ts"
Cohesion: 0.15
Nodes (13): SearchAndBookmarksDrawerProps, SettingsDrawerProps, Bookmark, BookSettings, BookState, bookStorePersist, BookStoreState, DEFAULT_BOOK_SETTINGS (+5 more)

### Community 57 - "Ebook Reader: Cross-Platform & Responsive Refactor Plan"
Cohesion: 0.07
Nodes (23): 10. Guardrails for the agent, 11. Open questions for the maintainer, 1. Problem statement, 4.1 Viewport and insets (fixes the status-bar / gesture-bar overlap), 4.2 Breakpoints (by **width**, not device type; foldables/split-screen must work), 4.3 Concrete layout changes in `App.tsx` (browse mode), 4.4 Reader (`ReaderView.tsx`, not yet reviewed: audit required), 4. Responsive design specification (mandatory on all targets) (+15 more)

### Community 58 - "Ebook Reader — Build, Packaging & Deployment Guide"
Cohesion: 0.07
Nodes (28): 1. Architecture & Build Prerequisites, 2.1 Development Mode, 2.2 Production Build & Artifacts, 2.3 Installer vs. Direct App Usage (Portable), 2. Building for Windows, 3.1 Android SDK & Toolchain Setup, 3.2 Development & Direct Device Deployment (ADB), 3.3 Building Standalone APKs & Google Play Bundles (AAB) (+20 more)

### Community 59 - "formatRegistry"
Cohesion: 0.29
Nodes (3): formatRegistry, registerAdapter(), AdapterFactory

### Community 60 - "pathUtils.ts"
Cohesion: 0.68
Nodes (5): 2.2 Windows-only or desktop-only assumptions, extractDocumentTitle(), getBreadcrumbSegments(), getParentPath(), normalizePath()

### Community 61 - "Features & Capabilities"
Cohesion: 0.40
Nodes (5): Core Functionality & Shell, Data Isolation & Developer Experience, Features & Capabilities, Mobile & Android Experience, Reading Engine & Layout Modes

### Community 62 - "scripts"
Cohesion: 0.12
Nodes (16): scripts, android:install:current, build, build:android, build:desktop, build:frontend, dev, dev:desktop (+8 more)

### Community 63 - "4.3 Reader Adapter Pattern"
Cohesion: 0.50
Nodes (4): 4.1 High-Level, 4.2 FileSystemProvider Abstraction, 4.3 Reader Adapter Pattern, 4. Architecture

## Knowledge Gaps
- **11 isolated node(s):** `@tailwindcss/postcss`, `@tauri-apps/cli`, `@types/react`, `@types/react-dom`, `autoprefixer` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 409 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ebook Reader — Product & Technical Requirements Document` connect `Ebook Reader — Product & Technical Requirements Document` to `12. Functional Requirements`, `15. Build & Distribution`, `5. Application Shell & UI/UX`, `AppError`, `6. File Navigation System`, `10. Error Reporting`, `18. Roadmap`, `3. Tech Stack`, `7. Reader Views`, `9. Format Support`, `2. Goals & Non-Goals`, `8. Book-Level Configuration`, `4.3 Reader Adapter Pattern`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `AppError` (e.g. with `DEV-LOG.md` and `2.3 Cross-cutting code smells that block a clean port`) actually correct?**
  _`AppError` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tailwindcss/postcss`, `@tauri-apps/cli`, `@types/react` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `extractDocumentTitle` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Why does `17. Risks & Mitigations` connect `AppError` to `Ebook Reader — Product & Technical Requirements Document`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `toAppError()` (e.g. with `DEV-LOG.md` and `5.1 `src-tauri/src/lib.rs``) actually correct?**
  _`toAppError()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._