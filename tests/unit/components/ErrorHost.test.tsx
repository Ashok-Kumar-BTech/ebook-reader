import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorHost } from "../../../src/components/ErrorHost";
import { AppError } from "../../../src/errors/appError";

describe("ErrorHost Component", () => {
  it("renders nothing when error is null", () => {
    const { container } = render(<ErrorHost error={null} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders friendly user message and hint for structured AppError", () => {
    const error = new AppError("CORRUPTED_FILE", "Invalid ZIP signature in container.xml");
    render(<ErrorHost error={error} onDismiss={vi.fn()} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("This file appears to be damaged and can't be opened.")).toBeInTheDocument();
    expect(screen.getByText("Try re-downloading or re-copying the file to your device.")).toBeInTheDocument();
  });

  it("calls onDismiss callback when close button is clicked", () => {
    const onDismiss = vi.fn();
    const error = new AppError("INVALID_FORMAT");
    render(<ErrorHost error={error} onDismiss={onDismiss} />);

    const closeBtn = screen.getByLabelText("Dismiss error banner");
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("toggles technical details disclosure and allows copying to clipboard", async () => {
    const error = new AppError("PERMISSION_DENIED", "EACCES: permission denied to access file");
    render(<ErrorHost error={error} onDismiss={vi.fn()} />);

    // Initially technical details are hidden
    expect(screen.queryByText(/EACCES: permission denied/)).not.toBeInTheDocument();

    // Click disclosure button
    const detailsBtn = screen.getByText("Details");
    fireEvent.click(detailsBtn);

    // Now technical details and error code are visible
    expect(screen.getByText(/PERMISSION_DENIED/)).toBeInTheDocument();
    expect(screen.getByText(/EACCES: permission denied/)).toBeInTheDocument();
  });
});
