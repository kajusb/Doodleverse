"use client";

import { useState } from "react";
import { useSceneState } from "@/lib/sceneState";

export function SelectedObjectPanel() {
  const { scene, selectedObjectIndex, setSelectedObjectIndex, updateScene, updateObject } = useSceneState();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (selectedObjectIndex === null) return null;

  const isSingleHero = selectedObjectIndex === -1 && !!scene.heroAssetUrl;
  const obj = isSingleHero ? null : scene.objects[selectedObjectIndex];
  const objectName = isSingleHero ? scene.name : (obj?.description || obj?.type || "Object");

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

      // Swap in the new model URL only — keep position/rotation as-is so it
      // appears where the old one was.
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
          to rotate
        </div>
        <div>
          <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd>{" "}
          to deselect
        </div>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-900/40 border border-red-700 rounded text-xs text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleRegenerate}
        disabled={isRegenerating}
        className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
      >
        {isRegenerating ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Regenerating... (~60s)
          </>
        ) : (
          <>🔄 Regenerate model</>
        )}
      </button>

      {isRegenerating && (
        <div className="mt-2 text-[10px] opacity-60 text-center">
          TRELLIS is building a new 3D model
        </div>
      )}
    </div>
  );
}