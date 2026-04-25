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

  // Web Audio API refs — gives us a gapless loop unlike <audio>
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

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

  // Set up gapless looping audio when the scene is ready
  useEffect(() => {
    if (state.status !== "ready" || !state.musicUrl) return;

    let cancelled = false;

    const startAudio = async () => {
      try {
        // Fetch and decode the audio bytes into a buffer we can loop in-memory
        const res = await fetch(state.musicUrl!);
        const arrayBuf = await res.arrayBuffer();

        // Use webkit prefix as fallback for older Safari
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        if (cancelled) {
          ctx.close();
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuf;
        source.loop = true;
        // Trim the encoder padding off the loop boundaries (~10ms each side)
        source.loopStart = 0.25;
        source.loopEnd = audioBuf.duration - 0.25;

        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        source.connect(gain).connect(ctx.destination);
        source.start();

        audioCtxRef.current = ctx;
        sourceRef.current = source;
        gainRef.current = gain;

        // If the AudioContext is suspended (browser autoplay block), try to
        // resume on first click anywhere on the page
        if (ctx.state === "suspended") {
          setNeedsClickToPlay(true);
          const resume = async () => {
            await ctx.resume();
            if (ctx.state === "running") {
              setNeedsClickToPlay(false);
              window.removeEventListener("click", resume);
            }
          };
          window.addEventListener("click", resume);
        }
      } catch (e) {
        console.warn("Audio setup failed:", e);
      }
    };

    startAudio();

    return () => {
      cancelled = true;
      try {
        sourceRef.current?.stop();
      } catch { /* already stopped */ }
      audioCtxRef.current?.close();
      sourceRef.current = null;
      gainRef.current = null;
      audioCtxRef.current = null;
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

      <button
        onClick={() => router.push("/upload")}
        className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition text-sm z-10"
      >
        ← New sketch
      </button>

      {needsClickToPlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-sm pointer-events-none">
          Click anywhere to enable music
        </div>
      )}
    </>
  );
}