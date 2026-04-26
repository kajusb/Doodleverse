import type { SceneJson } from "@/types/scene";

export type AtmosphereMood =
  | "sunny"        // bright daytime, blue/green
  | "sunset"       // warm orange/pink/red sky
  | "night"        // dark sky, low sun
  | "spooky"       // dark + green/purple tones
  | "snowy"        // pale/white tones
  | "magical"      // pinks/purples, fantasy
  | "stormy"       // grey + dim sun
  | "underwater"   // blue + dim
  | "alien"        // red/orange + dim
  | "neutral";     // fallback

// Convert hex color "#rrggbb" to HSL components [hue°, saturation%, lightness%]
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return [h, s * 100, l * 100];
}

// Classify the mood based on colors and sun position. This drives what
// atmospheric extras (clouds, stars, snow, etc.) get added to the scene.
export function classifyMood(scene: SceneJson): AtmosphereMood {
  if (!scene.skyColor) return "sunny"; // procedural sky = default sunny

  const [h, s, l] = hexToHsl(scene.skyColor);
  const sunY = scene.sunPosition?.[1] ?? 1;

  // Very dark sky + low sun = night
  if (l < 25 && sunY < 0.6) return "night";

  // Dark + green/yellow tint = spooky
  if (l < 35 && (h >= 60 && h <= 180)) return "spooky";

  // Warm hues (red/orange/pink) with low sun = sunset
  if (sunY < 0.5 && (h < 40 || h > 320) && s > 30) return "sunset";

  // Very pale/white = snowy
  if (l > 80 && s < 30) return "snowy";

  // Pink/purple/magenta = magical
  if (h > 270 && h < 330 && s > 30) return "magical";

  // Grey-ish + dim = stormy
  if (s < 20 && l < 60 && sunY < 0.7) return "stormy";

  // Deep blue + dim = underwater
  if (h > 180 && h < 240 && l < 50 && sunY < 0.6) return "underwater";

  // Red/orange dominance = alien/mars
  if (h < 30 && s > 40 && l < 60) return "alien";

  // Bright + blue/green hue = sunny daytime
  if (l > 50 && sunY > 0.5) return "sunny";

  return "neutral";
}