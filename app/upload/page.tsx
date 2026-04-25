"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SceneJson } from "@/types/scene";

const THOUGHT_DURATION_MS = 3500;

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentThought, setCurrentThought] = useState<string>("");
  const [fadeKey, setFadeKey] = useState<number>(0);
  const [dots, setDots] = useState<string>("");
  const [isFinalThought, setIsFinalThought] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [withMusic, setWithMusic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const thoughtsRef = useRef<string[]>([]);
  const thoughtIndexRef = useRef<number>(0);
  const realThoughtsArrivedRef = useRef<boolean>(false);
  const allThoughtsShownOnceRef = useRef<boolean>(false);
  const cycleCompleteRef = useRef<(() => void) | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Show placeholder + animated dots while waiting for narration
  useEffect(() => {
    if (!loading) return;

    setCurrentThought("Looking at your sketch");
    setFadeKey((k) => k + 1);
    setDots(".");

    let dotCount = 1;
    const dotInterval = setInterval(() => {
      if (realThoughtsArrivedRef.current) {
        clearInterval(dotInterval);
        setDots("");
        return;
      }
      dotCount = (dotCount % 3) + 1;
      setDots(".".repeat(dotCount));
    }, 500);

    return () => {
      clearInterval(dotInterval);
      setDots("");
    };
  }, [loading]);

  // Cycle through real thoughts once they arrive. Plays through all thoughts.
  useEffect(() => {
    if (!loading) return;
    let cancelled = false;

    const advance = () => {
      if (cancelled) return;

      if (!realThoughtsArrivedRef.current) {
        cycleTimerRef.current = setTimeout(advance, 300);
        return;
      }

      const list = thoughtsRef.current;
      if (list.length === 0) return;

      const nextIndex = thoughtIndexRef.current + 1;

      if (nextIndex >= list.length) {
        allThoughtsShownOnceRef.current = true;
        if (cycleCompleteRef.current) {
          cycleCompleteRef.current();
          cycleCompleteRef.current = null;
        }
        return;
      }

      thoughtIndexRef.current = nextIndex;
      setCurrentThought(list[thoughtIndexRef.current]);
      setFadeKey((k) => k + 1);
      setIsFinalThought(nextIndex === list.length - 1);

      cycleTimerRef.current = setTimeout(advance, THOUGHT_DURATION_MS);
    };

    cycleTimerRef.current = setTimeout(advance, THOUGHT_DURATION_MS);

    return () => {
      cancelled = true;
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    };
  }, [loading]);

  const generate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setIsFinalThought(false);
    thoughtsRef.current = [];
    thoughtIndexRef.current = 0;
    realThoughtsArrivedRef.current = false;
    allThoughtsShownOnceRef.current = false;

    try {
      const sceneForm = new FormData();
      sceneForm.append("image", file);
      const narrationForm = new FormData();
      narrationForm.append("image", file);
      narrationForm.append("withMusic", withMusic ? "true" : "false");

      const scenePromise = fetch("/api/generate-scene", { method: "POST", body: sceneForm })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Scene request failed (${res.status})`);
          return data.scene as SceneJson;
        });

      const narrationPromise = fetch("/api/generate-narration", { method: "POST", body: narrationForm })
        .then(async (res) => {
          const data = await res.json();
          console.log("NARRATION RESPONSE:", res.status, data);
          if (!res.ok) throw new Error(data.error || `Narration failed (${res.status})`);
          return data.thoughts as string[];
        })
        .catch((e) => {
          console.error("NARRATION FAILED:", e);
          return null;
        });

      narrationPromise.then((thoughts) => {
        if (thoughts && thoughts.length > 0) {
          thoughtsRef.current = thoughts;
          thoughtIndexRef.current = 0;
          realThoughtsArrivedRef.current = true;

          if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);

          setCurrentThought(thoughts[0]);
          setFadeKey((k) => k + 1);
          setIsFinalThought(thoughts.length === 1);

          const advance = () => {
            const list = thoughtsRef.current;
            const nextIndex = thoughtIndexRef.current + 1;

            if (nextIndex >= list.length) {
              allThoughtsShownOnceRef.current = true;
              if (cycleCompleteRef.current) {
                cycleCompleteRef.current();
                cycleCompleteRef.current = null;
              }
              return;
            }

            thoughtIndexRef.current = nextIndex;
            setCurrentThought(list[thoughtIndexRef.current]);
            setFadeKey((k) => k + 1);
            setIsFinalThought(nextIndex === list.length - 1);

            cycleTimerRef.current = setTimeout(advance, THOUGHT_DURATION_MS);
          };
          cycleTimerRef.current = setTimeout(advance, THOUGHT_DURATION_MS);
        }
      });

      const scene = await scenePromise;
      sessionStorage.setItem("doodleverse:scene", JSON.stringify(scene));
      sessionStorage.removeItem("doodleverse:music");

      const musicPromise = (withMusic && scene.music)
        ? (async () => {
            try {
              const musicRes = await fetch("/api/generate-music", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: scene.music, lengthMs: 15000 }),
              });
              if (musicRes.ok) {
                const blob = await musicRes.blob();
                const dataUrl: string = await new Promise((resolve, reject) => {
                  const r = new FileReader();
                  r.onloadend = () => resolve(r.result as string);
                  r.onerror = () => reject(r.error);
                  r.readAsDataURL(blob);
                });
                sessionStorage.setItem("doodleverse:music", dataUrl);
              } else {
                const errData = await musicRes.json().catch(() => ({}));
                console.warn("Music generation failed:", errData);
              }
            } catch (e) {
              console.warn("Music generation error:", e);
            }
          })()
        : Promise.resolve();

      const thoughtsDone = allThoughtsShownOnceRef.current
        ? Promise.resolve()
        : new Promise<void>((resolve) => { cycleCompleteRef.current = resolve; });

      await Promise.all([musicPromise, thoughtsDone]);

      // Navigate immediately — the final thought is still visible (fade-in only)
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
          onClick={() => !loading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 transition ${
            loading ? "cursor-default" : "cursor-pointer"
          } ${
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
              {!loading && (
                <div className="mt-3 text-sm opacity-70">
                  {file?.name} — click or drop to replace
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📄</div>
              <div className="font-semibold mb-1">Click to upload or drag a photo here</div>
              <div className="text-sm opacity-60">JPG or PNG</div>
            </div>
          )}
        </div>

        {/* AI thinking display */}
        {loading && (
          <div className="mt-5 p-6 bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-xl min-h-[100px] flex flex-col">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              AI is thinking
            </div>
            <div
              key={fadeKey}
              className={`text-lg font-medium leading-relaxed flex-1 flex items-center ${
                !realThoughtsArrivedRef.current
                  ? ""
                  : isFinalThought
                    ? "thought-fade-in"
                    : "thought-fade"
              }`}
            >
              {currentThought}{!realThoughtsArrivedRef.current && dots}
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}