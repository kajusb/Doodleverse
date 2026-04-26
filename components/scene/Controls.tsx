"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCollisionRegistry } from "@/lib/collisionRegistry";
import type { SceneJson } from "@/types/scene";

interface Props {
  scene: SceneJson;
}

const PLAYER_HEIGHT = 1.6;
const PLAYER_RADIUS = 0.4;
const WALK_SPEED = 6.0;
const RUN_SPEED = 12.0;
const MOUSE_SENSITIVITY = 0.0025;

export function Controls({ scene: _scene }: Props) {
  const gl = useThree((s) => s.gl);
  const reg = useCollisionRegistry();

  // Look angles (refs so they survive renders without triggering them)
  const yaw = useRef(0);
  const pitch = useRef(0);
  // Held movement keys
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  // Whether right mouse button is held — only then does mouse-look work
  const isLooking = useRef(false);
  // Whether we've initialized the camera position yet
  const initialized = useRef(false);

  // Mouse look — only active while right mouse is held
  useEffect(() => {
    const canvas = gl.domElement;

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isLooking.current = true;
        canvas.style.cursor = "grabbing";
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        isLooking.current = false;
        canvas.style.cursor = "";
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isLooking.current) return;
      yaw.current -= e.movementX * MOUSE_SENSITIVITY;
      pitch.current -= e.movementY * MOUSE_SENSITIVITY;
      const limit = Math.PI / 2 - 0.05;
      pitch.current = Math.max(-limit, Math.min(limit, pitch.current));
    };

    const onMouseLeave = () => {
      isLooking.current = false;
      canvas.style.cursor = "";
    };

    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    return () => {
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [gl]);

  // Keyboard: WASD movement
  useEffect(() => {
    const setKey = (code: string, down: boolean) => {
      switch (code) {
        case "KeyW":
        case "ArrowUp":
          keys.current.w = down;
          break;
        case "KeyA":
        case "ArrowLeft":
          keys.current.a = down;
          break;
        case "KeyS":
        case "ArrowDown":
          keys.current.s = down;
          break;
        case "KeyD":
        case "ArrowRight":
          keys.current.d = down;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          keys.current.shift = down;
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys when user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      ) {
        return;
      }
      setKey(e.code, true);
    };
    const onKeyUp = (e: KeyboardEvent) => setKey(e.code, false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Per-frame: read state.camera from useFrame's state arg (NOT the
  // captured camera from useThree — that's what triggers React Compiler).
  // Mutating the camera through this argument is the canonical R3F pattern.
  useFrame((state, delta) => {
    const camera = state.camera;

    // Initialize position on first frame
    if (!initialized.current) {
      camera.position.set(0, PLAYER_HEIGHT, 12);
      camera.rotation.order = "YXZ";
      initialized.current = true;
    }

    // Apply look angles
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // Compute movement direction from WASD relative to camera yaw
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw.current
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      yaw.current
    );

    const move = new THREE.Vector3();
    if (keys.current.w) move.add(forward);
    if (keys.current.s) move.sub(forward);
    if (keys.current.d) move.add(right);
    if (keys.current.a) move.sub(right);

    if (move.lengthSq() > 0) {
      move.normalize();
      const speed = keys.current.shift ? RUN_SPEED : WALK_SPEED;
      move.multiplyScalar(speed * delta);

      const next = camera.position.clone().add(move);
      const blockedX = collidesAt(next.x, camera.position.z, reg);
      const blockedZ = collidesAt(camera.position.x, next.z, reg);
      if (!blockedX) camera.position.x = next.x;
      if (!blockedZ) camera.position.z = next.z;
    }

    camera.position.y = PLAYER_HEIGHT;
  });

  return null;
}

function collidesAt(
  x: number,
  z: number,
  reg: ReturnType<typeof useCollisionRegistry>
): boolean {
  const boxes = reg.getBoxes();
  for (const c of boxes) {
    if (c.mode !== "wall" && c.mode !== "block") continue;
    // Inflate AABB by player radius for a cylinder-like check
    if (
      x > c.aabb.minX - PLAYER_RADIUS &&
      x < c.aabb.maxX + PLAYER_RADIUS &&
      z > c.aabb.minZ - PLAYER_RADIUS &&
      z < c.aabb.maxZ + PLAYER_RADIUS
    ) {
      return true;
    }
  }
  return false;
}