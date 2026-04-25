import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 90;

const ENDPOINT = "https://api.elevenlabs.io/v1/music";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
  }

  let body: { prompt?: string; lengthMs?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  // Clamp length: min 3s, max 60s (longer = pricier and slower)
  const lengthMs = Math.max(3000, Math.min(60000, body.lengthMs ?? 30000));

  let elevenResponse: Response;
  try {
    elevenResponse = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: lengthMs,
        // mp3 22kHz/32kbps — small file, works on Creator tier
        output_format: "mp3_22050_32",
        force_instrumental: true,
      }),
    });
  } catch (e) {
    console.error("ElevenLabs fetch failed:", e);
    return NextResponse.json({ error: "Failed to reach ElevenLabs API" }, { status: 502 });
  }

  if (!elevenResponse.ok) {
    const text = await elevenResponse.text();
    console.error("ElevenLabs error:", elevenResponse.status, text);
    return NextResponse.json(
      { error: `ElevenLabs error ${elevenResponse.status}`, detail: text },
      { status: 502 }
    );
  }

  // Pipe the audio bytes straight back to the browser
  const audioBuffer = await elevenResponse.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.byteLength),
    },
  });
}