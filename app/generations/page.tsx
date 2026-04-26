import { SavedGenerations } from "@/components/SavedGenerations";

export default function GenerationsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
            Doodleverse Library
          </p>
          <h1 className="text-4xl font-bold">Saved worlds</h1>
          <p className="max-w-2xl text-slate-300">
            Every generation is scoped to the signed-in user, so each person only sees their own Meshy worlds and audio.
          </p>
        </div>

        <SavedGenerations />
      </div>
    </main>
  );
}