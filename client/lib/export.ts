'use client'
import StickyNoteForExport from "@/components/BoxResizable/StickyNoteForExport";
import { useBoardStoreof } from "@/lib/Zustand/store";
import { useTempChangeStore } from "@/lib/Zustand/tempChangeStore";
import env from "@/utils/environment";
import CryptoJS from "crypto-js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import React from "react";
import { createRoot } from "react-dom/client";
async function handleSaveAsImage() {
  const element = document.getElementById("board-area");
  if (!element) return;
  const board = useBoardStoreof.getState().board;
  const fileName = sanitizeFileName(board?.name || "mobidrawer-board");

  const canvas = await html2canvas(element);
  const dataUrl = canvas.toDataURL("image/png");

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  link.click();
}

const exportStickyNoteToPDF = async ({
  text,
  color,
  width,
  height,
  noteId,
}: {
  text: string;
  color: string;
  width: string | number;
  height: string | number;
  noteId: string;
}) => {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  // Create root and render
  const root = createRoot(container);

  const element = React.createElement(StickyNoteForExport, {
    text,
    color,
    width,
    height,
  });
  await new Promise<void>((resolve) => {
    root.render(element);
    // Delay 50ms để đảm bảo render hoàn tất trước khi capture
    setTimeout(resolve, 50);
  });

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
  pdf.save(`StickyNote-${noteId}.pdf`);

  // Cleanup
  root.unmount();
  container.remove();
};

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
  if (!board) return;

  const canvasPaths = board?.canvasPaths.map((path) => ({
    thickness: path.thickness,
    color: path.color,
    opacity: path.opacity,
    paths: path.paths,
  }));

  const stickyNotes = board?.stickyNotes.map((note) => ({
    text: note.text,
    position: note.position,
    size: note.size,
    color: note.color,
  }));

  const exportData = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    canvasPaths,
    stickyNotes,
  };

  // 🔐 Mã hóa dữ liệu JSON thành chuỗi
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(exportData),
    env.NEXT_PUBLIC_BACKEND_SOCKET || "hellovn11213"
  ).toString();

  const blob = new Blob([encrypted], { type: "text/plain" });
  const fileName = sanitizeFileName(board.name || "mobidrawer-board");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.mobi`;
  a.click();
};

const handleImportMobidrawerFile = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();

    // 🔓 Giải mã AES
    const bytes = CryptoJS.AES.decrypt(
      text,
      env.NEXT_PUBLIC_BACKEND_SOCKET || "hellovn11213"
    );
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedData) {
      throw new Error("Giải mã thất bại, dữ liệu rỗng.");
    }

    const parsed = JSON.parse(decryptedData);

    useTempChangeStore
      .getState()
      .setTempChanges(parsed.canvasPaths, parsed.stickyNotes);
  } catch (err) {
    console.error("Lỗi giải mã file .mobidrawer:", err);
    alert("❌ File không hợp lệ hoặc sai key mã hóa.");
  }
};
function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD") // Tách dấu tiếng Việt (e.g., "đ" -> "d")
    .replace(/[\u0300-\u036f]/g, "") // Xoá dấu
    .replace(/[^a-zA-Z0-9-_ ]/g, "") // Xoá ký tự không hợp lệ
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng dấu gạch ngang
    .toLowerCase(); // Chuyển về chữ thường
}


export {
    exportStickyNoteToPDF, handleExportMobidrawerFile,
    handleImportMobidrawerFile,
    handleSaveAsImage,
    handleSaveAsPDF
  };