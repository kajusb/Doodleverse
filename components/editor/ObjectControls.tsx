"use client";

import { useSceneState } from "@/lib/sceneState";

const MOVE_STEP = 1.0; // meters per click
const ROTATE_STEP = Math.PI / 4; // 45 degrees per click

export function ObjectControls() {
  const { editMode, selectedObjectIndex, scene, updateObject, updateScene } = useSceneState();

  if (!editMode || selectedObjectIndex === null) return null;

  // Determine if this is the single-hero scene (uses scene.heroX/Z/Rotation)
  const isSingleHero = !!scene.heroAssetUrl;

  const getCurrent = () => {
    if (isSingleHero) {
      return {
        x: scene.heroX ?? 0,
        z: scene.heroZ ?? 0,
        y: 0,
        rotation: scene.heroRotation ?? 0,
      };
    }
    const obj = scene.objects[selectedObjectIndex];
    return {
      x: obj?.x ?? 0,
      z: obj?.z ?? 0,
      y: obj?.y ?? 0,
      rotation: obj?.rotation ?? 0,
    };
  };

  const apply = (updates: Partial<{ x: number; y: number; z: number; rotation: number }>) => {
    if (isSingleHero) {
      updateScene({
        ...(updates.x !== undefined ? { heroX: updates.x } : {}),
        ...(updates.z !== undefined ? { heroZ: updates.z } : {}),
        ...(updates.rotation !== undefined ? { heroRotation: updates.rotation } : {}),
      });
    } else {
      updateObject(selectedObjectIndex, updates);
    }
  };

  const cur = getCurrent();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-4 text-white">
      <div className="text-xs uppercase tracking-widest opacity-60 mb-3 text-center">
        Move object
      </div>

      {/* Directional pad layout */}
      <div className="grid grid-cols-3 gap-1 mb-3" style={{ gridTemplateColumns: "auto auto auto" }}>
        {/* Top row: forward */}
        <div />
        <button
          onClick={() => apply({ z: cur.z - MOVE_STEP })}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Forward"
        >
          ↑
        </button>
        <div />

        {/* Middle row: left, up/down, right */}
        <button
          onClick={() => apply({ x: cur.x - MOVE_STEP })}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Left"
        >
          ←
        </button>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => apply({ y: cur.y + MOVE_STEP })}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs transition"
            title="Up"
          >
            ⤴ Up
          </button>
          <button
            onClick={() => apply({ y: Math.max(0, cur.y - MOVE_STEP) })}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs transition"
            title="Down"
          >
            ⤵ Down
          </button>
        </div>
        <button
          onClick={() => apply({ x: cur.x + MOVE_STEP })}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Right"
        >
          →
        </button>

        {/* Bottom row: backward */}
        <div />
        <button
          onClick={() => apply({ z: cur.z + MOVE_STEP })}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded transition"
          title="Backward"
        >
          ↓
        </button>
        <div />
      </div>

      {/* Rotate buttons */}
      <div className="flex gap-2 justify-center pt-3 border-t border-slate-700">
        <button
          onClick={() => apply({ rotation: cur.rotation - ROTATE_STEP })}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm transition"
          title="Rotate left (or press R)"
        >
          ↺ Rotate
        </button>
        <button
          onClick={() => apply({ rotation: cur.rotation + ROTATE_STEP })}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm transition"
          title="Rotate right"
        >
          ↻ Rotate
        </button>
      </div>

      <div className="text-[10px] opacity-50 text-center mt-2">
        Press <kbd className="bg-slate-800 px-1 rounded">R</kbd> to rotate, <kbd className="bg-slate-800 px-1 rounded">Esc</kbd> to deselect
      </div>
    </div>
  );
}