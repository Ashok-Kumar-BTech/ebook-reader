import { useEffect } from "react";
import { GearIcon, XIcon, SunIcon, MoonIcon } from "@primer/octicons-react";
import type { BookSettings } from "../stores/bookStore";
import type { BookInstance } from "../types/reader";
import { FormatBadge } from "./FormatBadge";

export interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BookSettings;
  onUpdateSettings: (settings: Partial<BookSettings>) => void;
  onResetSettings: () => void;
  bookInstance: BookInstance | null;
  currentPage: number;
  totalPages: number;
  theme: "light" | "dark" | "sepia";
}

export function SettingsDrawer({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
  bookInstance,
  currentPage,
  totalPages,
  theme,
}: SettingsDrawerProps) {
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

  // Theming styles
  const isDark = theme === "dark";
  const isSepia = theme === "sepia";

  const drawerBg = isDark ? "#182234" : isSepia ? "#f4e8ce" : "#ffffff";
  const drawerText = isDark ? "#f3f4f6" : isSepia ? "#4a3b2c" : "#111827";
  const drawerBorder = isDark ? "#283548" : isSepia ? "#dfd0b5" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : isSepia ? "rgba(0,0,0,0.03)" : "#f9fafb";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : isSepia ? "rgba(0,0,0,0.08)" : "#e5e7eb";

  const progressPercent = totalPages > 1
    ? Math.round(((currentPage - 1) / (totalPages - 1)) * 100)
    : 100;

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 shadow-2xl flex flex-col border-l transition-transform duration-200 ease-out"
      style={{
        backgroundColor: drawerBg,
        color: drawerText,
        borderColor: drawerBorder,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: drawerBorder }}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center">
            <GearIcon size={16} />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Book Settings</h3>
            <p className="text-[11px] opacity-70 truncate max-w-[180px]">
              {bookInstance?.title || "Reader Configuration"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center"
          title="Close Settings (Esc)"
        >
          <XIcon size={16} />
        </button>
      </div>

      {/* Settings Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Section 1: Layout & Theme */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-3">
            Layout & Theme
          </h4>
          <div className="space-y-4">
            {/* View Mode */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <label className="text-xs font-medium block mb-2">Reading View</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onUpdateSettings({ continuousScroll: false, twoPageView: false })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    !settings.continuousScroll && !settings.twoPageView
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Single
                </button>
                <button
                  onClick={() => onUpdateSettings({ continuousScroll: false, twoPageView: true })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    !settings.continuousScroll && settings.twoPageView
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Spread
                </button>
                <button
                  onClick={() => onUpdateSettings({ continuousScroll: true, twoPageView: false })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    settings.continuousScroll
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Scroll
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <label className="text-xs font-medium block mb-2">Color Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onUpdateSettings({ theme: "light" })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                    settings.theme === "light"
                      ? "ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] font-bold"
                      : "hover:scale-[1.02]"
                  }`}
                  style={{ backgroundColor: "#ffffff", color: "#111827", borderColor: "#e5e7eb" }}
                >
                  <SunIcon size={18} className="mb-1 text-amber-500" />
                  <span>Light</span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ theme: "sepia" })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                    settings.theme === "sepia"
                      ? "ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] font-bold"
                      : "hover:scale-[1.02]"
                  }`}
                  style={{ backgroundColor: "#fbf0d9", color: "#5f4b32", borderColor: "#e2d3b5" }}
                >
                  <span className="text-sm mb-1 leading-none">📜</span>
                  <span>Sepia</span>
                </button>

                <button
                  onClick={() => onUpdateSettings({ theme: "dark" })}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-medium transition-all ${
                    settings.theme === "dark"
                      ? "ring-2 ring-[var(--color-primary)] border-[var(--color-primary)] font-bold"
                      : "hover:scale-[1.02]"
                  }`}
                  style={{ backgroundColor: "#111827", color: "#f9fafb", borderColor: "#374151" }}
                >
                  <MoonIcon size={18} className="mb-1 text-blue-400" />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Book Information */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-3">
            Book Information
          </h4>
          <div className="rounded-lg p-3 border space-y-2 text-xs" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Format:</span>
              {bookInstance?.filePath && <FormatBadge path={bookInstance.filePath} />}
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">Progress:</span>
              <span className="font-medium">
                Page {currentPage} of {totalPages} ({progressPercent}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-70">File:</span>
              <span className="font-medium truncate max-w-[180px]" title={bookInstance?.filePath}>
                {bookInstance?.filePath?.split("/").pop()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div
        className="p-4 border-t flex items-center justify-between flex-shrink-0"
        style={{ borderColor: drawerBorder }}
      >
        <button
          onClick={onResetSettings}
          className="text-xs text-[var(--color-error)] hover:underline flex items-center gap-1.5 transition-colors"
          title="Reset all book settings to default"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset Defaults</span>
        </button>

        <button
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

