import { NextRequest, NextResponse } from "next/server";
import { SCENE_PROMPT } from "@/lib/scenePrompt";
import { validateScene } from "@/lib/validateScene";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "gemma-4-26b-a4b-it";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function extractText(data: unknown): string | null {
  const candidate = (data as { candidates?: unknown[] })?.candidates?.[0] as
    | { content?: unknown }
    | undefined;
  if (!candidate) return null;
  const content = candidate.content;
  const chunks: string[] = [];

  const collectFromParts = (parts: unknown) => {
    if (!Array.isArray(parts)) return;
    for (const p of parts) {
      const text = (p as { text?: unknown })?.text;
      if (typeof text === "string") chunks.push(text);
    }
  };

  if (Array.isArray(content)) {
    for (const item of content) {
      const text = (item as { text?: unknown })?.text;
      if (typeof text === "string") chunks.push(text);
      collectFromParts((item as { parts?: unknown })?.parts);
    }
  } else if (content && typeof content === "object") {
    collectFromParts((content as { parts?: unknown }).parts);
  }

  const joined = chunks.join("").trim();
  return joined.length > 0 ? joined : null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let image: File | null = null;
  try {
    const form = await req.formData();
    const entry = form.get("image");
    if (entry instanceof File) image = entry;
  } catch {
    return NextResponse.json({ error: "Could not parse upload" }, { status: 400 });
  }

  if (!image) {
    return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
  }

  const arrayBuffer = await image.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = image.type || "image/jpeg";

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: SCENE_PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
  };

  let modelResponse: Response;
  try {
    modelResponse = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Gemini fetch failed:", e);
    return NextResponse.json({ error: "Failed to reach Gemini API" }, { status: 502 });
  }

  if (!modelResponse.ok) {
    const errText = await modelResponse.text();
    console.error("Gemini API error:", modelResponse.status, errText);
    return NextResponse.json(
      { error: `Gemini API error ${modelResponse.status}`, detail: errText },
      { status: 502 }
    );
  }

  const data = await modelResponse.json();
  const rawText = extractText(data);

  if (!rawText) {
    console.error("Could not extract text. Response:", JSON.stringify(data, null, 2));
    return NextResponse.json(
      { error: "Model returned no text", detail: data },
      { status: 502 }
    );
  }

  console.log("Raw model output:", rawText);

  try {
    const scene = validateScene(rawText);
    return NextResponse.json({ scene, raw: rawText });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Validation failed:", msg);
    return NextResponse.json(
      { error: "Could not validate scene JSON", detail: msg, raw: rawText },
      { status: 422 }
    );
  }
}