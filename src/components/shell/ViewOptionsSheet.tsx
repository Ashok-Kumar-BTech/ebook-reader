import { useEffect, useRef } from "react";
import { XIcon, SunIcon, MoonIcon, ColumnsIcon, RowsIcon } from "@primer/octicons-react";
import type { SortBy, SortOrder, ViewMode, AppTheme } from "../../stores/uiStore";

export interface ViewOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isCompact: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  appTheme: AppTheme;
  onSortChange: (sort: SortBy) => void;
  onSortOrderToggle: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onThemeChange: (theme: AppTheme) => void;
}

export function ViewOptionsSheet({
  isOpen,
  onClose,
  isCompact,
  sortBy,
  sortOrder,
  viewMode,
  appTheme,
  onSortChange,
  onSortOrderToggle,
  onViewModeChange,
  onThemeChange,
}: ViewOptionsSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={containerRef}
      className={`${
        isCompact
          ? "fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t p-5 shadow-2xl animate-in slide-in-from-bottom duration-200"
          : "absolute right-4 top-14 z-50 w-72 rounded-xl border p-4 shadow-xl animate-in fade-in zoom-in-95 duration-100"
      } flex flex-col gap-4 text-xs`}
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        color: "var(--color-text)",
        paddingBottom: isCompact ? "calc(1.25rem + var(--sab))" : "1rem",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        <span className="font-bold uppercase tracking-wider text-[11px] opacity-75">
          View & Display Options
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[var(--color-text-muted)] cursor-pointer"
          aria-label="Close view options"
        >
          <XIcon size={14} />
        </button>
      </div>

      {/* Sort Section */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-[11px] text-[var(--color-text-muted)]">Sort By</label>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="flex-1 px-3 py-2 text-xs border rounded-lg bg-[var(--color-background)] text-[var(--color-text)] cursor-pointer focus:outline-none"
            style={{ borderColor: "var(--color-border)" }}
          >
            <option value="name">Name</option>
            <option value="date">Date Modified</option>
            <option value="size">File Size</option>
            <option value="type">File Type</option>
          </select>

          <button
            onClick={onSortOrderToggle}
            className="px-3 py-2 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-semibold cursor-pointer"
            style={{ borderColor: "var(--color-border)" }}
            title={sortOrder === "asc" ? "Ascending" : "Descending"}
          >
            {sortOrder === "asc" ? "Asc ↑" : "Desc ↓"}
          </button>
        </div>
      </div>

      {/* View Mode Section */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-[11px] text-[var(--color-text-muted)]">Layout</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-[var(--color-primary)] text-white font-semibold shadow-xs"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]"
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <ColumnsIcon size={14} />
            <span>Grid View</span>
          </button>

          <button
            onClick={() => onViewModeChange("list")}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg border transition-all cursor-pointer ${
              viewMode === "list"
                ? "bg-[var(--color-primary)] text-white font-semibold shadow-xs"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]"
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <RowsIcon size={14} />
            <span>List View</span>
          </button>
        </div>
      </div>

      {/* Theme Section */}
      <div className="flex flex-col gap-1.5">
        <label className="font-semibold text-[11px] text-[var(--color-text-muted)]">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onThemeChange("light")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all cursor-pointer ${
              appTheme === "light"
                ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <SunIcon size={14} />
            <span>Light</span>
          </button>

          <button
            onClick={() => onThemeChange("sepia")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all cursor-pointer ${
              appTheme === "sepia"
                ? "bg-[#ecd5b3] text-[#5f4b32] border-[#cbb38d] font-semibold"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <span>📜 Sepia</span>
          </button>

          <button
            onClick={() => onThemeChange("dark")}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border transition-all cursor-pointer ${
              appTheme === "dark"
                ? "bg-gray-800 text-white border-gray-600 font-semibold"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <MoonIcon size={14} />
            <span>Dark</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isCompact) {
    return (
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex flex-col justify-end">
        {content}
      </div>
    );
  }

  return content;
}
