"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import type { SceneJson } from "@/types/scene";

interface SceneStateContextValue {
  scene: SceneJson;
  updateScene: (updates: Partial<SceneJson>) => void;
  addObject: (obj: SceneJson["objects"][number]) => void;
  updateObject: (index: number, updates: Partial<SceneJson["objects"][number]>) => void;
  removeObject: (index: number) => void;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  selectedObjectIndex: number | null;
  setSelectedObjectIndex: (i: number | null) => void;
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  // Music URL (data URL) — null if no music. Updated on regenerate.
  musicUrl: string | null;
  setMusicUrl: (url: string | null) => void;
}

const SceneStateContext = createContext<SceneStateContextValue | null>(null);

export function SceneStateProvider({
  initialScene,
  initialMusicUrl,
  children,
}: {
  initialScene: SceneJson;
  initialMusicUrl?: string | null;
  children: ReactNode;
}) {
  const [scene, setScene] = useState<SceneJson>(initialScene);
  const [editMode, setEditMode] = useState(false);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(initialMusicUrl ?? null);

  useEffect(() => {
    sessionStorage.setItem("doodleverse:scene", JSON.stringify(scene));
  }, [scene]);

  // Save music to sessionStorage whenever it changes
  useEffect(() => {
    if (musicUrl) {
      sessionStorage.setItem("doodleverse:music", musicUrl);
    } else {
      sessionStorage.removeItem("doodleverse:music");
    }
  }, [musicUrl]);

  const updateScene = useCallback((updates: Partial<SceneJson>) => {
    setScene((prev) => ({ ...prev, ...updates }));
  }, []);

  const addObject = useCallback((obj: SceneJson["objects"][number]) => {
    setScene((prev) => ({ ...prev, objects: [...prev.objects, obj] }));
  }, []);

  const updateObject = useCallback(
    (index: number, updates: Partial<SceneJson["objects"][number]>) => {
      setScene((prev) => ({
        ...prev,
        objects: prev.objects.map((o, i) => (i === index ? { ...o, ...updates } : o)),
      }));
    },
    []
  );

  const removeObject = useCallback((index: number) => {
    setScene((prev) => ({
      ...prev,
      objects: prev.objects.filter((_, i) => i !== index),
    }));
  }, []);

  return (
    <SceneStateContext.Provider
      value={{
        scene,
        updateScene,
        addObject,
        updateObject,
        removeObject,
        editMode,
        setEditMode,
        selectedObjectIndex,
        setSelectedObjectIndex,
        isDragging,
        setIsDragging,
        musicUrl,
        setMusicUrl,
      }}
    >
      {children}
    </SceneStateContext.Provider>
  );
}

export function useSceneState() {
  const ctx = useContext(SceneStateContext);
  if (!ctx) throw new Error("useSceneState must be used within SceneStateProvider");
  return ctx;
}