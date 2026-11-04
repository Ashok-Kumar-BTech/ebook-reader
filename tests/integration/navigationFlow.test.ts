import { describe, it, expect } from "vitest";
import { getParentPath, getBreadcrumbSegments, extractDocumentTitle, normalizePath } from "../../src/utils/pathUtils";

describe("Navigation & Path Traversal Integration Flow", () => {
  it("navigates hierarchical Windows directory paths accurately", () => {
    const currentDir = "C:\\Users\\Reader\\Books\\SciFi\\Dune";

    // Step 1: Initial breadcrumbs
    const crumbs = getBreadcrumbSegments(currentDir);
    expect(crumbs.length).toBe(6);
    expect(crumbs[0].name).toBe("C:");
    expect(crumbs[crumbs.length - 1].name).toBe("Dune");

    // Step 2: Navigate up one level
    const parent1 = getParentPath(currentDir);
    expect(parent1).toBe("C:\\Users\\Reader\\Books\\SciFi");

    // Step 3: Navigate up to drive root
    const parent2 = getParentPath(parent1!);
    const parent3 = getParentPath(parent2!);
    const parent4 = getParentPath(parent3!);
    const driveRoot = getParentPath(parent4!);
    expect(driveRoot).toBe("C:\\");

    // Drive root has no parent
    const aboveRoot = getParentPath(driveRoot!);
    expect(aboveRoot).toBeNull();
  });

  it("navigates hierarchical POSIX / Linux directory paths accurately", () => {
    const currentDir = "/home/user/documents/ebooks/fiction";
    const crumbs = getBreadcrumbSegments(currentDir);

    expect(crumbs[0].name).toBe("home");
    expect(crumbs[0].path).toBe("/home");
    expect(crumbs[crumbs.length - 1].name).toBe("fiction");

    const parent = getParentPath(currentDir);
    expect(parent).toBe("/home/user/documents/ebooks");

    const rootParent = getParentPath("/");
    expect(rootParent).toBeNull();
  });

  it("navigates Android Storage Access Framework (SAF) URI paths without segment corruption", () => {
    const safDir = "content://com.android.externalstorage.documents/tree/primary%3ADocuments%2FEbooks";
    
    // Breadcrumbs for SAF URI preserve human-readable display names
    const crumbs = getBreadcrumbSegments(safDir);
    expect(crumbs.length).toBe(1);
    expect(crumbs[0].name).toBe("Ebooks");

    // Title extraction strips raw Android storage tokens and extensions
    const bookTitle = extractDocumentTitle(`${safDir}%2FDune_Messiah.epub`);
    expect(bookTitle).toBe("Dune_Messiah");
    expect(bookTitle).not.toContain("primary%3A");
    expect(bookTitle).not.toContain(".epub");
  });

  it("normalizes path slashes consistently across platforms", () => {
    expect(normalizePath("C:\\Users\\User\\books")).toBe("C:/Users/User/books");
    expect(normalizePath("/home/user/books///")).toBe("/home/user/books");
    expect(normalizePath("")).toBe("");
  });
});
