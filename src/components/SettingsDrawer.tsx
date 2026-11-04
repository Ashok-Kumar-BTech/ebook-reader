import { useEffect } from "react";
import { GearIcon, XIcon, SunIcon, MoonIcon, EyeIcon } from "@primer/octicons-react";
import { useBreakpoint } from "../hooks/useBreakpoint";
import type { BookSettings } from "../stores/bookStore";
import type { BookInstance } from "../types/reader";
import { getFormatInfo } from "../formats/registry";
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
  const { isCompact } = useBreakpoint();
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

  const formatInfo = bookInstance?.filePath ? getFormatInfo(bookInstance.filePath) : null;
  const supportedViews = formatInfo?.views || ['single', 'two-page', 'scroll'];
  const isSingleSupported = supportedViews.includes('single');
  const isSpreadSupported = supportedViews.includes('two-page');
  const isScrollSupported = supportedViews.includes('scroll');
  const isReflowable = formatInfo ? formatInfo.reflowable : false;

  const drawerBg = isDark ? "#182234" : isSepia ? "#f4e8ce" : "#ffffff";
  const drawerText = isDark ? "#f3f4f6" : isSepia ? "#4a3b2c" : "#111827";
  const drawerBorder = isDark ? "#283548" : isSepia ? "#dfd0b5" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : isSepia ? "rgba(0,0,0,0.03)" : "#f9fafb";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : isSepia ? "rgba(0,0,0,0.08)" : "#e5e7eb";

  const progressPercent = totalPages > 1
    ? Math.round(((currentPage - 1) / (totalPages - 1)) * 100)
    : 100;

  const drawerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`${
        isCompact
          ? "w-full max-h-[80dvh] rounded-t-2xl shadow-2xl flex flex-col border-t animate-in slide-in-from-bottom duration-200"
          : "fixed inset-y-0 right-0 z-50 w-80 sm:w-96 shadow-2xl flex flex-col border-l transition-transform duration-200 ease-out"
      }`}
      style={{
        backgroundColor: drawerBg,
        color: drawerText,
        borderColor: drawerBorder,
        paddingBottom: isCompact ? "max(1rem, var(--sab))" : undefined,
      }}
    >
      {isCompact && (
        <div className="w-10 h-1 bg-gray-400/30 rounded-full mx-auto mt-2 mb-1 flex-shrink-0" />
      )}
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
          aria-label="Close Settings"
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
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-medium">Reading View</label>
                {!isSingleSupported && !isSpreadSupported && (
                  <span className="text-[10px] opacity-60 italic">Scroll-only format</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={!isSingleSupported}
                  title={!isSingleSupported ? "This format is scroll-only and does not support single-page view." : "Single Page View"}
                  onClick={() => isSingleSupported && onUpdateSettings({ continuousScroll: false, twoPageView: false })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    !isSingleSupported
                      ? "opacity-35 cursor-not-allowed border-transparent"
                      : !settings.continuousScroll && !settings.twoPageView
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  disabled={!isSpreadSupported}
                  title={!isSpreadSupported ? "This format is scroll-only and does not support two-page spread view." : "Two-Page Spread View"}
                  onClick={() => isSpreadSupported && onUpdateSettings({ continuousScroll: false, twoPageView: true })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    !isSpreadSupported
                      ? "opacity-35 cursor-not-allowed border-transparent"
                      : !settings.continuousScroll && settings.twoPageView
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Spread
                </button>
                <button
                  type="button"
                  disabled={!isScrollSupported}
                  title={!isScrollSupported ? "Scroll view is not supported for this format." : "Continuous Scroll View"}
                  onClick={() => isScrollSupported && onUpdateSettings({ continuousScroll: true, twoPageView: false })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    !isScrollSupported
                      ? "opacity-35 cursor-not-allowed border-transparent"
                      : settings.continuousScroll
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Scroll
                </button>
              </div>
            </div>

            {/* Panel Behavior */}
            <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              <div className="flex items-center gap-1.5 mb-2">
                <EyeIcon size={12} className="opacity-70" />
                <label className="text-xs font-medium">Panel Behavior</label>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  onClick={() => onUpdateSettings({ panelMode: 'smart' })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    (settings.panelMode ?? 'smart') === 'smart'
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Smart
                </button>
                <button
                  onClick={() => onUpdateSettings({ panelMode: 'persistent' })}
                  className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                    settings.panelMode === 'persistent'
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                  }`}
                >
                  Persistent
                </button>
              </div>
              <p className="text-[10px] opacity-60 leading-snug">
                {(settings.panelMode ?? 'smart') === 'smart'
                  ? 'Panels reveal only when hovering near top or bottom edges.'
                  : 'Panels are always visible while reading.'}
              </p>
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

        {/* Section 2: Typography (Reflowable Formats) */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-3">
            Typography
          </h4>
          {isReflowable ? (
            <div className="space-y-3">
              {/* Font Size */}
              <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium">Font Size</label>
                  <span className="text-xs font-bold text-[var(--color-primary)]">{settings.fontSize ?? 16}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fontSize: Math.max(12, (settings.fontSize ?? 16) - 2) })}
                    className="flex-1 py-1.5 px-2 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                    title="Decrease font size"
                    disabled={(settings.fontSize ?? 16) <= 12}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fontSize: 16 })}
                    className="py-1.5 px-3 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 font-medium opacity-75 hover:opacity-100 transition-colors"
                    title="Reset font size to default (16px)"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ fontSize: Math.min(36, (settings.fontSize ?? 16) + 2) })}
                    className="flex-1 py-1.5 px-2 text-xs rounded border hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors"
                    title="Increase font size"
                    disabled={(settings.fontSize ?? 16) >= 36}
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Line Height */}
              <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium">Line Spacing</label>
                  <span className="text-xs opacity-75">{settings.lineHeight ?? 1.6}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Compact', val: 1.3 },
                    { label: 'Normal', val: 1.6 },
                    { label: 'Relaxed', val: 2.0 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onUpdateSettings({ lineHeight: item.val })}
                      className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                        Math.abs((settings.lineHeight ?? 1.6) - item.val) < 0.1
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Margins */}
              <div className="rounded-lg p-3 border" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium">Page Margins</label>
                  <span className="text-xs opacity-75">{settings.margin ?? 48}px</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Narrow', val: 16 },
                    { label: 'Normal', val: 48 },
                    { label: 'Wide', val: 80 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => onUpdateSettings({ margin: item.val })}
                      className={`py-1.5 text-xs rounded-md border font-medium transition-colors ${
                        (settings.margin ?? 48) === item.val
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "hover:bg-black/5 dark:hover:bg-white/5 border-transparent"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-3 border text-xs opacity-70 leading-relaxed" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
              Typography reflow (font size, margins) is not applicable for fixed-layout formats ({bookInstance?.format?.toUpperCase() || 'PDF/CBZ'}). Use Document Zoom to scale content.
            </div>
          )}
        </div>

        {/* Section 3: Book Information */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)] mb-3">
            Book Information
          </h4>
          <div className="rounded-lg p-3 border space-y-2 text-xs" style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            {typeof bookInstance?.metadata?.author === 'string' && Boolean(bookInstance.metadata.author.trim()) && (
              <div className="flex justify-between items-center">
                <span className="opacity-70">Author:</span>
                <span className="font-medium truncate max-w-[180px]">{String(bookInstance.metadata.author)}</span>
              </div>
            )}
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

  return (
    <div
      className={`fixed inset-0 z-50 ${isCompact ? "bg-black/50 backdrop-blur-xs flex flex-col justify-end" : "bg-black/25"}`}
      onClick={onClose}
    >
      {drawerContent}
    </div>
  );
}

