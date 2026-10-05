import { describe, expect, it } from "vitest";
import { withFontFallback } from "../exportScene";

describe("withFontFallback", () => {
  it("appends a sans-serif fallback to web fonts that the SVG image cannot load", () => {
    expect(withFontFallback('__Inter_d65c78, __Inter_Fallback_d65c78')).toBe('__Inter_d65c78, __Inter_Fallback_d65c78, Arial, Helvetica, sans-serif');
  });
  it("keeps families that already end with a generic family", () => {
    expect(withFontFallback("Roboto, sans-serif")).toBe("Roboto, sans-serif");
    expect(withFontFallback("Courier New, monospace")).toBe("Courier New, monospace");
  });
  it("handles empty input", () => {
    expect(withFontFallback("")).toBe("Arial, Helvetica, sans-serif");
  });
});
