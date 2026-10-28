# Graph Report - ebook-reader  (2026-10-28)

## Corpus Check
- 63 files · ~49,015 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 23 file(s) not represented in the graph (top: .xml 9, (none) 6, .properties 2)

## Summary
- 650 nodes · 1163 edges · 50 communities (36 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82d6b7f1`
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
- BuildTask.kt
- logManager
- DocxAdapter
- formatRegistry
- BookAdapter
- bookStore.ts
- HtmlAdapter
- TOCItem
- .onCreate
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

## Communities (50 total, 14 thin omitted)

### Community 0 - "BookInstance"
Cohesion: 0.17
Nodes (5): jszip, CbzAdapter, createCbzAdapter(), loadJSZip(), RenderOptions

### Community 1 - "package.json"
Cohesion: 0.13
Nodes (14): name, private, type, version, autoprefixer, postcss, tailwindcss, @tailwindcss/postcss (+6 more)

### Community 2 - "bookStore.ts"
Cohesion: 0.10
Nodes (5): @tauri-apps/plugin-store, createStore(), TypedStoreImpl, UnifiedStore, WebStore

### Community 3 - "lib.rs"
Cohesion: 0.11
Nodes (9): DirectoryEntry, FileEntry, get_file_entry(), get_file_metadata(), is_supported_format(), list_directory(), pick_directory(), read_file() (+1 more)

### Community 4 - "tauri.conf.json"
Cohesion: 0.11
Nodes (18): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+10 more)

### Community 5 - "logger/index.ts"
Cohesion: 0.07
Nodes (44): RFC-5424, LEVEL_COLORS, LogEntryComponent(), LogViewer(), LogViewerProps, getLoggerConfig(), getTransports(), initializeLoggerWithTauri() (+36 more)

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "PdfAdapter"
Cohesion: 0.13
Nodes (5): pdfjs-dist, createPdfAdapter(), loadPdfJs(), PdfAdapter, SearchResult

### Community 8 - "EpubAdapter"
Cohesion: 0.15
Nodes (4): epubjs, createEpubAdapter(), EpubAdapter, loadEpubJs()

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
Cohesion: 0.06
Nodes (70): @primer/octicons-react, react, react-window, @tauri-apps/api, @tauri-apps/plugin-fs, getAdapterForPath(), App(), AppMode (+62 more)

### Community 33 - "registry.ts"
Cohesion: 0.16
Nodes (9): dompurify, mammoth, createDocxAdapter(), createHtmlAdapter(), getSupportedExtensions(), createTxtAdapter(), Bookmark, Format (+1 more)

### Community 34 - "BuildTask.kt"
Cohesion: 0.14
Nodes (3): BuildTask, Config, RustPlugin

### Community 35 - "logManager"
Cohesion: 0.09
Nodes (9): react-dom, ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, formatError(), getComponentStack(), logManager, redactContext() (+1 more)

### Community 36 - "DocxAdapter"
Cohesion: 0.17
Nodes (5): 4.1 High-Level, 4.2 FileSystemProvider Abstraction, 4.3 Reader Adapter Pattern, 4. Architecture, DocxAdapter

### Community 37 - "formatRegistry"
Cohesion: 0.29
Nodes (3): formatRegistry, registerAdapter(), AdapterFactory

### Community 39 - "bookStore.ts"
Cohesion: 0.08
Nodes (28): zustand, escapeRegex(), renderHighlightedContext(), SearchAndBookmarksDrawer(), SearchAndBookmarksDrawerProps, SearchBookmarksTab, Bookmark, BookState (+20 more)

### Community 40 - "HtmlAdapter"
Cohesion: 0.18
Nodes (5): Core Functionality, Features & Support Status, Important Limitations, Supported Formats & Support Matrix, HtmlAdapter

### Community 41 - "TOCItem"
Cohesion: 0.38
Nodes (4): TableOfContentsDrawer(), TableOfContentsDrawerProps, TOCNodeItem(), TOCItem

### Community 44 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, tauri

## Knowledge Gaps
- **11 isolated node(s):** `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli`, `@types/react`, `@types/react-dom` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 319 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BookAdapter` connect `BookAdapter` to `BookInstance`, `registry.ts`, `tauriApi.ts`, `DocxAdapter`, `formatRegistry`, `PdfAdapter`, `EpubAdapter`, `HtmlAdapter`, `TxtAdapter`, `Ebook Reader`?**
  _High betweenness centrality (0.200) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `BookAdapter` (e.g. with `Key Architectural Patterns` and `Where to Find Key Components`) actually correct?**
  _`BookAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tauri-apps/plugin-opener`, `@tailwindcss/postcss`, `@tauri-apps/cli` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Ebook Reader — Product & Technical Requirements Document` connect `Ebook Reader — Product & Technical Requirements Document` to `DocxAdapter`, `12. Functional Requirements`, `15. Build & Distribution`, `5. Application Shell & UI/UX`, `6. File Navigation System`, `10. Error Reporting`, `18. Roadmap`, `3. Tech Stack`, `7. Reader Views`, `9. Format Support`, `2. Goals & Non-Goals`, `8. Book-Level Configuration`, `Ebook Reader`?**
  _High betweenness centrality (0.148) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `EpubAdapter` (e.g. with `4.3 Reader Adapter Pattern` and `Supported Formats & Support Matrix`) actually correct?**
  _`EpubAdapter` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `bookStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0960591133004926 - nodes in this community are weakly interconnected._