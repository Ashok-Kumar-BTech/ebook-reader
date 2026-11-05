import { describe, it, expect } from "vitest";
import { AppError, toAppError, USER_MESSAGES, type AppErrorCode } from "../../src/errors/appError";

describe("AppError and Error Taxonomy", () => {
  it("defines messages for all 14 taxonomy codes", () => {
    const codes: AppErrorCode[] = [
      "INVALID_FORMAT",
      "CORRUPTED_FILE",
      "PASSWORD_PROTECTED",
      "DRM_PROTECTED",
      "UNSUPPORTED_VERSION",
      "FILE_NOT_FOUND",
      "PERMISSION_DENIED",
      "FILE_IN_USE",
      "TOO_LARGE",
      "PARSE_FAILED",
      "RENDER_FAILED",
      "CONVERSION_FAILED",
      "MISSING_COMPONENT",
      "UNKNOWN",
    ];

    expect(codes).toHaveLength(14);
    for (const code of codes) {
      expect(USER_MESSAGES[code]).toBeDefined();
      expect(USER_MESSAGES[code].message.length).toBeGreaterThan(5);
    }
  });

  it("constructs AppError with code, message, and details", () => {
    const err = new AppError("CORRUPTED_FILE", "Invalid ZIP header at byte 0x44");
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("CORRUPTED_FILE");
    expect(err.message).toBe("This file appears to be damaged and can't be opened.");
    expect(err.details).toBe("Invalid ZIP header at byte 0x44");
    expect(err.getUserMessage().hint).toBeDefined();
  });

  describe("toAppError mapping", () => {
    it("returns the error untouched if already an AppError", () => {
      const original = new AppError("FILE_IN_USE", "Lock held by PID 1234");
      const mapped = toAppError(original);
      expect(mapped).toBe(original);
    });

    it("maps permission errors correctly (SecurityException, EACCES)", () => {
      const e1 = new Error("java.lang.SecurityException: Permission Denial");
      expect(toAppError(e1).code).toBe("PERMISSION_DENIED");

      const e2 = new Error("open failed: EACCES (Permission denied)");
      expect(toAppError(e2).code).toBe("PERMISSION_DENIED");
    });

    it("maps missing file errors (ENOENT, not found)", () => {
      const e = new Error("ENOENT: no such file or directory, open 'D:\\book.epub'");
      expect(toAppError(e).code).toBe("FILE_NOT_FOUND");
    });

    it("maps DRM / encryption errors", () => {
      const e = new Error("Adobe ADEPT DRM is not supported");
      expect(toAppError(e).code).toBe("DRM_PROTECTED");
    });

    it("maps password errors", () => {
      const e = new Error("PDF is protected with a password");
      expect(toAppError(e).code).toBe("PASSWORD_PROTECTED");
    });

    it("maps corrupted archive errors", () => {
      const e = new Error("unexpected end of file while extracting EPUB");
      expect(toAppError(e).code).toBe("CORRUPTED_FILE");
    });

    it("maps out-of-memory / too large errors", () => {
      const e = new Error("Canvas allocation failed: out of memory");
      expect(toAppError(e).code).toBe("TOO_LARGE");
    });

    it("maps mobile missing picker component gracefully", () => {
      const e = new Error("Folder picker is not implemented on mobile");
      expect(toAppError(e).code).toBe("MISSING_COMPONENT");
    });

    it("falls back to UNKNOWN for unrecognized errors", () => {
      const e = new Error("Something strange happened in the matrix");
      const appErr = toAppError(e);
      expect(appErr.code).toBe("UNKNOWN");
      expect(appErr.details).toBe("Something strange happened in the matrix");
    });

    it("handles non-Error objects and strings safely", () => {
      expect(toAppError("Random string failure").code).toBe("UNKNOWN");
      expect(toAppError({ code: 500, detail: "Server error" }).code).toBe("UNKNOWN");
      expect(toAppError(null).code).toBe("UNKNOWN");
      expect(toAppError(undefined).code).toBe("UNKNOWN");
    });
  });
});

