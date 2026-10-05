// Quyết định khoá khi bắt đầu sửa chữ: chỉ tự khoá (và tự mở sau khi sửa) nếu element đang trống;
// lock do chính mình đặt tay từ context menu thì giữ nguyên
export function editLockPlan(currentLock: string | undefined, me: string | undefined) {
  if (!currentLock) return { canEdit: true, acquire: true };
  if (currentLock === me) return { canEdit: true, acquire: false };
  return { canEdit: false, acquire: false };
}
