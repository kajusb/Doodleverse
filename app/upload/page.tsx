"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SceneJson } from "@/types/scene";

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

    try {
      const form = new FormData();
      form.append("image", file);
      const sceneRes = await fetch("/api/generate-scene", { method: "POST", body: form });
      const sceneData = await sceneRes.json();
      if (!sceneRes.ok) throw new Error(sceneData.error || `Scene request failed (${sceneRes.status})`);
      const scene: SceneJson = sceneData.scene;

      sessionStorage.setItem("doodleverse:scene", JSON.stringify(scene));
      sessionStorage.removeItem("doodleverse:music");

      // Music only runs if the user opted in AND Gemma produced a prompt
      if (withMusic && scene.music) {
        setLoadingStage("Composing music to match your world…");
        try {
          // 10s loop costs 1/3 the credits and loops cleanly with Web Audio
          const musicRes = await fetch("/api/generate-music", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: scene.music, lengthMs: 15000 }),
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
          } else {
            const errData = await musicRes.json().catch(() => ({}));
            console.warn("Music generation failed:", errData);
          }
        } catch (e) {
          console.warn("Music generation error:", e);
        }
      }

      router.push("/view");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
      setLoadingStage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 flex flex-col items-center">
      <div className="max-w-2xl w-full pt-12">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-[0.3em] opacity-60 mb-2">
            Doodleverse
          </div>
          <h1 className="text-4xl font-bold mb-3">Draw a world, walk inside it</h1>
          <p className="opacity-70">
            Sketch a top-down map on paper, then upload a photo.
          </p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${
            dragging ? "border-emerald-400 bg-emerald-400/10" : "border-slate-600 hover:border-slate-400"
          } ${previewUrl ? "bg-slate-800/50" : "bg-slate-800/30"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />

          {previewUrl ? (
            <div className="flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="sketch preview" className="max-h-80 rounded-lg shadow-lg" />
              <div className="mt-3 text-sm opacity-70">
                {file?.name} — click or drop to replace
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📄</div>
              <div className="font-semibold mb-1">Click to upload or drag a photo here</div>
              <div className="text-sm opacity-60">JPG or PNG</div>
            </div>
          )}
        </div>

        <label className="mt-5 flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withMusic}
            onChange={(e) => setWithMusic(e.target.checked)}
            disabled={loading}
            className="w-5 h-5 accent-purple-500 cursor-pointer"
          />
          <span className="text-sm">
            <span className="font-semibold">♪ Generate background music</span>
            <span className="opacity-60 ml-2">(adds ~15s)</span>
          </span>
        </label>

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => router.push("/sample")}
            disabled={loading}
            className="px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 transition"
          >
            View sample world
          </button>
          <button
            onClick={generate}
            disabled={!file || loading}
            className="px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:cursor-not-allowed transition font-semibold"
          >
            {loading ? "Generating…" : "Generate world"}
          </button>
        </div>

        {loading && loadingStage && (
          <div className="mt-6 text-center text-sm opacity-70">
            {loadingStage}
          </div>
        )}
      </div>
    </div>
  );
}