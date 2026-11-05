#!/usr/bin/env node

/**
 * Version Bump & Synchronization Engine for Ebook Reader.
 *
 * Atomically synchronizes version across:
 * - package.json
 * - src-tauri/tauri.conf.json
 * - src-tauri/Cargo.toml
 * - src-tauri/gen/android/app/tauri.properties
 * - package-lock.json & src-tauri/Cargo.lock
 *
 * Strictly adheres to Semantic Versioning 2.0.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Official SemVer 2.0.0 regular expression
export const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Strips leading 'v' or 'V' and trims whitespace.
 */
export function normalizeVersion(input) {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/^v/i, '');
}

/**
 * Validates a version against SemVer 2.0.0 specifications.
 * Throws a descriptive error if invalid (e.g. leading zeros like 1.000).
 */
export function validateSemVer(version) {
  const normalized = normalizeVersion(version);
  if (!SEMVER_REGEX.test(normalized)) {
    throw new Error(
      `Invalid Semantic Version: "${version}". Version must strictly follow SemVer 2.0.0 (MAJOR.MINOR.PATCH) without leading zeroes (e.g., "1.0.0", not "1.000").`
    );
  }
  return normalized;
}

/**
 * Parses SemVer components.
 */
export function parseSemVer(version) {
  const normalized = validateSemVer(version);
  const match = normalized.match(SEMVER_REGEX);
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
    raw: normalized,
  };
}

/**
 * Calculates Android monotonically increasing 32-bit versionCode.
 * Formula: MAJOR * 1_000_000 + MINOR * 1_000 + PATCH
 */
export function calculateAndroidVersionCode(parsed) {
  return parsed.major * 1000000 + parsed.minor * 1000 + parsed.patch;
}

/**
 * Computes the target version based on keywords or explicit version.
 */
export function computeNextVersion(currentVersion, bumpArg) {
  if (!bumpArg) {
    throw new Error('Version or bump type argument is required (e.g. 1.0.0, patch, minor, major, rc)');
  }

  const keyword = bumpArg.toLowerCase().trim();
  const parsed = parseSemVer(currentVersion);

  switch (keyword) {
    case 'major':
      return `${parsed.major + 1}.0.0`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case 'rc':
    case 'prerelease': {
      if (parsed.prerelease && parsed.prerelease.startsWith('rc.')) {
        const parts = parsed.prerelease.split('.');
        const rcNum = parseInt(parts[1], 10) || 0;
        return `${parsed.major}.${parsed.minor}.${parsed.patch}-rc.${rcNum + 1}`;
      }
      return `${parsed.major}.${parsed.minor}.${parsed.patch}-rc.1`;
    }
    default:
      return validateSemVer(bumpArg);
  }
}

/**
 * Reads the current version from package.json.
 */
export function readCurrentVersion(projectRoot = ROOT_DIR) {
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

/**
 * Updates all versioned project files atomically.
 */
export function bumpProjectVersion(targetVersionInput, options = {}) {
  const { projectRoot = ROOT_DIR, dryRun = false, syncLockfiles = true } = options;

  const currentVersion = readCurrentVersion(projectRoot);
  const targetVersion = computeNextVersion(currentVersion, targetVersionInput);
  const parsed = parseSemVer(targetVersion);
  const androidCode = calculateAndroidVersionCode(parsed);

  const paths = {
    pkg: path.join(projectRoot, 'package.json'),
    tauriConf: path.join(projectRoot, 'src-tauri', 'tauri.conf.json'),
    cargoToml: path.join(projectRoot, 'src-tauri', 'Cargo.toml'),
    androidProps: path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'tauri.properties'),
  };

  const changes = [];

  // 1. package.json
  if (fs.existsSync(paths.pkg)) {
    const raw = fs.readFileSync(paths.pkg, 'utf8');
    const pkg = JSON.parse(raw);
    const oldVal = pkg.version;
    pkg.version = targetVersion;
    changes.push({ file: 'package.json', oldVal, newVal: targetVersion });
    if (!dryRun) {
      fs.writeFileSync(paths.pkg, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    }
  }

  // 2. src-tauri/tauri.conf.json
  if (fs.existsSync(paths.tauriConf)) {
    const raw = fs.readFileSync(paths.tauriConf, 'utf8');
    const conf = JSON.parse(raw);
    const oldVal = conf.version;
    conf.version = targetVersion;
    changes.push({ file: 'src-tauri/tauri.conf.json', oldVal, newVal: targetVersion });
    if (!dryRun) {
      fs.writeFileSync(paths.tauriConf, JSON.stringify(conf, null, 2) + '\n', 'utf8');
    }
  }

  // 3. src-tauri/Cargo.toml
  if (fs.existsSync(paths.cargoToml)) {
    const raw = fs.readFileSync(paths.cargoToml, 'utf8');
    const match = raw.match(/(^\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m);
    if (match) {
      const oldVal = raw.match(/^version\s*=\s*"([^"]+)"/m)?.[1] || '';
      const updated = raw.replace(
        /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+(")/m,
        `$1${targetVersion}$2`
      );
      changes.push({ file: 'src-tauri/Cargo.toml', oldVal, newVal: targetVersion });
      if (!dryRun) {
        fs.writeFileSync(paths.cargoToml, updated, 'utf8');
      }
    }
  }

  // 4. Android tauri.properties (if generated)
  if (fs.existsSync(paths.androidProps)) {
    const raw = fs.readFileSync(paths.androidProps, 'utf8');
    let updated = raw.replace(
      /^tauri\.android\.versionName=.*/m,
      `tauri.android.versionName=${targetVersion}`
    );
    updated = updated.replace(
      /^tauri\.android\.versionCode=.*/m,
      `tauri.android.versionCode=${androidCode}`
    );
    changes.push({
      file: 'src-tauri/gen/android/app/tauri.properties',
      oldVal: `name=${currentVersion}, code=*`,
      newVal: `name=${targetVersion}, code=${androidCode}`,
    });
    if (!dryRun) {
      fs.writeFileSync(paths.androidProps, updated, 'utf8');
    }
  }

  // 5. Synchronize lockfiles
  if (!dryRun && syncLockfiles) {
    try {
      execSync('npm install --package-lock-only --ignore-scripts', {
        cwd: projectRoot,
        stdio: 'ignore',
      });
      changes.push({ file: 'package-lock.json', oldVal: 'sync', newVal: targetVersion });
    } catch {
      // Non-fatal if npm lock sync encounters network issues
    }

    try {
      execSync(`cargo check --manifest-path src-tauri/Cargo.toml`, {
        cwd: projectRoot,
        stdio: 'ignore',
      });
      changes.push({ file: 'src-tauri/Cargo.lock', oldVal: 'sync', newVal: targetVersion });
    } catch {
      // Non-fatal if cargo check is running in container without full rustup
    }
  }

  return {
    previousVersion: currentVersion,
    currentVersion: targetVersion,
    androidCode,
    changes,
    dryRun,
  };
}

// CLI Execution entry point
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Ebook Reader - Version Bump & Synchronization Engine

Usage:
  node scripts/bump-version.js <version|keyword> [options]

Keywords:
  patch       Increment patch version (e.g. 1.0.0 -> 1.0.1)
  minor       Increment minor version (e.g. 1.0.0 -> 1.1.0)
  major       Increment major version (e.g. 1.0.0 -> 2.0.0)
  rc          Create or increment release candidate (e.g. 1.0.0-rc.1)

Direct Versions:
  1.0.0       Explicit SemVer string (leading 'v' is automatically normalized)

Options:
  --current, -c   Display current version across manifests and exit
  --dry-run       Preview changes without writing to disk
  --no-lock       Skip lockfile regeneration
  --help, -h      Show this help message
`);
    process.exit(0);
  }

  if (args.includes('--current') || args.includes('-c')) {
    const curr = readCurrentVersion();
    console.log(`Current project version: ${curr}`);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const syncLockfiles = !args.includes('--no-lock');
  const targetArg = args.find((a) => !a.startsWith('-'));

  if (!targetArg) {
    console.error('Error: Please provide a target version or bump keyword (patch, minor, major, rc).');
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  try {
    const result = bumpProjectVersion(targetArg, { dryRun, syncLockfiles });
    console.log(`\n======================================================`);
    console.log(result.dryRun ? `[DRY-RUN] Version Preview:` : `Version Bump Succeeded:`);
    console.log(`  Previous: ${result.previousVersion}`);
    console.log(`  Target:   ${result.currentVersion} (SemVer 2.0.0)`);
    console.log(`  Android:  versionCode=${result.androidCode}`);
    console.log(`======================================================`);
    console.log('Modified Manifests:');
    result.changes.forEach((c) => {
      console.log(`  • ${c.file}: ${c.oldVal} -> ${c.newVal}`);
    });
    console.log('');
  } catch (err) {
    console.error(`\nVersion Bump Error: ${err.message}\n`);
    process.exit(1);
  }
}

