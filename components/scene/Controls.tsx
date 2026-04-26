"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import type { SceneJson } from "@/types/scene";
import { useCollisionRegistry, ColliderBox } from "@/lib/collisionRegistry";

// AABB collision check at one (x, y, z) point against a list of boxes
function findBlockingBox(
  boxes: ColliderBox[],
  x: number,
  y: number,
  z: number,
  radius = 0.3,
): ColliderBox | null {
  for (const b of boxes) {
    const a = b.aabb;
    if (
      x + radius > a.minX && x - radius < a.maxX &&
      z + radius > a.minZ && z - radius < a.maxZ &&
      y > a.minY && y < a.maxY
    ) {
      return b;
    }
  }
  return null;
}

// Find the topmost box surface beneath (x, z) at or below current y
function findGroundUnder(
  boxes: ColliderBox[],
  x: number,
  z: number,
  y: number,
  radius = 0.3,
): number {
  let highest = 0;
  for (const b of boxes) {
    const a = b.aabb;
    const overlapXZ =
      x + radius > a.minX && x - radius < a.maxX &&
      z + radius > a.minZ && z - radius < a.maxZ;
    if (!overlapXZ) continue;
    if (a.maxY <= y + 0.01 && a.maxY > highest) {
      highest = a.maxY;
    }
  }
  return highest;
}

// If the camera overlaps any blocker on the XZ plane, shove it out
function resolveOverlap(
  camera: THREE.Camera,
  boxes: ColliderBox[],
  bodyY: number,
  radius = 0.3,
) {
  for (const b of boxes) {
    const a = b.aabb;
    if (bodyY < a.minY || bodyY > a.maxY) continue;
    const overlapX = camera.position.x + radius > a.minX && camera.position.x - radius < a.maxX;
    const overlapZ = camera.position.z + radius > a.minZ && camera.position.z - radius < a.maxZ;
    if (!overlapX || !overlapZ) continue;

    const pushPosX = a.maxX - (camera.position.x - radius);
    const pushNegX = (camera.position.x + radius) - a.minX;
    const pushPosZ = a.maxZ - (camera.position.z - radius);
    const pushNegZ = (camera.position.z + radius) - a.minZ;

    const minPush = Math.min(pushPosX, pushNegX, pushPosZ, pushNegZ);
    if (minPush === pushPosX)      camera.position.x += pushPosX + 0.001;
    else if (minPush === pushNegX) camera.position.x -= pushNegX + 0.001;
    else if (minPush === pushPosZ) camera.position.z += pushPosZ + 0.001;
    else                            camera.position.z -= pushNegZ + 0.001;
  }
}

export function Controls({
  speed = 5,
  eyeHeight = 1.6,
  jumpVelocity = 6,
  gravity = 18,
  stepUpHeight = 1.0,
}: {
  scene: SceneJson;
  speed?: number;
  eyeHeight?: number;
  jumpVelocity?: number;
  gravity?: number;
  stepUpHeight?: number;
}) {
  const reg = useCollisionRegistry();
  const keys = useRef<Record<string, boolean>>({});
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  // Separate from horizontal so movement still works while airborne
  const verticalVel = useRef(0);
  const onGround = useRef(true);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === "Space" && onGround.current) {
        verticalVel.current = jumpVelocity;
        onGround.current = false;
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [jumpVelocity]);

  useFrame((state, delta) => {
    const camera = state.camera;
    const k = keys.current;

    const boxes = reg.getBoxes();
    // Both block and wall stop horizontal movement
    const blockers = boxes.filter(b => b.mode === "block" || b.mode === "wall");

    // Horizontal movement (axis-by-axis so we slide along walls)
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    let dx = 0;
    let dz = 0;
    if (k["KeyW"] || k["ArrowUp"])    { dx += forward.current.x; dz += forward.current.z; }
    if (k["KeyS"] || k["ArrowDown"])  { dx -= forward.current.x; dz -= forward.current.z; }
    if (k["KeyD"] || k["ArrowRight"]) { dx += right.current.x;   dz += right.current.z; }
    if (k["KeyA"] || k["ArrowLeft"])  { dx -= right.current.x;   dz -= right.current.z; }

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      const boost = k["ShiftLeft"] || k["ShiftRight"] ? 2 : 1;
      const step = (speed * boost * delta) / len;
      dx *= step;
      dz *= step;

      const standingY = camera.position.y - eyeHeight;
      const bodyY = camera.position.y - 0.5;

      // Group height map: tallest box per object
      const groupMaxY = new Map<string, number>();
      for (const b of blockers) {
        const cur = groupMaxY.get(b.groupId) ?? -Infinity;
        if (b.aabb.maxY > cur) groupMaxY.set(b.groupId, b.aabb.maxY);
      }

      // Walls always block. Other blockers block only if too tall to step on
      const isImpassable = (block: ColliderBox | null): boolean => {
        if (!block) return false;
        if (block.mode === "wall") return true;
        const groupTop = groupMaxY.get(block.groupId) ?? block.aabb.maxY;
        return (groupTop - standingY) > stepUpHeight;
      };

      // Try X
      const xBlock = findBlockingBox(blockers, camera.position.x + dx, bodyY, camera.position.z);
      if (!xBlock || !isImpassable(xBlock)) {
        camera.position.x += dx;
      }
      // Try Z
      const zBlock = findBlockingBox(blockers, camera.position.x, bodyY, camera.position.z + dz);
      if (!zBlock || !isImpassable(zBlock)) {
        camera.position.z += dz;
      }
    }

    // Push-out — handles diagonal wedges and floating-point creep
    resolveOverlap(camera, blockers, camera.position.y - 0.5);

    // Vertical movement (jump + gravity, with smooth step-up onto objects)
    // Walls are NOT valid landing surfaces so we exclude them
    verticalVel.current -= gravity * delta;
    const newY = camera.position.y + verticalVel.current * delta;

    const landables = boxes.filter(b => b.mode !== "wall");
    const support = findGroundUnder(
      landables,
      camera.position.x,
      camera.position.z,
      camera.position.y,
    );
    const floor = support + eyeHeight;

    if (newY <= floor) {
      if (camera.position.y < floor && verticalVel.current <= 0) {
        // Stepping up onto a higher surface, ease the camera up
        const diff = floor - camera.position.y;
        // 0.12 = roughly 200ms to climb a small rock. Lower = slower
        const t = 1 - Math.pow(1 - 0.12, delta * 60);
        if (diff < 0.02) {
          camera.position.y = floor;
        } else {
          camera.position.y += diff * t;
        }
        verticalVel.current = 0;
        onGround.current = true;
      } else {
        // Normal landing from above
        camera.position.y = floor;
        verticalVel.current = 0;
        onGround.current = true;
      }
    } else {
      camera.position.y = newY;
      onGround.current = false;
    }
  });

  return <SafePointerLockControls />;
}

// Wraps Drei's PointerLockControls and silently absorbs the SecurityError
// the browser throws when you spam Esc + click. The error is harmless but
// surfaces as a Next.js error overlay if not caught
function SafePointerLockControls() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    // Catch synchronous throws from rapid re-lock attempts
    const onClick = () => {
      try {
        canvas.requestPointerLock();
      } catch {
        // Browser cooldown — ignore, user can try again
      }
    };
    canvas.addEventListener("click", onClick);

    // Catch async rejections from the lock promise
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = String(e.reason?.message ?? e.reason ?? "");
      if (msg.includes("pointer lock") || msg.includes("exited the lock")) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, [gl]);

  return <PointerLockControls onLock={() => {}} onUnlock={() => {}} />;
}