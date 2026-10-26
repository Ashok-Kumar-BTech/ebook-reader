/**
 * Utility functions for directory path normalization, parent navigation, and breadcrumbs.
 * Supports Windows (both backslash and forward slash) and POSIX paths.
 */

export interface BreadcrumbSegment {
  name: string;
  path: string;
  isLast: boolean;
}

/**
 * Normalizes a file or folder path by replacing multiple consecutive slashes
 * and stripping trailing slashes (except root).
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return '';
  // Convert Windows backslashes to forward slashes for internal calculations
  return inputPath.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Resolves the immediate parent directory of a given path.
 * Returns null if the path is already a root or has no parent.
 *
 * Examples:
 *   "D:/Books/personal" -> "D:/Books"
 *   "D:\Books\personal" -> "D:\Books"
 *   "D:/Books" -> "D:/"
 *   "D:\" -> null
 *   "/demo-library/sub" -> "/demo-library"
 *   "/demo-library" -> null (or "/" depending on base)
 */
export function getParentPath(inputPath: string): string | null {
  if (!inputPath) return null;
  const isBackslash = inputPath.includes('\\');
  const normalized = normalizePath(inputPath);
  
  // Windows drive root check: e.g. "C:" or "C:/" or "C:\"
  if (/^[a-zA-Z]:\/?$/.test(normalized) || /^[a-zA-Z]:$/.test(normalized)) {
    return null;
  }

  // POSIX root check: e.g. "/"
  if (normalized === '' || normalized === '/') {
    return null;
  }

  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    return null;
  }

  // If the parent is the Windows drive: e.g. "D:/Books" -> lastSlashIndex is at "D:"
  const parentSub = normalized.substring(0, lastSlashIndex);
  if (/^[a-zA-Z]:$/.test(parentSub)) {
    return isBackslash ? `${parentSub}\\` : `${parentSub}/`;
  }

  if (parentSub === '') {
    // POSIX root "/"
    return '/';
  }

  // Restore original separator style
  return isBackslash ? parentSub.replace(/\//g, '\\') : parentSub;
}

/**
 * Splits a path into clickable breadcrumb segments.
 *
 * Example: "D:/Books/personal/notes"
 * Returns:
 * [
 *   { name: "D:", path: "D:/" },
 *   { name: "Books", path: "D:/Books" },
 *   { name: "personal", path: "D:/Books/personal" },
 *   { name: "notes", path: "D:/Books/personal/notes", isLast: true }
 * ]
 */
export function getBreadcrumbSegments(inputPath: string): BreadcrumbSegment[] {
  if (!inputPath) return [];

  const isBackslash = inputPath.includes('\\');
  const normalized = normalizePath(inputPath);
  const isPosixRoot = inputPath.startsWith('/');
  
  const rawParts = normalized.split('/').filter(Boolean);
  if (rawParts.length === 0) {
    return [{ name: inputPath, path: inputPath, isLast: true }];
  }

  const segments: BreadcrumbSegment[] = [];
  let accumulated = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    const isFirst = i === 0;
    const isLast = i === rawParts.length - 1;

    if (isFirst) {
      if (/^[a-zA-Z]:$/.test(part)) {
        // Windows drive letter
        accumulated = isBackslash ? `${part}\\` : `${part}/`;
        segments.push({
          name: part,
          path: accumulated,
          isLast,
        });
        continue;
      } else if (isPosixRoot) {
        accumulated = `/${part}`;
        segments.push({
          name: part,
          path: accumulated,
          isLast,
        });
        continue;
      }
    }

    const sep = isBackslash ? '\\' : '/';
    if (accumulated.endsWith('/') || accumulated.endsWith('\\')) {
      accumulated = `${accumulated}${part}`;
    } else {
      accumulated = `${accumulated}${sep}${part}`;
    }

    segments.push({
      name: part,
      path: accumulated,
      isLast,
    });
  }

  return segments;
}
