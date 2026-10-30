# Graph Report - ebook-reader  (2026-10-30)

## Corpus Check
- 79 files · ~60,933 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .xml 9, (none) 6, .properties 2)

## Summary
- 777 nodes · 1579 edges · 56 communities (41 shown, 15 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 92 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `425a2bfe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BookInstance
- package.json
- storeMiddleware.ts
- lib.rs
- tauri.conf.json
- logManager
- compilerOptions
- RenderOptions
- EpubAdapter
- RenderOptions
- Ebook Reader — Product & Technical Requirements Document
- dependencies
- tauriApi.ts
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
- Ebook Reader
- ebook-reader
- logger/index.ts
- BuildTask.kt
- config.ts
- main.tsx
- RenderOptions
- adapters/registry.ts
- App.tsx
- HtmlAdapter
- logger/types.ts
- devDependencies
- LoggerInstance
- mobile.json
- scripts
- LogViewer.tsx
- vite.config.ts
- store.ts
- tauriApi.ts
- BookAdapter
- Ebook Reader: Cross-Platform & Responsive Refactor Plan

## God Nodes (most connected - your core abstractions)
1. `logManager` - 31 edges
2. `toAppError()` - 29 edges
3. `AppError` - 28 edges
4. `BookAdapter` - 28 edges
5. `App()` - 22 edges
6. `Ebook Reader — Product & Technical Requirements Document` - 22 edges
7. `EpubAdapter` - 20 edges
8. `DirRef` - 19 edges
9. `RenderOptions` - 19 edges
10. `ReaderView()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `5.3 Persistence changes` --references--> `ErrorHost()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/components/ErrorHost.tsx
- `9. PRD updates required (`docs/PRD.md`)` --references--> `AppError`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/errors/appError.ts
- `5.1 `src-tauri/src/lib.rs`` --references--> `toAppError()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/errors/appError.ts
- `4.2 Breakpoints (by **width**, not device type; foldables/split-screen must work)` --references--> `useBreakpoint()`  [INFERRED]
  docs/CROSS_PLATFORM_PLAN.md → src/hooks/useBreakpoint.ts
- `Key Architectural Patterns` --references--> `BookAdapter`  [INFERRED]
  README.md → src/types/reader.ts

## Import Cycles
- 2-file cycle: `src/utils/logger/index.ts -> src/utils/logger/react.ts -> src/utils/logger/index.ts`

## Communities (56 total, 15 thin omitted)

### Community 0 - "BookInstance"
Cohesion: 0.13
Nodes (5): jszip, CbzAdapter, createCbzAdapter(), loadJSZip(), SearchResult

### Community 1 - "package.json"
Cohesion: 0.12
Nodes (15): name, private, type, version, autoprefixer, postcss, react-window, tailwindcss (+7 more)

### Community 2 - "storeMiddleware.ts"
Cohesion: 0.32
Nodes (7): zustand, computeDiff(), createActionLogger(), createLoggedStore(), shallowEqual(), StoreLogConfig, withActionLogging()

### Community 3 - "lib.rs"
Cohesion: 0.15
Nodes (7): FileEntry, get_file_entry(), get_file_metadata(), is_supported_format(), list_directory(), read_file(), SUPPORTED_EXTENSIONS

### Community 4 - "tauri.conf.json"
Cohesion: 0.11
Nodes (18): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+10 more)

### Community 5 - "logManager"
Cohesion: 0.15
Nodes (8): formatError(), getComponentStack(), logger, logManager, redactContext(), LOG_LEVELS, LoggerConfig, LogLevel

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "RenderOptions"
Cohesion: 0.11
Nodes (9): 4.1 High-Level, 4.2 FileSystemProvider Abstraction, 4.3 Reader Adapter Pattern, 4. Architecture, pdfjs-dist, createPdfAdapter(), loadPdfJs(), PdfAdapter (+1 more)

### Community 8 - "EpubAdapter"
Cohesion: 0.13
Nodes (6): epubjs, createEpubAdapter(), EpubAdapter, loadEpubJs(), TableOfContentsDrawerProps, TOCItem

### Community 10 - "Ebook Reader — Product & Technical Requirements Document"
Cohesion: 0.20
Nodes (10): 11. Persistence Model, 13. Non-Functional Requirements, 14. Platform Matrix, 16. Testing Strategy, 19. Open Decisions, 1.1 Core Principles, 1. Project Overview, 20. Glossary (+2 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, dompurify, epubjs, jszip, mammoth, pdfjs-dist, @primer/octicons-react, react (+9 more)

### Community 12 - "tauriApi.ts"
Cohesion: 0.08
Nodes (30): 3.1 Principle, 3.2 Types (new file `src/platform/fs/types.ts`), 3.3 Navigation model (replaces path-string parsing), 3.4 Providers, 3.5 Single sources of truth, 3. Target architecture, Phase 2: Single sources of truth, 17. Risks & Mitigations (+22 more)

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

### Community 26 - "Ebook Reader"
Cohesion: 0.06
Nodes (29): Architectural Overview, Architecture & Codebase Map, Basic Usage Instructions, Clone & Install, Codebase Directory Map, Contribution Guidelines, Development & Execution Commands, Development Setup & Execution (+21 more)

### Community 32 - "logger/index.ts"
Cohesion: 0.27
Nodes (14): correlationIdStack, generateCorrelationId(), getCorrelationId(), popCorrelationId(), pushCorrelationId(), runWithCorrelation(), setCorrelationId(), withCorrelationId() (+6 more)

### Community 33 - "BuildTask.kt"
Cohesion: 0.14
Nodes (3): BuildTask, Config, RustPlugin

### Community 34 - "config.ts"
Cohesion: 0.16
Nodes (14): @tauri-apps/api, getLoggerConfig(), getTransports(), initializeLoggerWithTauri(), createConsoleTransport(), createFileTransport(), initialize(), enqueueWrite() (+6 more)

### Community 35 - "main.tsx"
Cohesion: 0.18
Nodes (5): react-dom, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, loggerConfig

### Community 37 - "adapters/registry.ts"
Cohesion: 0.12
Nodes (12): dompurify, mammoth, createDocxAdapter(), createHtmlAdapter(), formatRegistry, getSupportedExtensions(), registerAdapter(), FormatInfo (+4 more)

### Community 38 - "App.tsx"
Cohesion: 0.05
Nodes (80): 2.2 Windows-only or desktop-only assumptions, 5.4 Window state (A8), Phase 3: Responsive shell, @primer/octicons-react, react, @tauri-apps/plugin-store, getAdapterForPath(), App() (+72 more)

### Community 40 - "HtmlAdapter"
Cohesion: 0.19
Nodes (5): Core Functionality, Features & Support Status, Important Limitations, Supported Formats & Support Matrix, HtmlAdapter

### Community 41 - "logger/types.ts"
Cohesion: 0.29
Nodes (10): RFC-5424, compactFormatter(), jsonFormatter(), formatContext(), formatError(), LEVEL_COLORS, prettyFormatter(), ConsoleTransportOptions (+2 more)

### Community 42 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss, @tauri-apps/cli, @types/react, @types/react-dom (+3 more)

### Community 44 - "mobile.json"
Cohesion: 0.29
Nodes (6): description, identifier, permissions, platforms, $schema, windows

### Community 45 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, tauri

### Community 46 - "LogViewer.tsx"
Cohesion: 0.50
Nodes (4): LEVEL_COLORS, LogEntryComponent(), LogViewer(), LogViewerProps

### Community 48 - "store.ts"
Cohesion: 0.10
Nodes (3): TypedStoreImpl, UnifiedStore, WebStore

### Community 49 - "tauriApi.ts"
Cohesion: 0.10
Nodes (35): 2.1 Why folder opening fails on Android (traced through the code), 2.3 Cross-cutting code smells that block a clean port, 2. Findings from the code review, @tauri-apps/plugin-fs, DirectoryPicker(), FileNode, FileTree(), FileTreeNode() (+27 more)

### Community 57 - "Ebook Reader: Cross-Platform & Responsive Refactor Plan"
Cohesion: 0.07
Nodes (22): 10. Guardrails for the agent, 11. Open questions for the maintainer, 1. Problem statement, 4.1 Viewport and insets (fixes the status-bar / gesture-bar overlap), 4.2 Breakpoints (by **width**, not device type; foldables/split-screen must work), 4.3 Concrete layout changes in `App.tsx` (browse mode), 4.4 Reader (`ReaderView.tsx`, not yet reviewed: audit required), 4. Responsive design specification (mandatory on all targets) (+14 more)

## Knowledge Gaps
- **11 isolated node(s):** `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli`, `@types/react`, `@types/react-dom` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 342 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ebook Reader — Product & Technical Requirements Document` connect `Ebook Reader — Product & Technical Requirements Document` to `RenderOptions`, `tauriApi.ts`, `12. Functional Requirements`, `15. Build & Distribution`, `5. Application Shell & UI/UX`, `6. File Navigation System`, `10. Error Reporting`, `18. Roadmap`, `3. Tech Stack`, `7. Reader Views`, `9. Format Support`, `2. Goals & Non-Goals`, `8. Book-Level Configuration`, `Ebook Reader`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `toAppError()` (e.g. with `DEV-LOG.md` and `5.1 `src-tauri/src/lib.rs``) actually correct?**
  _`toAppError()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BookInstance` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Why does `17. Risks & Mitigations` connect `tauriApi.ts` to `Ebook Reader — Product & Technical Requirements Document`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `AppError` (e.g. with `DEV-LOG.md` and `2.3 Cross-cutting code smells that block a clean port`) actually correct?**
  _`AppError` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._