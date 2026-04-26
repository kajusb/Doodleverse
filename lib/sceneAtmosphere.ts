import type { SceneJson } from "@/types/scene";

export type AtmosphereMood =
  | "sunny"
  | "sunset"
  | "night"
  | "spooky"
  | "snowy"
  | "magical"
  | "stormy"
  | "underwater"
  | "alien"
  | "neutral";

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

// Classify the mood based on colors and sun position. Tuned to default to
// "sunny" (with clouds) for any reasonably bright sky color, so manual
// sky color changes in the editor don't suddenly remove clouds.
export function classifyMood(scene: SceneJson): AtmosphereMood {
  if (!scene.skyColor) return "sunny";

  const [h, s, l] = hexToHsl(scene.skyColor);
  const sunY = scene.sunPosition?.[1] ?? 1;

  // Very dark sky = night
  if (l < 20) return "night";

  // Dark + green/yellow tint = spooky
  if (l < 35 && h >= 60 && h <= 180) return "spooky";

  // Dark + red/orange = alien
  if (l < 40 && (h < 30 || h > 340) && s > 30) return "alien";

  // Snowy white sky
  if (l > 80 && s < 30) return "snowy";

  // Pink/purple = magical (only at sufficient saturation)
  if (h > 270 && h < 330 && s > 35 && l > 50) return "magical";

  // Warm hues + low sun = sunset
  if (sunY < 0.5 && (h < 40 || h > 320) && s > 30 && l > 40) return "sunset";

  // Stormy grey
  if (s < 15 && l < 55) return "stormy";

  // Deep blue + dim = underwater
  if (h > 180 && h < 240 && l < 45 && s > 40) return "underwater";

  // Default fallback for any bright/normal sky → sunny (with clouds)
  return "sunny";
}