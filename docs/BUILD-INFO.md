# Ebook Reader — Build, Packaging & Deployment Guide

This document provides a comprehensive technical guide for building, packaging, and deploying **Ebook Reader** across **Windows**, **Android**, and **Linux**, alongside critical runtime usage instructions for the built products.

---

## Table of Contents
1. [Architecture & Build Prerequisites](#1-architecture--build-prerequisites)
2. [Building for Windows](#2-building-for-windows)
   - [Development Mode](#21-development-mode)
   - [Production Build & Artifacts](#22-production-build--artifacts)
   - [Installer vs. Direct App Usage](#23-installer-vs-direct-app-usage-portable)
3. [Building for Android](#3-building-for-android)
   - [Android SDK & Toolchain Setup](#31-android-sdk--toolchain-setup)
   - [Development & Direct Device Deployment (ADB)](#32-development--direct-device-deployment-adb)
   - [Building Standalone APKs & Google Play Bundles](#33-building-standalone-apks--google-play-bundles-aab)
   - [Installation & Sideloading Procedure](#34-installation--sideloading-procedure)
4. [Building for Linux (including WSL2 / WSLg)](#4-building-for-linux-including-wsl2--wslg)
   - [Native Linux Toolchain & Dependencies](#41-native-linux-toolchain--dependencies)
   - [Testing Linux Builds inside WSL2 via WSLg](#42-testing-linux-builds-inside-wsl2-via-wslg)
   - [Package Artifacts (AppImage, DEB, Standalone)](#43-package-artifacts-appimage-deb-standalone)
5. [Automated Multi-Platform CI/CD (GitHub Actions)](#5-automated-multi-platform-cicd-github-actions)
6. [Crucial Usage Instructions Regarding the Built Product](#6-crucial-usage-instructions-regarding-the-built-product)
   - [Local-First Storage & State Model](#61-local-first-storage--state-model)
   - [Android Storage Access Framework (SAF) & Permissions](#62-android-storage-access-framework-saf--permissions)
   - [Performance & Large File Guidelines](#63-performance--large-file-guidelines)
   - [Network, Privacy & Security Isolation](#64-network-privacy--security-isolation)

---

## 1. Architecture & Build Prerequisites

Ebook Reader is built on **Tauri v2** with a **React 19 + TypeScript + Vite + Tailwind CSS** frontend and a **Rust core** backend.

### Universal Toolchain Requirements
- **Node.js**: Version 18.0+ or 20.0+ LTS (`node -v`, `npm -v`)
- **Rust Toolchain**: Stable 1.77+ (`rustc -v`, `cargo -v`)
- **Tauri CLI v2**: Installed locally via devDependencies (`npx tauri` or `npm run tauri`)

```powershell
# Verify universal prerequisites
node -v
npm -v
rustc --version
cargo --version
```

---

## 2. Building for Windows

The Windows target uses Microsoft's **WebView2 Runtime** (pre-installed by default on Windows 10 and 11).

### 2.1 Development Mode
Launches the application with Vite hot-module-replacement (HMR) and live Rust IPC:
```powershell
npm run tauri dev
```

### 2.2 Production Build & Artifacts
To compile and bundle optimized release artifacts:
```powershell
npm run tauri build
```

When completed, the following outputs are generated under `src-tauri/target/release/`:

| Artifact Path | Format | Description |
| :--- | :--- | :--- |
| `src-tauri/target/release/ebook-reader.exe` | **Standalone Executable** | Raw compiled portable binary. Requires zero installation. |
| `src-tauri/target/release/bundle/nsis/ebook-reader_1.0.0_x64-setup.exe` | **NSIS Installer** | Standard wizard installer for end users with Desktop/Start menu shortcuts. |
| `src-tauri/target/release/bundle/msi/ebook-reader_1.0.0_x64_en-US.msi` | **MSI Package** | Windows Installer package (generated if WiX Toolset is installed). |

### 2.3 Installer vs. Direct App Usage (Portable)

> [!TIP]
> **Which one should you choose?**
> - **Direct App Usage (`ebook-reader.exe`)**: Ideal for portable usage (e.g., running off a USB drive or without administrative rights). Simply place the `.exe` anywhere and double-click to run. All reading state and bookmarks persist to the user's `%APPDATA%\com.ebook.reader` folder.
> - **Installer (`ebook-reader_1.0.0_x64-setup.exe`)**: Ideal for standard desktop deployment. Manages file association registration, Start Menu search indexing, automatic desktop icon creation, and provides a clean entry in *Windows Settings > Installed apps* for uninstallation.

---

## 3. Building for Android

The Android target runs via the native Android WebView and communicates with Rust via JNI and `tauri-plugin-android-fs`.

### 3.1 Android SDK & Toolchain Setup
Ensure the following are installed:
1. **Java Development Kit (JDK)**: JDK 17 or JDK 21 (Temurin or OpenJDK).
2. **Android SDK Command-Line Tools & Build Tools**: API Level 34 / 35.
3. **Android NDK**: NDK version `25.2.9519653` or `26.1.10909125`.
4. **Environment Variables**:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.x.x"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:NDK_HOME = "$env:ANDROID_HOME\ndk\26.1.10909125"
   ```
5. **Rust Android Targets**:
   ```powershell
   rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android
   ```

### 3.2 Development & Direct Device Deployment (ADB)
To compile and automatically install/launch on a connected physical phone (or Android emulator):
1. Connect device via USB.
2. Enable **USB Debugging** under *Settings > Developer options*.
3. Execute:
   ```powershell
   npm run tauri android dev
   ```
   *This packages the APK, streams it across ADB, installs it, and starts live debugging.*

> [!NOTE]
> **Multi-User / Work Profile Dev Behavior:**
> When running `npm run tauri android dev`, the Tauri CLI internal runner calls `adb install -r <apk>` without `--user current`. In Android's `PackageManagerService`, an install command without a specified user defaults to `UserHandle.USER_ALL`. On phones with multiple user spaces (Work Profiles, Samsung Secure Folder, Xiaomi Second Space, Island/Shelter), ADB will deploy the debug APK into all user profiles.
>
> **How to target only your active personal profile during development:**
> Use the targeted install script after compiling:
> ```powershell
> npm run android:install:current
> ```
> *(Or manually: `adb install -r --user current src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk`)*.
> To remove a bleed build from a secondary user (e.g. user ID 10):
> ```powershell
> adb uninstall --user 10 com.ebook.reader
> ```

### 3.3 Building Standalone APKs & Google Play Bundles (AAB)

#### Debug APK (for quick local testing & sharing)
```powershell
npm run tauri android build --debug --target aarch64
```
**Output Location:**
```
src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```

#### Signed Release APK (for GitHub Releases & Direct Sideloading)
```powershell
npm run tauri android build --apk --target aarch64
```
**Output Location:**
```
src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release.apk
```

#### Android App Bundle (for Google Play Store)
```powershell
npm run tauri android build --aab --target aarch64
```
**Output Location:**
```
src-tauri/gen/android/app/build/outputs/bundle/arm64Release/app-arm64-release.aab
```

### 3.4 Installation & Sideloading Procedure

#### Option 1: Via ADB (Command Line Developer Install)
To ensure the app installs strictly for the current active user profile:
```powershell
adb install -r --user current src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk
```
Or use the npm script:
```powershell
npm run android:install:current
```

#### Option 2: Direct Device Sideloading (Production `.apk` Behavior)
> [!IMPORTANT]
> **Production `.apk` Single-User Guarantee:**
> Unlike developer ADB commands, installing a production `.apk` directly on a phone (via Files app, WhatsApp, Chrome download, or GitHub Release) is handled by Android's native system **`PackageInstaller`** (`InstallInstalling` activity).
> 
> The system `PackageInstaller` operates strictly within the security boundaries of the **active user profile**. It installs the application **exclusively for the profile that initiated the installation** and will **never** bleed or install into Work Profiles, Secure Folders, or secondary accounts.

1. Send or copy `app-arm64-release.apk` (or debug APK) to phone storage.
2. Locate the `.apk` in the phone's **Files** app and tap it.
3. If prompted: *"For security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** $\rightarrow$ toggle **Allow from this source**.
4. Tap **Install** (or **Update**).

---

## 4. Building for Linux (including WSL2 / WSLg)

On Linux, Tauri uses **WebKitGTK** (`webkit2gtk-4.1`) as the web rendering engine.

### 4.1 Native Linux Toolchain & Dependencies
Inside an Ubuntu / Debian environment, install the required development libraries:
```bash
sudo apt update && sudo apt install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  squashfs-tools
```

### 4.2 Testing Linux Builds inside WSL2 via WSLg

You can test and run Linux desktop GUI builds directly from Windows using **WSL2** and **WSLg** (Windows Subsystem for Linux GUI).

1. **Verify WSL2 and WSLg**:
   Open Windows PowerShell and check that WSL2 is running:
   ```powershell
   wsl --version
   wsl --status
   ```
2. **Setup within WSL**:
   Launch WSL (`wsl -d Ubuntu`), install the dependencies listed in Section 4.1, and install Rust & Node:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"
   # Install Node 20 via nvm or nodesource
   ```
3. **Execute in WSL**:
   ```bash
   npm run tauri dev
   ```
   *The Linux GUI window will pop up seamlessly on your Windows desktop through WSLg.*

> [!NOTE]
> **WSL2 Rendering Troubleshooting**:
> If WebKitGTK produces black windows or DMA-BUF errors in WSLg, run:
> ```bash
> export WEBKIT_DISABLE_COMPOSITING_MODE=1
> npm run tauri dev
> ```
> For maximum compilation speed, clone and build inside the native Linux ext4 path (`~/projects/ebook-reader`) rather than across the Windows NTFS mount (`/mnt/d/...`).

### 4.3 Package Artifacts (AppImage, DEB, Standalone)
Run the build command:
```bash
npm run tauri build
```
Outputs in `src-tauri/target/release/`:
- **AppImage**: `src-tauri/target/release/bundle/appimage/ebook-reader_1.0.0_amd64.AppImage`
  - *Usage:* `chmod +x ebook-reader_1.0.0_amd64.AppImage && ./ebook-reader_1.0.0_amd64.AppImage`
- **Debian Package**: `src-tauri/target/release/bundle/deb/ebook-reader_1.0.0_amd64.deb`
  - *Usage:* `sudo dpkg -i ebook-reader_1.0.0_amd64.deb`
- **Raw Binary**: `src-tauri/target/release/ebook-reader`

---

## 5. Automated Multi-Platform CI/CD (GitHub Actions)

For automated cross-compilation on every GitHub tag or push, use the following sample workflow template at `.github/workflows/release.yml`:

```yaml
name: Release Builds

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build-desktop:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'windows-latest'
            args: ''
          - platform: 'ubuntu-22.04'
            args: ''
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Install Linux Dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
      - name: Install npm dependencies
        run: npm ci
      - name: Build Desktop Application
        run: npx tauri build ${{ matrix.args }}
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: desktop-artifacts-${{ matrix.platform }}
          path: src-tauri/target/release/bundle/

  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Configure Android SDK Environment
        run: |
          echo "ANDROID_HOME=/usr/local/lib/android/sdk" >> $GITHUB_ENV
          echo "ANDROID_SDK_ROOT=/usr/local/lib/android/sdk" >> $GITHUB_ENV
          echo "/usr/local/lib/android/sdk/cmdline-tools/latest/bin" >> $GITHUB_PATH
          echo "/usr/local/lib/android/sdk/platform-tools" >> $GITHUB_PATH
      - name: Accept Licenses & Install Android Toolchain Components
        run: |
          yes | sdkmanager --licenses || true
          sdkmanager --install "ndk;26.1.10909125" "platforms;android-37.0" "build-tools;35.0.0"
          echo "NDK_HOME=/usr/local/lib/android/sdk/ndk/26.1.10909125" >> $GITHUB_ENV
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Setup Rust & Android Targets
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-linux-android
      - name: Install npm dependencies
        run: npm ci
      - name: Build Android APK
        run: npx tauri android build --debug --target aarch64
      - name: Upload Android APK
        uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: src-tauri/gen/android/app/build/outputs/apk/
```

---

## 6. Crucial Usage Instructions Regarding the Built Product

### 6.1 Local-First Storage & State Model
- **Zero Cloud / Zero Account Requirement**: The application operates 100% offline. There are no databases to configure, no remote APIs, and no account registrations.
- **Reading Progress & Bookmarks**: Per-book state (last-read page, bookmarks, custom font sizing, line height, and theme preferences) is stored locally using the Tauri store plugin:
  - **Windows**: `%APPDATA%\com.ebook.reader\book-states.dat`
  - **Linux**: `~/.local/share/com.ebook.reader/book-states.dat`
  - **Android**: Sandboxed app storage (`/data/data/com.ebook.reader/files/`).
- **Zero File Indexing**: The app does not scan or index your entire hard drive or storage in the background. It only reads the specific folder or file you select.

### 6.2 Android Storage Access Framework (SAF) & Permissions
- **Selecting Library Folders**: On Android, storage is governed by scoped storage. When tapping **Open Folder**, select your target directory using the Android system document picker. The app persists read permissions automatically.
- **Selecting Single Ebooks**: Tap **Open File** to pick a single standalone file (`.pdf`, `.epub`, `.cbz`, etc.) from Downloads, Google Drive, or SD card.
- **Title Sanitization**: Document headers automatically strip encoded SAF prefixes (such as `primary%3ADocuments%2F...`) to display clean, human-readable titles.

### 6.3 Performance & Large File Guidelines
- **PDF Resolution Capping**: The built reader incorporates a 16-megapixel canvas guard and caps the `devicePixelRatio` at `2.5x` to protect low-RAM mobile devices from Out-Of-Memory (OOM) crashes on large raster PDFs.
- **Zoom & Gesture Bounds**:
  - On **Mobile**, zoom is clamped to a minimum of **$1.0\times$ (Fit-to-Width)** and a maximum of **$3.0\times$**. Pages will never shrink into tiny unusable boxes.
  - On **Desktop**, zoom ranges from **$0.6\times$** to **$3.0\times$**.
  - Double-tapping toggles between $1.0\times$ fit and $1.75\times$ reading magnification.

### 6.4 Network, Privacy & Security Isolation
- **No Analytics / Telemetry**: No tracking SDKs, crash reporters, or analytics endpoints exist in the application.
- **Strict Content Security Policy (CSP)**: External network requests from the reader frame are disallowed, safeguarding against malicious payloads embedded inside untrusted EPUBs or HTML documents.

