"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SceneJson } from "@/types/scene";

type GenerationDraft = {
  title: string;
  originalImageUrl?: string;
  generatedModelUrl: string;
  generatedThumbnailUrl?: string;
  audioUrl?: string | null;
  theme: string;
  meshyTaskId?: string | null;
  status: "completed";
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function buildSceneDataUrl(scene: SceneJson): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(scene))}`;
}

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [withMusic, setWithMusic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    setError(null);
    setFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  };

  const generate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setLoadingStage("Interpreting your sketch…");
    sessionStorage.removeItem("doodleverse:generationDraft");

    try {
      const originalImageUrl = await readFileAsDataUrl(file);

      // Scene generation always runs
      const form = new FormData();
      form.append("image", file);
      const sceneRes = await fetch("/api/generate-scene", { method: "POST", body: form });
      const sceneData = await sceneRes.json();
      if (!sceneRes.ok) throw new Error(sceneData.error || `Scene request failed (${sceneRes.status})`);
      const scene: SceneJson = sceneData.scene;
      const worldTitle = scene.name?.trim() || "My Generated World";
      const generatedModelUrl = buildSceneDataUrl(scene);

      sessionStorage.setItem("doodleverse:scene", JSON.stringify(scene));
      // Always wipe any leftover music from a prior generation
      sessionStorage.removeItem("doodleverse:music");

      let audioUrl: string | null = null;

      // Music only runs if the user opted in AND Gemma produced a prompt
      if (withMusic && scene.music) {
        setLoadingStage("Composing music to match your world…");
        try {
          const musicRes = await fetch("/api/generate-music", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: scene.music, lengthMs: 30000 }),
          });
          if (musicRes.ok) {
            const blob = await musicRes.blob();
            const dataUrl: string = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
            sessionStorage.setItem("doodleverse:music", dataUrl);
            audioUrl = dataUrl;
          } else {
            // Music failed but the scene is fine — proceed silently
            const errData = await musicRes.json().catch(() => ({}));
            console.warn("Music generation failed:", errData);
          }
        } catch (e) {
          console.warn("Music generation error:", e);
        }
      }

      const generationDraft: GenerationDraft = {
        title: worldTitle,
        originalImageUrl,
        generatedModelUrl,
        generatedThumbnailUrl: originalImageUrl,
        audioUrl,
        theme: scene.theme,
        meshyTaskId: null,
        status: "completed",
      };

      sessionStorage.setItem("doodleverse:generationDraft", JSON.stringify(generationDraft));

      router.push("/view");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
      setLoadingStage("");
    }
  };

  return (
    <>
      {/* ── Topbar ── */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: "58px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          zIndex: 100,
          background: "rgba(255,255,255,0.86)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
            lineHeight: 1,
            cursor: "pointer",
          }}
          onClick={() => router.push("/")}
        >
          Doodle<span style={{ color: "var(--ink-mid)" }}>Verse</span>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: "flex", gap: "4px" }}>
          {[
            { label: "create",  path: "/upload",      active: true  },
            { label: "gallery", path: "/generations", active: false },
            { label: "sample",  path: "/sample",      active: false },
          ].map(({ label, path, active }) => (
            <button
              key={label}
              onClick={() => router.push(path)}
              disabled={loading}
              style={{
                fontFamily: "var(--font-patrick-hand), cursive",
                fontSize: "13px",
                padding: "6px 18px",
                borderRadius: "20px",
                border: active ? "1.5px solid rgba(0,0,0,0.15)" : "1.5px solid transparent",
                background: active ? "rgba(0,0,0,0.05)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-mid)",
                fontWeight: active ? 600 : 400,
                cursor: loading ? "not-allowed" : "pointer",
                textTransform: "capitalize",
                transition: "all 0.18s",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ width: "150px" }} />
      </header>

      {/* ── Main ── */}
      <main
        style={{
          paddingTop: "58px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          fontFamily: "var(--font-patrick-hand), cursive",
          color: "var(--ink)",
          overflow: "hidden",
        }}
      >
        {/* Hero */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <h1
            style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
              fontWeight: 700,
              color: "var(--ink)",
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            Draw a world, walk inside it
          </h1>
          <p style={{ fontSize: "14px", color: "var(--ink-light)", letterSpacing: "0.4px", textAlign: "center" }}>
            Sketch a top-down map · upload a photo · explore your world in 3D
          </p>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !previewUrl && inputRef.current?.click()}
          style={{
            width: "400px",
            maxWidth: "90vw",
            border: dragging ? "2px dashed rgba(0,0,0,0.40)" : "2px dashed rgba(0,0,0,0.18)",
            borderRadius: "16px",
            padding: previewUrl ? "16px" : "28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            cursor: previewUrl ? "default" : "pointer",
            background: dragging ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.88)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 18px rgba(0,0,0,0.07)",
            transition: "all 0.22s",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />

          {previewUrl ? (
            <div style={{ width: "100%", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="sketch preview"
                style={{
                  width: "100%",
                  maxHeight: "200px",
                  objectFit: "cover",
                  borderRadius: "10px",
                  display: "block",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  fontFamily: "var(--font-patrick-hand), cursive",
                  fontSize: "12px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  border: "1.5px solid rgba(0,0,0,0.18)",
                  background: "rgba(255,255,255,0.92)",
                  color: "var(--ink)",
                  cursor: "pointer",
                }}
              >
                Change
              </button>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--ink-light)", textAlign: "center" }}>
                {file?.name}
              </p>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pencil.png"
                alt=""
                aria-hidden="true"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain",
                  transform: "rotate(-30deg)",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.15))",
                  transition: "transform 0.3s ease",
                }}
              />
              <div>
                <p style={{ fontSize: "15px", color: "var(--ink)", textAlign: "center", fontFamily: "var(--font-patrick-hand), cursive" }}>
                  Drop your photo here, or{" "}
                  <span
                    style={{ color: "var(--ink-mid)", textDecoration: "underline", textDecorationStyle: "dotted", cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  >
                    browse
                  </span>
                </p>
                <p style={{ fontSize: "12px", color: "var(--ink-light)", textAlign: "center", marginTop: "3px" }}>
                  PNG, JPG — up to 10 MB
                </p>
              </div>
            </>
          )}
        </div>

        {/* Music toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            userSelect: "none",
            padding: "10px 16px",
            borderRadius: "12px",
            border: `1.5px solid ${withMusic ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.09)"}`,
            background: withMusic ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.70)",
            transition: "all 0.18s",
          }}
        >
          <input
            type="checkbox"
            checked={withMusic}
            onChange={(e) => setWithMusic(e.target.checked)}
            disabled={loading}
            style={{ display: "none" }}
          />
          <span
            style={{
              flexShrink: 0,
              width: "18px",
              height: "18px",
              borderRadius: "5px",
              border: `2px solid ${withMusic ? "var(--ink)" : "rgba(0,0,0,0.22)"}`,
              background: withMusic ? "var(--ink)" : "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {withMusic && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span>
            <span style={{ fontFamily: "var(--font-caveat), cursive", fontSize: "17px", fontWeight: 600, color: "var(--ink)" }}>
              ♪ Generate background music
            </span>
            <span style={{ fontSize: "12px", color: "var(--ink-light)", marginLeft: "8px" }}>(adds ~30 s)</span>
          </span>
        </label>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              background: "rgba(180,40,40,0.06)",
              border: "1.5px solid rgba(180,40,40,0.20)",
              color: "#922",
              fontSize: "13px",
              fontFamily: "var(--font-patrick-hand), cursive",
              maxWidth: "400px",
              width: "90vw",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={generate}
          disabled={!file || loading}
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: "18px",
            padding: "10px 32px",
            borderRadius: "20px",
            border: "none",
            background: !file || loading ? "rgba(0,0,0,0.15)" : "var(--ink)",
            color: "#fff",
            cursor: !file || loading ? "not-allowed" : "pointer",
            boxShadow: !file || loading ? "none" : "0 4px 16px rgba(0,0,0,0.18)",
            transition: "all 0.18s",
            opacity: !file || loading ? 0.55 : 1,
          }}
        >
          {loading ? "Generating…" : "✦ Generate world"}
        </button>

        {/* Hints */}
        {!file && !loading && (
          <p style={{ fontSize: "12px", color: "var(--ink-light)", marginTop: "-6px" }}>
            ← Upload a photo to begin
          </p>
        )}
        {loading && loadingStage && (
          <p style={{ fontSize: "13px", color: "var(--ink-light)", fontFamily: "var(--font-patrick-hand), cursive" }}>
            {loadingStage}
          </p>
        )}
      </main>
    </>
  );
}
