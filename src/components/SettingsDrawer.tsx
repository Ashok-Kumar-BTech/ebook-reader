import { useEffect } from "react";
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
          <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">Book Settings</h3>
            <p className="text-[11px] opacity-70 truncate max-w-[180px]">
              {bookInstance?.title || "Reader Configuration"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          title="Close Settings (Esc)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Settings Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Section 1: Typography */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-3">
            Typography
          </h4>
          <div className="space-y-4">
            {/* Font Family */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <label className="text-xs font-medium block mb-2">Font Family</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["serif", "sans", "mono"] as const).map((fam) => (
                  <button
                    key={fam}
                    onClick={() => onUpdateSettings({ fontFamily: fam })}
                    className={`px-2.5 py-1.5 text-xs rounded-md border font-medium transition-colors ${
                      settings.fontFamily === fam
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                        : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                    }`}
                    style={{
                      fontFamily: fam === "serif" ? "Georgia, serif" : fam === "mono" ? "monospace" : "sans-serif"
                    }}
                  >
                    {fam === "serif" ? "Serif" : fam === "sans" ? "Sans" : "Mono"}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Font Size</label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {settings.fontSize}px
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateSettings({ fontSize: Math.max(12, settings.fontSize - 1) })}
                  className="w-7 h-7 flex items-center justify-center rounded border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold"
                  style={{ borderColor: cardBorder }}
                  title="Decrease font size (-)"
                >
                  -
                </button>
                <input
                  type="range"
                  min="12"
                  max="36"
                  value={settings.fontSize}
                  onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value, 10) })}
                  className="flex-1 accent-[var(--color-primary)] cursor-pointer h-1.5 bg-black/10 dark:bg-white/10 rounded-lg"
                />
                <button
                  onClick={() => onUpdateSettings({ fontSize: Math.min(36, settings.fontSize + 1) })}
                  className="w-7 h-7 flex items-center justify-center rounded border hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold"
                  style={{ borderColor: cardBorder }}
                  title="Increase font size (+)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Line Height */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Line Height</label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {settings.lineHeight.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                  <button
                    key={lh}
                    onClick={() => onUpdateSettings({ lineHeight: lh })}
                    className={`py-1 text-xs rounded-md border font-medium transition-colors ${
                      Math.abs(settings.lineHeight - lh) < 0.05
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                    }`}
                  >
                    {lh.toFixed(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Margins */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Page Margin</label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {settings.margin}px
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[20, 32, 48].map((m) => (
                  <button
                    key={m}
                    onClick={() => onUpdateSettings({ margin: m })}
                    className={`py-1 text-xs rounded-md border font-medium transition-colors ${
                      settings.margin === m
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                    }`}
                  >
                    {m === 20 ? "Compact" : m === 32 ? "Normal" : "Wide"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: View Mode & Themes */}
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
                  <span className="text-base mb-1">☀️</span>
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
                  <span className="text-base mb-1">📜</span>
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
                  <span className="text-base mb-1">🌙</span>
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Book Information */}
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

