"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useSceneState } from "@/lib/sceneState";

// Click on empty ground → deselect.
// HeroAsset stops propagation on its own pointerdown, so if pointerdown
// reaches the canvas, it was empty space.
// We also suppress deselect for one pointerup if a drag just ended.
export function DragHandler() {
  const { gl } = useThree();
  const { setSelectedObjectIndex, selectedObjectIndex } = useSceneState();

  // True if a drag just ended; suppress the next deselect-on-pointerup
  const suppressNextDeselect = useRef(false);
  // True between pointerdown and pointerup if the down was on canvas
  const canvasPointerDown = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      // If the click is inside an HTML overlay (button, kbd, etc.), ignore
      if (target.tagName === "BUTTON" || target.closest("button")) return;
      canvasPointerDown.current = true;
    };

    const onObjectClicked = () => {
      // HeroAsset clicked — was not empty space
      canvasPointerDown.current = false;
    };

    const onDragStart = () => {
      // Drag in progress; don't deselect on the upcoming pointerup
      suppressNextDeselect.current = true;
      canvasPointerDown.current = false;
    };

    const onDragEnd = () => {
      // Drag just ended; eat one pointerup deselect attempt
      suppressNextDeselect.current = true;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (suppressNextDeselect.current) {
        suppressNextDeselect.current = false;
        canvasPointerDown.current = false;
        return;
      }
      if (canvasPointerDown.current && selectedObjectIndex !== null) {
        setSelectedObjectIndex(null);
      }
      canvasPointerDown.current = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("doodleverse:object-clicked", onObjectClicked);
    window.addEventListener("doodleverse:drag-start", onDragStart);
    window.addEventListener("doodleverse:drag-end", onDragEnd);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("doodleverse:object-clicked", onObjectClicked);
      window.removeEventListener("doodleverse:drag-start", onDragStart);
      window.removeEventListener("doodleverse:drag-end", onDragEnd);
    };
  }, [gl, selectedObjectIndex, setSelectedObjectIndex]);

  return null;
}