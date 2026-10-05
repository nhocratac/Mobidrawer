import { describe, expect, it } from "vitest";
import { fillToHex } from "../colors";
import { newObjectId } from "../types";

describe("colors", () => {
  it("maps tailwind class", () => {
    expect(fillToHex("bg-yellow-200")).toBe("#fef08a");
    expect(fillToHex("bg-red-500")).toBe("#ef4444");
    expect(fillToHex("bg-white")).toBe("#ffffff");
  });
  it("passes hex through", () => {
    expect(fillToHex("#123456")).toBe("#123456");
  });
  it("falls back", () => {
    expect(fillToHex("bg-unknown-900")).toBe("#fde68a");
    expect(fillToHex(undefined)).toBe("#fde68a");
  });
});

describe("newObjectId", () => {
  it("is 24 hex and unique", () => {
    const a = newObjectId();
    const b = newObjectId();
    expect(a).toMatch(/^[0-9a-f]{24}$/);
    expect(a).not.toBe(b);
  });
});
