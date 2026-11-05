# Ebook Reader

A modern, cross-platform, local-first ebook reader that opens documents stored on your own device — no accounts, no cloud sync, no tracking, fully offline.

Built with **Tauri 2**, **React 19**, **TypeScript**, and **Rust**.

---

## Philosophy

**Local-first** by design: all reading data stays strictly on your device. There is no user login, no account creation, no cloud synchronization, no remote backend API, no analytics, and zero telemetry. The application functions completely offline, preserving your reading privacy forever.

---

## Platform Status

| Platform | Status | Runtime & Architecture | Scope |
|----------|--------|------------------------|-------|
| **Windows** | 🟢 Active Target | Windows 10/11 x64 (WebView2) | NSIS Installer (`.exe`), MSI Installer (`.msi`), Portable (`.zip`) |
| **Linux** | 🟢 Active Target | WebKit2GTK 4.1 (x64) | Standalone AppImage (`.AppImage`), Debian / Ubuntu (`.deb`) |
| **Android** | 🟢 Active Target | Android 8.0+ / API 26+ (ARM64 / aarch64) | Android Application Package (`.apk`), Storage Access Framework (SAF) |
| **macOS / iOS** | ⚪ Out of Scope | — | Intentional non-goals |

---

## Features & Capabilities

### Core Functionality & Shell
- **Browse Local Directories & SAF Volumes** — Open any folder on desktop filesystems or select Android document trees via the Storage Access Framework (SAF) with persistent permissions.
- **Virtualized Library Navigation** — Switch between high-performance **Virtualized List View** (`react-window`) and responsive **Grid View** with format badges, file size, modification dates, and real-time title/extension filtering (`Ctrl+F`).
- **Interactive Breadcrumb Navigation** — Dynamic path breadcrumbs with history navigation (Back, Forward, and Navigate Up to Parent).
- **Recent Directory History** — Persistent tracking of up to 10 recently opened directories, ordered chronologically. Accessible from the header split dropdown and quick-resume cards on the Launchpad.
- **Drag-and-Drop Ingestion** — Drop book files or entire directories directly onto the desktop window for instant reading or browsing.
- **File Manager Integration** — Native "Reveal in File Manager" command supporting Windows Explorer (`explorer /select`), Linux file managers (`nautilus`, `dolphin`, `nemo` with `xdg-open` fallback), automatically suppressed on Android.

### Reading Engine & Layout Modes
- **Continuous Scroll View (Default)** — Vertical reading layout across all formats with lazy-loaded page slots powered by `IntersectionObserver`.
- **Single Page View** — Centered single-page reading viewport with responsive max-width containment and safe scroll margins.
- **Two-Page Spread View** — Open-book spread layout with a 1px spine divider matching physical book readers and modern PDF viewers.
- **Universal Zoom & Gesture Engine**:
  - Desktop: Smooth 0.6x to 3.0x zoom via toolbar buttons (`-` / `+`), keyboard shortcuts (`-`, `+`, `0`), and high-DPI touchpad pinch scaling.
  - Mobile Touch: 1.0x to 3.0x pinch-to-zoom with focal-point centering, 2-finger panning, double-tap zoom toggle (1.0x &harr; 1.75x), and horizontal swipe page flipping.
- **Reading Themes & Customization** — Light, Dark, and Sepia reading themes, typography scaling (font size, line height, margins) for reflowable formats, and per-book state persistence.
- **In-Book Search** — Fast multi-match text search across pages with context snippets, occurrence counts, and jump-to-page match navigation.
- **Table of Contents (TOC)** — Dedicated drawer displaying hierarchical chapter trees with active chapter indicators.
- **Bookmarks & Annotations** — Golden corner ribbons on bookmarked pages, timeline pin markers, and jump-to-bookmark drawer.
- **High-Performance Streaming** — Raw binary IPC streaming via Tauri (`tauri::ipc::Response`), allowing 50MB+ books to load in milliseconds without UI freezes.

### Mobile & Android Experience
- **Storage Access Framework (SAF)** — Built-in integration with `tauri-plugin-android-fs-api` supporting Android document tree pickers, single/multi-file selection, and persistent URI permissions across reboots.
- **Adaptive Launcher Icons** — Mipmap foregrounds normalized to the official Android 66dp–69dp safe zone (64% artwork scale on 108dp canvas) with `#FAF1D4` canvas background, preventing icon clipping on circular, squircle, and teardrop launcher masks.
- **Platform Gesture Navigation** — Full support for Android system back gestures (swiping inward from the right or left screen edge) and the 3-button navigation bar.
- **Hierarchical Back Stack** — In-reader dismissals (jump modal &rarr; settings &rarr; TOC &rarr; bookmarks &rarr; fullscreen &rarr; close book to library) and browse dismissals (view options sheet &rarr; clear search &rarr; history back &rarr; parent folder &rarr; Launchpad).
- **Double-Back Exit Guard** — A 2-second debounce with a visual *"Press back again to exit"* toast on the root Launchpad prevents accidental app closures.
- **Responsive Layout & Bottom Sheets** — Compact screen optimizations with bottom drawer sheets, safe-area insets (`--sat`, `--sab`), and auto-hiding navigation bars.

### Data Isolation & Developer Experience
- **Dev & Prod Instance Isolation (Option C)** — Complete OS-level and code-level storage sandboxing between development sessions (`tauri dev`, `npm run dev`) and installed production releases:
  - Separate Tauri identifier for development: `com.ebook.reader.dev` (`%APPDATA%\com.ebook.reader.dev\`) vs production: `com.ebook.reader` (`%APPDATA%\com.ebook.reader\`).
  - Code-level file namespacing: `*.dev.json` stores in dev vs `*.json` in production.
  - Automatic self-healing migration and local AppData sanitization to start production installations with a clean slate.
  - Visual amber `DEV` pill badge in the header during development mode.

---

## Supported Formats Matrix

| Format | Extension | Status | Engine / Adapter | Key Features |
|--------|-----------|--------|------------------|--------------|
| **PDF** | `.pdf` | ✅ Working | `PdfAdapter` (`pdfjs-dist`) | High-DPI canvas backing store, DPR scaling up to 3.5x, text selection, TOC extraction, iterative multi-match search |
| **EPUB** | `.epub` | ✅ Working | `EpubAdapter` (`epubjs`) | Reflowable pagination, continuous scroll, chapter TOC, themes, font size & line-height scaling, search |
| **CBZ** | `.cbz` | ✅ Working | `CbzAdapter` (`jszip`) | Comic archive reading, image extraction, paginated & continuous views, theme filters |
| **TXT** | `.txt` | ✅ Working | `TxtAdapter` | Automatic UTF-8/encoding detection, virtualized page slicing, regex chapter TOC |
| **HTML / XHTML** | `.html`, `.htm`, `.xhtml` | ✅ Working | `HtmlAdapter` (`dompurify`) | Sanitized DOM rendering, styled text flow, responsive container containment |
| **DOCX** | `.docx` | ✅ Working | `DocxAdapter` (`mammoth`) | Document-to-HTML conversion, inline image extraction, reflowable layout |
| **CBR** | `.cbr` | 📋 Planned | `CbrAdapter` | Comic book RAR archive support via sidecar (Phase 2) |
| **FB2** | `.fb2` | 📋 Planned | `Fb2Adapter` | FictionBook XML format parser (Phase 2) |
| **Markdown** | `.md` | 📋 Planned | `MarkdownAdapter` | GitHub-flavored markdown reader (Phase 2) |
| **RTF** | `.rtf` | 📋 Planned | `RtfAdapter` | Rich Text Format parser (Phase 2) |
| **MOBI / AZW3** | `.mobi`, `.azw3` | 📋 Planned | Calibre sidecar | Optional format sidecar (Phase 3) |
| **DJVU** | `.djvu` | ⚪ Deferred | — | Deferred to Phase 3 evaluation |
| **DRM-Protected** | `.acsm`, Kindle DRM | ❌ Unsupported | — | Strictly unsupported; DRM circumvention tools will never be included |

---

## Installation & Downloads

Pre-built binary packages, installers, and checksums are published on GitHub Releases:
👉 **[Download Latest Release](https://github.com/Ashok-Kumar-BTech/ebook-reader/releases)**

### Windows (x64)
- **Setup Installer:** Download `ebook-reader_*_x64-setup.exe` or `ebook-reader_*_x64_en-US.msi`, run the installer, and follow the wizard.
- **Portable Version:** Download `ebook-reader-windows-x64-portable.zip`, extract to any folder, and run `ebook-reader.exe`.

### Linux (x64)
- **AppImage (Universal):**
  ```bash
  chmod +x ebook-reader_*_amd64.AppImage
  ./ebook-reader_*_amd64.AppImage
  ```
- **Debian / Ubuntu (`.deb`):**
  ```bash
  sudo dpkg -i ebook-reader_*_amd64.deb
  sudo apt-get install -f # resolve any runtime dependencies
  ```

### Android (ARM64)
1. Download `ebook-reader_*_arm64-debug.apk` (or release APK) on your Android device.
2. Open the file and allow installation from unknown sources if prompted.
3. Or install from your workstation via ADB:
   ```bash
   adb install -r ebook-reader_*_arm64.apk
   ```

### Checksum Verification
Every release includes an official `SHA256SUMS.txt` file. Verify downloaded assets:
```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
```

---

## Development Setup

### Prerequisites

| Tool | Required Version | Purpose |
|------|------------------|---------|
| **Node.js** | 20.x+ (LTS) | Frontend runtime |
| **npm** | 10.x+ | Package manager |
| **Rust & Cargo** | 1.78+ (stable) | Native backend compiler |
| **Android SDK / NDK** | API 34+, NDK 26+ | Required for Android builds (`aarch64-linux-android`) |
| **Java JDK** | OpenJDK 17 | Required for Android Gradle builds |
| **Platform Dependencies** | OS-specific | [Tauri System Prerequisites](https://tauri.app/v2/guides/getting-started/prerequisites) |

### Clone & Install Dependencies
```bash
git clone https://github.com/Ashok-Kumar-BTech/ebook-reader.git
cd ebook-reader
npm install
```

### Development Scripts & Commands

| Command | Target | Description |
|---------|--------|-------------|
| `npm run tauri:dev` | **Desktop (Sandboxed)** | Launches desktop app with `-c tauri.dev.conf.json` for isolated dev storage. |
| `npm run dev` | **Web Browser** | Starts the Vite dev server at `http://localhost:1420` with localStorage fallback. |
| `npm run build` | **Type-Check & Build** | Runs TypeScript compiler (`tsc`) and compiles the production frontend bundle. |
| `npm run build:desktop` | **Desktop Release** | Compiles release binaries and installers (`.exe`, `.msi`, `.AppImage`, `.deb`). |
| `npm run build:android` | **Android APK** | Builds the release Android APK for ARM64 (`--apk --target aarch64`). |
| `npm run android:install:current` | **Android Device** | Deploys and installs the compiled debug APK directly to a connected device via ADB. |
| `npm run generate:logo` | **Asset Generator** | Generates all desktop icons and Android safe-zone adaptive mipmaps from SVG. |
| `npm test` | **Automated Tests** | Executes the full Vitest suite (117 unit & integration tests). |
| `npm run test:unit` | **Unit Tests** | Runs unit tests (`tests/unit/`). |
| `npm run test:integration` | **Integration Tests** | Runs integration tests (`tests/integration/`). |
| `cargo test --manifest-path src-tauri/Cargo.toml` | **Rust Tests** | Runs native Rust unit tests and path validation checks. |

---

## Architecture & Codebase Map

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      React 19 Frontend                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  App Shell  │  │   Adapters  │  │      State Stores   │  │
│  │  (Browse /  │──│ (PDF, EPUB, │  │  • bookStore.ts     │  │
│  │   Reader)   │  │  CBZ, TXT,  │  │  • uiStore.ts       │  │
│  └──────┬──────┘  │  HTML, DOCX)│  └─────────────────────┘  │
│         │         └─────────────┘                            │
│  ┌──────▼────────────────────────────────────────────────┐  │
│  │  Platform Filesystem Abstraction (src/platform/fs/)    │  │
│  │  • DesktopFsProvider (native fs / tauri-plugin-fs)    │  │
│  │  • AndroidFsProvider (tauri-plugin-android-fs-api)    │  │
│  │  • WebFsProvider (HTML5 drag-and-drop fallback)       │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────│──────────────────────────────────┘
                           │ Tauri 2 IPC (invoke, raw Response)
┌──────────────────────────▼──────────────────────────────────┐
│                      Tauri 2 Rust Backend                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Commands  │  │   Plugins   │  │     Persistence     │  │
│  │ • fast_read │  │ • store     │  │ • Tauri Store       │  │
│  │ • list_dir  │  │ • opener    │  │ • Dev sandboxing    │  │
│  │ • metadata  │  │ • dialog    │  │   (*.dev.json)      │  │
│  │ • reveal    │  │ • android-fs│  └─────────────────────┘  │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
ebook-reader/
├── src/                          # React + TypeScript Frontend
│   ├── main.tsx                  # Application bootstrap and global error boundaries
│   ├── App.tsx                   # App shell: Browse mode, Launchpad, header, back listener
│   ├── App.css                   # Tailwind CSS v4 design tokens and safe-area styles
│   ├── adapters/                 # Format engine adapters (BookAdapter contract)
│   │   ├── base.ts               # Core BookAdapter interface, render options, TOC types
│   │   ├── registry.ts           # Adapter factory and format registration
│   │   ├── pdfAdapter.ts         # PDF.js adapter with high-DPI canvas backing store
│   │   ├── epubAdapter.ts        # Epub.js reflowable & continuous scroll pagination
│   │   ├── cbzAdapter.ts         # JSZip comic archive extractor
│   │   ├── txtAdapter.ts         # Plaintext adapter with chapter regex extraction
│   │   └── htmlAdapter.ts        # HTML and DOCX (Mammoth) DOM-sanitized adapters
│   ├── components/               # UI Components
│   │   ├── ReaderView.tsx        # Reading viewport (Scroll, Single, Spread)
│   │   ├── SettingsDrawer.tsx    # Per-book typography, theme, and view options
│   │   ├── TableOfContentsDrawer.tsx # Hierarchical chapter tree drawer
│   │   ├── SearchAndBookmarksDrawer.tsx # Search drawer and bookmark ribbons
│   │   ├── VirtualizedFileList.tsx # High-performance react-window file list
│   │   ├── shell/                # App shell components (AppBar, Launchpad, BrowseGrid)
│   │   └── LogViewer.tsx         # In-app structured RFC-5424 log console
│   ├── platform/                 # Cross-Platform Abstractions
│   │   └── fs/                   # Filesystem abstraction (Desktop, Android SAF, Web)
│   ├── stores/                   # State Management (Zustand v5)
│   │   ├── bookStore.ts          # Per-book settings, progress, bookmarks
│   │   └── uiStore.ts            # UI state, directory history, view modes
│   ├── types/                    # Shared TypeScript interfaces
│   └── utils/                    # Core Utilities
│       ├── backNavigation.ts     # Platform gesture navigation & double-back exit guard
│       ├── gestures.ts           # Pinch-zoom math and focal-point centering
│       ├── logger/               # Structured rotating file & console logger
│       ├── pathUtils.ts          # Cross-platform breadcrumbs & URI decoders
│       ├── store.ts              # UnifiedStore (Tauri / LocalStorage) with dev isolation
│       ├── tauriApi.ts           # Safe Tauri API wrappers
│       └── windowState.ts        # Window bounds tracking and fullscreen
├── src-tauri/                    # Rust Native Desktop & Mobile Backend
│   ├── src/
│   │   ├── lib.rs                # Tauri commands (read, list, metadata, reveal)
│   │   └── main.rs               # Desktop executable entry point
│   ├── gen/android/              # Auto-generated Android Gradle project
│   ├── capabilities/             # Tauri v2 security ACL capabilities (desktop, mobile)
│   ├── tauri.conf.json           # Production Tauri bundle configuration
│   └── tauri.dev.conf.json       # Development sandbox override (com.ebook.reader.dev)
├── logo/                         # Branding and Icon Generators
│   ├── convert_icons.js          # Desktop icon pipeline
│   └── generate_android_icons.ps1# Android adaptive safe-zone icon generator
├── tests/                        # Vitest Test Suite (Unit & Integration)
├── .github/workflows/            # CI/CD Workflows (ci.yml, cd.yml)
├── DEV-LOG.md                    # Append-only engineering log
├── PLAN-PROGRESS.md              # Active task progress tracker
└── README.md                     # Project documentation
```

---

## Diagnostics & Troubleshooting

- **In-App Log Console:** Press `Ctrl+Shift+L` anywhere in the desktop app to toggle the built-in RFC-5424 structured log viewer.
- **Developer DevTools:** In development mode, press `Ctrl+Shift+I` (or `F12`) to inspect DOM elements and network requests.
- **Application Data Paths:**
  - **Windows Production:** `%APPDATA%\com.ebook.reader\`
  - **Windows Development:** `%APPDATA%\com.ebook.reader.dev\`
  - **Linux:** `~/.local/share/com.ebook.reader/`
  - **Android:** App-scoped private storage and SAF persisted URI tokens.
- **Linux WebKit2GTK Runtime:** If you encounter `libwebkit2gtk-4.1.so.0: cannot open shared object file`, install the runtime dependency:
  - Debian/Ubuntu: `sudo apt install libwebkit2gtk-4.1-0 libayatana-appindicator3-1`
  - Arch Linux: `sudo pacman -S webkit2gtk-4.1 libayatana-appindicator`
  - Fedora: `sudo dnf install webkit2gtk4.1 libayatana-appindicator`

---

## Privacy, Licensing & Attribution

- **Zero Cloud / Telemetry Guarantee:** The application makes zero outgoing network calls, contains zero analytics or crash beacons, and stores reading positions strictly on your physical device.
- **License:** Open source under the **GNU General Public License v3.0 (GPLv3)**. See [LICENSE](LICENSE) for the full license text.
- **Attribution & Third-Party Notices:** Complete licensing and attribution for all third-party dependencies are documented in [NOTICE](NOTICE).
- **Core Open-Source Technologies:**
  - [Tauri 2](https://tauri.app/) (MIT / Apache-2.0)
  - [React 19](https://react.dev/) & [Vite](https://vitejs.dev/) (MIT)
  - [PDF.js](https://mozilla.github.io/pdf.js/) (Apache-2.0)
  - [Epub.js](https://github.com/futurepress/epub.js) (BSD-2-Clause)
  - [JSZip](https://stuk.github.io/jszip/) (MIT)
  - [Mammoth.js](https://github.com/mwilliamson/mammoth.js) (BSD-2-Clause)
  - [DOMPurify](https://github.com/cure53/DOMPurify) (MPL-2.0 / Apache-2.0)
  - [Zustand](https://github.com/pmndrs/zustand) (MIT)
  - [Primer Octicons](https://primer.style/foundations/icons) (MIT)

---

*Built with ❤️ for private, local-first reading.*
