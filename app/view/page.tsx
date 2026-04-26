"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { SceneJson } from "@/types/scene";
import { SceneStateProvider, useSceneState } from "@/lib/sceneState";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { SelectedObjectPanel } from "@/components/editor/SelectedObjectPanel";
import { AddObjectButton } from "@/components/editor/AddObjectButton";

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
    <SceneStateProvider initialScene={state.scene} initialMusicUrl={state.musicUrl}>
      <ViewContent onNewSketch={() => router.push("/upload")} />
    </SceneStateProvider>
  );
}

function ViewContent({ onNewSketch }: { onNewSketch: () => void }) {
  const { scene, musicUrl } = useSceneState();
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);

  // Audio refs persist across renders so we can stop / replace sources
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Whenever musicUrl changes (initial load OR regenerate), decode and play.
  // Uses Web Audio API's BufferSource with loop=true for gapless playback.
  useEffect(() => {
    if (!musicUrl) {
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
      return;
    }

    let cancelled = false;

    const setupAudio = async () => {
      try {
        console.log("Music: starting setup");

        // Create or reuse the AudioContext
        let ctx = audioCtxRef.current;
        if (!ctx) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctx = new Ctx();
          audioCtxRef.current = ctx;
          console.log("Music: created AudioContext, initial state =", ctx.state);
        }

        // Fetch the audio bytes
        const res = await fetch(musicUrl);
        if (!res.ok) throw new Error(`Failed to fetch music: ${res.status}`);
        const arrayBuf = await res.arrayBuffer();
        console.log("Music: fetched", arrayBuf.byteLength, "bytes");

        // Decode (slice to avoid mutation issues with re-decoding)
        const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
        console.log("Music: decoded, duration =", audioBuf.duration.toFixed(2), "s");

        if (cancelled) return;

        // Stop the previous source BEFORE starting the new one
        try { sourceRef.current?.stop(); } catch { /* already stopped */ }

        // Build the source. Web Audio's loop=true is sample-accurate gapless —
        // there's no extra latency between loop end and loop start.
        const source = ctx.createBufferSource();
        source.buffer = audioBuf;
        source.loop = true;
        // Loop the entire buffer. No trimming — let the original audio repeat as-is.
        // (If you hear a click at the loop point, change loopStart/End.)
        source.loopStart = 0;
        source.loopEnd = audioBuf.duration;

        // Reuse / create gain node (volume)
        let gain = gainRef.current;
        if (!gain) {
          gain = ctx.createGain();
          gain.gain.value = 0.5;
          gain.connect(ctx.destination);
          gainRef.current = gain;
        }

        source.connect(gain);
        source.start();
        sourceRef.current = source;
        console.log("Music: source started, looping enabled");

        // If the audio context is suspended (browser autoplay policy), we
        // need a user gesture to resume. Listen for any input.
        if (ctx.state === "suspended") {
          console.log("Music: context suspended, awaiting user gesture");
          setNeedsClickToPlay(true);

          const resume = async () => {
            try {
              await ctx!.resume();
              console.log("Music: context resumed, state =", ctx!.state);
              if (ctx!.state === "running") {
                setNeedsClickToPlay(false);
                window.removeEventListener("click", resume);
                window.removeEventListener("keydown", resume);
                window.removeEventListener("touchstart", resume);
              }
            } catch (e) {
              console.warn("Music: failed to resume context", e);
            }
          };
          window.addEventListener("click", resume);
          window.addEventListener("keydown", resume);
          window.addEventListener("touchstart", resume);
        } else {
          setNeedsClickToPlay(false);
        }
      } catch (e) {
        console.error("Music: setup failed", e);
      }
    };

    setupAudio();

    return () => {
      cancelled = true;
    };
  }, [musicUrl]);

  // Cleanup the audio context on unmount
  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch { /* already stopped */ }
      audioCtxRef.current?.close();
      sourceRef.current = null;
      gainRef.current = null;
      audioCtxRef.current = null;
    };
  }, []);

  return (
    <>
      <Scene scene={scene} />

      <button
        onClick={onNewSketch}
        className="absolute top-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-sm text-white rounded-lg hover:bg-black/70 transition text-sm z-[100]"
      >
        ← New sketch
      </button>

      <AddObjectButton />

      <EditorPanel />
      <SelectedObjectPanel />

      {needsClickToPlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-sm pointer-events-none z-[100]">
          Click anywhere to enable music
        </div>
      )}
    </>
  );
}