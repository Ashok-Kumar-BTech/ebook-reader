import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  registerBackHandler,
  dispatchBackNavigation,
  handlePlatformBackAction,
  resetBackHandlers,
  getBackHandlerCount,
  setLastExitPressTime,
  getLastExitPressTime,
  initPlatformBackNavigation,
} from "../../src/utils/backNavigation";

describe("Platform Back Navigation System", () => {
  beforeEach(() => {
    resetBackHandlers();
    delete (window as any).__handleAndroidBack;
    vi.useRealTimers();
  });

  afterEach(() => {
    resetBackHandlers();
    delete (window as any).__handleAndroidBack;
  });

  describe("Handler Registration & Priority Execution", () => {
    it("registers and unregisters back handlers correctly", () => {
      expect(getBackHandlerCount()).toBe(0);
      const unregister = registerBackHandler(() => true);
      expect(getBackHandlerCount()).toBe(1);

      unregister();
      expect(getBackHandlerCount()).toBe(0);
    });

    it("executes higher priority handlers before lower priority handlers", () => {
      const callOrder: string[] = [];

      registerBackHandler(() => {
        callOrder.push("low-priority");
        return false;
      }, 0);

      registerBackHandler(() => {
        callOrder.push("high-priority");
        return false;
      }, 10);

      const handled = dispatchBackNavigation();
      expect(handled).toBe(false);
      expect(callOrder).toEqual(["high-priority", "low-priority"]);
    });

    it("executes handlers with the same priority in LIFO order", () => {
      const callOrder: string[] = [];

      registerBackHandler(() => {
        callOrder.push("first-registered");
        return false;
      }, 5);

      registerBackHandler(() => {
        callOrder.push("second-registered");
        return false;
      }, 5);

      dispatchBackNavigation();
      expect(callOrder).toEqual(["second-registered", "first-registered"]);
    });

    it("stops propagation immediately when a handler returns true", () => {
      const lowPriorityMock = vi.fn(() => true);
      const highPriorityMock = vi.fn(() => true);

      registerBackHandler(lowPriorityMock, 0);
      registerBackHandler(highPriorityMock, 10);

      const handled = dispatchBackNavigation();
      expect(handled).toBe(true);
      expect(highPriorityMock).toHaveBeenCalledTimes(1);
      expect(lowPriorityMock).not.toHaveBeenCalled();
    });

    it("falls through to lower priority handler when higher priority handler returns false", () => {
      const modalHandler = vi.fn(() => false); // Modal not open
      const viewHandler = vi.fn(() => true);   // Closed book

      registerBackHandler(viewHandler, 0);
      registerBackHandler(modalHandler, 10);

      const handled = dispatchBackNavigation();
      expect(handled).toBe(true);
      expect(modalHandler).toHaveBeenCalledTimes(1);
      expect(viewHandler).toHaveBeenCalledTimes(1);
    });

    it("delegates to legacy window.__handleAndroidBack if set and returns true", () => {
      const legacyMock = vi.fn(() => true);
      const stackMock = vi.fn(() => true);

      (window as any).__handleAndroidBack = legacyMock;
      registerBackHandler(stackMock, 10);

      const handled = dispatchBackNavigation();
      expect(handled).toBe(true);
      expect(legacyMock).toHaveBeenCalledTimes(1);
      expect(stackMock).not.toHaveBeenCalled();
    });
  });

  describe("Double-Back Exit Guard", () => {
    it("triggers onExitPrompt on first press at root without invoking exit", async () => {
      const onExitPrompt = vi.fn();
      const exitFn = vi.fn(async () => {});

      const result = await handlePlatformBackAction(onExitPrompt, exitFn);
      expect(result).toBe(false);
      expect(onExitPrompt).toHaveBeenCalledTimes(1);
      expect(exitFn).not.toHaveBeenCalled();
      expect(getLastExitPressTime()).toBeGreaterThan(0);
    });

    it("invokes exitFn when pressed twice within the 2000ms window", async () => {
      const onExitPrompt = vi.fn();
      const exitFn = vi.fn(async () => {});

      // First press at root
      await handlePlatformBackAction(onExitPrompt, exitFn);
      expect(onExitPrompt).toHaveBeenCalledTimes(1);
      expect(exitFn).not.toHaveBeenCalled();

      // Second press within window
      await handlePlatformBackAction(onExitPrompt, exitFn);
      expect(exitFn).toHaveBeenCalledWith(0);
      expect(exitFn).toHaveBeenCalledTimes(1);
      // Timer should be reset
      expect(getLastExitPressTime()).toBe(0);
    });

    it("resets exit window if second press occurs after 2000ms", async () => {
      const onExitPrompt = vi.fn();
      const exitFn = vi.fn(async () => {});

      // Simulate first press that occurred 3 seconds ago
      setLastExitPressTime(Date.now() - 3000);

      await handlePlatformBackAction(onExitPrompt, exitFn);
      // Should treat as first press again
      expect(onExitPrompt).toHaveBeenCalledTimes(1);
      expect(exitFn).not.toHaveBeenCalled();
    });

    it("resets exit timer if an intervening back action was consumed", async () => {
      const onExitPrompt = vi.fn();
      const exitFn = vi.fn(async () => {});

      // First press at root
      await handlePlatformBackAction(onExitPrompt, exitFn);
      expect(onExitPrompt).toHaveBeenCalledTimes(1);
      expect(getLastExitPressTime()).toBeGreaterThan(0);

      // Now a view handler is pushed and consumes an action
      registerBackHandler(() => true, 10);
      const consumedResult = await handlePlatformBackAction(onExitPrompt, exitFn);
      expect(consumedResult).toBe(true);
      expect(getLastExitPressTime()).toBe(0);
    });
  });

  describe("Touch Edge-Swipe Fallback Listener Lifecycle", () => {
    it("attaches and cleans up touch event listeners cleanly", async () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const cleanup = await initPlatformBackNavigation({ enableTouchFallback: true });

      expect(addSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), { passive: true });
      expect(addSpy).toHaveBeenCalledWith("touchend", expect.any(Function), { passive: true });

      cleanup();

      expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("touchend", expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});

