import { describe, it, expect } from "vitest";
import {
  normalizePath,
  getParentPath,
  getBreadcrumbSegments,
  extractDocumentTitle,
} from "../../src/utils/pathUtils";

describe("pathUtils", () => {
  describe("normalizePath", () => {
    it("converts Windows backslashes to forward slashes", () => {
      expect(normalizePath("C:\\Users\\Reader\\Books")).toBe("C:/Users/Reader/Books");
    });

    it("collapses trailing slashes except for root", () => {
      expect(normalizePath("D:/Books/Sci-Fi///")).toBe("D:/Books/Sci-Fi");
    });

    it("handles empty input safely", () => {
      expect(normalizePath("")).toBe("");
    });
  });

  describe("getParentPath", () => {
    it("resolves Windows parent directories while maintaining original slash style", () => {
      expect(getParentPath("D:\\Books\\personal")).toBe("D:\\Books");
      expect(getParentPath("D:/Books/personal")).toBe("D:/Books");
    });

    it("resolves drive root parent as null", () => {
      expect(getParentPath("C:\\")).toBeNull();
      expect(getParentPath("C:/")).toBeNull();
      expect(getParentPath("C:")).toBeNull();
    });

    it("resolves POSIX parent directories", () => {
      expect(getParentPath("/home/user/books")).toBe("/home/user");
      expect(getParentPath("/books")).toBe("/");
    });

    it("resolves POSIX root / parent as null", () => {
      expect(getParentPath("/")).toBeNull();
      expect(getParentPath("")).toBeNull();
    });

    it("returns null for Android SAF content URIs and virtual collections", () => {
      expect(getParentPath("content://com.android.externalstorage.documents/tree/primary%3ABooks")).toBeNull();
      expect(getParentPath("collection:selected_books")).toBeNull();
      expect(getParentPath("virtual:all_books")).toBeNull();
    });
  });

  describe("getBreadcrumbSegments", () => {
    it("generates correct breadcrumb segments for Windows paths", () => {
      const segments = getBreadcrumbSegments("D:/Books/Sci-Fi");
      expect(segments).toEqual([
        { name: "D:", path: "D:/", isLast: false },
        { name: "Books", path: "D:/Books", isLast: false },
        { name: "Sci-Fi", path: "D:/Books/Sci-Fi", isLast: true },
      ]);
    });

    it("generates correct breadcrumb segments for POSIX paths", () => {
      const segments = getBreadcrumbSegments("/home/user/books");
      expect(segments).toEqual([
        { name: "home", path: "/home", isLast: false },
        { name: "user", path: "/home/user", isLast: false },
        { name: "books", path: "/home/user/books", isLast: true },
      ]);
    });

    it("handles SAF URIs by producing a single decoded crumb", () => {
      const uri = "content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FBooks";
      const segments = getBreadcrumbSegments(uri);
      expect(segments).toHaveLength(1);
      expect(segments[0].name).toBe("Books");
      expect(segments[0].isLast).toBe(true);
    });

    it("handles virtual collections gracefully", () => {
      const segments = getBreadcrumbSegments("virtual:selected_books");
      expect(segments).toEqual([
        { name: "Selected Ebooks", path: "virtual:selected_books", isLast: true },
      ]);
    });
  });

  describe("extractDocumentTitle", () => {
    it("extracts clean title from standard Windows paths", () => {
      expect(extractDocumentTitle("C:\\Users\\ashok\\Documents\\Quantum Physics.pdf")).toBe("Quantum Physics");
    });

    it("extracts clean title from POSIX paths", () => {
      expect(extractDocumentTitle("/home/user/books/The Great Gatsby.epub")).toBe("The Great Gatsby");
    });

    it("extracts and decodes Android SAF URIs with encoded slashes and primary prefix", () => {
      const safUri = "content://com.android.externalstorage.documents/document/primary%3ADocuments%2FProject%20Analysis.pdf";
      expect(extractDocumentTitle(safUri)).toBe("Project Analysis");
    });

    it("handles files with multiple dots in filename", () => {
      expect(extractDocumentTitle("D:/Books/release.v1.0.final.epub")).toBe("release.v1.0.final");
    });

    it("handles unicode and emoji titles", () => {
      expect(extractDocumentTitle("/books/📚 Learning Rust & TypeScript.pdf")).toBe("📚 Learning Rust & TypeScript");
    });

    it("returns 'Document' fallback for empty or whitespace paths", () => {
      expect(extractDocumentTitle("")).toBe("Document");
    });
  });
});

