import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemoryTransport, createMemoryTransport } from "../../src/utils/logger/transports/memory";
import type { LogEntry } from "../../src/utils/logger/types";

describe("MemoryTransport & In-App Log Buffer", () => {
  let transport: MemoryTransport;

  beforeEach(() => {
    transport = createMemoryTransport(10); // Small limit for testing
  });

  const createEntry = (level: LogEntry["level"], message: string): LogEntry => ({
    timestamp: new Date().toISOString(),
    level,
    logger: "test-logger",
    message,
    context: { testKey: "testVal" },
  });

  it("retains written log entries in chronological order", () => {
    transport.write(createEntry("info", "First log"));
    transport.write(createEntry("warn", "Second log"));

    const entries = transport.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].message).toBe("First log");
    expect(entries[1].message).toBe("Second log");
  });

  it("strictly enforces FIFO ring buffer capacity when limit is exceeded", () => {
    for (let i = 1; i <= 15; i++) {
      transport.write(createEntry("info", `Log ${i}`));
    }

    const entries = transport.getEntries();
    expect(entries).toHaveLength(10);
    // Oldest entries (1 to 5) should have been evicted; entries 6 to 15 remain
    expect(entries[0].message).toBe("Log 6");
    expect(entries[9].message).toBe("Log 15");
  });

  it("clears all stored log entries when clear() is invoked", () => {
    transport.write(createEntry("info", "To be cleared"));
    expect(transport.getEntries()).toHaveLength(1);

    transport.clear();
    expect(transport.getEntries()).toHaveLength(0);
  });

  it("notifies active subscribers when new log entries arrive", () => {
    const subscriber = vi.fn();
    const unsubscribe = transport.subscribe(subscriber);

    const entry = createEntry("error", "Critical issue");
    transport.write(entry);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(entry);

    unsubscribe();
    transport.write(createEntry("info", "Another log"));
    expect(subscriber).toHaveBeenCalledTimes(1); // Not called after unsubscribe
  });

  it("handles subscriber errors gracefully without interrupting logging pipeline", () => {
    const faultySubscriber = vi.fn(() => {
      throw new Error("Subscriber failed");
    });
    const goodSubscriber = vi.fn();

    transport.subscribe(faultySubscriber);
    transport.subscribe(goodSubscriber);

    const entry = createEntry("warn", "Resilience check");
    expect(() => transport.write(entry)).not.toThrow();

    expect(faultySubscriber).toHaveBeenCalledTimes(1);
    expect(goodSubscriber).toHaveBeenCalledTimes(1);
  });
});

