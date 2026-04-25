"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { SceneJson } from "@/types/scene";

const Scene = dynamic(
  () => import("@/components/scene/Scene").then((m) => m.Scene),
  { ssr: false }
);

type LoadState =
  | { status: "loading" }
  | { status: "ready"; scene: SceneJson; musicUrl: string | null }
  | { status: "missing" };

export default function ViewPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("doodleverse:scene");
    if (!raw) {
      setState({ status: "missing" });
      return;
    }
    try {
      const scene = JSON.parse(raw) as SceneJson;
      const musicUrl = sessionStorage.getItem("doodleverse:music");
      setState({ status: "ready", scene, musicUrl });
    } catch {
      setState({ status: "missing" });
    }
  }, []);

  // Try to start music as soon as the scene is ready
  useEffect(() => {
    if (state.status !== "ready" || !state.musicUrl) return;

    const audio = new Audio(state.musicUrl);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.play().catch(() => {
      // Browser blocked autoplay. Wait for the first user click to retry
      setNeedsClickToPlay(true);
      const tryPlay = () => {
        audio.play().then(() => setNeedsClickToPlay(false)).catch(() => {});
        window.removeEventListener("click", tryPlay);
      };
      window.addEventListener("click", tryPlay);
    });

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [state]);

  if (state.status === "loading") return null;

  if (state.status === "missing") {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="text-xl mb-3">No generated scene found</div>
        <button
          onClick={() => router.push("/upload")}
          className="px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 font-semibold"
        >
          Upload a sketch
        </button>
      </div>
    );
  }

  return (
    <>
      <Scene scene={state.scene} />

      {/* Single button: back to upload */}
      <button
        onClick={() => router.push("/upload")}
        className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition text-sm z-10"
      >
        ← New sketch
      </button>

      {/* Subtle hint if browser blocked music autoplay */}
      {needsClickToPlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-sm pointer-events-none">
          Click anywhere to enable music
        </div>
      )}
    </>
  );
}