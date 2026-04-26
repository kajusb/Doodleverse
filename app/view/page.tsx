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

      setSaveSuccess("world succedfully saved");
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
      <>
        <header className="topbar">
          <a href="/upload" className="topbar-wordmark">Doodleverse</a>
        </header>
        <div className="page-shell flex items-center justify-center">
          <div
            className="card anim-fade-up"
            style={{ maxWidth: 400, width: "100%", margin: "0 16px", padding: "48px 36px", textAlign: "center" }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>🌍</div>
            <h2
              style={{
                fontFamily: "var(--font-caveat), cursive",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              No scene found
            </h2>
            <p style={{ color: "var(--ink-mid)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
              Upload a sketch to generate your 3D world.
            </p>
            <button className="btn btn-primary" onClick={() => router.push("/upload")}>
              ← Create a world
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Scene fills the full viewport */}
      <Scene scene={state.scene} />

      {/* Topbar overlay */}
      <header
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "var(--topbar)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "rgba(255,255,255,0.86)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <a
          href="/upload"
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          Doodleverse
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => router.push("/upload")}
          >
            ← New sketch
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => router.push("/generations")}
          >
            Gallery
          </button>
          {(savePayload || isSaved) && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void handleSaveWorld()}
              disabled={isSaving || isSaved}
            >
              {isSaving ? "Saving…" : isSaved ? "✓ Saved" : "Save world"}
            </button>
          )}
        </div>
      </header>

      {/* Status toast */}
      {(saveSuccess || saveError) && (
        <div
          style={{
            position: "absolute",
            top: "calc(var(--topbar) + 12px)",
            right: 24,
            zIndex: 110,
            borderRadius: "var(--radius-sm)",
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: saveError ? "rgba(176,48,48,0.12)" : "rgba(255,255,255,0.88)",
            border: saveError
              ? "1.5px solid rgba(176,48,48,0.30)"
              : "1.5px solid rgba(0,0,0,0.12)",
            color: saveError ? "#b03030" : "var(--ink)",
            boxShadow: "var(--shadow-sm)",
          }}
          className="anim-fade-up"
        >
          {saveError ?? saveSuccess}
        </div>
      )}

      {/* Music hint */}
      {needsClickToPlay && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 110,
            background: "rgba(17,17,17,0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#fff",
            borderRadius: 24,
            padding: "8px 20px",
            fontSize: 13,
            pointerEvents: "none",
            letterSpacing: "0.01em",
          }}
        >
          Click anywhere to enable music
        </div>
      )}
    </div>
  );
}