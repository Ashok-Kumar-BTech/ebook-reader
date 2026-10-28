# Graph Report - ebook-reader  (2026-10-28)

## Corpus Check
- 55 files · ~39,741 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .icns 1, .ico 1)

## Summary
- 613 nodes · 1118 edges · 42 communities (34 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6f2a837c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- BookInstance
- package.json
- bookStore.ts
- lib.rs
- tauri.conf.json
- logger/index.ts
- compilerOptions
- PdfAdapter
- EpubAdapter
- TxtAdapter
- Ebook Reader — Product & Technical Requirements Document
- dependencies
- devDependencies
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
- tauriApi.ts
- registry.ts
- types.ts
- main.tsx
- DocxAdapter
- BookAdapter
- App.tsx
- HtmlAdapter
- scripts
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `BookAdapter` - 28 edges
2. `logManager` - 28 edges
3. `Ebook Reader — Product & Technical Requirements Document` - 22 edges
4. `EpubAdapter` - 20 edges
5. `RenderOptions` - 19 edges
6. `App()` - 18 edges
7. `TOCItem` - 17 edges
8. `TxtAdapter` - 16 edges
9. `compilerOptions` - 16 edges
10. `HtmlAdapter` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Key Architectural Patterns` --references--> `BookAdapter`  [INFERRED]
  README.md → src/types/reader.ts
- `Where to Find Key Components` --references--> `BookAdapter`  [INFERRED]
  README.md → src/types/reader.ts
- `Supported Formats & Support Matrix` --references--> `CbzAdapter`  [INFERRED]
  README.md → src/adapters/cbzAdapter.ts
- `4.3 Reader Adapter Pattern` --references--> `EpubAdapter`  [INFERRED]
  docs/PRD.md → src/adapters/epubAdapter.ts
- `Supported Formats & Support Matrix` --references--> `EpubAdapter`  [INFERRED]
  README.md → src/adapters/epubAdapter.ts

## Import Cycles
- 2-file cycle: `src/utils/logger/index.ts -> src/utils/logger/react.ts -> src/utils/logger/index.ts`

## Communities (42 total, 8 thin omitted)

### Community 0 - "BookInstance"
Cohesion: 0.14
Nodes (5): jszip, CbzAdapter, createCbzAdapter(), loadJSZip(), SearchResult

### Community 1 - "package.json"
Cohesion: 0.13
Nodes (14): name, private, type, version, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss (+6 more)

### Community 2 - "bookStore.ts"
Cohesion: 0.07
Nodes (13): @tauri-apps/plugin-store, AppTheme, loggedStoreCreator, logger, SortBy, SortOrder, UiState, uiStorePersist (+5 more)

### Community 3 - "lib.rs"
Cohesion: 0.11
Nodes (9): DirectoryEntry, FileEntry, get_file_entry(), get_file_metadata(), is_supported_format(), list_directory(), pick_directory(), read_file() (+1 more)

### Community 4 - "tauri.conf.json"
Cohesion: 0.11
Nodes (18): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+10 more)

### Community 5 - "logger/index.ts"
Cohesion: 0.06
Nodes (35): zustand, LEVEL_COLORS, LogEntryComponent(), LogViewer(), LogViewerProps, getLoggerConfig(), correlationIdStack, generateCorrelationId() (+27 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "PdfAdapter"
Cohesion: 0.18
Nodes (5): 4.1 High-Level, 4.2 FileSystemProvider Abstraction, 4.3 Reader Adapter Pattern, 4. Architecture, PdfAdapter

### Community 8 - "EpubAdapter"
Cohesion: 0.13
Nodes (5): epubjs, createEpubAdapter(), EpubAdapter, loadEpubJs(), TOCItem

### Community 10 - "Ebook Reader — Product & Technical Requirements Document"
Cohesion: 0.18
Nodes (11): 11. Persistence Model, 13. Non-Functional Requirements, 14. Platform Matrix, 16. Testing Strategy, 17. Risks & Mitigations, 19. Open Decisions, 1.1 Core Principles, 1. Project Overview (+3 more)

### Community 11 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, dompurify, epubjs, jszip, mammoth, pdfjs-dist, @primer/octicons-react, react (+8 more)

### Community 12 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss, @tauri-apps/cli, @types/react, @types/react-dom (+3 more)

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
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

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

### Community 32 - "tauriApi.ts"
Cohesion: 0.08
Nodes (52): @tauri-apps/api, @tauri-apps/plugin-fs, getAdapterForPath(), App(), AppMode, FileEntry, sortEntries(), SUPPORTED_EXTENSIONS (+44 more)

### Community 33 - "registry.ts"
Cohesion: 0.12
Nodes (12): dompurify, mammoth, pdfjs-dist, createDocxAdapter(), createHtmlAdapter(), createPdfAdapter(), loadPdfJs(), getSupportedExtensions() (+4 more)

### Community 34 - "types.ts"
Cohesion: 0.13
Nodes (21): RFC-5424, getTransports(), initializeLoggerWithTauri(), compactFormatter(), jsonFormatter(), formatContext(), formatError(), LEVEL_COLORS (+13 more)

### Community 35 - "main.tsx"
Cohesion: 0.18
Nodes (5): react-dom, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, loggerConfig

### Community 37 - "BookAdapter"
Cohesion: 0.12
Nodes (5): formatRegistry, registerAdapter(), AdapterFactory, BookAdapter, Format

### Community 39 - "App.tsx"
Cohesion: 0.09
Nodes (32): @primer/octicons-react, react, react-window, FormatBadge(), getFormatBadge(), SUPPORTED_EXTENSIONS, ReaderViewProps, escapeRegex() (+24 more)

### Community 40 - "HtmlAdapter"
Cohesion: 0.19
Nodes (5): Core Functionality, Features & Support Status, Important Limitations, Supported Formats & Support Matrix, HtmlAdapter

### Community 44 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, tauri

## Knowledge Gaps
- **11 isolated node(s):** `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli`, `@types/react`, `@types/react-dom` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 306 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BookAdapter` connect `BookAdapter` to `BookInstance`, `registry.ts`, `DocxAdapter`, `PdfAdapter`, `EpubAdapter`, `HtmlAdapter`, `TxtAdapter`, `App.tsx`, `Ebook Reader`?**
  _High betweenness centrality (0.225) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `BookAdapter` (e.g. with `Key Architectural Patterns` and `Where to Find Key Components`) actually correct?**
  _`BookAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `BookInstance` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Why does `Ebook Reader — Product & Technical Requirements Document` connect `Ebook Reader — Product & Technical Requirements Document` to `PdfAdapter`, `12. Functional Requirements`, `15. Build & Distribution`, `5. Application Shell & UI/UX`, `6. File Navigation System`, `10. Error Reporting`, `18. Roadmap`, `3. Tech Stack`, `7. Reader Views`, `9. Format Support`, `2. Goals & Non-Goals`, `8. Book-Level Configuration`, `Ebook Reader`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `EpubAdapter` (e.g. with `4.3 Reader Adapter Pattern` and `Supported Formats & Support Matrix`) actually correct?**
  _`EpubAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._