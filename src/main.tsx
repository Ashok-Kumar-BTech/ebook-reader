import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { logManager, loggerConfig, initializeLoggerWithTauri } from "./utils/logger";
import "./App.css";

// Initialize logger early
logManager.initialize(loggerConfig);

// Initialize Tauri transports if available
if (typeof window !== 'undefined') {
  initializeLoggerWithTauri().catch(err => {
    console.warn('[Logger] Tauri initialization failed:', err);
  });
}

// Global error handlers
window.addEventListener('error', (event) => {
  logManager.error('UNCAUGHT_ERROR', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  }, event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  logManager.error('UNHANDLED_REJECTION', {
    reason: String(event.reason),
  }, event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
