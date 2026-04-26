"use client";

import { useEffect } from "react";
import { useSceneState } from "@/lib/sceneState";
import type { SceneObject } from "@/types/scene";

// Headless component. Listens for:
// - Cmd/Ctrl+C → copy selected object
// - Cmd/Ctrl+V → paste a copy at the same position as the original
// - Delete / Backspace → remove the selected object
export function CopyPasteHandler() {
  const {
    scene,
    selectedObjectIndex,
    addObject,
    removeObject,
    updateScene,
    setSelectedObjectIndex,
    copiedObjectRef,
  } = useSceneState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Copy
      if (isMeta && e.code === "KeyC") {
        if (selectedObjectIndex === null) return;

        let toCopy: SceneObject | null = null;

        if (selectedObjectIndex === -1 && scene.heroAssetUrl) {
          toCopy = {
            type: "house",
            x: scene.heroX ?? 0,
            y: scene.heroY ?? 0,
            z: scene.heroZ ?? 0,
            rotation: scene.heroRotation ?? 0,
            scale: scene.heroScale ?? 1,
            glbUrl: scene.heroAssetUrl,
          };
        } else {
          const src = (scene.objects ?? [])[selectedObjectIndex];
          if (src) toCopy = { ...src };
        }

        if (toCopy) {
          copiedObjectRef.current = toCopy;
          console.log("Copied object:", toCopy);
          e.preventDefault();
        }
        return;
      }

      // Paste — same position as the original (no offset)
      if (isMeta && e.code === "KeyV") {
        const src = copiedObjectRef.current;
        if (!src) return;

        const newObj: SceneObject = { ...src };
        addObject(newObj);

        const newIndex = (scene.objects ?? []).length;
        setSelectedObjectIndex(newIndex);

        console.log("Pasted object as index", newIndex);
        e.preventDefault();
        return;
      }

      // Delete the selected object
      if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedObjectIndex === null) return;

        if (selectedObjectIndex === -1 && scene.heroAssetUrl) {
          // Clear the legacy hero (no removeObject equivalent for the hero)
          updateScene({
            heroAssetUrl: undefined,
            heroX: 0,
            heroY: 0,
            heroZ: 0,
            heroRotation: 0,
            heroScale: 1,
          });
        } else {
          removeObject(selectedObjectIndex);
        }

        setSelectedObjectIndex(null);
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    scene,
    selectedObjectIndex,
    addObject,
    removeObject,
    updateScene,
    setSelectedObjectIndex,
    copiedObjectRef,
  ]);

  return null;
}