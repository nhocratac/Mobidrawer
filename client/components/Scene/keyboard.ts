interface KeyLike {
  key: string;
  target: unknown;
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
