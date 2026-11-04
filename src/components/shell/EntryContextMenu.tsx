import { useEffect, useState } from "react";
import {
  BookIcon,
  FileDirectoryFillIcon,
  FileDirectoryIcon,
  CopyIcon,
  CheckIcon,
  CheckCircleIcon,
  CheckCircleFillIcon,
  XIcon,
} from "@primer/octicons-react";

export interface ContextMenuEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isSupported?: boolean;
}

export interface EntryContextMenuProps {
  x: number;
  y: number;
  entry: ContextMenuEntry;
  onClose: () => void;
  onOpen: () => void;
  onRevealInOS?: () => void;
  isCompleted?: boolean;
  onToggleCompleted?: () => void;
  isCompact?: boolean;
}

export function EntryContextMenu({
  x,
  y,
  entry,
  onClose,
  onOpen,
  onRevealInOS,
  isCompleted,
  onToggleCompleted,
  isCompact,
}: EntryContextMenuProps) {
  const [copied, setCopied] = useState(false);
  const isMobile = isCompact ?? (typeof window !== "undefined" && window.innerWidth < 640);

  // Accessibility: Escape key closes the menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(entry.path);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 600);
  };

  // Keep desktop floating menu safely inside viewport bounds
  const adjustedX = Math.max(12, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 800) - 220));
  const adjustedY = Math.max(12, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 600) - 200));

  return (
    <>
      {/* Full-screen backdrop to safely dismiss without event bubbling race conditions */}
      <div
        data-testid="context-menu-backdrop"
        className={`fixed inset-0 z-40 ${isMobile ? "bg-black/40 backdrop-blur-xs" : "bg-transparent"}`}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Menu Container: Slide-up Bottom Sheet on Mobile, Positioned Popup on Desktop */}
      <div
        role="menu"
        aria-label="Entry Actions"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={isMobile ? undefined : { left: `${adjustedX}px`, top: `${adjustedY}px` }}
        className={`fixed z-50 select-none ${
          isMobile
            ? "left-0 right-0 bottom-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-2xl shadow-2xl p-4 pb-8 text-sm text-[var(--color-text)] animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto"
            : "min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl py-1.5 text-xs text-[var(--color-text)] animate-in fade-in zoom-in-95 duration-100"
        }`}
      >
        {/* Mobile handle indicator */}
        {isMobile && (
          <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3 opacity-60" />
        )}

        {/* Title Header */}
        <div className={`font-semibold opacity-70 truncate border-b border-[var(--color-border)] ${
          isMobile ? "px-2 pb-3 mb-2 text-base" : "px-3 py-1 text-[11px] mb-1 max-w-[220px]"
        }`}>
          {entry.name}
        </div>

        {/* Open Action */}
        <button
          onClick={() => {
            onOpen();
            onClose();
          }}
          className={`w-full text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors active:scale-[0.99] rounded-lg ${
            isMobile ? "px-3 py-3 text-sm" : "px-3 py-2 text-xs"
          }`}
        >
          {entry.isDirectory ? (
            <FileDirectoryFillIcon size={isMobile ? 18 : 14} className="text-[var(--color-primary)]" />
          ) : (
            <BookIcon size={isMobile ? 18 : 14} />
          )}
          <span>{entry.isDirectory ? "Open Folder" : "Open Book"}</span>
        </button>

        {/* Completed / Not Completed Toggle Action (Books Only) */}
        {!entry.isDirectory && onToggleCompleted && (
          <button
            onClick={() => {
              onToggleCompleted();
              onClose();
            }}
            className={`w-full text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between transition-colors active:scale-[0.99] rounded-lg ${
              isMobile ? "px-3 py-3 text-sm" : "px-3 py-2 text-xs"
            }`}
            title={isCompleted ? "Mark as Not Completed" : "Mark as Completed"}
          >
            <div className="flex items-center gap-3">
              {isCompleted ? (
                <CheckCircleFillIcon size={isMobile ? 18 : 14} className="text-emerald-500" />
              ) : (
                <CheckCircleIcon size={isMobile ? 18 : 14} className="opacity-70" />
              )}
              <span className={isCompleted ? "text-emerald-500 font-medium" : ""}>
                {isCompleted ? "Completed" : "Not Completed"}
              </span>
            </div>
            <span className="text-[10px] opacity-40 ml-2">
              {isCompleted ? "Done" : "Mark read"}
            </span>
          </button>
        )}

        {/* Reveal in OS File Manager (Desktop only) */}
        {onRevealInOS && (
          <button
            onClick={() => {
              onRevealInOS();
              onClose();
            }}
            className={`w-full text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors active:scale-[0.99] rounded-lg ${
              isMobile ? "px-3 py-3 text-sm" : "px-3 py-2 text-xs"
            }`}
          >
            <FileDirectoryIcon size={isMobile ? 18 : 14} className="opacity-70" />
            <span>Reveal in File Manager</span>
          </button>
        )}

        {/* Copy Path Action */}
        <button
          onClick={handleCopy}
          className={`w-full text-left hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-3 transition-colors active:scale-[0.99] rounded-lg ${
            isMobile ? "px-3 py-3 text-sm" : "px-3 py-2 text-xs"
          }`}
        >
          {copied ? (
            <CheckIcon size={isMobile ? 18 : 14} className="text-emerald-500" />
          ) : (
            <CopyIcon size={isMobile ? 18 : 14} className="opacity-70" />
          )}
          <span>{copied ? "Copied Path!" : "Copy Path"}</span>
        </button>

        {/* Mobile Cancel Button */}
        {isMobile && (
          <div className="mt-3 pt-2 border-t border-[var(--color-border)]">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-black/5 dark:bg-white/5 font-semibold text-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <XIcon size={16} />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
