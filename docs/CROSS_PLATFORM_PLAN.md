# Ebook Reader: Cross-Platform & Responsive Refactor Plan

**Audience:** an agentic IDE / coding agent working in this repo.
**Goal:** make the app work correctly on **Windows, Linux, and Android** (per `docs/PRD.md`), with a **responsive UI on every target resolution**. Windows behaviour must not regress.
**Stack:** Tauri 2.x (Rust) + React 18 + Vite + TypeScript + Tailwind (v4, via `@tailwindcss/postcss`) + Zustand.
**Android dev loop (current):** physical device (moto g57 power) over USB debugging, mirrored with `scrcpy`, built with the Tauri Android toolchain.

> **How to use this document.** Work phase by phase (§7). Each task has an ID and acceptance criteria. Items marked **(verify)** are inferences that must be confirmed in code, logs, or on a device before relying on them. Do not mark a task done until its acceptance criteria pass on Windows **and** Android.

---

## 1. Problem statement

Two defects observed on Android (screenshots from the device):

1. **Layout overlap.** The top bar renders underneath the system status bar (clock, icons collide with the Open Folder / search controls). The bottom gesture bar overlaps the bottom of the viewport. The header packs too many controls into one fixed-height row for a ~360 px wide screen.
2. **Opening a folder fails.** After picking a folder, the UI shows `Invalid URI: content://com.android.externalstorage.documents/tree/primary%3ADocume…`. The message is printed inline in the toolbar row **and** in the content area, overlapping other elements. The recent-folders card shows the folder as `primary%3ADocuments` (URL-encoded) with the raw `content://` URI as its subtitle.

Root cause in one sentence: **the app treats every folder and file as a filesystem path string, but on Android the folder picker returns a SAF `content://` tree URI, which `std::fs`, `PathBuf`, `plugin-fs readDir`, and the string-based path helpers cannot handle.**

---

## 2. Findings from the code review

Files reviewed: `src/App.tsx`, `src/utils/tauriApi.ts`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, plus `PRD.md`, `GRAPH_REPORT.md`, `graph.json`. **Not yet reviewed (read before editing):** `src/utils/pathUtils.ts`, `src/utils/windowState.ts`, `src/components/ReaderView.tsx`, `VirtualizedFileList.tsx`, `FileTree.tsx`, drawers, `src/stores/*`, global CSS, `tauri.conf.json`, `src-tauri/gen/android/**`, `Cargo.toml`.

### 2.1 Why folder opening fails on Android (traced through the code)

| Step | Code | What happens on Android |
|---|---|---|
| 1 | `openDirectoryDialog()` → `plugin-dialog open({ directory: true })` | Returns a `content://…/tree/primary%3ADocuments` string, not a path. |
| 2 | `handleOpenDirectory` → `navigateToDir(path)` + `addRecentFolder(path)` | The URI is stored as `currentRoot` and as a recent folder, as-is. |
| 3 | `loadDirectory(path)` → `listDirectory(path)` → Rust `list_directory` | `PathBuf::from("content://…")` → `path.exists()` is false → `Err("Path does not exist")`. |
| 4 | `logTauriCall` catches the error and **returns `null`** | The real error is swallowed; the caller cannot tell "failed" from "unavailable". |
| 5 | Fallback in `loadDirectory`: `readDirectory(path)` → `plugin-fs readDir(path)` | `plugin-fs` rejects the tree URI (`Invalid URI`). `fs:allow-read-dir` with `path: "**"` is a filesystem-path scope and does not cover SAF URIs **(verify exact origin of the "Invalid URI" string in logs)**. |
| 6 | Fallback joins children with `` `${path}/${entry.name}` `` | Even if listing worked, child URIs would be malformed. SAF child URIs are opaque document URIs and cannot be built by string concatenation. |
| 7 | `setError(err.message)` | Raw plugin message is shown verbatim in two places with no layout constraints. |

> Discrepancy to check: as uploaded, `logTauriCall` swallows errors, yet the screenshot shows an error surfaced to the UI. Confirm the installed build matches this source (look at the log file / `adb logcat`). The fix is the same either way.

### 2.2 Windows-only or desktop-only assumptions

| # | Location | Assumption | Impact |
|---|---|---|---|
| A1 | `lib.rs` `list_directory`, `get_file_entry`, `read_file`, `get_file_metadata` | Folder = `PathBuf` on a real filesystem | Fails for every SAF URI |
| A2 | `tauriApi.ts` all functions take `path: string` | Opaque identity = path string | Same |
| A3 | `App.tsx` `` `${path}/${entry.name}` `` (fallback listing) | Child path built by concatenation | Invalid for URIs |
| A4 | `App.tsx` `folderPath.split(/[/\\]/).filter(Boolean).pop()` (recent folders, twice) | Display name from last path segment | Shows `primary%3ADocuments` |
| A5 | `pathUtils.ts` `getParentPath`, `getBreadcrumbSegments`, `normalizePath` | Parent/breadcrumbs derived by string parsing **(verify)** | Cannot represent SAF trees; "Up" and breadcrumb are wrong |
| A6 | `lib.rs` `pick_directory` | Sync command that blocks on an `mpsc` receiver waiting for a dialog callback | Unused by the frontend; risks deadlock on the main thread. **Delete.** |
| A7 | `capabilities/default.json` | `$schema` = `desktop-schema.json`; scope `path: "**"`; desktop-only dirs (`desktop`, `home`) | No mobile capability; no SAF permissions |
| A8 | `App.tsx` `toggleFullscreen`, `initWindowStateWatcher`, F11 handler | Desktop window model | Meaningless or throwing on Android **(verify)** |
| A9 | `App.tsx` shortcuts (Ctrl+F, Alt+←/→/↑) and placeholder text "Search books in folder... (Ctrl+F)" | Hardware keyboard | No touch equivalent; misleading hint on phone |
| A10 | `App.tsx` every control uses `title="…"` for explanation | Hover tooltips | Invisible on touch |
| A11 | `App.tsx` header `h-12`, one row with Open Folder split-button + search + sort + grid/list + 3 theme buttons | ≥ 1000 px wide window | Overflows/overlaps at 360 px |
| A12 | Second toolbar row: nav buttons + breadcrumbs (`max-w-2xl`) + item count + loading + **inline `{error}`** | Wide window | Error text overlaps controls on narrow screens |
| A13 | Root `<div className="app">` and `h-full` chains; no `viewport-fit=cover`, no safe-area handling | Window fully owns the screen | System bars overlap content on Android (edge-to-edge) |
| A14 | `readFile` / `readFileData` returns the **entire file** as `Uint8Array` | Plenty of RAM | OOM risk on phones for large PDF/CBZ |
| A15 | `lib.rs` `list_directory` uses `?` inside the loop (`get_file_entry(...)?`, `entry.map_err(...)?`) | All entries readable | One unreadable entry fails the whole listing (PRD FR-DIR-17 wants per-entry inline errors) |
| A16 | `lib.rs` `WalkDir` with depth 1, `fs::metadata` follows symlinks | – | Use `fs::read_dir` + `symlink_metadata`; avoid an extra dependency |

### 2.3 Cross-cutting code smells that block a clean port

- **Duplicated supported-extension lists** (6 copies): `lib.rs`, `tauriApi.ts` (`SUPPORTED_EXTS`), `App.tsx`, `FileTree.tsx`, `FormatBadge.tsx`, `types/reader.ts`. `FileEntry` is defined in 4 places; `getFormatBadge` in 2. PRD §9.3 requires one format registry.
- **Error swallowing**: `logTauriCall` returns `null` on failure, and several callers do `?? []`. There is no `AppError` / taxonomy (PRD §10).
- **Mixed time units**: Rust returns `modified` in **seconds**; `App.tsx` multiplies by 1000; the web fallback in `tauriApi.ts` already returns **milliseconds** (`file.lastModified`) so web-mode dates are wrong.
- **Web fallback violates the PRD** (`indexDirectoryHandle` recursively scans the whole tree). Acceptable for `npm run dev`, but it must live behind the same provider interface and be lazy.
- **Dead code**: `greet`, `DirectoryEntry`, `pick_directory` in `lib.rs`.
- **Giant components**: `App.tsx` (~850 lines), `ReaderView.tsx` (>1700 lines per graph).

---

## 3. Target architecture

### 3.1 Principle

> UI code never sees a path. It sees opaque references (`DirRef`, `EntryRef`) and asks a **platform provider** to list, read, and describe them.

### 3.2 Types (new file `src/platform/fs/types.ts`)

```ts
export type RefId = string; // desktop: absolute path; android: content:// URI; web: virtual path

export interface DirRef {
  id: RefId;
  name: string;                // human-readable, already decoded (never derive it in the UI)
}

export interface Entry {
  id: RefId;                   // opaque; pass back to the provider, never concatenate
  parent: RefId;
  name: string;
  isDirectory: boolean;
  size: number;                // bytes, 0 for dirs
  modifiedMs: number;          // ALWAYS milliseconds
  isSupported: boolean;        // from format registry, not from the provider
  error?: AppErrorCode;        // per-entry error, shown inline (FR-DIR-17)
}

export interface FileSystemProvider {
  readonly kind: 'desktop' | 'android' | 'web';
  readonly capabilities: {
    canGoAboveRoot: boolean;   // desktop true; android false (permission boundary = picked tree)
    revealInOS: boolean;
    persistentRecents: boolean;
  };
  pickDirectory(): Promise<DirRef | null>;
  listChildren(dir: DirRef): Promise<Entry[]>;        // immediate children only, lazy
  readFile(entry: Pick<Entry, 'id' | 'name'>): Promise<Uint8Array>;
  /** Validate a stored DirRef (recent folder). Throws AppError PERMISSION_DENIED / FILE_NOT_FOUND. */
  reopen(dir: DirRef): Promise<DirRef>;
}
```

Select the provider **once at startup** (`src/platform/index.ts`), using `@tauri-apps/plugin-os` `platform()` (or `navigator.userAgent` as a fallback): `android` → `AndroidFsProvider`, other Tauri → `DesktopFsProvider`, no Tauri → `WebFsProvider`. Remove the per-call `checkIsTauri()` branching.

### 3.3 Navigation model (replaces path-string parsing)

- Keep a **navigation stack** of `DirRef` (`{id, name}`) in the store: `stack: DirRef[]`, plus back/forward history.
- **Breadcrumbs** = `stack.map(d => d.name)`. **Up** = pop. No `getParentPath` for navigation.
- On Android the **root is the picked tree**; "Up" is disabled at the root (`capabilities.canGoAboveRoot === false`). On desktop, Up at the picked root may continue to the filesystem parent via the desktop provider (keep current behaviour).
- `pathUtils.ts` becomes desktop-only (used inside `DesktopFsProvider`) or is deleted.

### 3.4 Providers

**`DesktopFsProvider`**: wraps the existing Rust commands (`list_directory`, `read_file`) and `plugin-dialog`. Behaviour must stay identical on Windows/Linux.

**`AndroidFsProvider`**: Storage Access Framework. **Recommended: adopt the community plugin `tauri-plugin-android-fs`** (Rust crate + npm package `tauri-plugin-android-fs-api`). From its docs it provides a directory picker (`pick_dir`), `persist_uri_permission` (so access survives app restarts), `read_dir` on a tree URI returning `Entry::File`/`Entry::Dir` with `uri` and `name`, and readable file handles. **(verify before committing: current version/API names in the JS package, maintenance status, license compatibility with the project's GPLv3 plan, and that it supports the project's `minSdk`.)** Fallback option if it does not fit: write a small in-repo Kotlin Tauri plugin around `DocumentsContract` / `DocumentFile` / `ContentResolver` / `takePersistableUriPermission`.

Android provider behaviour:
1. `pickDirectory()` → plugin picker → **immediately persist URI permission** → return `{ id: uri, name: decodedDisplayName }`.
2. `listChildren()` → plugin `read_dir(uri)` (immediate children only) → map to `Entry` (use the plugin's `name`; sizes/mtime from plugin if provided, else 0).
3. `readFile()` → read bytes via the plugin's readable handle, or `plugin-fs readFile` with a URL-type `FilePath` **(verify which works with large files)**.
4. `reopen(dir)` → verify the persisted permission still exists; otherwise throw `PERMISSION_DENIED` so the UI asks the user to re-pick.

**`WebFsProvider`**: keep for `npm run dev`, but make listing lazy (no recursive scan) and return `modifiedMs`.

### 3.5 Single sources of truth

- `src/formats/registry.ts`: extensions, MIME, support level, views, reflowable, adapter (PRD §9.3). Delete the 6 duplicate lists. `isSupported` is computed in the frontend from this registry; Rust no longer decides it (remove `SUPPORTED_EXTENSIONS` and `is_supported` from `lib.rs`, or keep it only as an optimisation hint).
- `src/errors/appError.ts`: PRD §10 taxonomy.

```ts
export type AppErrorCode =
  | 'INVALID_FORMAT' | 'CORRUPTED_FILE' | 'PASSWORD_PROTECTED' | 'DRM_PROTECTED'
  | 'UNSUPPORTED_VERSION' | 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'FILE_IN_USE'
  | 'TOO_LARGE' | 'PARSE_FAILED' | 'RENDER_FAILED' | 'CONVERSION_FAILED'
  | 'MISSING_COMPONENT' | 'UNKNOWN';

export class AppError extends Error {
  constructor(public code: AppErrorCode, public details?: string) { super(code); }
}
export function toAppError(e: unknown): AppError { /* map raw Rust / plugin / SAF messages to codes; keep raw text only in `details` */ }
export const userMessage: Record<AppErrorCode, { message: string; hint?: string }> = { /* PRD §10.2 strings */ };
```

Rules: providers **throw `AppError`**; `logTauriCall` must **re-throw** (log + rethrow) instead of returning `null`; the UI renders `userMessage[code]` and puts `details` behind a "Details" disclosure. Never show raw `Invalid URI: …` text.

---

## 4. Responsive design specification (mandatory on all targets)

### 4.1 Viewport and insets (fixes the status-bar / gesture-bar overlap)

1. `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
2. Global CSS:
```css
:root {
  --sat: env(safe-area-inset-top, 0px);
  --sab: env(safe-area-inset-bottom, 0px);
  --sal: env(safe-area-inset-left, 0px);
  --sar: env(safe-area-inset-right, 0px);
}
html, body, #root { height: 100%; }
.app { height: 100dvh; display: flex; flex-direction: column; box-sizing: border-box;
       padding: var(--sat) var(--sar) var(--sab) var(--sal); }
```
Use `dvh`, not `vh`. Any `position: fixed` bar must add the relevant inset to its own padding/offset.
3. **`env()` may return 0 inside Android WebView even when the app is edge-to-edge (verify on device).** Do not rely on it alone. Preferred robust fix: apply insets **natively** in the generated `MainActivity.kt` (`src-tauri/gen/android/app/src/main/java/<package>/MainActivity.kt`; check whether `gen/android` is committed, otherwise patch via a template or CI step):
```kotlin
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    WindowCompat.setDecorFitsSystemWindows(window, false)           // explicit edge-to-edge
    val content = findViewById<android.view.View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { v, insets ->
        val bars = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() or
            WindowInsetsCompat.Type.displayCutout() or
            WindowInsetsCompat.Type.ime())                           // keyboard for the search field
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
        WindowInsetsCompat.CONSUMED
    }
}
```
   If the native padding is applied, the CSS `env()` padding must not be applied a second time (double padding). Choose one mechanism per platform; gate via a `data-platform="android"` attribute on `<html>`.
4. Android 15+ enforces edge-to-edge for apps targeting SDK 35, and the opt-out is not available on newer targets, so handle insets rather than trying to disable edge-to-edge. Identify the device's Android version and the project's `targetSdk` (verify).

### 4.2 Breakpoints (by **width**, not device type; foldables/split-screen must work)

| Class | Width | Browse | Reader |
|---|---|---|---|
| Compact | < 600 px | Single column. App bar = title + Open Folder icon + overflow menu. Search expands from an icon. Sort / grid-list / theme live in one "View options" bottom sheet. | Single page only. Top and bottom bars auto-hide on tap. Panels (TOC, Search/Bookmarks, Settings) = bottom sheets. |
| Medium | 600–839 px | Toolbar with icons only (no text); search inline. | Single page; panels as side sheets over content. |
| Expanded | ≥ 840 px | Current desktop layout. | Two-page spread allowed (also require landscape/min reader width); panels as side drawers. |

Define these as Tailwind v4 custom breakpoints (`@theme { --breakpoint-compact: …; }`) or CSS custom media, and expose a `useBreakpoint()` hook for logic (e.g., view-mode availability). Two-page availability must be enforced in the **view-availability logic** (PRD §7.2), not only in CSS.

### 4.3 Concrete layout changes in `App.tsx` (browse mode)

- **Header (A11):** split into `<AppBar>` with three zones. Hide brand text below `sm` (already partly done). Move sort, grid/list, and the 3 theme buttons into a `<ViewOptions>` popover (expanded) / bottom sheet (compact). Replace the split "Open Folder + recent chevron" with an icon button on compact; the recent list becomes a sheet.
- **Second row (A12):** make it `flex-wrap`-safe: nav buttons (48 px targets), breadcrumb as a horizontally scrollable chip row (`min-w-0 overflow-x-auto`, remove `max-w-2xl`), item count hidden on compact (move to the list header). **Remove inline `{error}` and `Loading…` from this row.**
- **Errors:** introduce a single `<ErrorHost>` (fixed region below the app bar, `max-height` bounded, scrollable, max 2 visible + "+N more", dismissible, never covers navigation). Render `userMessage[code]` + "Details" disclosure + a primary action (e.g., "Choose folder again"). `VirtualizedFileList` receives an `error` prop today; change it to render an empty-state with the same `AppError` instead of raw text.
- **Grid:** `grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr))`. Use `@container` queries for card internals.
- **List rows:** min height 56 px, whole row tappable, filename truncates with `min-w-0`, show size/date only when the container is wide enough.
- **Touch targets:** ≥ 48×48 dp for every interactive control (currently `p-1.5` icon buttons ≈ 28 px).
- **Hover/keyboard hints:** keep `title` for desktop but add visible labels or `aria-label` for icon-only buttons; remove "(Ctrl+F)" from the placeholder on touch (`matchMedia('(pointer: coarse)')` or platform flag). Add touch equivalents for shortcuts (search icon; back via Android back button, see §6).
- **Typography/spacing:** `rem`-based; respect system font scale (test at 130–200%).
- **Motion:** honour `prefers-reduced-motion`; drop `hover:-translate-y-0.5` effects on touch.
- **Recent folders cards:** use `DirRef.name` (decoded) as title; the subtitle must not show a raw `content://` URI. On Android show "Internal storage › Documents" style text or nothing.

### 4.4 Reader (`ReaderView.tsx`, not yet reviewed: audit required)

- Replace fixed side drawers with the responsive panel component (§4.2).
- Bottom page bar must sit above the bottom inset and never be under the gesture bar.
- Gestures: tap zones (left/center/right), horizontal swipe for page turn, pinch-zoom; keep keyboard and mouse on desktop.
- Fullscreen: on Android use immersive mode (hide system bars) through the native layer, not the desktop window API (A8).
- `pdf.js`: cap canvas scale (`devicePixelRatio` × zoom) so a single canvas stays under ~16 MP; render only visible pages; destroy canvases on page leave.
- `epub.js`: confirm iframe sizing uses the container's measured size and re-measures on rotation/split-screen.
- Re-lay out on `resize`/`orientationchange`/visual viewport changes, preserving the current location (PRD FR-VIEW-10).

---

## 5. Rust / config changes

### 5.1 `src-tauri/src/lib.rs`
- Delete `greet`, `pick_directory`, `DirectoryEntry`.
- Gate desktop filesystem commands with `#[cfg(desktop)]` (Android never uses them).
- Replace `WalkDir` with `std::fs::read_dir`; use `symlink_metadata` where appropriate; **do not fail the whole listing for one bad entry**: return that entry with an `error` field (PRD FR-DIR-17). Return `modified_ms` (milliseconds) and update the TS type accordingly.
- Remove `SUPPORTED_EXTENSIONS`/`is_supported` (computed in the frontend registry) or generate both from a shared JSON.
- Register the Android plugin only on Android:
```rust
#[cfg(target_os = "android")]
let builder = builder.plugin(tauri_plugin_android_fs::init());
```
  and in `Cargo.toml` add it under `[target.'cfg(target_os = "android")'.dependencies]`.
- Return structured errors from commands (`#[derive(Serialize)] enum CmdError { NotFound, PermissionDenied, … }`) instead of `String`, so `toAppError` can map reliably.

### 5.2 Capabilities (`src-tauri/capabilities/`)
- `default.json` → add `"platforms": ["windows", "linux", "macOS"]`.
- New `mobile.json` with `"$schema": "../gen/schemas/mobile-schema.json"`, `"platforms": ["android"]`, `"windows": ["main"]`, and only what Android needs: `core:default`, `store:default`, `opener:default`, and the plugin's permission set (e.g., `android-fs:default` **(verify identifier in the plugin docs)**). Do **not** grant broad `fs:*` path scopes on Android; they do not apply to SAF anyway.
- Android manifest: no `MANAGE_EXTERNAL_STORAGE` (PRD §14). SAF needs no storage permission.

### 5.3 Persistence changes
- `recentFolders: string[]` → `recentFolders: { id: string; name: string; platform: 'desktop'|'android'|'web' }[]`. Write a **migration** that converts existing strings (desktop: name = last segment).
- On launch/selection of a recent folder on Android call `provider.reopen()`; on failure remove it from recents or prompt re-pick, and show `PERMISSION_DENIED` via `ErrorHost`.
- `bookId` = hash(id + size + mtime) still works with URIs, but verify `mtime`/`size` are available for SAF entries; otherwise hash(id + size).

### 5.4 Window state (A8)
- Guard `initWindowStateWatcher` / `toggleFullscreen` / F11 behind `platform.kind !== 'android'`. Android uses immersive mode via the native layer.

---

## 6. Android-specific behaviours to add

- **Back button / gesture:** reader → browse → parent folder → launchpad → exit. Hook via the Tauri/Android back handler (verify the supported API for Tauri 2 mobile) or `history`/`popstate` integration.
- **Open with / Share intents** (PRD FR-FILE-5 equivalent) as a later phase; drag-and-drop is desktop-only.
- **Context menu:** right-click on desktop; long-press on touch (`onContextMenu` + `pointer: coarse` long-press timer).
- **Lifecycle:** persist reading location on `visibilitychange` / `pagehide` (Android may kill the process in background).
- **Keyboard (IME):** search input must stay visible when the keyboard opens (ime insets, §4.1).

---

## 7. Work plan

### Phase 0: Observability and quick wins (do first)
| ID | Task | Acceptance |
|---|---|---|
| P0-1 | Make `logTauriCall` re-throw after logging; remove `?? []` swallowing in `App.tsx` fallbacks | Failing command surfaces a typed error; log file has the real cause |
| P0-2 | Capture `adb logcat` + app log for the folder-open failure and record findings in `docs/ANDROID_NOTES.md` | Root cause of §2.1 steps 3–5 confirmed |
| P0-3 | Add `viewport-fit=cover`, `100dvh`, safe-area padding; apply native insets in `MainActivity.kt` | Header and bottom bar fully visible on the moto g57 power in portrait and landscape; no double padding |
| P0-4 | Add `<ErrorHost>`; remove inline `{error}` from the toolbar row | Two simultaneous errors never overlap other UI at 360 px |

### Phase 1: Filesystem abstraction (unblocks Android folders)
| ID | Task | Acceptance |
|---|---|---|
| P1-1 | Add `src/platform/fs/{types,desktop,android,web,index}.ts`; move `tauriApi.ts` logic into providers | Windows behaves exactly as before (manual regression: open folder, navigate, open each supported format) |
| P1-2 | Integrate the Android SAF plugin (§3.4), persist URI permission, implement list/read | Pick folder → files and subfolders list; open a PDF and an EPUB from it |
| P1-3 | Replace path-string navigation with `DirRef` stack (§3.3); fix breadcrumbs, Up, back/forward | No call to `split('/')`, `getParentPath`, or `` `${path}/${name}` `` in `App.tsx`/components |
| P1-4 | Migrate recents to `{id,name,platform}` with `reopen()` | Recent card shows `Documents`, not `primary%3ADocuments`; relaunching the app and tapping a recent folder works or shows a clear re-pick prompt |
| P1-5 | New capabilities (§5.2) and `lib.rs` cleanup (§5.1) | `cargo check` for desktop and Android targets passes; no unused commands |

### Phase 2: Single sources of truth
| ID | Task | Acceptance |
|---|---|---|
| P2-1 | Format registry module; remove the 6 duplicate extension lists, duplicate `FileEntry`, duplicate `getFormatBadge` | `grep -rn "\"epub\"\|'.epub'"` finds only the registry |
| P2-2 | `AppError` taxonomy + `toAppError` + `userMessage`; use in providers, adapters, `ReaderView` | No raw exception text reaches the UI (PRD FR-ERR-9) |
| P2-3 | Unify time units to ms end-to-end | Dates correct in desktop and web modes |

### Phase 3: Responsive shell
| ID | Task | Acceptance |
|---|---|---|
| P3-1 | `useBreakpoint()`, platform flag on `<html data-platform>`, breakpoint tokens | Hook returns compact/medium/expanded correctly when resizing the desktop window |
| P3-2 | Split `App.tsx` into `AppShell`, `AppBar`, `ViewOptions`, `Breadcrumbs`, `BrowsePane`, `Launchpad`, `RecentFolders` | No component > ~300 lines; behaviour unchanged on desktop |
| P3-3 | Compact/medium layouts per §4.3; 48 dp targets; grid/list adaptation | See test matrix §8; no horizontal page scroll at 320 px |
| P3-4 | Bottom-sheet panel primitive; migrate TOC / Search-Bookmarks / Settings drawers | Panels usable one-handed on a phone; Esc/back closes |

### Phase 4: Reader on mobile
| ID | Task | Acceptance |
|---|---|---|
| P4-1 | Audit and split `ReaderView.tsx` (toolbar, page nav, viewport controller, gestures) | Same behaviour on desktop; unit-testable pieces |
| P4-2 | Touch gestures, auto-hide bars, bottom inset handling, immersive fullscreen on Android | Read a book end-to-end with touch only |
| P4-3 | Rotation / split-screen re-layout preserving location | No lost position after rotate (PRD FR-VIEW-10) |
| P4-4 | Memory: PDF canvas cap, size guard `TOO_LARGE`, avoid duplicate buffers; evaluate streaming/range reads | 100 MB PDF and large CBZ open without crashing the moto g57 power |

### Phase 5: Platform behaviours, tests, CI
| ID | Task | Acceptance |
|---|---|---|
| P5-1 | Back-button handling, long-press context menu, lifecycle persistence | Behaviours in §6 verified on device |
| P5-2 | Vitest + RTL tests for providers (mocked), `toAppError`, navigation stack, `useBreakpoint`; `cargo test` for listing/error cases | CI green |
| P5-3 | GitHub Actions: Windows, Linux, Android (APK) jobs (PRD §15.3) | Artifacts produced for all three |
| P5-4 | Update `docs/PRD.md` (§7 below) | PRD matches implementation |

---

## 8. Test matrix (every phase)

| Dimension | Cases |
|---|---|
| Android phone | 360×800 and 412×915 (portrait + landscape), gesture navigation **and** 3-button navigation, display/font scale 100% and 150% |
| Android other | Tablet ~800×1280, split-screen, fold/unfold if available, Android 13 and Android 15+ |
| Desktop | Windows 1920×1080; 1024×700; minimum window ~800×600; Linux (AppImage or `tauri dev`) |
| Storage (Android) | SAF folder on internal storage (`Documents`, `Download`), SD card if available, large folder (≥ 1,000 entries), folder with unreadable/odd filenames (spaces, `%`, unicode) |
| Flows | Pick folder → browse → open book → rotate → close → relaunch → recent folder; revoke permission then reopen recent (expect `PERMISSION_DENIED` UI) |
| Formats | PDF, EPUB, CBZ, TXT, HTML; DRM-protected (expect `DRM_PROTECTED`); corrupt file (expect `CORRUPTED_FILE`) |
| Layout assertions | No element under system bars; no horizontal body scroll; all interactive targets ≥ 48 dp; errors never overlap controls |

Useful commands (adapt to the repo's scripts): `npm run tauri android dev`, `adb logcat | findstr /i "RustStdoutStderr chromium ebook"` (Windows) or `| grep -i ...` (Linux/macOS), `npx tsc --noEmit`, `cargo check --target aarch64-linux-android` from `src-tauri`.

---

## 9. PRD updates required (`docs/PRD.md`)

- **§18 Roadmap / §14 Platform matrix:** Android is currently Phase 3. Given the requirement that all targets work and are responsive, either move "Android SAF provider + responsive shell" into the MVP or explicitly mark the MVP as desktop-complete with Android as the immediate next milestone. Record the decision.
- **§4.2:** record the decision on the Android provider implementation (community plugin vs. custom Kotlin) with the version pinned.
- **§5:** add responsive requirements (suggested IDs `FR-RESP-1…`): breakpoints (§4.2), safe-area/inset handling (§4.1), 48 dp touch targets, no hover-only functionality, error host behaviour, touch equivalents for shortcuts/context menu/drag-drop.
- **§12.1 / 12.2 / 12.3:** add a platform column. Desktop-only: FR-SHELL-10/11/12 (fullscreen/shortcuts), FR-DIR-18 reveal-in-OS, FR-FILE-3/4 drag-and-drop. Android replacements: immersive mode, long-press menu, share/open-with intents.
- **§11:** update `UiState.recentFolders` shape.
- **§10:** note that errors are produced by providers as `AppError`.

---

## 10. Guardrails for the agent

1. **Do not regress Windows.** After each phase, run the desktop smoke test in §8 before moving on.
2. Keep changes **small and reviewable**: one task ID per commit/PR; keep the web provider working for `npm run dev`.
3. **Never concatenate or parse `RefId`s** outside a provider.
4. Do not add `MANAGE_EXTERNAL_STORAGE` or any cloud/network dependency (PRD non-goals: local-first, no tracking, F-Droid compatible: no proprietary SDKs).
5. Do not ship raw error strings to the UI; log details locally only.
6. When a task depends on an item marked **(verify)**, verify first, record the result in `docs/ANDROID_NOTES.md`, then implement.
7. If `src-tauri/gen/android` is generated and git-ignored, patch it through a reproducible step (script or documented template) so CI builds include the `MainActivity` change.

## 11. Open questions for the maintainer

1. Confirm the Android SAF approach: adopt `tauri-plugin-android-fs` (recommended) or write a custom Kotlin plugin?
2. Minimum Android version / `minSdk` and `targetSdk` for the release build?
3. Should the Android root be restricted to the picked tree (recommended), or should the app also support single-file picking ("Open file…")?
4. Move Android into the MVP in the PRD (recommended) or keep Phase 3?
5. Is Linux desktop required to be responsive in the same release, or only Windows + Android first?
