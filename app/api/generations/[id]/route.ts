import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  deleteGenerationByIdForUser,
  getGenerationByIdForUser,
  isValidGenerationId,
} from "@/lib/generations";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidGenerationId(id)) {
    return NextResponse.json({ error: "Invalid generation id" }, { status: 400 });
  }

  try {
    const generation = await getGenerationByIdForUser(id, userId);

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({ generation }, { status: 200 });
  } catch (error) {
    console.error("Failed to load generation:", error);
    return NextResponse.json({ error: "Failed to load generation" }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidGenerationId(id)) {
    return NextResponse.json({ error: "Invalid generation id" }, { status: 400 });
  }

  try {
    const deleted = await deleteGenerationByIdForUser(id, userId);

    if (!deleted) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete generation:", error);
    return NextResponse.json({ error: "Failed to delete generation" }, { status: 500 });
  }
}