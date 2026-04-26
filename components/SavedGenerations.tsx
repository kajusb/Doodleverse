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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="gen-card"
            style={{ height: 280 }}
          >
            <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius) var(--radius) 0 0" }} />
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 14, width: "55%" }} />
              <div className="skeleton" style={{ height: 20, width: "80%" }} />
              <div className="skeleton" style={{ height: 12, width: "40%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card"
        style={{
          padding: "24px 28px",
          borderColor: "rgba(176,48,48,0.22)",
          background: "rgba(176,48,48,0.06)",
          color: "#b03030",
          fontSize: 14,
        }}
      >
        {error}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div
        className="card"
        style={{
          padding: "56px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 40 }}>🌍</span>
        <h3
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink)",
          }}
        >
          No saved worlds yet
        </h3>
        <p style={{ color: "var(--ink-mid)", fontSize: 14, maxWidth: 360, lineHeight: 1.65 }}>
          Generate a world from a sketch, then click &ldquo;Save world&rdquo; to store it here.
        </p>
        <a
          href="/upload"
          className="btn btn-primary"
          style={{ marginTop: 8 }}
        >
          Create a world
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 20,
      }}
    >
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