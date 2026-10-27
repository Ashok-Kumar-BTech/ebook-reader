import { useState, useEffect } from "react";
import {
  XIcon,
  SearchIcon,
  BookmarkIcon,
  TrashIcon,
} from "@primer/octicons-react";
import type { SearchResult } from "../types/reader";
import type { Bookmark } from "../stores/bookStore";

export type SearchBookmarksTab = "search" | "bookmarks";

export interface SearchAndBookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SearchBookmarksTab;
  onTabChange: (tab: SearchBookmarksTab) => void;
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  bookmarks: Bookmark[];
  onAddBookmark: (page: number, label?: string) => void;
  onRemoveBookmark: (id: string) => void;
  theme: "light" | "dark" | "sepia";
}

export function SearchAndBookmarksDrawer({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  currentPage,
  onNavigateToPage,
  onSearch,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  theme,
}: SearchAndBookmarksDrawerProps) {
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Bookmark Input State
  const [newBookmarkLabel, setNewBookmarkLabel] = useState("");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const results = await onSearch(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddBookmarkClick = () => {
    onAddBookmark(currentPage, newBookmarkLabel.trim() || undefined);
    setNewBookmarkLabel("");
  };

  if (!isOpen) return null;

  // Theme styling
  const getThemeStyles = () => {
    switch (theme) {
      case "dark":
        return {
          bg: "#111827",
          barBg: "#1f2937",
          border: "#374151",
          text: "#f9fafb",
          textMuted: "#9ca3af",
          hover: "rgba(255, 255, 255, 0.08)",
          activeItem: "rgba(59, 130, 246, 0.2)",
        };
      case "sepia":
        return {
          bg: "#fbf0d9",
          barBg: "#f4e8ce",
          border: "#e2d3b5",
          text: "#5f4b32",
          textMuted: "#8f775c",
          hover: "rgba(95, 75, 50, 0.08)",
          activeItem: "rgba(217, 119, 6, 0.2)",
        };
      case "light":
      default:
        return {
          bg: "#ffffff",
          barBg: "#f6f6f6",
          border: "#e5e7eb",
          text: "#111827",
          textMuted: "#6b7280",
          hover: "rgba(0, 0, 0, 0.05)",
          activeItem: "rgba(59, 130, 246, 0.1)",
        };
    }
  };

  const style = getThemeStyles();

  return (
    <aside
      className="fixed inset-y-0 right-0 w-80 sm:w-96 shadow-2xl z-50 flex flex-col border-l transition-transform duration-200 ease-out select-none"
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ backgroundColor: style.barBg, borderColor: style.border }}
      >
        <span className="font-semibold text-sm">
          {activeTab === "search" ? "Search Book" : "Bookmarks"}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Close Drawer (Esc)"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Tabs Switcher: Search vs Bookmarks */}
      <div
        className="flex border-b text-xs font-semibold flex-shrink-0"
        style={{ backgroundColor: style.barBg, borderColor: style.border }}
      >
        <button
          onClick={() => onTabChange("search")}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "search"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] font-bold"
              : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <SearchIcon size={14} />
          <span>Search</span>
          {hasSearched && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
              {searchResults.length}
            </span>
          )}
        </button>

        <button
          onClick={() => onTabChange("bookmarks")}
          className={`flex-1 py-2.5 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "bookmarks"
              ? "border-[var(--color-primary)] text-[var(--color-primary)] font-bold"
              : "border-transparent opacity-70 hover:opacity-100"
          }`}
        >
          <BookmarkIcon size={14} />
          <span>Bookmarks</span>
          {bookmarks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
              {bookmarks.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* TAB 1: IN-BOOK SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search in book..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-8 text-sm rounded border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: style.border }}
                  autoFocus
                />
                <div className="absolute left-2.5 top-3 opacity-40 pointer-events-none flex items-center">
                  <SearchIcon size={14} />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 opacity-50 hover:opacity-100 flex items-center"
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 text-xs font-semibold rounded bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-40"
              >
                {isSearching ? "Searching..." : "Find"}
              </button>
            </form>

            {/* Results Output */}
            {isSearching && (
              <div className="text-center py-8" style={{ color: style.textMuted }}>
                <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Searching through book pages...</p>
              </div>
            )}

            {!isSearching && hasSearched && (
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: style.textMuted }}>
                  {searchResults.length === 0
                    ? `No matches found for "${searchQuery}"`
                    : `Found ${searchResults.length} match${searchResults.length === 1 ? "" : "es"}:`}
                </p>

                <div className="space-y-2">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        onNavigateToPage(result.location);
                        onClose();
                      }}
                      className="p-3 rounded border text-xs cursor-pointer transition-colors"
                      style={{ borderColor: style.border }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = style.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[var(--color-primary)]">
                          Page {result.location}
                        </span>
                      </div>
                      <p className="line-clamp-3 leading-relaxed opacity-90">
                        {renderHighlightedContext(result.context, result.matchedText)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSearching && !hasSearched && (
              <div className="text-center py-12" style={{ color: style.textMuted }}>
                <SearchIcon size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Search Within Book</p>
                <p className="text-xs mt-1">Enter keywords to quickly find and jump to matching passages.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BOOKMARKS */}
        {activeTab === "bookmarks" && (
          <div className="space-y-4">
            {/* Quick Add Bookmark Card */}
            <div
              className="p-3 rounded-lg border flex flex-col gap-2"
              style={{ backgroundColor: style.barBg, borderColor: style.border }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Bookmark Page {currentPage}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional label / note..."
                  value={newBookmarkLabel}
                  onChange={(e) => setNewBookmarkLabel(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  style={{ borderColor: style.border }}
                />
                <button
                  onClick={handleAddBookmarkClick}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors whitespace-nowrap"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Bookmark List */}
            {bookmarks.length === 0 ? (
              <div className="text-center py-12" style={{ color: style.textMuted }}>
                <BookmarkIcon size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No Bookmarks Saved</p>
                <p className="text-xs mt-1">Bookmark key locations to return to them anytime.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.id}
                    className="p-3 rounded-lg border flex items-center justify-between text-xs transition-colors group cursor-pointer"
                    style={{ borderColor: style.border }}
                    onClick={() => {
                      const pageNum = typeof bm.location === "number" ? bm.location : parseInt(bm.location, 10);
                      if (!isNaN(pageNum)) {
                        onNavigateToPage(pageNum);
                        onClose();
                      }
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = style.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-[var(--color-primary)] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 whitespace-nowrap">
                        p. {bm.location}
                      </span>
                      <div className="truncate min-w-0">
                        <p className="font-medium truncate">{bm.label || `Page ${bm.location}`}</p>
                        <p className="text-[10px] opacity-60">
                          {new Date(bm.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBookmark(bm.id);
                      }}
                      className="p-1 rounded opacity-50 hover:opacity-100 hover:text-red-500 transition-colors ml-2 flex items-center"
                      title="Delete bookmark"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

// Highlight matched search snippet
function renderHighlightedContext(context: string, query: string) {
  if (!query) return context;
  const parts = context.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
