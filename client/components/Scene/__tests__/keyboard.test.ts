import { describe, expect, it } from "vitest";
import { isRedoKey, isUndoKey, shouldHandleDeleteKey } from "../keyboard";

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

const k = (key: string, mods: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {}, target: unknown = t("body")) => ({
  key,
  target,
  metaKey: !!mods.meta,
  ctrlKey: !!mods.ctrl,
  shiftKey: !!mods.shift,
});

describe("isUndoKey / isRedoKey", () => {
  it("Cmd+Z and Ctrl+Z are undo, not redo", () => {
    expect(isUndoKey(k("z", { meta: true }))).toBe(true);
    expect(isUndoKey(k("z", { ctrl: true }))).toBe(true);
    expect(isRedoKey(k("z", { meta: true }))).toBe(false);
    expect(isRedoKey(k("z", { ctrl: true }))).toBe(false);
  });
  it("key is case-insensitive", () => {
    expect(isUndoKey(k("Z", { ctrl: true }))).toBe(true);
    expect(isRedoKey(k("Y", { ctrl: true }))).toBe(true);
  });
  it("Shift+Cmd+Z, Shift+Ctrl+Z and Ctrl+Y are redo, not undo", () => {
    expect(isRedoKey(k("Z", { meta: true, shift: true }))).toBe(true);
    expect(isRedoKey(k("z", { ctrl: true, shift: true }))).toBe(true);
    expect(isRedoKey(k("y", { ctrl: true }))).toBe(true);
    expect(isUndoKey(k("Z", { meta: true, shift: true }))).toBe(false);
    expect(isUndoKey(k("y", { ctrl: true }))).toBe(false);
  });
  it("requires Cmd or Ctrl", () => {
    expect(isUndoKey(k("z"))).toBe(false);
    expect(isRedoKey(k("z", { shift: true }))).toBe(false);
    expect(isRedoKey(k("y"))).toBe(false);
  });
  it("Cmd+Y is not redo", () => {
    expect(isRedoKey(k("y", { meta: true }))).toBe(false);
  });
  it("ignored while typing", () => {
    expect(isUndoKey(k("z", { meta: true }, t("textarea")))).toBe(false);
    expect(isRedoKey(k("y", { ctrl: true }, t("input")))).toBe(false);
    expect(isRedoKey(k("z", { ctrl: true, shift: true }, t("div", true)))).toBe(false);
  });
  it("events without modifier fields are not undo/redo", () => {
    expect(isUndoKey({ key: "z", target: t("body") })).toBe(false);
    expect(isRedoKey({ key: "y", target: t("body") })).toBe(false);
  });
});
