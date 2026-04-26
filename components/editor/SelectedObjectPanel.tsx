"use client";

import { useState } from "react";
import { useSceneState } from "@/lib/sceneState";
import type { SceneObject } from "@/types/scene";

const SCALE_MIN = 0.25;
const SCALE_MAX = 4.0;
const SCALE_STEP = 0.05;

export function SelectedObjectPanel() {
  const {
    scene,
    selectedObjectIndex,
    setSelectedObjectIndex,
    updateScene,
    updateObject,
    addObject,
    removeObject,
  } = useSceneState();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (selectedObjectIndex === null) return null;

  const isSingleHero = selectedObjectIndex === -1 && !!scene.heroAssetUrl;
  const obj = isSingleHero ? null : (scene.objects ?? [])[selectedObjectIndex];
  const objectName = isSingleHero ? scene.name : (obj?.description || obj?.type || "Object");

  const currentScale = isSingleHero
    ? (scene.heroScale ?? 1)
    : (obj?.scale ?? 1);

  const setScale = (newScale: number) => {
    if (isSingleHero) {
      updateScene({ heroScale: newScale });
    } else {
      updateObject(selectedObjectIndex, { scale: newScale });
    }
  };

  // Duplicate the selected object — adds an exact copy at the same position.
  // The new copy is selected so the user can immediately drag it apart.
  const handleDuplicate = () => {
    let toCopy: SceneObject | null = null;
    if (isSingleHero) {
      toCopy = {
        type: "house",
        x: scene.heroX ?? 0,
        y: scene.heroY ?? 0,
        z: scene.heroZ ?? 0,
        rotation: scene.heroRotation ?? 0,
        scale: scene.heroScale ?? 1,
        glbUrl: scene.heroAssetUrl,
      };
    } else if (obj) {
      toCopy = { ...obj };
    }
    if (!toCopy) return;

    // Spawn at the SAME position as the original (no offset).
    addObject({ ...toCopy });
    const newIndex = (scene.objects ?? []).length;
    setSelectedObjectIndex(newIndex);
  };

  // Delete the selected object. For the hero, clears heroAssetUrl.
  const handleDelete = () => {
    if (isSingleHero) {
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
  };

  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const handleRegenerate = async () => {
    const sketchDataUrl = sessionStorage.getItem("doodleverse:original-sketch");
    if (!sketchDataUrl) {
      setError("Original sketch not found. Generate a new world first.");
      return;
    }

    setIsRegenerating(true);
    setError(null);

    try {
      const blob = await dataUrlToBlob(sketchDataUrl);
      const formData = new FormData();
      formData.append("image", blob, "sketch.png");

      const res = await fetch("/api/generate-hero", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      const newUrl = data.glbUrl;
      if (!newUrl) {
        throw new Error("No model URL in response");
      }

      if (isSingleHero) {
        updateScene({ heroAssetUrl: newUrl });
      } else {
        updateObject(selectedObjectIndex, { glbUrl: newUrl });
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-5 text-white w-72">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-60">Selected</div>
          <div className="text-lg font-bold capitalize">{objectName}</div>
        </div>
        <button
          onClick={() => setSelectedObjectIndex(null)}
          className="text-slate-400 hover:text-white transition text-xl leading-none"
          title="Deselect (Esc)"
          disabled={isRegenerating}
        >
          ×
        </button>
      </div>

      <div className="text-xs space-y-1 opacity-80 mb-4">
        <div>
          <span className="font-semibold">Drag arrows</span> to move
        </div>
        <div>
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">R</kbd>{" "}
          rotate ·{" "}
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">⌘C</kbd>/
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">⌘V</kbd>{" "}
          copy/paste
        </div>
        <div>
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Del</kbd>{" "}
          delete ·{" "}
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd>{" "}
          deselect
        </div>
      </div>

      {/* Scale slider */}
      <div className="mb-4 pb-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs uppercase tracking-widest opacity-60">Scale</label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono opacity-80">
              {currentScale.toFixed(2)}×
            </span>
            <button
              onClick={() => setScale(1)}
              className="text-[10px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded transition"
              title="Reset to 1.0×"
            >
              Reset
            </button>
          </div>
        </div>
        <input
          type="range"
          min={SCALE_MIN}
          max={SCALE_MAX}
          step={SCALE_STEP}
          value={currentScale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] opacity-50 mt-1">
          <span>{SCALE_MIN}×</span>
          <span>1×</span>
          <span>{SCALE_MAX}×</span>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/40 border border-red-700 rounded text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Action buttons — Duplicate + Regenerate side by side */}
      <div className="flex gap-2 mb-2">
        <button
          onClick={handleDuplicate}
          disabled={isRegenerating}
          className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
          title="Duplicate (or ⌘C then ⌘V)"
        >
          📋 Duplicate
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
        >
          {isRegenerating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Regen…
            </>
          ) : (
            <>🔄 Regenerate</>
          )}
        </button>
      </div>

      {/* Delete button — full width, danger color */}
      <button
        onClick={handleDelete}
        disabled={isRegenerating}
        className="w-full px-3 py-2 bg-red-700/80 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-1"
        title="Delete (or Del key)"
      >
        🗑 Delete
      </button>

      {isRegenerating && (
        <div className="mt-2 text-[10px] opacity-60 text-center">
          TRELLIS is building a new 3D model
        </div>
      )}
    </div>
  );
}