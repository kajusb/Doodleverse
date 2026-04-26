"use client";

import { useState } from "react";
import { useSceneState } from "@/lib/sceneState";

// Generate or regenerate background music for the scene.
// Uses the scene's `music` prompt (a description from Gemma) to drive
// ElevenLabs music generation. Result is stored as a base64 data URL.
export function MusicControl() {
  const { scene, musicUrl, setMusicUrl } = useSceneState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMusic = !!musicUrl;

  // Build a prompt. If the scene has one (from initial generation), use it.
  // Otherwise build a generic one from the scene's mood / theme.
  const buildPrompt = (): string => {
    if (scene.music) return scene.music;
    const themeBit = scene.theme ? ` ${scene.theme}` : "";
    return `Ambient${themeBit} background music, atmospheric, looping, no vocals`;
  };

  const handleClick = async () => {
    setError(null);
    setIsGenerating(true);

    try {
      const prompt = buildPrompt();
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, lengthMs: 15000 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Music request failed (${res.status})`);
      }

      // The API returns the audio as a Blob. Convert to a base64 data URL
      // so we can persist in sessionStorage and re-decode in the audio player.
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });

      // Updating musicUrl triggers the audio player to swap tracks
      setMusicUrl(dataUrl);
    } catch (err) {
      console.error("Music generation failed:", err);
      setError(err instanceof Error ? err.message : "Music generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="border-t border-slate-700 pt-4 mt-4">
      <div className="text-xs uppercase tracking-widest opacity-60 mb-2">Music</div>

      <button
        onClick={handleClick}
        disabled={isGenerating}
        className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Generating music… (~15s)
          </>
        ) : hasMusic ? (
          <>🔄 Regenerate music</>
        ) : (
          <>♪ Generate music</>
        )}
      </button>

      {error && (
        <div className="mt-2 p-2 bg-red-900/40 border border-red-700 rounded text-xs text-red-200">
          {error}
        </div>
      )}

      {hasMusic && !isGenerating && (
        <div className="mt-2 text-[10px] opacity-50 text-center">
          Music is playing. Click to swap for a new variation.
        </div>
      )}
    </div>
  );
}