/**
 * Centralized Error Taxonomy and Definitions
 * Conforms to PRD §10 (Error Reporting) and CROSS_PLATFORM_PLAN §3.5
 */

export type AppErrorCode =
  | 'INVALID_FORMAT'
  | 'CORRUPTED_FILE'
  | 'PASSWORD_PROTECTED'
  | 'DRM_PROTECTED'
  | 'UNSUPPORTED_VERSION'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'FILE_IN_USE'
  | 'TOO_LARGE'
  | 'PARSE_FAILED'
  | 'RENDER_FAILED'
  | 'CONVERSION_FAILED'
  | 'MISSING_COMPONENT'
  | 'UNKNOWN';

export interface UserErrorInfo {
  message: string;
  hint?: string;
}

export const USER_MESSAGES: Record<AppErrorCode, UserErrorInfo> = {
  INVALID_FORMAT: {
    message: "This file isn't a supported book format.",
    hint: "Supported formats include: PDF, EPUB, CBZ, TXT, HTML, DOCX.",
  },
  CORRUPTED_FILE: {
    message: "This file appears to be damaged and can't be opened.",
    hint: "Try re-downloading or re-copying the file to your device.",
  },
  PASSWORD_PROTECTED: {
    message: "This book is password-protected and can't be opened.",
  },
  DRM_PROTECTED: {
    message: "This book is DRM-protected and isn't supported.",
  },
  UNSUPPORTED_VERSION: {
    message: "This book uses an unsupported version of the format.",
  },
  FILE_NOT_FOUND: {
    message: "This file no longer exists at its original location.",
    hint: "Reopen the folder or locate the file again.",
  },
  PERMISSION_DENIED: {
    message: "You don't have permission to read this file or folder.",
    hint: "Check file permissions or select the folder again.",
  },
  FILE_IN_USE: {
    message: "This file is locked by another program.",
    hint: "Close the other program and try again.",
  },
  TOO_LARGE: {
    message: "This file is too large to open.",
  },
  PARSE_FAILED: {
    message: "This book couldn't be read. It may be damaged.",
    hint: "Try opening another file or checking file integrity.",
  },
  RENDER_FAILED: {
    message: "This book couldn't be displayed.",
    hint: "Try switching view modes or restarting the app.",
  },
  CONVERSION_FAILED: {
    message: "This book couldn't be prepared for reading.",
  },
  MISSING_COMPONENT: {
    message: "A required component for this format or action isn't available.",
    hint: "On mobile devices, use 'Open Ebook File(s)' to select your books directly.",
  },
  UNKNOWN: {
    message: "Something went wrong while opening this book or directory.",
    hint: "Technical details are available below.",
  },
};

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly details?: string;

  constructor(code: AppErrorCode, details?: string, originalCause?: unknown) {
    const info = USER_MESSAGES[code] || USER_MESSAGES.UNKNOWN;
    super(info.message);
    this.name = "AppError";
    this.code = code;
    this.details = details || (originalCause instanceof Error ? originalCause.message : typeof originalCause === 'string' ? originalCause : undefined);

    if (originalCause instanceof Error && originalCause.stack) {
      this.stack = originalCause.stack;
    }
  }

  getUserMessage(): UserErrorInfo {
    return USER_MESSAGES[this.code] || USER_MESSAGES.UNKNOWN;
  }
}

/**
 * Maps raw system, Rust, plugin, or web errors into a structured AppError
 */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) {
    return e;
  }

  const rawMessage = e instanceof Error ? e.message : (typeof e === 'string' ? e : JSON.stringify(e));
  const lower = (rawMessage || '').toLowerCase();

  if (lower.includes('folder picker is not implemented on mobile') || lower.includes('folder picking is not supported')) {
    return new AppError('MISSING_COMPONENT', rawMessage, e);
  }

  if (lower.includes('invalid uri') || lower.includes('securityexception') || lower.includes('permission denied') || lower.includes('eacces')) {
    return new AppError('PERMISSION_DENIED', rawMessage, e);
  }

  if (lower.includes('path does not exist') || lower.includes('not found') || lower.includes('enoent') || lower.includes('file not found')) {
    return new AppError('FILE_NOT_FOUND', rawMessage, e);
  }

  if (lower.includes('drm') || lower.includes('encrypted') || lower.includes('rights management')) {
    return new AppError('DRM_PROTECTED', rawMessage, e);
  }

  if (lower.includes('password') || lower.includes('protected with a password')) {
    return new AppError('PASSWORD_PROTECTED', rawMessage, e);
  }

  if (lower.includes('corrupt') || lower.includes('damaged') || lower.includes('crc') || lower.includes('unexpected end of file')) {
    return new AppError('CORRUPTED_FILE', rawMessage, e);
  }

  if (lower.includes('too large') || lower.includes('out of memory') || lower.includes('oom') || lower.includes('allocation failed')) {
    return new AppError('TOO_LARGE', rawMessage, e);
  }

  if (lower.includes('not a supported') || lower.includes('unsupported format') || lower.includes('no compatible format')) {
    return new AppError('INVALID_FORMAT', rawMessage, e);
  }

  if (lower.includes('parse') || lower.includes('malformed')) {
    return new AppError('PARSE_FAILED', rawMessage, e);
  }

  if (lower.includes('render') || lower.includes('canvas')) {
    return new AppError('RENDER_FAILED', rawMessage, e);
  }

  return new AppError('UNKNOWN', rawMessage, e);
}

