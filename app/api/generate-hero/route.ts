import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import sharp from "sharp";

export const runtime = "nodejs";
export const maxDuration = 300; // TRELLIS can take 1-3 minutes

const TRELLIS_VERSION = "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c";

export async function POST(req: NextRequest) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });
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

  console.log("Hero input image:", image.name, image.type, image.size);

  // Convert ANYTHING to PNG using sharp. TRELLIS / PIL can't read AVIF, HEIC,
  // WebP, etc. — converting to PNG guarantees compatibility.
  let pngBuffer: Buffer;
  try {
    const inputBuffer = Buffer.from(await image.arrayBuffer());
    pngBuffer = await sharp(inputBuffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true }) // also downsize for speed
      .png()
      .toBuffer();
    console.log("Converted to PNG, size:", pngBuffer.length);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Image conversion failed:", msg);
    return NextResponse.json({ error: `Image conversion failed: ${msg}` }, { status: 400 });
  }

  // Send as base64 data URL with the proper PNG mime type
  const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

  const replicate = new Replicate({ auth: apiToken });

  try {
    const output = await replicate.run(
      `firtoz/trellis:${TRELLIS_VERSION}`,
      {
        input: {
          images: [dataUrl],
          texture_size: 512,
          mesh_simplify: 0.98,
          generate_model: true,
          generate_color: true,
          generate_normal: false,
          save_gaussian_ply: false,
          randomize_seed: true,
          ss_sampling_steps: 12,
          slat_sampling_steps: 12,
          ss_guidance_strength: 7.5,
          slat_guidance_strength: 3,
        },
      }
    );

    console.log("TRELLIS RAW OUTPUT:", JSON.stringify(output, null, 2));
    console.log("TRELLIS OUTPUT TYPE:", typeof output);
    console.log("TRELLIS IS ARRAY:", Array.isArray(output));
    if (output && typeof output === "object" && !Array.isArray(output)) {
      console.log("TRELLIS OUTPUT KEYS:", Object.keys(output));
    }

    const glbUrl = await extractGlbUrl(output);

    if (!glbUrl) {
      console.error("No GLB URL found in TRELLIS response");
      return NextResponse.json({ error: "Model returned no GLB" }, { status: 502 });
    }

    console.log("EXTRACTED GLB URL:", glbUrl);
    return NextResponse.json({ glbUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Replicate TRELLIS error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

async function extractGlbUrl(output: unknown): Promise<string | null> {
  if (!output) return null;
  if (typeof output === "string") return output;

  if (isFileOutput(output)) {
    try {
      const u = output.url();
      return urlFromMaybeUrlObject(u);
    } catch (e) {
      console.warn("FileOutput.url() failed:", e);
    }
  }

  if (Array.isArray(output)) {
    for (const item of output) {
      const u = await extractGlbUrl(item);
      if (u) return u;
    }
    return null;
  }

  if (typeof output === "object") {
    const obj = output as Record<string, unknown>;
    const keysToTry = ["model_file", "glb", "mesh", "model", "output", "file"];
    for (const key of keysToTry) {
      if (key in obj) {
        const u = await extractGlbUrl(obj[key]);
        if (u) return u;
      }
    }
  }

  return null;
}

function isFileOutput(x: unknown): x is { url: () => string | URL } {
  return (
    typeof x === "object" &&
    x !== null &&
    "url" in x &&
    typeof (x as { url: unknown }).url === "function"
  );
}

function urlFromMaybeUrlObject(u: string | URL | unknown): string {
  if (typeof u === "string") return u;
  if (u instanceof URL) return u.toString();
  return String(u);
}