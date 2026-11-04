# Ebook Reader

A cross-platform, local-first ebook reader that opens books stored on your own device — no accounts, no cloud, no tracking, fully offline.

## Philosophy

**Local-first** by design: all data stays strictly on your device. There is no login, no account creation, no cloud sync, no remote backend API, no analytics, and no telemetry. The application functions completely offline, preserving your reading privacy forever.

## Platform Status

| Platform | Status | Scope |
|----------|--------|-------|
| **Windows** | 🟢 Primary Target | Active (Windows 10/11 x64, WebView2) |
| **Linux** | 🟢 Primary Target | Active (AppImage, deb, rpm, tar.gz, WebKit2GTK) |
| **Android** | 🟡 Future Scope | Planned for Phase 3 (Storage Access Framework) |
| **macOS / iOS** | ⚪ Out of Scope | Not planned (intentional non-goals) |

> **Screenshot / Preview**
> 
> *Screenshots and demo captures will be published in the [docs/assets](docs/) directory upon public release.*

---

## Features & Support Status

### Core Functionality
- **Browse Local Directories** — Open any directory on your filesystem. Navigate smoothly with a virtualized file list or visual grid view, interactive breadcrumb navigation, and navigation history (back, forward, up).
- **Recent Directory History** — Persistent tracking of up to 5 recently opened directories, ordered from latest to oldest. Easily accessible via the "Open Folder" split dropdown menu in the header and interactive cards on the Welcome screen.
- **Continuous Scroll as Default** — Books launch in Continuous Scroll view by default across all formats, with lazy-loaded page slots powered by `IntersectionObserver`.
- **Reader Views** — Seamless switching between:
  - **Continuous Scroll View** (default): Vertical scrolling with responsive page slots and vector clarity.
  - **Single Page View**: Focused reading sized to ~80% of Scroll view width (~700px), with safe scroll margins to ensure zero content clipping at page tops.
  - **Two-Page Spread View**: Open-book layout with 0px center gutter and a 1px spine divider matching modern browser PDF viewers.
- **Universal Pinch-to-Zoom Engine** — Smooth 0.5x to 3.0x scaling with native multi-touch gestures (Pointer Events tracking) and high-DPI precision trackpad pinch scaling.
- **In-Book Search** — Fast multi-match text search across pages with context snippets. Persistent right-docked drawer stays open while exploring matches and resets instantly when the search query is cleared.
- **Table of Contents** — Dedicated left-docked TOC drawer accessible just below the top panel, displaying hierarchical chapter trees with active chapter indicators.
- **Bookmarks & Annotations** — Visual golden corner ribbons on bookmarked pages and timeline pin markers with jump-to-page navigation.
- **Reading Themes & Customization** — Light, Dark, and Sepia themes, line height adjustments for reflowable formats, and per-book reading state persistence (last read page, zoom, layout mode).
- **High-Performance Streaming** — Raw binary IPC streaming via Tauri (`tauri::ipc::Response`), allowing books over 40MB to load in milliseconds without UI freezes.

### Supported Formats & Support Matrix

| Format | Status | Engine / Implementation | Features Supported |
|--------|--------|-------------------------|-------------------|
| **PDF** (`.pdf`) | ✅ Working | `PdfAdapter` (`pdfjs-dist`) | High-DPI canvas backing store, DPR scaling up to 3.5x, text selection, TOC extraction, iterative multi-match search |
| **EPUB** (`.epub`) | ✅ Working | `EpubAdapter` (`epubjs`) | Reflowable layout, chapter navigation, themes, font size & line-height scaling, in-book search |
| **CBZ** (`.cbz`) | ✅ Working | `CbzAdapter` (`jszip`) | Comic archive reading, image extraction, paginated & continuous views, theme filters |
| **TXT** (`.txt`) | ✅ Working | `TxtAdapter` | Automatic UTF-8/encoding detection, virtualized page slicing, regex chapter TOC |
| **HTML / XHTML** (`.html`, `.htm`, `.xhtml`) | ✅ Working | `HtmlAdapter` (`dompurify`) | Sanitized DOM rendering, styled text flow, responsive container containment |
| **DOCX** (`.docx`) | ✅ Working | `DocxAdapter` (`mammoth`) | Document-to-HTML conversion, image extraction, reflowable layout |
| **CBR** (`.cbr`) | 📋 Planned | `CbrAdapter` | Comic book RAR archive support via sidecar (Phase 2) |
| **FB2** (`.fb2`) | 📋 Planned | `Fb2Adapter` | FictionBook XML format parser (Phase 2) |
| **Markdown** (`.md`) | 📋 Planned | `MarkdownAdapter` | GitHub-flavored markdown reader (Phase 2) |
| **RTF** (`.rtf`) | 📋 Planned | `RtfAdapter` | Rich Text Format parser (Phase 2) |
| **MOBI / AZW3** (`.mobi`, `.azw3`) | 📋 Planned | Calibre sidecar / parser | Optional format sidecar (Phase 3) |
| **DJVU** (`.djvu`) | ⚪ Deferred | — | Deferred to Phase 3 evaluation |
| **DRM-Protected Books** (`.acsm`, Kindle DRM, FairPlay) | ❌ Unsupported | — | Strictly unsupported; DRM circumvention tools will never be included |
| **Proprietary Media Formats** (Audio/Video ebooks) | ❌ Unsupported | — | Out of scope; only text, vector, and image documents are supported |

### Important Limitations
- **DRM-Protected Books Are Unsupported:** Files locked with Adobe Adept, Amazon Kindle DRM, or Apple FairPlay are strictly unsupported. No DRM circumvention tools are included or planned.
- **No Remote Cloud Sync or User Accounts:** All bookmarks, reading positions, and history are saved strictly to local JSON files via the Tauri Store plugin.
- **No Heavy Background Indexing:** Directories are read on-demand without background database file crawlers or battery-draining indexing services.
- **Fixed-Layout vs. Reflowable:** Typography adjustments (such as line height) apply exclusively to reflowable formats (EPUB, HTML, DOCX, TXT); fixed-layout formats (PDF, CBZ) scale via vector viewport zoom.

---

## Installation & Usage

### Download Releases
Pre-built binary packages and installers are published on the GitHub Releases page:
👉 **[Download Latest Release](https://github.com/Ashok-Kumar-BTech/ebook-reader/releases)**

### Windows Installation
1. Download the latest `ebook-reader_x.x.x_x64_en-US.msi` installer or standalone `.exe`.
2. Run the installer and complete the setup wizard.
3. Launch **Ebook Reader** from your Start Menu or Desktop shortcut.

### Linux Installation
1. Download your preferred package format from GitHub Releases:
   - **AppImage (Universal):**
     ```bash
     chmod +x ebook-reader_*.AppImage
     ./ebook-reader_*.AppImage
     ```
   - **Debian / Ubuntu (`.deb`):**
     ```bash
     sudo dpkg -i ebook-reader_*_amd64.deb
     sudo apt-get install -f # resolve any missing dependencies
     ```
   - **Tarball (`.tar.gz`):**
     Extract the archive and run the executable directly.

### Basic Usage Instructions
1. **Launch the App:** You will be greeted by the Welcome Screen.
2. **Open a Folder:** Click **Open Folder** (or press `Ctrl+O`) to select a directory containing your books.
3. **Quick Resume:** If you have previously opened directories, click on any item in the **Recent Folders** list or the header split dropdown to reopen it immediately.
4. **Browse & Filter:** Use the search bar (`Ctrl+F` in browse mode) to filter files, or toggle between **Grid View** and **List View**.
5. **Read a Book:** Click any book card or list item to launch the reader.
6. **Reader Controls:**
   - **Table of Contents:** Click the floating **Contents** button on the left edge (or press `C`).
   - **Search & Bookmarks:** Click the **Search** (`Ctrl+F`) or **Bookmarks** (`B`) button in the top menu.
   - **Reader Settings:** Click **Settings** (or press `S`) to change reading themes (Light, Sepia, Dark) or view modes (Scroll, Single, Spread).
   - **Zoom Controls:** Use the `-` / `+` toolbar buttons, press `-` / `+` on your keyboard, double-click to toggle zoom, or pinch in/out on your touchpad/touchscreen.
   - **Exit Reader:** Click the close button (`X`) or press `Esc` to return to library browse mode.

### Troubleshooting
- **Windows — WebView2 Missing:** On older Windows 10 installations, download and install the [Microsoft Edge WebView2 Evergreen Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).
- **Linux — WebKit2GTK Error:** If you encounter `libwebkit2gtk-4.1.so.0: cannot open shared object file`, install the runtime dependency:
  - Debian/Ubuntu: `sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1`
  - Arch Linux: `sudo pacman -S webkit2gtk-4.1 libayatana-appindicator`
  - Fedora: `sudo dnf install webkit2gtk4.1 libayatana-appindicator`
- **Linux — Wayland Scaling Issues:** If window rendering appears distorted under Wayland, launch with `GDK_BACKEND=x11 ./ebook-reader`.

---

## Development Setup & Execution

### Prerequisites
Before setting up the project locally, ensure you have the following installed:

| Tool | Required Version | Purpose | Installation Link |
|------|------------------|---------|-------------------|
| **Node.js** | 20.x+ (LTS recommended) | Frontend runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 10.x+ (shipped with Node) | Package manager | Shipped with Node.js |
| **Rust & Cargo** | 1.78+ (stable) | Native backend | [rustup.rs](https://rustup.rs/) |
| **C++ Build Tools** | Visual Studio Build Tools | Windows native compiler | [Visual Studio C++ Workload](https://visualstudio.microsoft.com/visual-cpp-build-tools/) |
| **Platform Dependencies** | OS-specific | Tauri 2.x libraries | [Tauri System Prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites) |

### Clone & Install
```bash
# Clone the repository
git clone https://github.com/Ashok-Kumar-BTech/ebook-reader.git
cd ebook-reader

# Install Node.js dependencies
npm install
```

### Development & Execution Commands

| Command | Action | Description |
|---------|--------|-------------|
| `npm run tauri dev` | **Desktop Dev Mode** | Launches the Tauri 2 desktop app with Vite hot-module reloading and Rust compilation. |
| `npm run dev` | **Frontend Web Mode** | Starts the Vite dev server at `http://localhost:1420` in browser mode with fallback storage. |
| `npm run build` | **Type-Check & Build** | Runs TypeScript compiler (`tsc`) and generates the production bundle using Vite. |
| `npm run preview` | **Preview Build** | Serves the production bundle locally for previewing web assets. |
| `npm run tauri build` | **Native Package Build** | Builds release binaries and platform installers (`.msi` for Windows, `.deb`/`.AppImage` for Linux). |
| `cargo check` | **Rust Verification** | Fast syntax and type checking for the Rust backend (run inside `src-tauri/`). |
| `cargo test` | **Rust Unit Tests** | Executes unit tests across Rust modules (run inside `src-tauri/`). |

---

## Architecture & Codebase Map

### Architectural Overview
The application follows a decoupled desktop architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      React 19 Frontend                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  App Shell  │  │   Adapters  │  │      State Stores   │  │
│  │  (Browse/   │──│ (PDF, EPUB, │  │  • bookStore.ts     │  │
│  │   Read mode)│  │  CBZ, TXT,  │  │  • uiStore.ts       │  │
│  └─────────────┘  │  HTML, DOCX)│  └─────────────────────┘  │
│                   └──────┬──────┘                            │
└──────────────────────────│────────────────────────────────────┘
                           │ Tauri 2 IPC (invoke, raw Response)
┌──────────────────────────▼────────────────────────────────────┐
│                      Tauri 2 Rust Backend                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   Commands  │  │   Plugins   │  │     Persistence     │   │
│  │ (fast read, │  │  • store    │  │  • Tauri Store      │   │
│  │  directory) │  │  • fs       │  │  • (per-book JSON)  │   │
│  └─────────────┘  │  • dialog   │  └─────────────────────┘   │
│                   └─────────────┘                            │
└───────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns
1. **Adapter Pattern (`src/adapters/`):** All document formats implement a unified `BookAdapter` interface (`load`, `renderPage`, `search`, `getTOC`, `unload`). The reader UI interacts only with this abstract interface, isolating format-specific engine logic.
2. **Unified Persistence (`src/utils/store.ts`):** Automatically detects whether the app is executing inside native Tauri (`@tauri-apps/plugin-store`) or a browser (`localStorage`), ensuring zero-crash developer workflows.
3. **High-Speed Binary Streaming:** Files over 40MB bypass JSON serialization by using Tauri's raw binary response streaming (`tauri::ipc::Response`), yielding sub-15ms transfer times.

### Where to Find Key Components

| Component / Subsystem | Location | Description |
|-----------------------|----------|-------------|
| **App Shell** | [`src/App.tsx`](src/App.tsx) | Root application component handling browse mode, welcome screen, top toolbar, and navigation state. |
| **Format Adapters** | [`src/adapters/`](src/adapters/) | Engine implementations for each file format (`pdfAdapter.ts`, `epubAdapter.ts`, `cbzAdapter.ts`, `txtAdapter.ts`, `htmlAdapter.ts`). |
| **Adapter Interface & Factory** | [`src/adapters/base.ts`](src/adapters/base.ts), [`registry.ts`](src/adapters/registry.ts) | Core `BookAdapter` contract, render option definitions, and format registry lookup. |
| **Shared Types** | [`src/types/`](src/types/) | Domain type definitions for view modes, reading themes, settings (`reader.ts`), and global types (`index.ts`). |
| **State Stores** | [`src/stores/`](src/stores/) | Zustand stores for per-book configurations and bookmarks (`bookStore.ts`) and global UI state with directory history (`uiStore.ts`). |
| **Native Tauri Commands** | [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs) | Rust backend functions for high-speed directory reading and raw binary file streaming. |
| **Persistence Utility** | [`src/utils/store.ts`](src/utils/store.ts) | Unified storage abstraction bridging `@tauri-apps/plugin-store` and `localStorage`. |

### Codebase Directory Map

```
ebook-reader/
├── src/                          # React + TypeScript Frontend
│   ├── main.tsx                  # Application bootstrap and global providers
│   ├── App.tsx                   # App shell: Browse mode, Welcome screen, header
│   ├── App.css                   # Tailwind CSS v4 design tokens, custom styles
│   ├── adapters/                 # Format adapter implementations
│   │   ├── base.ts               # BookAdapter interface, RenderOptions, TOC types
│   │   ├── registry.ts           # Adapter factory and format registration
│   │   ├── pdfAdapter.ts         # PDF.js adapter with high-DPI canvas engine
│   │   ├── epubAdapter.ts        # Epub.js adapter with reflowable pagination
│   │   ├── cbzAdapter.ts         # JSZip comic archive adapter
│   │   ├── txtAdapter.ts         # Plaintext adapter with chapter regex
│   │   └── htmlAdapter.ts        # HTML & DOCX (Mammoth) adapters
│   ├── components/               # UI Components
│   │   ├── ReaderView.tsx        # Reading viewport (Scroll, Single, Spread)
│   │   ├── SettingsDrawer.tsx    # Per-book configuration drawer
│   │   ├── TableOfContentsDrawer.tsx  # Left-docked TOC drawer
│   │   ├── SearchAndBookmarksDrawer.tsx # Right-docked Search & Bookmarks drawer
│   │   ├── VirtualizedFileList.tsx    # High-performance react-window file list
│   │   ├── FormatBadge.tsx       # Color-coded format badges
│   │   └── LogViewer.tsx         # In-app structured log viewer
│   ├── stores/                   # State Management (Zustand v5)
│   │   ├── bookStore.ts          # Per-book settings, locations, bookmarks
│   │   └── uiStore.ts            # Global UI state, recent directories history
│   ├── types/                    # Shared TypeScript interfaces
│   │   ├── reader.ts             # Render options, view modes, themes
│   │   └── index.ts              # Type index exports
│   └── utils/                    # Utilities and Helper Libraries
│       ├── logger/               # Structured RFC-5424 logger
│       ├── pathUtils.ts          # Breadcrumb and path manipulation
│       ├── store.ts              # UnifiedStore (Tauri / LocalStorage)
│       ├── tauriApi.ts           # Safe Tauri API wrappers
│       └── windowState.ts        # Window bounds tracking and fullscreen
├── src-tauri/                    # Rust Native Desktop Backend
│   ├── src/
│   │   ├── lib.rs                # Tauri entry point, file reading, directory IPC
│   │   └── main.rs               # Desktop executable runner
│   ├── Cargo.toml                # Rust dependencies and metadata
│   ├── tauri.conf.json           # Tauri window, security, and bundle configuration
│   └── capabilities/             # Tauri v2 security capabilities and permissions
├── docs/
│   └── PRD.md                    # Product Requirements Document
├── DEV-LOG.md                    # Append-only engineering log
├── package.json                  # Frontend dependencies and npm scripts
├── package-lock.json             # Locked dependency tree
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build configuration
└── README.md                     # Project documentation
```

---

## Testing, Quality & Troubleshooting

### Quality Verification Commands
Run these commands to verify code quality before submitting pull requests:

```bash
# Frontend type verification and bundle compilation
npm run build

# Rust backend syntax, type, and borrow checking
cd src-tauri
cargo check

# Rust unit test suite
cargo test

# Rust linter (strict warnings check)
cargo clippy -- -D warnings
```

### Logging & Diagnostics
- **In-App Log Console:** Press `Ctrl+Shift+L` anywhere in the application to toggle the built-in structured log viewer.
- **Developer DevTools:** In development mode, press `Ctrl+Shift+I` (or `F12`) to open the web developer console.
- **Local Application Data Paths:**
  - **Windows:** `%APPDATA%\com.ebook.reader\`
  - **Linux:** `~/.local/share/com.ebook.reader/`

### Format-Specific Verification Guidelines
- **PDF Verification:** Test both scanned image-only PDFs and vector PDFs. Verify zoom scaling up to 300% maintains crisp text without pixelated blurring.
- **EPUB Verification:** Test complex reflowable books with custom stylesheets. Verify theme switches invert text colors without breaking image visibility.
- **CBZ Comic Verification:** Verify widescreen comic pages render correctly in Two-Page Spread mode and meet flush at the 1px center seam.
- **Touch & Gesture Verification:** Verify 2-finger touchpad pinch scales pages smoothly without page-jump anomalies or gesture cancellation.

---

## Documentation Index

| Document | Purpose & Description |
|----------|-----------------------|
| [`docs/PRD.md`](docs/PRD.md) | **Product & Technical Requirements Document** — Comprehensive architectural specifications, platform scopes, user journeys, and non-functional requirements. |
| [`DEV-LOG.md`](DEV-LOG.md) | **Implementation Plans & Progress Tracking** — Chronological, append-only engineering record of all implemented features, bug fixes, action plans, and refactors. |
| [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) | **Release & Build Configuration** — Window dimensions, security CSPs, bundle targets (`.msi`, `.deb`, `.AppImage`), icons, and plugins. |
| [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json) | **Security Capabilities** — Fine-grained Tauri v2 permission definitions for filesystem, dialog, and store access. |

### Contribution Guidelines
We welcome contributions that align with our local-first, privacy-respecting philosophy! To contribute:
1. **Review Documentation:** Read [`docs/PRD.md`](docs/PRD.md) to understand architectural boundaries and local-first requirements.
2. **Open an Issue:** Discuss planned changes, format additions, or UI enhancements on GitHub Issues before initiating large pull requests.
3. **Verify Quality:** Ensure `npm run build` and `cargo check` compile cleanly with zero errors and zero warnings.
4. **Document Changes:** Append an entry detailing changes, affected files, and rationale to [`DEV-LOG.md`](DEV-LOG.md).

---

## Privacy, Licensing & Project Status

### Privacy & Offline Guarantee
- **Zero Network Requests:** The application makes no outgoing network requests during operation.
- **No Telemetry or Tracking:** No user metrics, crash telemetry, analytics, or behavioral cookies exist in the codebase.
- **User Ownership:** Your reading positions, bookmarks, and recent history remain stored entirely on your device in plain JSON format.

### License & Attribution
- **License:** Open-source under the GNU General Public License v3.0 (GPLv3). See [LICENSE](LICENSE) for the full official text.
- **Third-Party Notices:** Complete attribution and license text for third-party open-source components are documented in [NOTICE](NOTICE).
- **Compliance Plan:** Full licensing and distribution compliance plan for GitHub Releases is available in [docs/plans/LICENSING.md](docs/plans/LICENSING.md).
- **Logo & Branding:** The application logo and icons are AI-generated using Gemini's Nano Banana (see [NOTICE](NOTICE) and [logo/README.md](logo/README.md)).
- **Core Open-Source Dependencies:**
  - **Tauri 2** (MIT / Apache-2.0)
  - **React 19 & Vite** (MIT)
  - **PDF.js** (Apache-2.0)
  - **Epub.js** (BSD-2-Clause)
  - **JSZip** (MIT)
  - **Mammoth.js** (BSD-2-Clause)
  - **DOMPurify** (MPL-2.0 / Apache-2.0)
  - **Zustand** (MIT)
  - **Primer Octicons** (MIT)

### Project Status & Roadmap
- **Current Milestone:** **MVP (Phase 1) — Desktop Release**
  - ✅ Multi-format support (PDF, EPUB, CBZ, TXT, HTML, DOCX)
  - ✅ Continuous Scroll (default), Single View, and Two-Page Spread views
  - ✅ Universal pinch-to-zoom and pan navigation
  - ✅ Table of Contents, Search, and Bookmarks drawers
  - ✅ Up to 5 Recent Directories history tracking
  - ✅ Native installers for Windows (`.msi`) and Linux (`.AppImage`, `.deb`)
- **Phase 2 (Upcoming):**
  - 📋 Comic Book RAR (`.cbr`) support via unrar sidecar
  - 📋 FictionBook (`.fb2`), Markdown (`.md`), and Rich Text (`.rtf`) adapters
  - 📋 Text highlights, user annotations, and notes export
- **Phase 3 (Long-Term):**
  - 📋 Android companion build utilizing Storage Access Framework (SAF)
  - 📋 Text-to-Speech (TTS) integration using native OS synthesizers
  - 📋 Calibre integration sidecar for MOBI and AZW3 formats

### Issue Reporting
If you encounter a bug, rendering discrepancy, or have a feature request:
- **Submit an Issue:** [GitHub Issues Tracker](https://github.com/Ashok-Kumar-BTech/ebook-reader/issues)
- Please include your OS version, book format, reproduction steps, and relevant snippets from the built-in log viewer (`Ctrl+Shift+L`).

---

*Built with ❤️ for private, local-first reading using Tauri 2, React 19, TypeScript, and Rust.*
