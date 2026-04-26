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
    ? {
        pathname: "/view",
        query: { id: generation._id },
      }
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
    <article className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/80 shadow-lg shadow-black/20">
      {displayImage ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImage}
            alt={title}
            className="h-48 w-full object-cover"
          />
        </>
      ) : (
        <div className="flex h-48 w-full items-center justify-center bg-slate-800 text-sm text-slate-400">
          No preview available
        </div>
      )}

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
            {generation.theme || "unknown"}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-300">
            Created {formatDate(generation.createdAt)}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href={viewHref}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400"
          >
            View
          </Link>

          <button
            type="button"
            onClick={() => generation._id && onDelete(generation._id)}
            disabled={isDeleting || !generation._id}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-red-400/50 px-4 py-2 font-medium text-red-100 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}