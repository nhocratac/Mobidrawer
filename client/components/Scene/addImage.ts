import { useSceneStore } from "@/lib/Zustand/sceneStore";
import { screenToWorld } from "./geometry";
import { sceneSocket } from "./sceneSocket";
import { newObjectId } from "./types";

const IMAGE_SIZE = 200;

// Ảnh mới (upload hoặc AI) đặt ở giữa màn hình hiện tại
export function addImageElement(boardId: string, image: { url: string; alt: string; cloudinaryId: string }) {
  const st = useSceneStore.getState();
  const centre = screenToWorld({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, st.viewport);
  sceneSocket.create(boardId, [
    {
      id: newObjectId(),
      boardId,
      type: "image",
      x: centre.x - IMAGE_SIZE / 2,
      y: centre.y - IMAGE_SIZE / 2,
      w: IMAGE_SIZE,
      h: IMAGE_SIZE,
      rotation: 0,
      z: st.topZ() + 1,
      version: 0,
      image,
    },
  ]);
}
