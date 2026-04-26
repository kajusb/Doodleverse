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
  // True while user is actively dragging the selected object
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
}

const SceneStateContext = createContext<SceneStateContextValue | null>(null);

export function SceneStateProvider({
  initialScene,
  children,
}: {
  initialScene: SceneJson;
  children: ReactNode;
}) {
  const [scene, setScene] = useState<SceneJson>(initialScene);
  const [editMode, setEditMode] = useState(false);
  const [selectedObjectIndex, setSelectedObjectIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("doodleverse:scene", JSON.stringify(scene));
  }, [scene]);

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