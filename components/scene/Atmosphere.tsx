"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Cloud, Clouds, Stars } from "@react-three/drei";
import * as THREE from "three";
import type { AtmosphereMood } from "@/lib/sceneAtmosphere";

interface Props {
  mood: AtmosphereMood;
}

// Renders mood-appropriate atmospheric extras (clouds, stars, snow, etc.)
export function Atmosphere({ mood }: Props) {
  switch (mood) {
    case "sunny":
      return <SunnyClouds />;
    case "sunset":
      return <SunsetClouds />;
    case "night":
      return <NightSky />;
    case "spooky":
      return <SpookyAir />;
    case "snowy":
      return <SnowfallAndClouds />;
    case "magical":
      return <MagicalClouds />;
    case "stormy":
      return <StormClouds />;
    case "underwater":
      return <Bubbles />;
    case "alien":
      return <AlienHaze />;
    default:
      return null;
  }
}

// Soft white scattered clouds for sunny days
function SunnyClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      <Cloud seed={1} segments={20} bounds={[60, 4, 60]} volume={20}
        color="white" opacity={0.6} position={[10, 30, -20]} />
      <Cloud seed={2} segments={20} bounds={[60, 4, 60]} volume={20}
        color="white" opacity={0.5} position={[-30, 35, 20]} />
      <Cloud seed={3} segments={20} bounds={[80, 4, 80]} volume={25}
        color="white" opacity={0.55} position={[40, 32, 40]} />
    </Clouds>
  );
}

// Pink/orange tinted clouds for golden hour
function SunsetClouds() {
  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      <Cloud seed={1} segments={25} bounds={[80, 5, 80]} volume={30}
        color="#ffb088" opacity={0.7} position={[15, 25, -25]} />
      <Cloud seed={2} segments={25} bounds={[80, 5, 80]} volume={30}
        color="#ff9070" opacity={0.6} position={[-20, 28, 15]} />
      <Cloud seed={3} segments={20} bounds={[60, 4, 60]} volume={20}
        color="#ffc0a0" opacity={0.5} position={[35, 30, 35]} />
    </Clouds>
  );
}

// Stars for nighttime — twinkle effect via Drei
function NightSky() {
  return (
    <>
      <Stars radius={200} depth={60} count={3000} factor={4}
        saturation={0} fade speed={1} />
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={5} segments={30} bounds={[100, 6, 100]} volume={40}
          color="#1a1a30" opacity={0.4} position={[0, 40, 0]} />
      </Clouds>
    </>
  );
}

// Wispy dark fog for haunted/spooky scenes
function SpookyAir() {
  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      <Cloud seed={1} segments={40} bounds={[120, 8, 120]} volume={50}
        color="#404560" opacity={0.5} position={[0, 20, 0]} />
      <Cloud seed={2} segments={30} bounds={[80, 6, 80]} volume={30}
        color="#2a2a40" opacity={0.6} position={[10, 8, 10]} />
      <Cloud seed={3} segments={30} bounds={[80, 6, 80]} volume={30}
        color="#2a2a40" opacity={0.6} position={[-15, 6, -10]} />
    </Clouds>
  );
}

// Heavy white clouds + falling snow particles
function SnowfallAndClouds() {
  return (
    <>
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={30} bounds={[100, 6, 100]} volume={40}
          color="#e0e0e8" opacity={0.7} position={[0, 35, 0]} />
        <Cloud seed={2} segments={25} bounds={[80, 5, 80]} volume={30}
          color="#d8d8e0" opacity={0.6} position={[20, 30, -20]} />
      </Clouds>
      <Snowfall />
    </>
  );
}

// Pink/purple dreamy clouds for fantasy
function MagicalClouds() {
  return (
    <>
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={25} bounds={[70, 5, 70]} volume={25}
          color="#ffc0e0" opacity={0.6} position={[15, 28, -15]} />
        <Cloud seed={2} segments={25} bounds={[70, 5, 70]} volume={25}
          color="#d0a0ff" opacity={0.5} position={[-20, 32, 20]} />
        <Cloud seed={3} segments={20} bounds={[50, 4, 50]} volume={20}
          color="#ffb0d0" opacity={0.55} position={[30, 25, 35]} />
      </Clouds>
      <Stars radius={150} depth={50} count={500} factor={2}
        saturation={1} fade speed={2} />
    </>
  );
}

// Heavy dark clouds + gentle drizzle for stormy weather
function StormClouds() {
  return (
    <>
      <Clouds material={THREE.MeshBasicMaterial}>
        <Cloud seed={1} segments={35} bounds={[120, 8, 120]} volume={50}
          color="#3a4050" opacity={0.85} position={[0, 30, 0]} />
        <Cloud seed={2} segments={30} bounds={[80, 6, 80]} volume={35}
          color="#2a3040" opacity={0.8} position={[20, 28, -15]} />
        <Cloud seed={3} segments={30} bounds={[80, 6, 80]} volume={35}
          color="#2a3040" opacity={0.8} position={[-25, 25, 20]} />
      </Clouds>
      <Rainfall />
    </>
  );
}

// Rising bubbles for underwater scenes
function Bubbles() {
  return <BubbleField />;
}

// Dust haze for alien/mars scenes
function AlienHaze() {
  return (
    <Clouds material={THREE.MeshBasicMaterial}>
      <Cloud seed={1} segments={30} bounds={[100, 5, 100]} volume={35}
        color="#a04030" opacity={0.4} position={[0, 15, 0]} />
      <Cloud seed={2} segments={25} bounds={[80, 4, 80]} volume={25}
        color="#c05040" opacity={0.3} position={[20, 12, -20]} />
    </Clouds>
  );
}

// === Particle effects ===

// Falling snow — small white points drifting downward, recycle when below ground
function Snowfall() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 800;

  // Build the BufferAttribute imperatively so R3F doesn't complain about
  // missing `args` prop on declarative <bufferAttribute>.
  const { positionAttr, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      velocities[i] = 0.05 + Math.random() * 0.1;
    }
    const positionAttr = new THREE.BufferAttribute(positions, 3);
    return { positionAttr, velocities };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] -= velocities[i] * delta * 60;
      pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.05) * 0.01;
      if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 40;
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry attach="geometry" attributes-position={positionAttr} />
      <pointsMaterial
        size={0.15}
        color="white"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Falling rain — gentle drizzle, not a downpour
function Rainfall() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 500;

  const { positionAttr, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      // Slower fall — softer feel
      velocities[i] = 0.6 + Math.random() * 0.4;
    }
    const positionAttr = new THREE.BufferAttribute(positions, 3);
    return { positionAttr, velocities };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] -= velocities[i] * delta * 60;
      // Subtle slant
      pos[i * 3] += velocities[i] * delta * 2;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 40;
        pos[i * 3] = (Math.random() - 0.5) * 80;
      }
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry attach="geometry" attributes-position={positionAttr} />
      <pointsMaterial
        size={0.15}
        color="#a0b0c0"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  );
}

// Bubbles rising from the seafloor — same as snow but upward + transparent blue
function BubbleField() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 300;

  const { positionAttr, velocities } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      velocities[i] = 0.1 + Math.random() * 0.15;
    }
    const positionAttr = new THREE.BufferAttribute(positions, 3);
    return { positionAttr, velocities };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] += velocities[i] * delta * 60;
      pos[i * 3] += Math.sin(pos[i * 3 + 1] * 0.1 + i) * 0.005;
      if (pos[i * 3 + 1] > 30) pos[i * 3 + 1] = 0;
    }
    geom.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry attach="geometry" attributes-position={positionAttr} />
      <pointsMaterial
        size={0.3}
        color="#a0d0ff"
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}