import { describe, it, expect } from "vitest";
import {
  formatRegistry,
  getFormatInfo,
  isFormatSupported,
  getFormatBadge,
  getAllSupportedExtensions,
  extractExtension,
} from "../../src/adapters/registry";

describe("formatRegistry & format definitions", () => {
  describe("extractExtension", () => {
    it("extracts clean lowercase extension from simple filename", () => {
      expect(extractExtension("book.PDF")).toBe("pdf");
      expect(extractExtension("novel.EPUB")).toBe("epub");
    });

    it("handles multiple dots and path separators", () => {
      expect(extractExtension("D:/books/archive.v1.0.final.cbz")).toBe("cbz");
      expect(extractExtension("/var/data/my.doc.file.docx")).toBe("docx");
    });

    it("strips query params and hash fragments", () => {
      expect(extractExtension("content://file.pdf?token=123#page=1")).toBe("pdf");
    });

    it("returns empty string when no extension exists", () => {
      expect(extractExtension("README")).toBe("");
      expect(extractExtension("")).toBe("");
    });
  });

  describe("isFormatSupported", () => {
    it("recognizes all PRD-mandated formats", () => {
      expect(isFormatSupported("doc.pdf")).toBe(true);
      expect(isFormatSupported("doc.epub")).toBe(true);
      expect(isFormatSupported("comic.cbz")).toBe(true);
      expect(isFormatSupported("comic.cbr")).toBe(true);
      expect(isFormatSupported("notes.txt")).toBe(true);
      expect(isFormatSupported("notes.text")).toBe(true);
      expect(isFormatSupported("page.html")).toBe(true);
      expect(isFormatSupported("page.htm")).toBe(true);
      expect(isFormatSupported("page.xhtml")).toBe(true);
      expect(isFormatSupported("report.docx")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isFormatSupported("DOC.PDF")).toBe(true);
      expect(isFormatSupported("Novel.Epub")).toBe(true);
      expect(isFormatSupported("COMIC.CBZ")).toBe(true);
    });

    it("rejects unsupported extensions", () => {
      expect(isFormatSupported("file.exe")).toBe(false);
      expect(isFormatSupported("video.mp4")).toBe(false);
      expect(isFormatSupported("audio.mp3")).toBe(false);
      expect(isFormatSupported("archive.zip")).toBe(false);
      expect(isFormatSupported("code.rs")).toBe(false);
    });
  });

  describe("view applicability rules per PRD", () => {
    it("allows single, two-page, and scroll for PDF, EPUB, and CBZ", () => {
      for (const fmt of ["file.pdf", "file.epub", "file.cbz"] as const) {
        const info = getFormatInfo(fmt);
        expect(info?.views).toContain("single");
        expect(info?.views).toContain("two-page");
        expect(info?.views).toContain("scroll");
      }
    });

    it("restricts TXT, HTML, and DOCX strictly to scroll view", () => {
      for (const fmt of ["file.txt", "file.html", "file.docx"] as const) {
        const info = getFormatInfo(fmt);
        expect(info?.views).toContain("scroll");
        expect(info?.views).not.toContain("single");
        expect(info?.views).not.toContain("two-page");
      }
    });
  });

  describe("getFormatBadge", () => {
    it("returns correct labels and badge colors", () => {
      const pdfBadge = getFormatBadge("file.pdf");
      expect(pdfBadge?.label).toBe("PDF");
      expect(pdfBadge?.color).toContain("red");

      const epubBadge = getFormatBadge("file.epub");
      expect(epubBadge?.label).toBe("EPUB");
      expect(epubBadge?.color).toContain("green");

      const cbzBadge = getFormatBadge("file.cbz");
      expect(cbzBadge?.label).toBe("CBZ");
      expect(cbzBadge?.color).toContain("blue");

      const txtBadge = getFormatBadge("file.txt");
      expect(txtBadge?.label).toBe("TXT");

      const docxBadge = getFormatBadge("file.docx");
      expect(docxBadge?.label).toBe("DOCX");
      expect(docxBadge?.color).toContain("purple");
    });

    it("returns null for unsupported formats", () => {
      expect(getFormatBadge("archive.tar.gz")).toBeNull();
    });
  });

  describe("supported extensions list", () => {
    it("includes all PRD-mandated extensions", () => {
      const exts = getAllSupportedExtensions();
      expect(exts).toContain("pdf");
      expect(exts).toContain("epub");
      expect(exts).toContain("cbz");
      expect(exts).toContain("cbr");
      expect(exts).toContain("txt");
      expect(exts).toContain("html");
      expect(exts).toContain("docx");
    });
  });

  describe("formatRegistry singleton", () => {
    it("registers and retrieves format adapters", () => {
      expect(formatRegistry.isSupported("sample.pdf")).toBe(true);
      expect(formatRegistry.getSupportedExtensions()).toContain("pdf");
    });
  });
});
