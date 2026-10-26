import { useState, useEffect, useCallback, useMemo } from "react";
import { useUiStore } from "../stores/uiStore";
import { openDirectoryDialog, readDirectory, getFileStat, listDirectory } from "../utils/tauriApi";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isSupported: boolean;
  size: number;
  modified: number;
}

interface FileTreeProps {
  rootPath: string;
  onFileClick: (path: string) => void;
  onDirectoryChange?: (path: string) => void;
  searchQuery?: string;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".epub",
  ".cbz",
  ".cbr",
  ".txt",
  ".html",
  ".htm",
  ".docx",
]);

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return (
    <>
      {before}
      <mark className="bg-amber-300 dark:bg-amber-600/70 text-black dark:text-white rounded px-0.5">
        {match}
      </mark>
      {after}
    </>
  );
}

function nodeMatchesQuery(node: FileNode, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.children) {
    return node.children.some(child => nodeMatchesQuery(child, query));
  }
  return false;
}

function getFormatBadge(path: string): { label: string; color: string } | null {
  const ext = path.toLowerCase().slice(path.lastIndexOf("."));
  if (!SUPPORTED_EXTENSIONS.has(ext)) return null;

  const formats: Record<string, { label: string; color: string }> = {
    ".pdf": { label: "PDF", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    ".epub": { label: "EPUB", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    ".cbz": { label: "CBZ", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    ".cbr": { label: "CBR", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    ".txt": { label: "TXT", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
    ".html": { label: "HTML", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    ".htm": { label: "HTML", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    ".docx": { label: "DOCX", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  return formats[ext] || null;
}

function FileTreeNode({
  node,
  depth = 0,
  expandedPaths,
  onToggleExpand,
  onFileClick,
  onDirectoryClick,
  searchQuery = "",
}: {
  node: FileNode;
  depth: number;
  expandedPaths: string[];
  onToggleExpand: (path: string) => void;
  onFileClick: (path: string) => void;
  onDirectoryClick?: (path: string) => void;
  searchQuery?: string;
}) {
  const isExpanded = searchQuery ? true : expandedPaths.includes(node.path);
  const badge = useMemo(() => getFormatBadge(node.path), [node.path]);

  const matchesSelf = searchQuery
    ? node.name.toLowerCase().includes(searchQuery.toLowerCase())
    : true;

  if (!node.isDirectory) {
    if (searchQuery && !matchesSelf) return null;

    return (
      <div
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--color-hover)] rounded transition-colors group cursor-pointer"
        onClick={() => onFileClick(node.path)}
      >
        <span className="w-5" />
        <span className="flex-1 truncate text-sm text-[var(--color-text)]">
          {highlightText(node.name, searchQuery)}
        </span>
        {badge && (
          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${badge.color}`}>
            {badge.label}
          </span>
        )}
      </div>
    );
  }

  const hasMatchingDescendant = searchQuery
    ? node.children?.some(child => nodeMatchesQuery(child, searchQuery))
    : true;

  if (searchQuery && !matchesSelf && !hasMatchingDescendant) {
    return null;
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--color-hover)] rounded transition-colors cursor-pointer group"
      >
        <span
          className="w-5 flex items-center justify-center p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node.path);
          }}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
        <svg className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span
          className="flex-1 truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
          onClick={() => {
            onToggleExpand(node.path);
            if (onDirectoryClick) {
              onDirectoryClick(node.path);
            }
          }}
        >
          {highlightText(node.name, searchQuery)}
        </span>
        {node.children && node.children.length > 0 && (
          <span className="text-xs text-[var(--color-text-muted)]">{node.children.length} items</span>
        )}
      </div>
      {isExpanded && node.children && (
        <div className="ml-4 border-l border-[var(--color-border)] pl-2">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              onFileClick={onFileClick}
              onDirectoryClick={onDirectoryClick}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ rootPath, onFileClick, onDirectoryChange, searchQuery = "" }: FileTreeProps) {
  const { expandedPaths, toggleExpandedPath, setCurrentRoot } = useUiStore();
  const [tree, setTree] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path: string): Promise<FileNode> => {
    const fastEntries = await listDirectory(path);
    if (fastEntries) {
      const children: FileNode[] = fastEntries.map((e) => ({
        name: e.name,
        path: e.path,
        isDirectory: e.is_directory,
        children: undefined,
        isSupported: e.is_supported,
        size: e.size,
        modified: e.modified * 1000,
      }));
      children.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      return {
        name: path.split("/").pop() || path,
        path,
        isDirectory: true,
        children,
        isSupported: false,
        size: 0,
        modified: 0,
      };
    }

    const dirEntries = await readDirectory(path);
    if (!dirEntries) {
      throw new Error("Directory reading not available in this environment");
    }
    const children: FileNode[] = [];

    for (const entry of dirEntries) {
      const fullPath = `${path}/${entry.name}`;
      const isDirectory = entry.isDirectory ?? false;
      const isSupported = !isDirectory && getFormatBadge(fullPath) !== null;

      let size = 0;
      let modified = 0;

      if (!isDirectory) {
        try {
          const fileStat = await getFileStat(fullPath);
          size = fileStat?.size ?? 0;
          const mtime = fileStat?.mtime;
          modified = mtime instanceof Date ? mtime.getTime() : (mtime ?? 0);
        } catch {
          // Ignore stat errors
        }
      }

      if (isDirectory) {
        children.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true,
          children: undefined,
          isSupported: false,
          size: 0,
          modified: 0,
        });
      } else {
        children.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false,
          isSupported,
          size,
          modified,
        });
      }
    }

    // Sort: directories first, then by name
    children.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return {
      name: path.split("/").pop() || path,
      path,
      isDirectory: true,
      children,
      isSupported: false,
      size: 0,
      modified: 0,
    };
  }, []);

  const loadRoot = useCallback(async () => {
    if (!rootPath) {
      setTree(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rootNode = await loadDirectory(rootPath);
      setTree(rootNode);
      setCurrentRoot(rootPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  }, [rootPath, loadDirectory, setCurrentRoot]);

  // Load on mount and when rootPath changes
  useEffect(() => {
    loadRoot();
  }, [loadRoot]);

  const handleToggleExpand = useCallback(async (path: string) => {
    const isExpanded = expandedPaths.includes(path);
    toggleExpandedPath(path);

    if (!isExpanded) {
      // Load children when expanding for the first time
      const node = findNode(tree, path);
      if (node && node.isDirectory && !node.children) {
        try {
          const loadedNode = await loadDirectory(path);
          const updatedTree = updateTreeWithChildren(tree, path, loadedNode.children);
          setTree(updatedTree);
        } catch (err) {
          console.error("Failed to load directory:", err);
        }
      }
    }
  }, [expandedPaths, toggleExpandedPath, tree, loadDirectory]);

  return (
    <div className="flex-1 overflow-auto p-2">
      {loading && <div className="p-4 text-center text-[var(--color-text-muted)]">Loading...</div>}
      {error && <div className="p-4 text-center text-red-500">{error}</div>}
      {tree && (
        <FileTreeNode
          node={tree}
          depth={0}
          expandedPaths={expandedPaths}
          onToggleExpand={handleToggleExpand}
          onFileClick={onFileClick}
          onDirectoryClick={onDirectoryChange}
          searchQuery={searchQuery}
        />
      )}
      {!rootPath && !loading && (
        <div className="p-8 text-center text-[var(--color-text-muted)]">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-lg font-medium mb-1">No folder opened</p>
          <p className="text-sm mb-4">Click "Open Directory" to start browsing</p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function findNode(node: FileNode | null, path: string): FileNode | null {
  if (!node) return null;
  if (node.path === path) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, path);
      if (found) return found;
    }
  }
  return null;
}

function updateTreeWithChildren(
  tree: FileNode | null,
  parentPath: string,
  children: FileNode[] | undefined
): FileNode | null {
  if (!tree) return null;
  if (tree.path === parentPath) {
    return { ...tree, children };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((child) => updateTreeWithChildren(child, parentPath, children)).filter((c): c is FileNode => c !== null),
    };
  }
  return tree;
}

// Directory picker component
export function DirectoryPicker({ onSelect }: { onSelect: (path: string) => void }) {
  const handleClick = async () => {
    const selected = await openDirectoryDialog("Select a directory containing your ebooks");
    if (selected) {
      onSelect(selected as string);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center justify-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      Open Directory
    </button>
  );
}
