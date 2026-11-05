import { checkIsTauri } from "./tauriApi";
import { logManager } from "./logger";

const logger = logManager.getLogger("BackNavigation");

export type BackHandlerFn = () => boolean;

interface RegisteredHandler {
  id: number;
  handler: BackHandlerFn;
  priority: number;
}

let nextHandlerId = 1;
const handlers: RegisteredHandler[] = [];
let lastExitPressTime = 0;
const EXIT_GUARD_WINDOW_MS = 2000;

/**
 * Registers a back navigation handler into the global back stack.
 *
 * @param handler Function returning `true` if it consumed the back event, `false` otherwise.
 * @param priority Higher priority handlers are invoked first. Defaults to 0.
 * @returns An unregister function to remove the handler on component unmount.
 */
export function registerBackHandler(handler: BackHandlerFn, priority = 0): () => void {
  const item: RegisteredHandler = {
    id: nextHandlerId++,
    handler,
    priority,
  };
  handlers.push(item);

  return () => {
    const idx = handlers.findIndex((h) => h.id === item.id);
    if (idx !== -1) {
      handlers.splice(idx, 1);
    }
  };
}

/**
 * Dispatches a back action down the registered handler stack.
 * Handlers are evaluated in descending order of priority, with LIFO tie-breaking.
 *
 * @returns `true` if any handler consumed the back action, `false` if the stack is exhausted (root reached).
 */
export function dispatchBackNavigation(): boolean {
  // Check any legacy window.__handleAndroidBack first if registered and not empty
  if (typeof (window as any).__handleAndroidBack === "function") {
    try {
      const handled = (window as any).__handleAndroidBack();
      if (handled) {
        logger.debug("BACK_HANDLED_BY_LEGACY_HOOK");
        lastExitPressTime = 0;
        return true;
      }
    } catch (err) {
      logger.error("LEGACY_BACK_HANDLER_ERROR", { error: String(err) });
    }
  }

  // Sort by priority descending, then insertion index descending (LIFO)
  const sorted = [...handlers].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return b.id - a.id;
  });

  for (const item of sorted) {
    try {
      const consumed = item.handler();
      if (consumed) {
        logger.debug("BACK_ACTION_CONSUMED", { id: item.id, priority: item.priority });
        lastExitPressTime = 0;
        return true;
      }
    } catch (err) {
      logger.error("BACK_HANDLER_EXECUTION_FAILED", { id: item.id, error: String(err) });
    }
  }

  logger.debug("BACK_STACK_EXHAUSTED_AT_ROOT");
  return false;
}

/**
 * Handles a platform back button or gesture event with the double-back exit guard.
 *
 * @param onExitPrompt Callback triggered when user is at the root and needs to press back again to exit.
 * @param exitFn Optional custom exit runner for testing or custom termination.
 */
export async function handlePlatformBackAction(
  onExitPrompt?: () => void,
  exitFn?: (code: number) => Promise<void>
): Promise<boolean> {
  const handled = dispatchBackNavigation();
  if (handled) {
    return true;
  }

  const now = Date.now();
  if (now - lastExitPressTime < EXIT_GUARD_WINDOW_MS) {
    logger.info("DOUBLE_BACK_EXIT_TRIGGERED");
    lastExitPressTime = 0;

    if (exitFn) {
      await exitFn(0);
      return false;
    }

    try {
      const { exit } = await import("@tauri-apps/api/app");
      await exit(0);
    } catch (err) {
      logger.warn("TAURI_EXIT_CALL_FAILED", { error: String(err) });
    }
    return false;
  }

  // First press at root: trigger exit prompt toast
  lastExitPressTime = now;
  logger.info("ROOT_EXIT_PROMPT_TRIGGERED");
  if (onExitPrompt) {
    onExitPrompt();
  }
  return false;
}

export interface PlatformBackNavigationOptions {
  onExitPrompt?: () => void;
  enableTouchFallback?: boolean;
}

/**
 * Initializes the native platform back button & gesture listener on Android/Tauri,
 * and attaches an in-app edge-swipe gesture listener for touch devices.
 *
 * @returns Cleanup function to unregister all listeners.
 */
export async function initPlatformBackNavigation(
  options?: PlatformBackNavigationOptions
): Promise<() => void> {
  const cleanups: (() => void)[] = [];

  const inTauri = await checkIsTauri();
  if (inTauri) {
    try {
      const { onBackButtonPress } = await import("@tauri-apps/api/app");
      const unlisten = await onBackButtonPress(async () => {
        logger.debug("NATIVE_BACK_BUTTON_EVENT_RECEIVED");
        await handlePlatformBackAction(options?.onExitPrompt);
      });
      cleanups.push(() => {
        if (typeof unlisten?.unregister === "function") {
          unlisten.unregister();
        } else if (typeof unlisten === "function") {
          (unlisten as any)();
        }
      });
      logger.info("NATIVE_BACK_LISTENER_REGISTERED");
    } catch (err) {
      logger.warn("FAILED_TO_REGISTER_NATIVE_BACK_LISTENER", { error: String(err) });
    }
  }

  // In-app touch edge swipe fallback for mobile/tablet touch screens
  if (typeof window !== "undefined" && (options?.enableTouchFallback ?? true)) {
    let touchStartX = 0;
    let touchStartY = 0;
    let isFromEdge = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      const width = window.innerWidth;
      // Started within 28px of left or right edge
      isFromEdge = touchStartX <= 28 || touchStartX >= width - 28;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isFromEdge || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const width = window.innerWidth;

      // Swiped inward from right edge (deltaX < -40) or inward from left edge (deltaX > 40)
      const swipedInwardFromRight = touchStartX >= width - 28 && deltaX < -40;
      const swipedInwardFromLeft = touchStartX <= 28 && deltaX > 40;

      if ((swipedInwardFromRight || swipedInwardFromLeft) && Math.abs(deltaY) < 60) {
        logger.debug("IN_APP_EDGE_SWIPE_BACK_DETECTED", {
          fromRight: swipedInwardFromRight,
          deltaX,
        });
        handlePlatformBackAction(options?.onExitPrompt);
      }
      isFromEdge = false;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    cleanups.push(() => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    });
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

// Diagnostic & Test Helpers
export function getBackHandlerCount(): number {
  return handlers.length;
}

export function resetBackHandlers(): void {
  handlers.length = 0;
  lastExitPressTime = 0;
}

export function getLastExitPressTime(): number {
  return lastExitPressTime;
}

export function setLastExitPressTime(time: number): void {
  lastExitPressTime = time;
}
