"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

export function Controls({
  speed = 5,
  eyeHeight = 1.6,
  jumpVelocity = 6,
  gravity = 18,
}: {
  speed?: number;
  eyeHeight?: number;
  jumpVelocity?: number;
  gravity?: number;
}) {
  const keys = useRef<Record<string, boolean>>({});
  const direction = useRef(new THREE.Vector3());
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

    // Horizontal movement
    camera.getWorldDirection(forward.current);
    forward.current.y = 0;
    forward.current.normalize();
    right.current.crossVectors(forward.current, camera.up).normalize();

    direction.current.set(0, 0, 0);
    if (k["KeyW"] || k["ArrowUp"]) direction.current.add(forward.current);
    if (k["KeyS"] || k["ArrowDown"]) direction.current.sub(forward.current);
    if (k["KeyD"] || k["ArrowRight"]) direction.current.add(right.current);
    if (k["KeyA"] || k["ArrowLeft"]) direction.current.sub(right.current);

    if (direction.current.lengthSq() > 0) {
      direction.current.normalize();
      const boost = k["ShiftLeft"] || k["ShiftRight"] ? 2 : 1;
      direction.current.multiplyScalar(speed * boost * delta);
      camera.position.x += direction.current.x;
      camera.position.z += direction.current.z;
    }

    // Vertical movement (jump + gravity)
    verticalVel.current -= gravity * delta;
    camera.position.y += verticalVel.current * delta;

    // Land on the ground (eye height = floor)
    if (camera.position.y <= eyeHeight) {
      camera.position.y = eyeHeight;
      verticalVel.current = 0;
      onGround.current = true;
    }
  });

  return <PointerLockControls />;
}