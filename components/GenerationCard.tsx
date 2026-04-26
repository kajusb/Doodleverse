"use client";

import Link from "next/link";
import type { Generation } from "@/types/Generation";

type GenerationCardProps = {
  generation: Generation;
  isDeleting?: boolean;
  onDelete: (id: string) => Promise<void> | void;
};

function formatDate(value: Date | string | undefined): string {
  if (!value) return "Unknown date";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function GenerationCard({ generation, isDeleting = false, onDelete }: GenerationCardProps) {
  const displayImage = generation.generatedThumbnailUrl || generation.originalImageUrl;
  const title = generation.title?.trim() || generation.theme?.trim() || "Untitled world";
  const viewHref = generation._id
    ? { pathname: "/view", query: { id: generation._id } }
    : {
        pathname: "/view",
        query: {
          modelUrl: generation.generatedModelUrl,
          audioUrl: generation.audioUrl ?? "",
          title,
          saved: "1",
        },
      };

  return (
    <article className="gen-card">
      {/* Thumbnail */}
      <div style={{ position: "relative", height: 180, overflow: "hidden", background: "rgba(0,0,0,0.04)" }}>
        {displayImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayImage}
            alt={title}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              color: "var(--ink-light)",
            }}
          >
            <span style={{ fontSize: 32 }}>🌍</span>
            <span style={{ fontSize: 12 }}>No preview</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px 18px 18px" }}>
        {generation.theme && (
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--ink-light)",
              marginBottom: 6,
            }}
          >
            {generation.theme}
          </p>
        )}

        <h3
          style={{
            fontFamily: "var(--font-caveat), cursive",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--ink)",
            marginBottom: 4,
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </h3>

        <p style={{ fontSize: 12, color: "var(--ink-light)", marginBottom: 18 }}>
          {formatDate(generation.createdAt)}
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href={viewHref}
            className="btn btn-primary btn-sm"
            style={{ flex: 1, textAlign: "center" }}
          >
            View
          </Link>

          <button
            type="button"
            onClick={() => generation._id && onDelete(generation._id)}
            disabled={isDeleting || !generation._id}
            className="btn btn-danger btn-sm"
            style={{ flex: 1 }}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}