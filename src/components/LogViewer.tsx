/**
 * LogViewer - In-app structured RFC-5424 log console
 * Connects directly to memoryTransport for real-time live log inspection in all builds.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { LogEntry, LogLevel } from '../utils/logger';
import { memoryTransport } from '../utils/logger/transports/memory';

export interface LogViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: '#9ca3af',
  debug: '#06b6d4',
  info: '#22c55e',
  warn: '#f59e0b',
  error: '#ef4444',
  fatal: '#d946ef',
};

function LogEntryComponent({
  log,
  isSelected,
  onClick,
}: {
  log: LogEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const time =
    new Date(log.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) +
    '.' +
    new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0');

  return (
    <div
      onClick={onClick}
      data-testid="log-entry"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        borderRadius: '4px',
        backgroundColor: isSelected ? 'var(--color-primary)' + '20' : 'transparent',
        border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'monospace',
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', minWidth: '78px', flexShrink: 0 }}>
        {time}
      </span>
      <span
        style={{
          color: LEVEL_COLORS[log.level] || '#22c55e',
          fontWeight: 700,
          minWidth: '50px',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        {log.level}
      </span>
      <span
        style={{
          color: 'var(--color-text-muted)',
          minWidth: '110px',
          maxWidth: '140px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
        title={log.logger}
      >
        [{log.logger}]
      </span>
      <span
        style={{
          color: 'var(--color-text)',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={log.message}
      >
        {log.message}
      </span>
      {log.durationMs !== undefined && (
        <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>
          {log.durationMs}ms
        </span>
      )}
      {log.error && (
        <span style={{ color: '#ef4444', fontWeight: 600, flexShrink: 0 }}>[ERR]</span>
      )}
    </div>
  );
}

export function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>(() => memoryTransport.getEntries());
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const isDev = Boolean(import.meta.env?.DEV);

  // Subscribe to live memory transport logs
  useEffect(() => {
    if (!isOpen) return;

    setLogs(memoryTransport.getEntries());

    const unsubscribe = memoryTransport.subscribe((newEntry) => {
      setLogs((prev) => {
        const next = [...prev, newEntry];
        if (next.length > 500) {
          return next.slice(next.length - 500);
        }
        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter logs by level and search query
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterLevel !== 'all') {
      result = result.filter((log) => log.level === filterLevel);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((log) => {
        const msg = log.message.toLowerCase();
        const loggerName = log.logger.toLowerCase();
        const ctx = log.context ? JSON.stringify(log.context).toLowerCase() : '';
        const err = log.error ? JSON.stringify(log.error).toLowerCase() : '';
        return msg.includes(q) || loggerName.includes(q) || ctx.includes(q) || err.includes(q);
      });
    }

    return result;
  }, [logs, filterLevel, searchQuery]);

  // Auto-scroll on new entries
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const handleClear = useCallback(() => {
    memoryTransport.clear();
    setLogs([]);
    setSelectedLog(null);
  }, []);

  const handleCopySelected = useCallback(async () => {
    if (!selectedLog) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, [selectedLog]);

  const handleCopyAll = useCallback(async () => {
    if (filteredLogs.length === 0) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(filteredLogs, null, 2));
      setCopyFeedback('All copied!');
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback('Copy failed');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  }, [filteredLogs]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="In-App Log Console"
      data-testid="log-viewer-modal"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '420px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '2px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        boxShadow: '0 -8px 30px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-background)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text)' }}>
            Log Console
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              backgroundColor: isDev ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)',
              color: isDev ? '#f59e0b' : '#22c55e',
              border: `1px solid ${isDev ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
            }}
          >
            {isDev ? 'DEV' : 'RELEASE'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {logs.length} events {filteredLogs.length !== logs.length ? `(${filteredLogs.length} filtered)` : ''}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {copyFeedback && (
            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
              {copyFeedback}
            </span>
          )}
          <button
            onClick={handleCopyAll}
            title="Copy filtered logs as JSON"
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Copy All
          </button>
          <button
            onClick={handleClear}
            title="Clear memory log buffer"
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <label
            style={{
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button
            onClick={onClose}
            aria-label="Close Log Console"
            style={{
              padding: '3px 8px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '6px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <input
          type="text"
          placeholder="Filter logs by message, logger, or context..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="log-search-input"
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'nowrap' }}>
          {(['all', 'trace', 'debug', 'info', 'warn', 'error'] as const).map((level) => {
            const isSelected = filterLevel === level;
            return (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                data-testid={`filter-${level}`}
                style={{
                  padding: '3px 7px',
                  fontSize: '10px',
                  borderRadius: '3px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected ? '1px solid transparent' : '1px solid var(--color-border)',
                  backgroundColor: isSelected
                    ? level === 'all'
                      ? 'var(--color-primary)'
                      : LEVEL_COLORS[level as LogLevel]
                    : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Body: Log List & Detail Panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Log List View */}
        <div
          ref={logContainerRef}
          data-testid="log-list-container"
          style={{
            flex: selectedLog ? 0.6 : 1,
            overflowY: 'auto',
            padding: '4px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                padding: '40px',
                fontSize: '12px',
              }}
            >
              {logs.length === 0 ? 'No logs in memory buffer yet' : 'No logs match current filter'}
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <LogEntryComponent
                key={index}
                log={log}
                isSelected={selectedLog === log}
                onClick={() => setSelectedLog(selectedLog === log ? null : log)}
              />
            ))
          )}
        </div>

        {/* Selected Log JSON Details Side Panel */}
        {selectedLog && (
          <div
            data-testid="log-detail-panel"
            style={{
              flex: 0.4,
              borderLeft: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: '6px 12px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text)' }}>
                Entry Details
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleCopySelected}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    borderRadius: '3px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            <pre
              style={{
                flex: 1,
                margin: 0,
                padding: '8px 12px',
                overflow: 'auto',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'var(--color-text)',
                lineHeight: 1.4,
              }}
            >
              {JSON.stringify(selectedLog, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
