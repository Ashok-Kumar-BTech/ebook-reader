import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LogViewer } from "../../../src/components/LogViewer";
import { memoryTransport } from "../../../src/utils/logger/transports/memory";
import type { LogEntry } from "../../../src/utils/logger/types";

describe("LogViewer Component", () => {
  beforeEach(() => {
    memoryTransport.clear();
  });

  const pushEntry = (level: LogEntry["level"], logger: string, message: string) => {
    memoryTransport.write({
      timestamp: new Date().toISOString(),
      level,
      logger,
      message,
    });
  };

  it("does not render into the DOM when isOpen is false", () => {
    render(<LogViewer isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("log-viewer-modal")).not.toBeInTheDocument();
  });

  it("renders live logs from memoryTransport when isOpen is true", () => {
    pushEntry("info", "test-logger", "Initial startup log");
    pushEntry("warn", "fs-logger", "File not found warning");

    render(<LogViewer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId("log-viewer-modal")).toBeInTheDocument();
    expect(screen.getByText("Initial startup log")).toBeInTheDocument();
    expect(screen.getByText("File not found warning")).toBeInTheDocument();
  });

  it("filters log entries by level when level buttons are clicked", () => {
    pushEntry("info", "app", "Info message");
    pushEntry("warn", "app", "Warning message");
    pushEntry("error", "app", "Error message");

    render(<LogViewer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Info message")).toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toBeInTheDocument();

    // Click WARN filter
    fireEvent.click(screen.getByTestId("filter-warn"));

    expect(screen.queryByText("Info message")).not.toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.queryByText("Error message")).not.toBeInTheDocument();

    // Click ALL to restore
    fireEvent.click(screen.getByTestId("filter-all"));
    expect(screen.getByText("Info message")).toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("Error message")).toBeInTheDocument();
  });

  it("filters log entries by search query", () => {
    pushEntry("info", "network", "Connected to host");
    pushEntry("info", "database", "Database migrated");

    render(<LogViewer isOpen={true} onClose={vi.fn()} />);

    const searchInput = screen.getByTestId("log-search-input");
    fireEvent.change(searchInput, { target: { value: "database" } });

    expect(screen.queryByText("Connected to host")).not.toBeInTheDocument();
    expect(screen.getByText("Database migrated")).toBeInTheDocument();
  });

  it("clears all logs when Clear button is clicked", () => {
    pushEntry("info", "app", "Log to clear");
    render(<LogViewer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Log to clear")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear"));

    expect(screen.queryByText("Log to clear")).not.toBeInTheDocument();
    expect(screen.getByText("No logs in memory buffer yet")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const onClose = vi.fn();
    render(<LogViewer isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Close Log Console"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<LogViewer isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

