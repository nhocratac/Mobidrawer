import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useBoardStoreof } from "@/lib/Zustand/store";

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

async function handleSaveAsImage() {
  const element = document.getElementById("board-area");
  if (!element) return;
  const board = useBoardStoreof.getState().board;
  const fileName = sanitizeFileName(board?.name || "mobidrawer-board");

  const canvas = await html2canvas(element);
  const dataUrl = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download =  `${fileName}.png`;
  link.click();
}

async function handleSaveAsPDF() {
  const element = document.getElementById("board-area");
  if (!element) return;
  const board = useBoardStoreof.getState().board;
  const fileName = sanitizeFileName(board?.name || "mobidrawer-board");

  const canvas = await html2canvas(element);
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`${fileName}.pdf`);
}

const handleExportMobidrawerFile = () => {
  const board = useBoardStoreof.getState().board;
  const exportData = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    board,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });

  const fileName = sanitizeFileName(board?.name || "mobidrawer-board");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.mobi`;
  a.click();
};

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD") // Tách dấu tiếng Việt (e.g., "đ" -> "d")
    .replace(/[\u0300-\u036f]/g, "") // Xoá dấu
    .replace(/[^a-zA-Z0-9-_ ]/g, "") // Xoá ký tự không hợp lệ
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch ngang
    .toLowerCase(); // Chuyển về chữ thường
}
export { handleSaveAsImage, handleSaveAsPDF , handleExportMobidrawerFile };
