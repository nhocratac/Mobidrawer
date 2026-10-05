import { describe, expect, it } from "vitest";
import { shouldHandleDeleteKey } from "../keyboard";

const t = (tag: string, contentEditable = false) => ({ tagName: tag.toUpperCase(), isContentEditable: contentEditable });

describe("shouldHandleDeleteKey", () => {
  it("handles Delete on body", () => {
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("body") })).toBe(true);
  });
  it("handles Backspace on svg", () => {
    expect(shouldHandleDeleteKey({ key: "Backspace", target: t("svg") })).toBe(true);
  });
  it("ignores textarea / input / select / contentEditable", () => {
    expect(shouldHandleDeleteKey({ key: "Backspace", target: t("textarea") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("input") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("select") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: t("div", true) })).toBe(false);
  });
  it("ignores other keys and null target", () => {
    expect(shouldHandleDeleteKey({ key: "a", target: t("body") })).toBe(false);
    expect(shouldHandleDeleteKey({ key: "Delete", target: null })).toBe(true);
  });
});
