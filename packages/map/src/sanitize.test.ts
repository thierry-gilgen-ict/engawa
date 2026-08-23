// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sanitizeTerminalText } from "./sanitize.js";

describe("terminal sanitization", () => {
  it("removes control characters and bounds length", () => {
    const malicious = "safe\u0007\u001b[31mRED\u001b[0m" + "x".repeat(1000);
    const sanitized = sanitizeTerminalText(malicious, 20);
    expect(sanitized).toBe("safe[31mRED[0mxxxxxx");
    expect(
      [...sanitized].every((char) => {
        const code = char.charCodeAt(0);
        return code >= 32 && code !== 127;
      }),
    ).toBe(true);
  });

  it("strips bidirectional override characters", () => {
    const bidi = "safe\u202Ehidden\u202Ctail";
    expect(sanitizeTerminalText(bidi)).toBe("safehiddentail");
  });
});
