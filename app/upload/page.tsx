"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { SceneJson } from "@/types/scene";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      sessionStorage.setItem("doodleverse:scene", JSON.stringify(data.scene as SceneJson));
      router.push("/view");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setLoading(false);
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

        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => router.push("/sample")}
            className="px-5 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
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

        {loading && (
          <div className="mt-6 text-center text-sm opacity-70">
            Gemma is interpreting your sketch… (10-30s)
          </div>
        )}
      </div>
    </div>
  );
}