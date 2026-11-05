import { describe, it, expect } from "vitest";
import { CbzAdapter } from "../../src/adapters/cbzAdapter";
import { AppError } from "../../src/errors/appError";

describe("CbzAdapter Archive Detection Guard", () => {
  it("throws UNSUPPORTED_VERSION when loading genuine RAR archive magic bytes", async () => {
    const adapter = new CbzAdapter();
    // RAR signature: 0x52, 0x61, 0x72, 0x21 ('Rar!')
    const rarHeader = new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);

    await expect(adapter.load("/comics/batman.cbr", rarHeader)).rejects.toThrow(AppError);

    try {
      await adapter.load("/comics/batman.cbr", rarHeader);
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe("UNSUPPORTED_VERSION");
      expect(err.details).toMatch(/This comic book uses RAR compression/i);
    }
  });
});
