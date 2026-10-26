import { useMemo } from "react";

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".epub",
  ".cbz",
  ".cbr",
  ".txt",
  ".html",
  ".htm",
  ".xhtml",
  ".docx",
]);

export function FormatBadge({ path }: { path: string }) {
  const badge = useMemo(() => getFormatBadge(path), [path]);

  if (!badge) return null;

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${badge.color}`}>
      {badge.label}
    </span>
  );
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
    ".xhtml": { label: "HTML", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    ".docx": { label: "DOCX", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  return formats[ext] || null;
}
