"use client";

import { useState, useRef } from "react";
import { useSceneState } from "@/lib/sceneState";

export function AddObjectButton() {
  const { addObject } = useSceneState();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Generation is now BACKGROUND — modal closes when it starts
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const closeModal = () => {
    setIsOpen(false);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
  };

  const generate = async () => {
    if (!file) return;
    setError(null);

    // Snapshot the file so we can close the modal immediately
    const fileToSend = file;

    // Close modal NOW so user can walk around while waiting
    closeModal();
    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append("image", fileToSend);

      const res = await fetch("/api/generate-hero", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned ${res.status}`);
      }

      const newUrl = data.glbUrl;
      if (!newUrl) {
        throw new Error("No model URL in response");
      }

      const spawnX = (Math.random() - 0.5) * 4;
      const spawnZ = (Math.random() - 0.5) * 4;

      addObject({
        type: "house",
        x: spawnX,
        y: 0,
        z: spawnZ,
        rotation: 0,
        glbUrl: newUrl,
      });
    } catch (err) {
      console.error("Add object failed:", err);
      setError(err instanceof Error ? err.message : "Failed to add object");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Floating "+ Add to world" button — disabled while generating */}
      <button
        onClick={() => !isGenerating && setIsOpen(true)}
        disabled={isGenerating}
        className="fixed top-16 right-4 z-[100] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed text-white rounded-lg shadow-lg transition text-sm font-semibold flex items-center gap-2"
      >
        <span className="text-lg leading-none">+</span> Add to world
      </button>

      {/* Floating status pill — shows while a background generation is running */}
      {isGenerating && (
        <div className="fixed top-28 right-4 z-[100] px-3 py-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 text-white rounded-lg shadow-lg text-xs flex items-center gap-2 animate-fade-in">
          <span className="inline-block w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Generating new object… (~60s)</span>
        </div>
      )}

      {/* Error pill — shown if last generation failed */}
      {error && !isGenerating && (
        <div className="fixed top-28 right-4 z-[100] px-3 py-2 bg-red-900/95 backdrop-blur-sm border border-red-700 text-white rounded-lg shadow-lg text-xs flex items-center gap-2 max-w-xs">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload modal — only for picking a file. Closes as soon as generation starts. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={closeModal}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-60 mb-1">
                  Add to world
                </div>
                <h2 className="text-xl font-bold">Upload a new sketch</h2>
                <p className="text-xs opacity-60 mt-1">
                  You can walk around while it generates.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              className="border-2 border-dashed rounded-xl p-6 transition cursor-pointer border-slate-600 hover:border-slate-400 bg-slate-800/30"
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
                  <img src={previewUrl} alt="sketch preview" className="max-h-60 rounded-lg shadow-lg" />
                  <div className="mt-3 text-xs opacity-70">
                    {file?.name} — click to replace
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📄</div>
                  <div className="font-semibold mb-1">Click to upload or drop a photo</div>
                  <div className="text-xs opacity-60">JPG or PNG</div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-2 bg-red-900/40 border border-red-700 rounded text-xs text-red-200">
                {error}
              </div>
            )}

            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={!file}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
              >
                ✨ Add to world
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}