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

  // URIs and virtual collections cannot navigate "up" via path string operations
  if (
    inputPath.startsWith('content://') ||
    inputPath.startsWith('collection:') ||
    inputPath.startsWith('virtual:')
  ) {
    return null;
  }

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

  // SAF URIs and virtual collections
  if (
    inputPath.startsWith('content://') ||
    inputPath.startsWith('collection:') ||
    inputPath.startsWith('virtual:')
  ) {
    let friendlyName = inputPath;
    try {
      if (inputPath.startsWith('collection:') || inputPath.startsWith('virtual:')) {
        friendlyName = 'Selected Ebooks';
      } else {
        const decoded = decodeURIComponent(inputPath);
        const afterColon = decoded.includes(':') ? decoded.split(':').pop() : decoded;
        friendlyName = (afterColon || '').split('/').filter(Boolean).pop() || decoded;
      }
    } catch {
      friendlyName = inputPath;
    }
    return [{ name: friendlyName, path: inputPath, isLast: true }];
  }

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

/**
 * Cleanly extracts the human-readable document title from a file path, SAF content URI, or URL.
 * Decodes URI entities, strips Android SAF storage prefixes (like primary:Documents/...),
 * and removes file extensions.
 *
 * Examples:
 *   "content://.../primary%3ADocuments%2FProject%20Analysis.pdf" -> "Project Analysis"
 *   "D:/Books/Science/Quantum Physics.epub" -> "Quantum Physics"
 *   "primary:Download/My Book.pdf" -> "My Book"
 */
export function extractDocumentTitle(pathOrUri: string): string {
  if (!pathOrUri) return "Document";
  try {
    let decoded = decodeURIComponent(pathOrUri);
    // Strip Android SAF storage prefixes like primary:Documents/...
    if (decoded.includes(":")) {
      const colonParts = decoded.split(":");
      decoded = colonParts[colonParts.length - 1];
    }
    const lastSegment = decoded.split(/[/\\]/).filter(Boolean).pop() || decoded;
    return lastSegment.replace(/\.[^.]+$/, "").trim() || "Document";
  } catch {
    const raw = pathOrUri.split(/[/\\]/).filter(Boolean).pop() || pathOrUri;
    return raw.replace(/\.[^.]+$/, "").trim() || "Document";
  }
}
