// Rasterize board hiện tại thành canvas: grid + pencil (canvas) rồi SVG scene phía trên.
// html2canvas vẽ <svg> bằng cách serialize thành ảnh, khi đó <image href> ngoài và class Tailwind
// trong foreignObject bị mất — nên tự serialize với ảnh dạng data URL và style inline.

const INLINE_PROPS = [
  "display",
  "flex-direction",
  "align-items",
  "justify-content",
  "text-align",
  "padding",
  "font-size",
  "font-family",
  "font-weight",
  "line-height",
  "color",
  "background-color",
  "white-space",
  "overflow-wrap",
  "word-break",
  "overflow",
  "width",
  "height",
  "box-sizing",
  "border-radius",
];

const SVG_NS = "http://www.w3.org/2000/svg";
const GENERIC_FAMILIES = ["serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui"];
const FONT_FALLBACK = "Arial, Helvetica, sans-serif";

// Web font (next/font) không nạp được khi SVG được vẽ như ảnh → thêm font hệ thống dự phòng thay vì rơi về serif
export function withFontFallback(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) return FONT_FALLBACK;
  const last = trimmed.split(",").pop()!.trim().replace(/["']/g, "").toLowerCase();
  return GENERIC_FAMILIES.includes(last) ? trimmed : `${trimmed}, ${FONT_FALLBACK}`;
}

async function toDataUrl(href: string): Promise<string | null> {
  if (href.startsWith("data:")) return href;
  try {
    const res = await fetch(href, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderBoardToCanvas(): Promise<HTMLCanvasElement | null> {
  const area = document.getElementById("board-area");
  const svg = area?.querySelector("svg");
  if (!area || !svg) return null;
  const { width, height } = area.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = getComputedStyle(area).backgroundColor;
  ctx.fillRect(0, 0, width, height);
  area.querySelectorAll("canvas").forEach((c) => ctx.drawImage(c, 0, 0, width, height));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const originals = svg.querySelectorAll("foreignObject *");
  const copies = clone.querySelectorAll("foreignObject *");
  originals.forEach((el, i) => {
    const computed = getComputedStyle(el);
    const style = INLINE_PROPS.map((prop) => {
      const value = computed.getPropertyValue(prop);
      return `${prop}:${prop === "font-family" ? withFontFallback(value) : value}`;
    }).join(";");
    (copies[i] as HTMLElement).setAttribute("style", style);
  });

  await Promise.all(
    Array.from(clone.querySelectorAll("image")).map(async (img) => {
      const href = img.getAttribute("href") ?? img.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      const data = href ? await toDataUrl(href) : null;
      if (data) img.setAttribute("href", data);
      else img.remove(); // ảnh không tải được (CORS / 404): bỏ thay vì vẽ icon lỗi
    })
  );

  const xml = new XMLSerializer().serializeToString(clone);
  const image = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml));
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}
