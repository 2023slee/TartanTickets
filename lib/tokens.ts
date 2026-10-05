// Named color tokens (UX spec §6). The app's CSS variables are generated
// from this object, so the contrast tests check the colors actually used.
export const tokens = {
  ink: "#1b1b1f", // main text
  muted: "#55565c", // secondary text
  surface: "#ffffff", // card background
  canvas: "#f4f2ee", // page background
  border: "#dcd8d0",
  accent: "#a6192e", // Carnegie red, for buttons
  onAccent: "#ffffff", // text on accent
  focus: "#1a5fb4", // keyboard focus ring
} as const;

function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two hex colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `:root { --ink: ...; --on-accent: ...; }` */
export function tokensAsCss(): string {
  const vars = Object.entries(tokens)
    .map(([name, value]) => `--${name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}: ${value};`)
    .join(" ");
  return `:root { ${vars} }`;
}
