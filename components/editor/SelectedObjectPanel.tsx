"use client";

import { useSceneState } from "@/lib/sceneState";

export function SelectedObjectPanel() {
  const { scene, selectedObjectIndex, setSelectedObjectIndex } = useSceneState();

  if (selectedObjectIndex === null) return null;

  const isSingleHero = !!scene.heroAssetUrl;
  const obj = isSingleHero ? null : scene.objects[selectedObjectIndex];
  const objectName = isSingleHero ? scene.name : (obj?.description || obj?.type || "Object");

  const handleRegenerate = () => {

    alert("Regenerate is coming soon- needs the original sketch saved.");
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

      <button
        onClick={handleRegenerate}
        className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition"
      >
        🔄 Regenerate model
      </button>
    </div>
  );
}