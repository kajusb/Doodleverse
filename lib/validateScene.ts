import type { SceneJson, SceneObject, ObjectType, Theme, Terrain } from "@/types/scene";

const VALID_TYPES = new Set<ObjectType>([
  "tree", "house", "rock", "river", "path", "bridge", "water",
]);
const VALID_THEMES = new Set<Theme>(["forest", "desert", "snow", "meadow", "fantasy"]);
const VALID_TERRAINS = new Set<Terrain>(["grass", "sand", "snow", "stone", "dirt"]);


function findLastJsonBlock(text: string): string | null {
  let depth = 0;
  let end = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "}") {
      if (depth === 0) end = i;
      depth++;
    } else if (ch === "{") {
      depth--;
      if (depth === 0 && end !== -1) {
        return text.slice(i, end + 1);
      }
    }
  }
  return null;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  try { return JSON.parse(trimmed); } catch {}
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  const block = findLastJsonBlock(trimmed);
  if (block) {
    try { return JSON.parse(block); } catch {}
  }
  throw new Error("Could not parse JSON from model response");
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeObject(raw: unknown): SceneObject | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const type = o.type as ObjectType;
  if (!VALID_TYPES.has(type)) {
    console.warn("Dropping unknown object type:", o.type);
    return null;
  }

  const obj: SceneObject = {
    type,
    x: num(o.x, 0),
    z: num(o.z, 0),
  };
  if (o.y !== undefined) obj.y = num(o.y, 0);
  if (o.scale !== undefined) obj.scale = Math.max(0.2, Math.min(3, num(o.scale, 1)));
  if (o.rotation !== undefined) obj.rotation = num(o.rotation, 0);
  if (o.width !== undefined) obj.width = Math.max(0.1, num(o.width, 1));
  if (o.length !== undefined) obj.length = Math.max(0.1, num(o.length, 1));
  if (typeof o.description === "string") obj.description = o.description;
  if (typeof o.color === "string" && /^#[0-9a-f]{3,8}$/i.test(o.color)) {
    obj.color = o.color;
  }
  return obj;
}

export function validateScene(rawResponse: string): SceneJson {
  const parsed = extractJson(rawResponse);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parsed response is not an object");
  }
  const p = parsed as Record<string, unknown>;

  const name = typeof p.name === "string" ? p.name : "Untitled World";
  const theme = VALID_THEMES.has(p.theme as Theme) ? (p.theme as Theme) : "forest";
  const terrain = VALID_TERRAINS.has(p.terrain as Terrain)
    ? (p.terrain as Terrain)
    : "grass";

  const rawObjects = Array.isArray(p.objects) ? p.objects : [];
  const objects = rawObjects
    .map(sanitizeObject)
    .filter((o): o is SceneObject => o !== null);

  return {
    name,
    theme,
    terrain,
    objects,
    size: typeof p.size === "number" ? p.size : 40,
    music: typeof p.music === "string" ? p.music : undefined,
  };
}