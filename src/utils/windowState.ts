import { checkIsTauri } from "./tauriApi";
import { createStore } from "./store";
import { logManager } from "./logger";

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
};

const windowStateStore = createStore<WindowState>("window-state", DEFAULT_WINDOW_STATE);
const logger = logManager.getLogger("WindowState");

let isInitialized = false;

/**
 * Initializes window state persistence.
 * Restores previous size, position, and maximized status on startup,
 * and attaches debounced listeners to persist changes.
 */
export async function initWindowStateWatcher(): Promise<() => void> {
  if (isInitialized) {
    return () => {};
  }
  isInitialized = true;

  const inTauri = await checkIsTauri();
  let cleanupListeners: (() => void)[] = [];

  try {
    await windowStateStore.load();
    const savedState = windowStateStore.get() || DEFAULT_WINDOW_STATE;

    if (inTauri) {
      try {
        const { getCurrentWindow, LogicalSize, LogicalPosition } = await import("@tauri-apps/api/window");
        const appWindow = getCurrentWindow();

        if (savedState.isMaximized) {
          await appWindow.maximize();
        } else if (savedState.width && savedState.height) {
          const width = Math.max(800, savedState.width);
          const height = Math.max(600, savedState.height);
          await appWindow.setSize(new LogicalSize(width, height));

          if (savedState.x !== undefined && savedState.y !== undefined && savedState.x >= 0 && savedState.y >= 0) {
            await appWindow.setPosition(new LogicalPosition(savedState.x, savedState.y));
          }
        }

        logger.info("WINDOW_STATE_RESTORED", { savedState });

        // Debounced save
        let saveTimeout: ReturnType<typeof setTimeout> | null = null;
        const debounceSave = () => {
          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(async () => {
            try {
              const maximized = await appWindow.isMaximized();
              if (maximized) {
                windowStateStore.set(prev => ({ ...prev, isMaximized: true }));
              } else {
                const size = await appWindow.innerSize();
                const pos = await appWindow.outerPosition();
                windowStateStore.set({
                  width: size.width,
                  height: size.height,
                  x: pos.x,
                  y: pos.y,
                  isMaximized: false,
                });
              }
            } catch (err) {
              logger.debug("WINDOW_STATE_SAVE_ERROR", { error: String(err) });
            }
          }, 400);
        };

        const unlistenResize = await appWindow.onResized(debounceSave);
        const unlistenMoved = await appWindow.onMoved(debounceSave);

        cleanupListeners.push(unlistenResize, unlistenMoved);
      } catch (tauriWindowErr) {
        logger.warn("TAURI_WINDOW_INIT_ERROR", { error: String(tauriWindowErr) });
      }
    } else {
      // Browser fallback (localStorage)
      logger.info("WINDOW_STATE_BROWSER_MODE", { savedState });
      const handleBrowserResize = () => {
        windowStateStore.set({
          width: window.innerWidth,
          height: window.innerHeight,
          isMaximized: false,
        });
      };
      window.addEventListener("resize", handleBrowserResize);
      cleanupListeners.push(() => window.removeEventListener("resize", handleBrowserResize));
    }
  } catch (err) {
    logger.error("WINDOW_STATE_INIT_FAILED", {}, err as Error);
  }

  return () => {
    cleanupListeners.forEach(fn => fn());
    cleanupListeners = [];
    isInitialized = false;
  };
}

/**
 * Toggles fullscreen mode across Tauri desktop and browser environments.
 * Returns the updated fullscreen state (true if fullscreen, false otherwise).
 */
export async function toggleFullscreen(): Promise<boolean> {
  const inTauri = await checkIsTauri();
  if (inTauri) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();
      const current = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!current);
      return !current;
    } catch (err) {
      logger.warn("TAURI_FULLSCREEN_ERROR", { error: String(err) });
    }
  }

  // Web Standard Fullscreen Fallback
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return true;
    } else {
      await document.exitFullscreen();
      return false;
    }
  } catch (err) {
    logger.warn("WEB_FULLSCREEN_ERROR", { error: String(err) });
    return !!document.fullscreenElement;
  }
}

/**
 * Checks whether the application window is currently in fullscreen mode.
 */
export async function isFullscreen(): Promise<boolean> {
  const inTauri = await checkIsTauri();
  if (inTauri) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return await getCurrentWindow().isFullscreen();
    } catch {
      return false;
    }
  }
  return !!document.fullscreenElement;
}
