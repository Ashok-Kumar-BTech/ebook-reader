# Open Source Licensing & Compliance Plan (GitHub Releases)

## 1. Executive Summary

This document establishes the licensing strategy, third-party component compliance audit, and publication checklist for releasing **Ebook Reader** to the public via **GitHub Releases** (Windows `.exe`/`.msi`, Linux `.AppImage`/`.deb`, and portable archives).

- **Project License:** GNU General Public License v3.0 (GPL-3.0-only)
- **Distribution Scope:** GitHub Releases (Primary)
- **Deferred Scope:** F-Droid and Google Play Store requirements are planned for future phases (Phase 3).

---

## 2. License Selection & Rationale

Per PRD §1.1 ("FOSS-friendly; Core is open source") and PRD §19 ("Open Decisions: GPLv3 vs AGPLv3 vs MIT — Recommendation: GPLv3 for core"), **GNU General Public License v3.0 (GPLv3)** has been established as the canonical project license.

### Why GPLv3:
1. **Strong Copyleft Protection:** Guarantees that users retain the four essential software freedoms: to run, study, share, and modify the software, keeping improvements open-source.
2. **Local-First & Offline Philosophy:** GPLv3 aligns with the project's zero-cloud, zero-tracking, user-sovereign ethos.
3. **Third-Party Compatibility:** GPLv3 is strictly compatible with all permissive open-source licenses used in the codebase (MIT, Apache 2.0, BSD 2-Clause, MPL 2.0, Unlicense).
4. **Future F-Droid Alignment:** F-Droid requires pure open-source licensing; adopting GPLv3 now completely avoids future relicensing friction.

---

## 3. Dependency License Audit

All dependencies included in the application bundle have been analyzed for GPLv3 compatibility.

### 3.1 Runtime Frontend Dependencies (`package.json`)

| Package | Version | Declared License | GPLv3 Compatible | Attribution & Compliance Requirements |
|---|---|---|---|---|
| `react` | ^19.1.0 | MIT | Yes | Standard MIT copyright notice retained |
| `react-dom` | ^19.1.0 | MIT | Yes | Standard MIT copyright notice retained |
| `zustand` | ^5.0.16 | MIT | Yes | Standard MIT copyright notice retained |
| `epubjs` | ^0.3.93 | BSD-2-Clause | Yes | **Notice requirement:** Retain copyright notice and disclaimer in documentation (`NOTICE` file) |
| `pdfjs-dist` | ^4.10.38 | Apache-2.0 | Yes | **Notice requirement:** Apache 2.0 attribution preserved in `NOTICE` file; no patent retaliation conflicts |
| `mammoth` | ^1.13.0 | BSD-2-Clause | Yes | **Notice requirement:** Retain copyright notice and disclaimer in documentation (`NOTICE` file) |
| `dompurify` | ^3.4.17 | MPL-2.0 OR Apache-2.0 | Yes | Used under Apache-2.0 option. File-level modifications (none) must remain under original terms |
| `jszip` | ^3.10.2 | MIT OR GPL-3.0-or-later | Yes | Dual-licensed; compatible under either MIT or GPL-3.0+ |
| `@primer/octicons-react`| ^19.42.0 | MIT | Yes | Standard MIT notice retained |
| `react-window` | ^2.5.0 | MIT | Yes | Standard MIT copyright notice retained |
| `@tauri-apps/api` | ^2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `@tauri-apps/plugin-dialog` | ^2.8.3 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `@tauri-apps/plugin-fs` | ^2.7.1 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `@tauri-apps/plugin-opener` | ^2 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `@tauri-apps/plugin-store` | ^2.5.0 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `tauri-plugin-android-fs-api` | ^30.2.0 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |

### 3.2 Runtime Backend Crates (`src-tauri/Cargo.toml`)

| Crate | Version | Declared License | GPLv3 Compatible | Attribution Notes |
|---|---|---|---|---|
| `tauri` | 2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `tauri-plugin-opener` | 2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `tauri-plugin-dialog` | 2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `tauri-plugin-fs` | 2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `tauri-plugin-store` | 2 | Apache-2.0 OR MIT | Yes | Dual-licensed permissive |
| `tauri-plugin-android-fs` | 30.2.0 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `serde` / `serde_json` | 1 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |
| `walkdir` | 2 | MIT OR Unlicense | Yes | Dual-licensed permissive |
| `chrono` | 0.4 | MIT OR Apache-2.0 | Yes | Dual-licensed permissive |

### 3.3 Build-Time & Development Tooling (Not Distributed in Binary)

Tooling used strictly to bundle or test (such as `vite`, `typescript`, `tailwindcss`, `vitest`, `@tauri-apps/cli`, `tauri-build`, `postcss`, and `autoprefixer`) does not impose runtime distribution licensing encumbrances on the generated application binaries.

### 3.4 Application Logo & Branding Artwork

- **Origin:** The Ebook Reader application logo, platform icons, and visual branding assets are **AI-generated using Gemini's Nano Banana**.
- **Licensing Status:** No third-party software, proprietary design tools, or commercial service licenses apply to the logo generation. The master graphic is maintained at `public/favicon.png` and distributed as part of the project repository under the overall project license. Explicit attribution is documented in the root `NOTICE` file.

---

## 4. Implemented Licensing Artifacts

1. **`LICENSE` (Repository Root):**
   - Contains the full, unaltered official text of the **GNU General Public License Version 3, 29 June 2007** as published by the Free Software Foundation.
2. **`NOTICE` (Repository Root):**
   - Contains comprehensive attribution and verbatim copyright/license notices for all bundled runtime third-party components (epub.js, PDF.js, Mammoth, DOMPurify, JSZip, Octicons, React, Tauri, etc.).
3. **`package.json`:**
   - `"license": "GPL-3.0-only"` explicitly declared.
4. **`src-tauri/Cargo.toml`:**
   - `license = "GPL-3.0-only"` explicitly declared in `[package]`.
5. **`README.md`:**
   - Documented License section referencing GPLv3 and the `NOTICE` file.

---

## 5. GitHub Releases Checklist

Before publishing release tags:

- [x] Full official `LICENSE` file present at root.
- [x] `NOTICE` file present at root with third-party attributions.
- [x] `package.json` declared as `GPL-3.0-only`.
- [x] `Cargo.toml` declared as `GPL-3.0-only`.
- [ ] Tag releases with semantic versions (e.g. `v0.1.0`).
- [ ] Attach generated binaries (Windows installer `.msi`, setup `.exe`, portable `.zip`, Linux `.AppImage`).
- [ ] Provide source code archive accompanying binaries as required by GPLv3 Section 6.

---

## 6. Future Scopes (Deferred)

- **F-Droid Build Requirements (Phase 3):**
  - Requires reproducible builds from source without proprietary blobs or network downloads during build.
  - Requires `metadata/{app_id}.yml` recipe.
- **Google Play Store (Phase 3):**
  - Requires Privacy Policy URL and Play Console data safety declarations.

