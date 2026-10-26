/**
 * LogViewer - In-app log viewer for debugging (dev only)
 */

import { useState, useMemo, useRef } from 'react';
import type { LogEntry, LogLevel } from '../utils/logger';

interface LogViewerProps {
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

function LogEntryComponent({ log, isSelected, onClick }: { log: LogEntry; isSelected: boolean; onClick: () => void }) {
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + "." + new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0');
  
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 10px',
        borderRadius: '4px',
        backgroundColor: isSelected ? 'var(--color-primary)' + '20' : 'transparent',
        border: isSelected ? '1px solid var(--color-primary)' : 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', minWidth: '80px' }}>{time}</span>
      <span
        style={{
          color: LEVEL_COLORS[log.level],
          fontSize: '11px',
          fontWeight: 600,
          minWidth: '50px',
          textTransform: 'uppercase',
        }}
      >
        {log.level}
      </span>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', minWidth: '120px' }}>{log.logger}</span>
      <span style={{ color: 'var(--color-text)', fontSize: '12px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {log.message}
      </span>
      {log.durationMs !== undefined && (
        <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
          {log.durationMs}ms
        </span>
      )}
    </div>
  );
}
export function LogViewer({ isOpen, onClose }: LogViewerProps) {
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  const isDev = import.meta.env.DEV;
  
  const sampleLogs = useMemo((): LogEntry[] => {
    if (!isDev) return [];
    return [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        logger: 'app',
        message: 'Application started',
        context: { version: '0.1.0', env: 'development' },
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        logger: 'component:App',
        message: 'MOUNT',
        context: { component: 'App' },
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        logger: 'store:uiStore',
        message: 'STATE_CHANGE',
        context: { action: 'setTheme', diff: { appTheme: { from: 'dark', to: 'sepia' } } },
      },
      {
        timestamp: new Date().toISOString(),
        level: 'warn',
        logger: 'tauriApi',
        message: 'Tauri API call failed',
        context: { api: 'dialog.openDirectory' },
        error: { name: 'Error', message: 'Not in Tauri environment' },
      },
    ];
  }, [isDev]);

  const filteredLogs = useMemo(() => {
    let result = sampleLogs;

    if (filterLevel !== 'all') {
      result = result.filter(log => log.level === filterLevel);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.logger.toLowerCase().includes(query) ||
        JSON.stringify(log.context).toLowerCase().includes(query)
      );
    }

    return result;
  }, [sampleLogs, filterLevel, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '400px',
        backgroundColor: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Log Viewer (Dev)</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {sampleLogs.length} logs | {filteredLogs.length} filtered
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button onClick={onClose} style={{ padding: '4px 8px', fontSize: '11px' }}>✕</button>
        </div>
      </div>
      
      {/* Filters */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '6px 10px',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'var(--color-background)',
            color: 'var(--color-text)',
            fontSize: '12px',
          }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'].map(level => (
            <button
              key={level}
              onClick={() => setFilterLevel(level as LogLevel | 'all')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                backgroundColor: filterLevel === level ? LEVEL_COLORS[level as LogLevel] : 'var(--color-background)',
                color: filterLevel === level ? 'white' : 'var(--color-text)',
              }}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      
      {/* Log List */}
      <div
        ref={logContainerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px' }}>
            No logs to display
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredLogs.map((log, index) => (
              <LogEntryComponent
                key={index}
                log={log}
                isSelected={selectedLog === log}
                onClick={() => setSelectedLog(log)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Detail Panel */}
      {selectedLog && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '12px',
            maxHeight: '300px',
            overflow: 'auto',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong>Log Details</strong>
            <button onClick={() => setSelectedLog(null)} style={{ fontSize: '12px' }}>Close</button>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: '11px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: 'var(--color-text)',
            }}
          >
            {JSON.stringify(selectedLog, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
