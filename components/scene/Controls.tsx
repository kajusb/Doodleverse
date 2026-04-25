"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

export function Controls({ speed = 5 }: { speed?: number }) {
  const three = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const direction = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => { keys.current[e.code] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((state, delta) => {

    const camera = state.camera;
    const k = keys.current;

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
      direction.current.normalize().multiplyScalar(speed * delta);
      camera.position.add(direction.current);
      camera.position.y = 1.6;
    }
  });

  return <PointerLockControls />;
}