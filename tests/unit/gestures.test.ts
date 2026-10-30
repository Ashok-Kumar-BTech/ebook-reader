import { describe, it, expect } from "vitest";

/**
 * Pure gesture math calculations mirror ReaderView pinch-zoom and pan engine
 */
export function calculateZoomBounds(isCompact: boolean, isMobile: boolean) {
  const minZoom = isCompact || isMobile ? 1.0 : 0.6;
  const maxZoom = 3.0;
  return { minZoom, maxZoom };
}

export function clampZoom(targetZoom: number, isCompact: boolean, isMobile: boolean): number {
  const { minZoom, maxZoom } = calculateZoomBounds(isCompact, isMobile);
  return Math.min(maxZoom, Math.max(minZoom, targetZoom));
}

export function getDoubleTapTargetZoom(currentZoom: number, minZoom: number): number {
  if (currentZoom > 1.05) {
    return minZoom;
  }
  return 1.75;
}

export function calculateFocalPanOffset(
  prevPan: { x: number; y: number },
  focalCenter: { x: number; y: number },
  ratio: number
): { x: number; y: number } {
  return {
    x: (prevPan.x - focalCenter.x) * ratio + focalCenter.x,
    y: (prevPan.y - focalCenter.y) * ratio + focalCenter.y,
  };
}

describe("Gesture Engine & Zoom Thresholds", () => {
  describe("Zoom Thresholds per Device & Viewport", () => {
    it("strictly prevents zooming out below 1.0x on mobile devices", () => {
      const { minZoom } = calculateZoomBounds(true, true);
      expect(minZoom).toBe(1.0);

      // Attempting to pinch out to 0.4x or 0.6x must clamp to 1.0x
      expect(clampZoom(0.4, true, true)).toBe(1.0);
      expect(clampZoom(0.6, true, true)).toBe(1.0);
      expect(clampZoom(0.99, true, true)).toBe(1.0);
    });

    it("prevents zooming out below 1.0x even on mobile in landscape mode", () => {
      // Landscape mobile: isCompact is false, but isMobile is true
      const { minZoom } = calculateZoomBounds(false, true);
      expect(minZoom).toBe(1.0);
      expect(clampZoom(0.5, false, true)).toBe(1.0);
    });

    it("allows zooming out to 0.6x on desktop for wide document overview", () => {
      const { minZoom, maxZoom } = calculateZoomBounds(false, false);
      expect(minZoom).toBe(0.6);
      expect(maxZoom).toBe(3.0);
      expect(clampZoom(0.6, false, false)).toBe(0.6);
      expect(clampZoom(0.3, false, false)).toBe(0.6);
    });

    it("caps maximum zoom at 3.0x across all devices", () => {
      expect(clampZoom(4.5, true, true)).toBe(3.0);
      expect(clampZoom(10.0, false, false)).toBe(3.0);
    });
  });

  describe("Double-Tap Zoom Toggle", () => {
    it("toggles from 1.0x (fit) to 1.75x inspection zoom on double tap", () => {
      const nextZoom = getDoubleTapTargetZoom(1.0, 1.0);
      expect(nextZoom).toBe(1.75);
    });

    it("resets back to minZoom (1.0x on mobile) when already zoomed in", () => {
      const nextZoom = getDoubleTapTargetZoom(1.75, 1.0);
      expect(nextZoom).toBe(1.0);

      const nextZoomFromMax = getDoubleTapTargetZoom(3.0, 1.0);
      expect(nextZoomFromMax).toBe(1.0);
    });
  });

  describe("Focal-Point Centering Math", () => {
    it("keeps focal point pinned under fingers when zooming in", () => {
      const prevPan = { x: 0, y: 0 };
      const focalCenter = { x: 100, y: 150 }; // user pinching at (100, 150)
      const ratio = 2.0; // 2x magnification

      const newPan = calculateFocalPanOffset(prevPan, focalCenter, ratio);
      // Expected: (0 - 100) * 2 + 100 = -100
      expect(newPan.x).toBe(-100);
      // Expected: (0 - 150) * 2 + 150 = -150
      expect(newPan.y).toBe(-150);
    });

    it("returns zero shift when zoom ratio is 1.0", () => {
      const prevPan = { x: 25, y: -40 };
      const focalCenter = { x: 80, y: 120 };
      const newPan = calculateFocalPanOffset(prevPan, focalCenter, 1.0);
      expect(newPan).toEqual(prevPan);
    });
  });
});

