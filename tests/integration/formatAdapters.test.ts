import { describe, it, expect } from "vitest";
import { formatRegistry, getAdapterForPath } from "../../src/adapters/registry";
import { getFormatInfo, isFormatSupported, getAllSupportedExtensions } from "../../src/formats/registry";

describe("Format Adapters Integration Pipeline", () => {
  it("resolves and initializes registered adapters for all core formats", () => {
    const testFiles = [
      { path: "/books/guide.pdf", expectedFormat: "pdf", views: ["single", "two-page", "scroll"] },
      { path: "/books/novel.epub", expectedFormat: "epub", views: ["single", "two-page", "scroll"] },
      { path: "/books/comic.cbz", expectedFormat: "cbz", views: ["single", "two-page", "scroll"] },
      { path: "/books/readme.txt", expectedFormat: "txt", views: ["scroll"] },
      { path: "/books/chapter.html", expectedFormat: "html", views: ["scroll"] },
      { path: "/books/document.docx", expectedFormat: "docx", views: ["scroll"] },
    ];

    for (const { path, expectedFormat, views } of testFiles) {
      expect(isFormatSupported(path)).toBe(true);
      const info = getFormatInfo(path);
      expect(info).not.toBeNull();
      expect(info?.format).toBe(expectedFormat);
      expect(info?.views).toEqual(views);

      const adapter = getAdapterForPath(path);
      expect(adapter).not.toBeNull();
      expect(adapter?.format).toBe(expectedFormat);
    }
  });

  it("manages adapter instance caching and cleanup lifecycle", () => {
    const bookPath = "/books/cached_test.epub";
    const instance1 = formatRegistry.getAdapterForPath(bookPath);
    const instance2 = formatRegistry.getAdapterForPath(bookPath);

    // Verifies instance is cached for the same path
    expect(instance1).toBe(instance2);

    // Unload instance
    formatRegistry.unloadAdapterForPath(bookPath);

    // Next request creates a fresh instance
    const instance3 = formatRegistry.getAdapterForPath(bookPath);
    expect(instance3).not.toBe(instance1);

    formatRegistry.clearInstances();
  });

  it("handles unsupported and edge-case paths safely", () => {
    const unsupportedPaths = [
      "/files/binary.exe",
      "/files/archive.tar.gz",
      "/files/video.mkv",
      "/files/song.mp3",
      "",
      "/files/no_extension",
    ];

    for (const path of unsupportedPaths) {
      expect(isFormatSupported(path)).toBe(false);
      expect(getFormatInfo(path)).toBeNull();
      expect(getAdapterForPath(path)).toBeNull();
    }
  });

  it("guarantees all extensions in format registry are unique and lowercased", () => {
    const extensions = getAllSupportedExtensions();
    expect(extensions.length).toBeGreaterThan(5);

    const seen = new Set<string>();
    for (const ext of extensions) {
      expect(ext).toBe(ext.toLowerCase());
      expect(ext.startsWith(".")).toBe(false);
      expect(seen.has(ext)).toBe(false);
      seen.add(ext);
    }
  });
});

