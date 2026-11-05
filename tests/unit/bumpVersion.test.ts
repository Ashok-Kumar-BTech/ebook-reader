import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  SEMVER_REGEX,
  normalizeVersion,
  validateSemVer,
  parseSemVer,
  calculateAndroidVersionCode,
  computeNextVersion,
  bumpProjectVersion,
} from '../../scripts/bump-version.js';

describe('Version Bump Engine & SemVer 2.0.0 Validation', () => {
  describe('normalizeVersion', () => {
    it('strips leading "v" or "V" and trims whitespace', () => {
      expect(normalizeVersion('v1.0.0')).toBe('1.0.0');
      expect(normalizeVersion('V2.3.4')).toBe('2.3.4');
      expect(normalizeVersion('  v0.1.0  ')).toBe('0.1.0');
      expect(normalizeVersion('1.0.0')).toBe('1.0.0');
    });

    it('handles non-string inputs safely', () => {
      expect(normalizeVersion(null as unknown as string)).toBe('');
      expect(normalizeVersion(undefined as unknown as string)).toBe('');
    });
  });

  describe('validateSemVer', () => {
    it('accepts compliant SemVer 2.0.0 strings', () => {
      expect(validateSemVer('0.1.0')).toBe('0.1.0');
      expect(validateSemVer('1.0.0')).toBe('1.0.0');
      expect(validateSemVer('2.14.8')).toBe('2.14.8');
      expect(validateSemVer('v1.0.0')).toBe('1.0.0');
      expect(validateSemVer('1.0.0-rc.1')).toBe('1.0.0-rc.1');
      expect(validateSemVer('1.0.0-beta.2+build.42')).toBe('1.0.0-beta.2+build.42');
    });

    it('rejects invalid versions with leading zeros (e.g. 1.000)', () => {
      expect(() => validateSemVer('1.000')).toThrow(/Invalid Semantic Version.*1\.000/);
      expect(() => validateSemVer('v1.000')).toThrow(/Invalid Semantic Version.*1\.000/);
      expect(() => validateSemVer('1.01.0')).toThrow(/Invalid Semantic Version/);
      expect(() => validateSemVer('01.0.0')).toThrow(/Invalid Semantic Version/);
    });

    it('rejects versions with insufficient or excessive segments', () => {
      expect(() => validateSemVer('1')).toThrow(/Invalid Semantic Version/);
      expect(() => validateSemVer('1.0')).toThrow(/Invalid Semantic Version/);
      expect(() => validateSemVer('1.0.0.0')).toThrow(/Invalid Semantic Version/);
      expect(() => validateSemVer('alpha')).toThrow(/Invalid Semantic Version/);
    });
  });

  describe('parseSemVer', () => {
    it('extracts major, minor, patch, prerelease, and build metadata', () => {
      const parsed = parseSemVer('v1.2.3-rc.4+20261105');
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'rc.4',
        build: '20261105',
        raw: '1.2.3-rc.4+20261105',
      });
    });
  });

  describe('calculateAndroidVersionCode', () => {
    it('computes monotonically increasing 32-bit positive integer', () => {
      expect(calculateAndroidVersionCode({ major: 0, minor: 1, patch: 0, raw: '0.1.0', prerelease: null, build: null })).toBe(1000);
      expect(calculateAndroidVersionCode({ major: 1, minor: 0, patch: 0, raw: '1.0.0', prerelease: null, build: null })).toBe(1000000);
      expect(calculateAndroidVersionCode({ major: 1, minor: 2, patch: 3, raw: '1.2.3', prerelease: null, build: null })).toBe(1002003);
      expect(calculateAndroidVersionCode({ major: 2, minor: 10, patch: 5, raw: '2.10.5', prerelease: null, build: null })).toBe(2010005);
    });
  });

  describe('computeNextVersion', () => {
    const current = '1.0.0';

    it('computes patch increment', () => {
      expect(computeNextVersion(current, 'patch')).toBe('1.0.1');
    });

    it('computes minor increment', () => {
      expect(computeNextVersion(current, 'minor')).toBe('1.1.0');
    });

    it('computes major increment', () => {
      expect(computeNextVersion(current, 'major')).toBe('2.0.0');
    });

    it('computes release candidate sequence', () => {
      expect(computeNextVersion(current, 'rc')).toBe('1.0.0-rc.1');
      expect(computeNextVersion('1.0.0-rc.1', 'rc')).toBe('1.0.0-rc.2');
    });

    it('accepts explicit SemVer versions and normalizes prefix', () => {
      expect(computeNextVersion(current, '1.2.3')).toBe('1.2.3');
      expect(computeNextVersion(current, 'v2.0.0')).toBe('2.0.0');
    });

    it('throws when given invalid increment keyword or invalid format', () => {
      expect(() => computeNextVersion(current, 'invalid')).toThrow(/Invalid Semantic Version/);
      expect(() => computeNextVersion(current, '1.000')).toThrow(/Invalid Semantic Version/);
    });
  });

  describe('bumpProjectVersion (atomic multi-file update)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bump-test-'));

      // Create mock package.json
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'ebook-reader', version: '0.1.0' }, null, 2),
        'utf8'
      );

      // Create mock src-tauri/tauri.conf.json
      fs.mkdirSync(path.join(tempDir, 'src-tauri'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'src-tauri', 'tauri.conf.json'),
        JSON.stringify({ productName: 'Ebook Reader', version: '0.1.0' }, null, 2),
        'utf8'
      );

      // Create mock src-tauri/Cargo.toml
      fs.writeFileSync(
        path.join(tempDir, 'src-tauri', 'Cargo.toml'),
        '[package]\nname = "ebook-reader"\nversion = "0.1.0"\nedition = "2024"\n',
        'utf8'
      );

      // Create mock src-tauri/gen/android/app/tauri.properties
      fs.mkdirSync(path.join(tempDir, 'src-tauri', 'gen', 'android', 'app'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'src-tauri', 'gen', 'android', 'app', 'tauri.properties'),
        'tauri.android.versionName=0.1.0\ntauri.android.versionCode=1000\n',
        'utf8'
      );
    });

    afterEach(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('previews changes without writing when dryRun is true', () => {
      const result = bumpProjectVersion('1.0.0', {
        projectRoot: tempDir,
        dryRun: true,
        syncLockfiles: false,
      });

      expect(result.dryRun).toBe(true);
      expect(result.previousVersion).toBe('0.1.0');
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.androidCode).toBe(1000000);

      // Verify files remained unchanged on disk
      const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
      expect(pkg.version).toBe('0.1.0');
    });

    it('atomically updates package.json, tauri.conf.json, Cargo.toml, and tauri.properties', () => {
      const result = bumpProjectVersion('1.0.0', {
        projectRoot: tempDir,
        dryRun: false,
        syncLockfiles: false,
      });

      expect(result.previousVersion).toBe('0.1.0');
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.androidCode).toBe(1000000);

      // Verify package.json
      const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
      expect(pkg.version).toBe('1.0.0');

      // Verify tauri.conf.json
      const conf = JSON.parse(fs.readFileSync(path.join(tempDir, 'src-tauri', 'tauri.conf.json'), 'utf8'));
      expect(conf.version).toBe('1.0.0');

      // Verify Cargo.toml
      const cargo = fs.readFileSync(path.join(tempDir, 'src-tauri', 'Cargo.toml'), 'utf8');
      expect(cargo).toContain('version = "1.0.0"');

      // Verify tauri.properties
      const props = fs.readFileSync(
        path.join(tempDir, 'src-tauri', 'gen', 'android', 'app', 'tauri.properties'),
        'utf8'
      );
      expect(props).toContain('tauri.android.versionName=1.0.0');
      expect(props).toContain('tauri.android.versionCode=1000000');
    });
  });
});

