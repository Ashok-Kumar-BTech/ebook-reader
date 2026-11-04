import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { toAppError, AppError } from "../../src/errors/appError";
import { ErrorHost } from "../../src/components/ErrorHost";

describe("Error Handling Pipeline Integration", () => {
  it("translates native OS errors into structured AppError and renders in ErrorHost", () => {
    // 1. Simulate native permission denied error
    const nativeError = new Error("EACCES: permission denied, open '/restricted/book.pdf'");
    const appError = toAppError(nativeError);

    expect(appError).toBeInstanceOf(AppError);
    expect(appError.code).toBe("PERMISSION_DENIED");
    expect(appError.message).toBe("You don't have permission to read this file or folder.");
    expect(appError.getUserMessage().hint).toBe("Check file permissions or select the folder again.");
    expect(appError.details).toContain("EACCES");

    // 2. Render in ErrorHost component
    const onDismiss = vi.fn();
    const onAction = vi.fn();

    render(
      <ErrorHost
        error={appError}
        onDismiss={onDismiss}
        onAction={onAction}
        actionLabel="Retry Access"
      />
    );

    // Verify user-facing friendly message is shown, NOT raw stack trace
    expect(screen.getByText("You don't have permission to read this file or folder.")).toBeInTheDocument();
    expect(screen.getByText(/Check file permissions/i)).toBeInTheDocument();

    // Verify actionable button
    const actionBtn = screen.getByRole("button", { name: "Retry Access" });
    fireEvent.click(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);

    // Verify technical details toggle
    const detailsToggle = screen.getByText("Details");
    fireEvent.click(detailsToggle);
    expect(screen.getByText(/EACCES: permission denied/i)).toBeInTheDocument();

    // Verify dismiss
    const dismissBtn = screen.getByTitle("Dismiss alert");
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("translates Android SecurityException into PERMISSION_DENIED AppError", () => {
    const androidErr = new Error("java.lang.SecurityException: Permission Denial: opening provider");
    const appErr = toAppError(androidErr);

    expect(appErr.code).toBe("PERMISSION_DENIED");
  });

  it("translates file locked / busy errors into FILE_IN_USE AppError", () => {
    const lockErr = new Error("EBUSY: resource busy or locked, read");
    const appErr = toAppError(lockErr);

    expect(appErr.code).toBe("FILE_IN_USE");
    expect(appErr.message).toBe("This file is locked by another program.");
  });
});
