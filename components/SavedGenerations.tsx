"use client";

import { useEffect, useState } from "react";
import { GenerationCard } from "@/components/GenerationCard";
import type { Generation } from "@/types/Generation";

type GenerationsResponse = {
  generations?: Generation[];
  error?: string;
};

export function SavedGenerations() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadGenerations() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/generations", { cache: "no-store" });
        const data = (await response.json()) as GenerationsResponse;

        if (!response.ok) {
          throw new Error(data.error || `Request failed (${response.status})`);
        }

        if (!ignore) {
          setGenerations(data.generations ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          const message = loadError instanceof Error ? loadError.message : "Failed to load generations";
          setError(message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadGenerations();

    return () => {
      ignore = true;
    };
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this saved world?");
    if (!confirmed) return;

    setDeletingId(id);
    setError(null);

    try {
      const response = await fetch(`/api/generations/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || `Delete failed (${response.status})`);
      }

      setGenerations((current) => current.filter((generation) => generation._id !== id));
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete generation";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 text-sm text-slate-300">
        Loading saved worlds...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-6 text-sm text-slate-300">
        No saved worlds yet. Generate a world, then click Save World to store it in your library.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {generations.map((generation) => (
        <GenerationCard
          key={generation._id ?? generation.generatedModelUrl}
          generation={generation}
          isDeleting={deletingId === generation._id}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}