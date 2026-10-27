import { useState, useEffect } from "react";
import { XIcon, BookIcon, ChevronRightIcon } from "@primer/octicons-react";
import type { TOCItem } from "../types/reader";

export interface TableOfContentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  toc: TOCItem[];
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  theme: "light" | "dark" | "sepia";
}

export function TableOfContentsDrawer({
  isOpen,
  onClose,
  toc,
  currentPage,
  onNavigateToPage,
  theme,
}: TableOfContentsDrawerProps) {
  // Filter/Search within TOC
  const [filterQuery, setFilterQuery] = useState("");

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

  // Filter TOC items if search query provided
  const filterTOC = (items: TOCItem[], query: string): TOCItem[] => {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();

    return items.reduce<TOCItem[]>((acc, item) => {
      const matchesSelf = item.label.toLowerCase().includes(lowerQuery);
      const filteredChildren = item.children ? filterTOC(item.children, query) : [];

      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...item,
          children: filteredChildren.length > 0 ? filteredChildren : item.children,
        });
      }
      return acc;
    }, []);
  };

  const displayTOC = filterTOC(toc, filterQuery);

  return (
    <aside
      className="fixed inset-y-0 left-0 w-80 sm:w-96 shadow-2xl z-50 flex flex-col border-r transition-transform duration-200 ease-out select-none"
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      {/* Drawer Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ backgroundColor: style.barBg, borderColor: style.border }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center">
            <BookIcon size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Table of Contents</h3>
            <p className="text-[11px] opacity-70">
              {toc.length > 0 ? `${toc.length} chapters / sections` : "Outline navigation"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Close Table of Contents (Esc)"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Filter input if TOC is large */}
      {toc.length > 8 && (
        <div
          className="px-3 py-2 border-b flex-shrink-0"
          style={{ backgroundColor: style.barBg, borderColor: style.border }}
        >
          <input
            type="text"
            placeholder="Filter chapters..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            style={{ borderColor: style.border }}
          />
        </div>
      )}

      {/* TOC Items Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {displayTOC.length === 0 ? (
          <div className="text-center py-16" style={{ color: style.textMuted }}>
            <BookIcon size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {filterQuery ? "No matching chapters" : "No Table of Contents"}
            </p>
            <p className="text-xs mt-1">
              {filterQuery
                ? `No chapters match "${filterQuery}"`
                : "This document does not contain outline markers."}
            </p>
          </div>
        ) : (
          displayTOC.map((item) => (
            <TOCNodeItem
              key={item.id}
              item={item}
              currentPage={currentPage}
              onNavigate={(page) => {
                onNavigateToPage(page);
                onClose();
              }}
              themeStyle={style}
            />
          ))
        )}
      </div>
    </aside>
  );
}

// Hierarchical TOC Tree Node Component
function TOCNodeItem({
  item,
  currentPage,
  onNavigate,
  themeStyle,
}: {
  item: TOCItem;
  currentPage: number;
  onNavigate: (page: number) => void;
  themeStyle: { hover: string; activeItem: string; border: string; textMuted: string };
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isCurrent = currentPage === item.location;

  return (
    <div className="text-xs">
      <div
        className="flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors"
        style={{
          paddingLeft: `${Math.max(8, item.level * 16 + 8)}px`,
          backgroundColor: isCurrent ? themeStyle.activeItem : "transparent",
        }}
        onClick={() => onNavigate(item.location)}
        onMouseEnter={(e) => {
          if (!isCurrent) e.currentTarget.style.backgroundColor = themeStyle.hover;
        }}
        onMouseLeave={(e) => {
          if (!isCurrent) e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="p-0.5 rounded opacity-60 hover:opacity-100 flex-shrink-0 flex items-center"
            >
              <ChevronRightIcon
                size={12}
                className={`transform transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          {!hasChildren && <span className="w-3.5 flex-shrink-0" />}
          <span className={`truncate ${isCurrent ? "font-bold text-[var(--color-primary)]" : ""}`}>
            {item.label}
          </span>
        </div>

        {item.location > 0 && (
          <span className="text-[10px] ml-2 flex-shrink-0" style={{ color: themeStyle.textMuted }}>
            {item.location}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="space-y-0.5">
          {item.children!.map((child) => (
            <TOCNodeItem
              key={child.id}
              item={child}
              currentPage={currentPage}
              onNavigate={onNavigate}
              themeStyle={themeStyle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
