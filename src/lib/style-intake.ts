// src/lib/style-intake.ts

// A type describing the user’s visual style preferences.
export interface StyleConfig {
  theme: string;             // "light" | "dark" | "either"
  palette: string;           // "monochromatic" | "bright" | "muted" | "neutrals" | "bw"
  font: string;              // "geometric" | "book" | "code" | "display"
  vibe: string;              // "simple" | "clean-max" | "corporate" | "boho" | "playful"
  motion: string;            // "none" | "elements" | "text-elements" | "scroll" | "surprise"
  favouriteApp?: string;     // Optional: the user’s favourite app for inspiration
  images?: string[];         // Optional: filenames or identifiers for uploaded reference images
}

/**
 * Produce a human‑readable summary of the style choices to confirm with the user.
 */
export function summariseStyle(style: StyleConfig): string {
  const lines: string[] = [];
  lines.push(`• Theme: ${style.theme}`);
  lines.push(`• Colour palette: ${style.palette}`);
  lines.push(`• Font: ${style.font}`);
  lines.push(`• Design vibe: ${style.vibe}`);
  lines.push(`• Motion effects: ${style.motion}`);
  if (style.favouriteApp) {
    lines.push(`• Favourite app: ${style.favouriteApp}`);
  }
  if (style.images && style.images.length > 0) {
    lines.push(`• Uploaded images: ${style.images.join(", ")}`);
  }
  return lines.join("\n");
}

/**
 * Infer which front‑end framework to use based on the style. If the design
 * vibe is playful or if the motion includes scroll transitions, return "react";
 * otherwise, default to "vite".
 */
export function inferFrontend(style: StyleConfig): "react" | "vite" {
  if (style.vibe === "playful" || style.motion === "scroll") {
    return "react";
  }
  return "vite";
}

/**
 * Build a prompt to guide the UI‑generation model (e.g. Google AI Studio).
 * It embeds ND design principles: clear hierarchy, generous white space,
 * high contrast, limited colour palette, and accessible fonts. Adjust
 * the wording as needed to suit your model provider.
 */
export function buildStylePrompt(style: StyleConfig): string {
  const themeDescription =
    style.theme === "light"
      ? "a light theme"
      : style.theme === "dark"
      ? "a dark theme"
      : "either a light or dark theme";
  const vibeMap: Record<string, string> = {
    "simple": "simple and minimalist",
    "clean-max": "clean but maximalist",
    "corporate": "professional and corporate",
    "boho": "bohemian and feminine",
    "playful": "playful and engaging",
  };
  const vibeDescription = vibeMap[style.vibe] || style.vibe;

  return [
    `Design a ${vibeDescription} interface with ${themeDescription}.`,
    `Use a ${style.palette} colour palette and a ${style.font} font.`,
    `Motion effects should be "${style.motion}".`,
    `Follow ND guidelines: short, punchy copy; clear hierarchy; generous white space; high contrast;`,
    `accessible typography; responsive layout occupying only 60–85% of the viewport.`,
    style.favouriteApp
      ? `Take inspiration from the app ${style.favouriteApp}.`
      : "",
    style.images && style.images.length > 0
      ? `Use the uploaded images as visual references.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
