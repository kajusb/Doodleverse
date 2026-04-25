import { NextRequest, NextResponse } from "next/server";
import { buildNarrationPrompt } from "@/lib/narrationPrompt";

export const runtime = "nodejs";
export const maxDuration = 30;

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

function findLastJsonArray(text: string): string | null {
  let depth = 0;
  let end = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "]") {
      if (depth === 0) end = i;
      depth++;
    } else if (ch === "[") {
      depth--;
      if (depth === 0 && end !== -1) {
        return text.slice(i, end + 1);
      }
    }
  }
  return null;
}

function parseThoughts(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw.trim());
    if (Array.isArray(parsed)) return parsed.filter(t => typeof t === "string");
  } catch {}

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1]);
      if (Array.isArray(parsed)) return parsed.filter(t => typeof t === "string");
    } catch {}
  }

  const block = findLastJsonArray(raw);
  if (block) {
    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed)) return parsed.filter(t => typeof t === "string");
    } catch {}
  }

  return [];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let image: File | null = null;
  let withMusic = false;
  try {
    const form = await req.formData();
    const entry = form.get("image");
    if (entry instanceof File) image = entry;
    withMusic = form.get("withMusic") === "true";
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
          { text: buildNarrationPrompt(withMusic) },
        ],
      },
    ],
    generationConfig: { temperature: 0.7 },
  };

  let modelResponse: Response;
  try {
    modelResponse = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("Gemma narration fetch failed:", e);
    return NextResponse.json({ error: "Failed to reach Gemini API" }, { status: 502 });
  }

  if (!modelResponse.ok) {
    const text = await modelResponse.text();
    console.error("Gemma narration error:", modelResponse.status, text);
    return NextResponse.json(
      { error: `Gemini API error ${modelResponse.status}` },
      { status: 502 }
    );
  }

  const data = await modelResponse.json();
  const rawText = extractText(data);

  if (!rawText) {
    return NextResponse.json({ error: "Model returned no text" }, { status: 502 });
  }

  const thoughts = parseThoughts(rawText);
  if (thoughts.length === 0) {
    console.warn("Could not parse thoughts. Raw was:", rawText.slice(0, 500));
    return NextResponse.json({ error: "Could not parse thoughts" }, { status: 422 });
  }

  return NextResponse.json({ thoughts });
}