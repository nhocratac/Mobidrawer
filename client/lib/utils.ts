import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Dưới một phút
  if (diffSeconds < 60) {
    return "vừa xong";
  }
  
  // Vài phút trước (dưới 1 giờ)
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} phút trước`;
  }
  
  // Vài giờ trước (dưới 1 ngày)
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} giờ trước`;
  }
  
  // Vài ngày trước (dưới 1 tuần)
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} ngày trước`;
  }
  
  // Vài tuần trước (dưới 1 tháng)
  if (diffSeconds < 2592000) {
    const weeks = Math.floor(diffSeconds / 604800);
    return `${weeks} tuần trước`;
  }
  
  // Vài tháng trước (dưới 1 năm)
  if (diffSeconds < 31536000) {
    const months = Math.floor(diffSeconds / 2592000);
    return `${months} tháng trước`;
  }
  
  // Vài năm trước
  const years = Math.floor(diffSeconds / 31536000);
  return `${years} năm trước`;
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
