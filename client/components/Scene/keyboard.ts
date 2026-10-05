interface KeyLike {
  key: string;
  target: unknown;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// Delete/Backspace chỉ xoá element khi người dùng không đang gõ chữ
export function shouldHandleDeleteKey(e: KeyLike): boolean {
  if (e.key !== "Delete" && e.key !== "Backspace") return false;
  return !isTypingTarget(e.target);
}

export function isTypingTarget(target: unknown): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null;
  if (!el) return false;
  return TYPING_TAGS.has((el.tagName ?? "").toUpperCase()) || !!el.isContentEditable;
}

// Cmd/Ctrl+Z (không Shift) = hoàn tác
export function isUndoKey(e: KeyLike): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey) return false;
  return e.key.toLowerCase() === "z" && !isTypingTarget(e.target);
}

// Cmd/Ctrl+Shift+Z hoặc Ctrl+Y = làm lại (Cmd+Y trên macOS là lịch sử trình duyệt)
export function isRedoKey(e: KeyLike): boolean {
  const key = e.key.toLowerCase();
  const redo = (key === "z" && !!e.shiftKey && !!(e.metaKey || e.ctrlKey)) || (key === "y" && !!e.ctrlKey);
  return redo && !isTypingTarget(e.target);
}
