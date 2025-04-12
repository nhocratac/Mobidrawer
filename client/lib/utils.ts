import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const dd = String(date.getDate()).padStart(2, "0");
  const MM = String(date.getMonth() + 1).padStart(2, "0"); // Tháng bắt đầu từ 0
  const yyyy = date.getFullYear();
  const HH = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${dd}/${MM}/${yyyy} - ${HH}:${mm}:${ss}`;
}

export function parseTokenInfo(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString()).user;
}

export function generateSlug(input: string | null | undefined): string {
  // Kiểm tra đầu vào
  if (!input || input.trim() === "") {
      return "";
  }

  // Chuyển thành chữ thường, loại bỏ dấu và tạo slug
  const slug = input
      .toLowerCase()
      // Thay thế ký tự có dấu thành không dấu
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Thay khoảng trắng bằng dấu gạch ngang
      .replace(/\s+/g, "-")
      // Loại bỏ ký tự không phải chữ cái, số hoặc dấu gạch ngang
      .replace(/[^a-z0-9-]/g, "")
      // Loại bỏ nhiều dấu gạch ngang liên tiếp
      .replace(/-+/g, "-")
      // Xóa dấu gạch ngang ở đầu và cuối
      .replace(/^-|-$/g, "");

  return slug;
}
