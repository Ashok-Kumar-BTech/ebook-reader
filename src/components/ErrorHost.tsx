import { useState } from "react";
import { AlertIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, CheckIcon, XIcon } from "@primer/octicons-react";
import { AppError } from "../errors/appError";

export interface ErrorHostProps {
  error: AppError | string | null;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function ErrorHost({ error, onDismiss, onAction, actionLabel }: ErrorHostProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const appError = error instanceof AppError ? error : new AppError("UNKNOWN", typeof error === "string" ? error : undefined);
  const userMessage = appError.getUserMessage();
  const details = appError.details || appError.message;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Error Code: ${appError.code}\nMessage: ${userMessage.message}\nHint: ${userMessage.hint || "None"}\nDetails: ${details || "None"}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  return (
    <div
      role="alert"
      className="w-full border-b px-4 py-2.5 flex flex-col gap-2 z-30 flex-shrink-0 animate-in fade-in duration-150 transition-all text-xs"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        borderColor: "rgba(239, 68, 68, 0.25)",
        color: "var(--color-text)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & Message */}
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="text-[var(--color-error)] mt-0.5 flex-shrink-0">
            <AlertIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--color-error)] leading-snug">
              {userMessage.message}
            </div>
            {userMessage.hint && (
              <div className="text-[var(--color-text-muted)] text-[11px] mt-0.5 leading-snug">
                {userMessage.hint}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions & Dismiss */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onAction && actionLabel && (
            <button
              onClick={onAction}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer shadow-xs"
            >
              {actionLabel}
            </button>
          )}

          {details && (
            <button
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: "var(--color-border)" }}
              title="Toggle error details"
            >
              <span>Details</span>
              {showDetails ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
            </button>
          )}

          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
            title="Dismiss alert"
            aria-label="Dismiss error banner"
          >
            <XIcon size={14} />
          </button>
        </div>
      </div>

      {/* Expandable Details Pane */}
      {showDetails && details && (
        <div
          className="mt-1 p-2 rounded-md font-mono text-[11px] break-all border flex flex-col gap-1.5"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between opacity-75 pb-1 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Code: {appError.code}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[10px]"
              title="Copy details to clipboard"
            >
              {copied ? <CheckIcon size={12} className="text-emerald-500" /> : <CopyIcon size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <pre className="whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-none text-[11px] leading-relaxed opacity-85 select-text">
            {details}
          </pre>
        </div>
      )}
    </div>
  );
}

