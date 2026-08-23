// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

describe("module import safety", () => {
  it("does not perform network I/O on import", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await import("./index.js");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
