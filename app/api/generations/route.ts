import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { createGeneration, listGenerationsForUser } from "@/lib/generations";

export const runtime = "nodejs";

type CreateGenerationRequest = {
  title?: string;
  originalImageUrl?: string;
  generatedModelUrl?: string;
  generatedThumbnailUrl?: string;
  audioUrl?: string;
  theme?: string;
  meshyTaskId?: string;
  status?: "pending" | "completed" | "failed";
};

function normalizeRequiredField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalField(value: unknown): string | undefined {
  const normalized = normalizeRequiredField(value);
  return normalized || undefined;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const generations = await listGenerationsForUser(userId);
    return NextResponse.json({ generations }, { status: 200 });
  } catch (error) {
    console.error("Failed to load generations:", error);
    return NextResponse.json({ error: "Failed to load generations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateGenerationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const originalImageUrl = normalizeRequiredField(body.originalImageUrl);
  const generatedModelUrl = normalizeRequiredField(body.generatedModelUrl);

  if (!generatedModelUrl) {
    return NextResponse.json(
      { error: "generatedModelUrl is required" },
      { status: 400 },
    );
  }

  try {
    const generation = await createGeneration(userId, {
      title: normalizeOptionalField(body.title) ?? "Untitled world",
      originalImageUrl: originalImageUrl || undefined,
      generatedModelUrl,
      generatedThumbnailUrl: normalizeOptionalField(body.generatedThumbnailUrl),
      audioUrl: normalizeOptionalField(body.audioUrl) ?? null,
      theme: normalizeOptionalField(body.theme) ?? "unknown",
      meshyTaskId: normalizeOptionalField(body.meshyTaskId),
      status: body.status ?? "completed",
    });

    return NextResponse.json({ generation }, { status: 201 });
  } catch (error) {
    console.error("Failed to save generation:", error);
    return NextResponse.json({ error: "Failed to save generation" }, { status: 500 });
  }
}