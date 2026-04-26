"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type SaveWorldPayload = {
  title: string;
  originalImageUrl?: string;
  generatedModelUrl: string;
  generatedThumbnailUrl?: string;
  audioUrl?: string | null;
  theme?: string;
  status: "completed";
};

type SavedGenerationResponse = {
  generation?: SaveWorldPayload;
  error?: string;
};

function normalizeString(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseSceneFromDataUrl(dataUrl: string): SceneJson | null {
  if (!dataUrl.startsWith("data:application/json")) {
    return null;
  }

  const parts = dataUrl.split(",", 2);
  if (parts.length !== 2) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(parts[1])) as SceneJson;
  } catch {
    return null;
  }
}

function getDraftFromSessionStorage(): SaveWorldPayload | null {
  const raw = sessionStorage.getItem("doodleverse:generationDraft");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SaveWorldPayload>;
    if (!parsed.generatedModelUrl || !parsed.title) {
      return null;
    }

    return {
      title: parsed.title,
      originalImageUrl: parsed.originalImageUrl,
      generatedModelUrl: parsed.generatedModelUrl,
      generatedThumbnailUrl: parsed.generatedThumbnailUrl,
      audioUrl: parsed.audioUrl ?? null,
      theme: parsed.theme,
      status: "completed",
    };
  } catch {
    return null;
  }
}

function getPayloadFromSearchParams(searchParams: URLSearchParams): SaveWorldPayload | null {
  const originalImageUrl = normalizeString(searchParams.get("originalImageUrl"));
  const generatedModelUrl = normalizeString(searchParams.get("modelUrl"));
  const title = normalizeString(searchParams.get("title")) ?? "My Generated World";

  if (!generatedModelUrl) {
    return null;
  }

  return {
    title,
    originalImageUrl: originalImageUrl ?? undefined,
    generatedModelUrl,
    generatedThumbnailUrl:
      normalizeString(searchParams.get("generatedThumbnailUrl")) ?? originalImageUrl ?? undefined,
    audioUrl: normalizeString(searchParams.get("audioUrl")) ?? null,
    theme: normalizeString(searchParams.get("theme")) ?? undefined,
    status: "completed",
  };
}

export default function ViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);
  const [savePayload, setSavePayload] = useState<SaveWorldPayload | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const generationId = searchParams.get("id")?.trim();

    if (generationId) {
      void (async () => {
        try {
          const response = await fetch(`/api/generations/${generationId}`, {
            cache: "no-store",
          });
          const data = (await response.json()) as SavedGenerationResponse;

          if (!response.ok || !data.generation) {
            throw new Error(data.error || `Failed to load saved world (${response.status})`);
          }

          const scene = parseSceneFromDataUrl(data.generation.generatedModelUrl);
          if (!scene) {
            throw new Error("Saved world data is invalid");
          }

          if (cancelled) {
            return;
          }

          setState({
            status: "ready",
            scene,
            musicUrl: data.generation.audioUrl ?? null,
          });
          setIsSaved(true);
          setSavePayload(null);
          setSaveError(null);
          setSaveSuccess(null);
        } catch {
          if (!cancelled) {
            setState({ status: "missing" });
            setIsSaved(false);
            setSavePayload(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const modelUrl = searchParams.get("modelUrl")?.trim();
    if (modelUrl) {
      const audioUrl = searchParams.get("audioUrl")?.trim() || null;
      const scene = parseSceneFromDataUrl(modelUrl);
      const isSavedWorld = searchParams.get("saved") === "1";

      if (scene) {
        setState({ status: "ready", scene, musicUrl: audioUrl });
      } else {
        setState({ status: "missing" });
      }

      setIsSaved(isSavedWorld);
      setSavePayload(isSavedWorld ? null : getPayloadFromSearchParams(searchParams));
      return;
    }

    const raw = sessionStorage.getItem("doodleverse:scene");
    if (!raw) {
      setState({ status: "missing" });
      return;
    }
    try {
      const scene = JSON.parse(raw) as SceneJson;
      const musicUrl = sessionStorage.getItem("doodleverse:music");
      setState({ status: "ready", scene, musicUrl });
      setSavePayload(getDraftFromSessionStorage());
      setIsSaved(false);
    } catch {
      setState({ status: "missing" });
      setSavePayload(null);
      setIsSaved(false);
    }

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

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

  async function handleSaveWorld() {
    if (!savePayload || isSavingRef.current || isSaved) return;

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(savePayload),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || `Save failed (${response.status})`);
      }

      setSaveSuccess("World saved to library");
      setIsSaved(true);
      sessionStorage.removeItem("doodleverse:generationDraft");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save world";
      setSaveError(message);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }

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

      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-3">
        <button
          onClick={() => router.push("/upload")}
          className="rounded-lg bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          ← New sketch
        </button>
        <button
          onClick={() => router.push("/generations")}
          className="rounded-lg bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          Saved worlds
        </button>
        {(savePayload || isSaved) && (
          <button
            onClick={() => void handleSaveWorld()}
            disabled={isSaving || isSaved}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
          >
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save World"}
          </button>
        )}
      </div>

      {(saveSuccess || saveError) && (
        <div
          className={`absolute right-4 top-20 z-10 rounded-lg px-4 py-3 text-sm backdrop-blur-sm ${
            saveError
              ? "bg-red-500/20 text-red-100 border border-red-500/40"
              : "bg-emerald-500/20 text-emerald-50 border border-emerald-400/40"
          }`}
        >
          {saveError ?? saveSuccess}
        </div>
      )}

      {/* Subtle hint if browser blocked music autoplay */}
      {needsClickToPlay && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-sm text-white rounded-lg text-sm pointer-events-none">
          Click anywhere to enable music
        </div>
      )}
    </>
  );
}