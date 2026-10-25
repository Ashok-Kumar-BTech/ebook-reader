# Graph Report - ebook-reader  (2026-10-25)

## Corpus Check
- 27 files · ~14,182 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 4, .icns 1, .ico 1)

## Summary
- 369 nodes · 499 edges · 32 communities (24 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- registry.ts
- package.json
- bookStore.ts
- lib.rs
- tauri.conf.json
- BookAdapter
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
- Tauri + React + Typescript
- ebook-reader

## God Nodes (most connected - your core abstractions)
1. `BookAdapter` - 25 edges
2. `Ebook Reader — Product & Technical Requirements Document` - 22 edges
3. `EpubAdapter` - 20 edges
4. `RenderOptions` - 18 edges
5. `TxtAdapter` - 16 edges
6. `compilerOptions` - 16 edges
7. `PdfAdapter` - 14 edges
8. `TOCItem` - 14 edges
9. `DocxAdapter` - 13 edges
10. `CbzAdapter` - 12 edges

## Surprising Connections (you probably didn't know these)
- `4.3 Reader Adapter Pattern` --references--> `EpubAdapter`  [INFERRED]
  docs/PRD.md → src/adapters/epubAdapter.ts
- `4.3 Reader Adapter Pattern` --references--> `DocxAdapter`  [INFERRED]
  docs/PRD.md → src/adapters/htmlAdapter.ts
- `4.3 Reader Adapter Pattern` --references--> `PdfAdapter`  [INFERRED]
  docs/PRD.md → src/adapters/pdfAdapter.ts
- `CbzAdapter` --implements--> `BookAdapter`  [EXTRACTED]
  src/adapters/cbzAdapter.ts → src/types/reader.ts
- `EpubAdapter` --implements--> `BookAdapter`  [EXTRACTED]
  src/adapters/epubAdapter.ts → src/types/reader.ts

## Import Cycles
- None detected.

## Communities (32 total, 8 thin omitted)

### Community 0 - "registry.ts"
Cohesion: 0.06
Nodes (20): jszip, CbzAdapter, createCbzAdapter(), loadJSZip(), createEpubAdapter(), createDocxAdapter(), createHtmlAdapter(), DocxAdapter (+12 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (34): name, private, scripts, build, dev, preview, tauri, type (+26 more)

### Community 2 - "bookStore.ts"
Cohesion: 0.09
Nodes (19): @tauri-apps/plugin-store, zustand, Bookmark, BookSettings, BookState, bookStorePersist, BookStoreState, DEFAULT_BOOK_SETTINGS (+11 more)

### Community 3 - "lib.rs"
Cohesion: 0.12
Nodes (8): DirectoryEntry, FileEntry, get_file_entry(), get_file_metadata(), is_supported_format(), list_directory(), pick_directory(), SUPPORTED_EXTENSIONS

### Community 4 - "tauri.conf.json"
Cohesion: 0.10
Nodes (20): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+12 more)

### Community 5 - "BookAdapter"
Cohesion: 0.13
Nodes (4): formatRegistry, registerAdapter(), AdapterFactory, BookAdapter

### Community 6 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 7 - "PdfAdapter"
Cohesion: 0.12
Nodes (7): 4.1 High-Level, 4.2 FileSystemProvider Abstraction, 4.3 Reader Adapter Pattern, 4. Architecture, pdfjs-dist, loadPdfJs(), PdfAdapter

### Community 10 - "Ebook Reader — Product & Technical Requirements Document"
Cohesion: 0.17
Nodes (11): 11. Persistence Model, 13. Non-Functional Requirements, 14. Platform Matrix, 16. Testing Strategy, 17. Risks & Mitigations, 19. Open Decisions, 1.1 Core Principles, 1. Project Overview (+3 more)

### Community 11 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, dompurify, epubjs, jszip, mammoth, pdfjs-dist, react, react-dom (+4 more)

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

## Knowledge Gaps
- **12 isolated node(s):** `@tauri-apps/plugin-opener`, `dompurify`, `mammoth`, `@tailwindcss/postcss`, `@tauri-apps/cli` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 225 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ebook Reader — Product & Technical Requirements Document` connect `Ebook Reader — Product & Technical Requirements Document` to `PdfAdapter`, `12. Functional Requirements`, `15. Build & Distribution`, `5. Application Shell & UI/UX`, `6. File Navigation System`, `10. Error Reporting`, `18. Roadmap`, `3. Tech Stack`, `7. Reader Views`, `9. Format Support`, `2. Goals & Non-Goals`, `8. Book-Level Configuration`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **What connects `@tauri-apps/plugin-opener`, `dompurify`, `mammoth` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `registry.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062146892655367235 - nodes in this community are weakly interconnected._
- **Why does `4.3 Reader Adapter Pattern` connect `PdfAdapter` to `EpubAdapter`, `registry.ts`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06072874493927125 - nodes in this community are weakly interconnected._
- **Why does `4. Architecture` connect `PdfAdapter` to `Ebook Reader — Product & Technical Requirements Document`?**
  _High betweenness centrality (0.213) - this node is a cross-community bridge._
- **Should `bookStore.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08505747126436781 - nodes in this community are weakly interconnected._