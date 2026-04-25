"use client";

import { createContext, useCallback, useContext, useMemo, useRef } from "react";

export interface ColliderBox {
  id: string;
  groupId: string;
  aabb: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  // "block" = stops you, but climbable if short
  // "step"  = always climbable (rocks, bridges)
  // "wall"  = always solid, can't climb, can't land on (trees, etc.)
  mode: "block" | "step" | "wall";
}

interface RegistryAPI {
  register: (id: string, boxes: ColliderBox[]) => void;
  unregister: (id: string) => void;
  getBoxes: () => ColliderBox[];
}

const Ctx = createContext<RegistryAPI | null>(null);

export function CollisionProvider({ children }: { children: React.ReactNode }) {
  // Stored as Map<groupId, boxes[]> so unmount cleans up the whole group
  const map = useRef<Map<string, ColliderBox[]>>(new Map());

  const register = useCallback((id: string, boxes: ColliderBox[]) => {
    map.current.set(id, boxes);
  }, []);

  const unregister = useCallback((id: string) => {
    map.current.delete(id);
  }, []);

  const getBoxes = useCallback(() => {
    const all: ColliderBox[] = [];
    for (const list of map.current.values()) {
      for (const b of list) all.push(b);
    }
    return all;
  }, []);

  const api = useMemo<RegistryAPI>(
    () => ({ register, unregister, getBoxes }),
    [register, unregister, getBoxes],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCollisionRegistry(): RegistryAPI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCollisionRegistry must be used inside CollisionProvider");
  return ctx;
}