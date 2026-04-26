"use client";

import { useSceneState } from "@/lib/sceneState";
import type { FogDensity } from "@/types/scene";
import { useState } from "react";
import { MusicControl } from "./MusicControl";

const MOOD_PRESETS: {
  id: string;
  name: string;
  sky: string;
  ground: string;
  fog: FogDensity;
  sun: [number, number, number];
}[] = [
  { id: "sunny", name: "☀️ Sunny", sky: "#87ceeb", ground: "#6aa84f", fog: "light", sun: [0.3, 1, 0.3] },
  { id: "sunset", name: "🌅 Sunset", sky: "#ff8c5a", ground: "#8a5a3a", fog: "light", sun: [1, 0.15, 0.5] },
  { id: "night", name: "🌙 Night", sky: "#0a0a25", ground: "#1a1a30", fog: "medium", sun: [0.3, 0.4, 0.3] },
  { id: "spooky", name: "👻 Spooky", sky: "#1a1a3e", ground: "#2d3a2d", fog: "medium", sun: [0.3, 0.4, 0.3] },
  { id: "snowy", name: "❄️ Snowy", sky: "#c8d4e0", ground: "#f5f5f8", fog: "light", sun: [0.3, 0.8, 0.3] },
  { id: "magical", name: "✨ Magical", sky: "#d4a4e0", ground: "#7a6acc", fog: "light", sun: [0.3, 1, 0.3] },
  { id: "stormy", name: "⛈️ Stormy", sky: "#4a5060", ground: "#3a4030", fog: "heavy", sun: [0.3, 0.6, 0.3] },
  { id: "underwater", name: "🌊 Underwater", sky: "#1a4060", ground: "#3a6070", fog: "medium", sun: [0.3, 0.4, 0.3] },
  { id: "alien", name: "👽 Alien", sky: "#c44030", ground: "#a04020", fog: "light", sun: [0.3, 0.6, 0.3] },
];

export function EditorPanel() {
  const { scene, updateScene, editMode, setEditMode } = useSceneState();
  const [open, setOpen] = useState(false);

  const applyMood = (preset: typeof MOOD_PRESETS[number]) => {
    updateScene({
      skyColor: preset.sky,
      groundColor: preset.ground,
      fogColor: preset.sky,
      fogDensity: preset.fog,
      sunPosition: preset.sun,
    });
  };

  return (
    <>
      {/* Toggle button — middle-left, always visible */}
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setEditMode(true);
        }}
        className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] bg-slate-800/95 hover:bg-slate-700 text-white px-4 py-3 rounded-lg backdrop-blur-sm border border-slate-600 transition shadow-2xl font-semibold"
      >
        {open ? "✕ Close" : "✏️ Edit"}
      </button>

      {/* Edit mode indicator — bottom-left, doesn't overlap the button */}
      {editMode && !open && (
        <div className="fixed bottom-4 left-4 z-[100] px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-sm backdrop-blur-sm">
          Edit mode
        </div>
      )}

      {/* Side panel — slides in from the right */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-[90] shadow-2xl transition-transform duration-300 overflow-y-auto ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 pt-8 space-y-6 text-white">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">World</div>
            <div className="text-xl font-bold">{scene.name}</div>
          </div>

          {/* Mood presets */}
          <div>
            <label className="block text-sm font-semibold mb-2">Mood preset</label>
            <div className="grid grid-cols-2 gap-2">
              {MOOD_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyMood(p)}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left text-sm transition border border-slate-700"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sky color */}
          <div>
            <label className="block text-sm font-semibold mb-2">Sky color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={scene.skyColor ?? "#87ceeb"}
                onChange={(e) => updateScene({ skyColor: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border border-slate-700"
              />
              <input
                type="text"
                value={scene.skyColor ?? "#87ceeb"}
                onChange={(e) => updateScene({ skyColor: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Ground color */}
          <div>
            <label className="block text-sm font-semibold mb-2">Ground color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={scene.groundColor ?? "#6aa84f"}
                onChange={(e) => updateScene({ groundColor: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer border border-slate-700"
              />
              <input
                type="text"
                value={scene.groundColor ?? "#6aa84f"}
                onChange={(e) => updateScene({ groundColor: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Music — generate or regenerate the background track */}
          <MusicControl />
        </div>
      </div>
    </>
  );
}