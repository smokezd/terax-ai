import { convertFileSrc, invoke } from "@tauri-apps/api/core";

const NERD_FONT_CANDIDATES = [
  "JetBrainsMono Nerd Font",
  "JetBrainsMono Nerd Font Mono",
  "JetBrainsMonoNL Nerd Font",
  "FiraCode Nerd Font",
  "FiraCode Nerd Font Mono",
  "MesloLGS NF",
  "MesloLGM Nerd Font",
  "Hack Nerd Font",
  "Hack Nerd Font Mono",
  "CaskaydiaCove Nerd Font",
  "CaskaydiaMono Nerd Font",
  "Iosevka Nerd Font",
  "Iosevka Term Nerd Font",
  "SauceCodePro Nerd Font",
  "Hasklug Nerd Font",
];

const FALLBACK_CHAIN = '"JetBrains Mono", SFMono-Regular, Menlo, monospace';

// Bundled, OS-shipped, or CSS generic: never looked up on disk. Looking up
// "JetBrains Mono" would shadow the bundled face with a disk copy.
const NON_INSTALLED_FAMILIES = new Set([
  "jetbrains mono",
  "sfmono-regular",
  "menlo",
  "monospace",
  "serif",
  "sans-serif",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-monospace",
  "ui-serif",
  "ui-sans-serif",
  "ui-rounded",
  "emoji",
  "math",
  "fangsong",
]);

// Mirrors the backend's per-call family cap.
const MAX_FAMILIES_PER_LOOKUP = 8;

type InstalledFamily = {
  family: string;
  faces: { path: string; weight: number; italic: boolean }[];
};

let detected: string | null = null;
let monoReady: Promise<void> | null = null;
const installedFamilies = new Map<string, Promise<void>>();

export function ensureMonoFontsLoaded(): Promise<void> {
  if (monoReady) return monoReady;
  if (typeof document === "undefined" || !document.fonts?.load) {
    monoReady = Promise.resolve();
    return monoReady;
  }
  monoReady = Promise.allSettled([
    document.fonts.load('400 14px "JetBrains Mono"'),
    document.fonts.load('700 14px "JetBrains Mono"'),
  ]).then(() => undefined);
  return monoReady;
}

/** Family names in a CSS `font-family` stack that may be installed fonts. */
export function installedFamilyCandidates(stack: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of stack.split(",")) {
    const name = part
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2")
      .trim();
    const key = name.toLowerCase();
    if (!name || NON_INSTALLED_FAMILIES.has(key) || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Registers installed fonts named in `stack` as document fonts so canvas text
 * can use them. Resolves once every face is registered; never rejects, so a
 * missing or unreadable font leaves the CSS fallback chain in charge.
 * Each family is looked up at most once per window.
 */
export function registerInstalledFonts(stack: string): Promise<void> {
  const pending: Promise<void>[] = [];
  const missing: string[] = [];
  for (const family of installedFamilyCandidates(stack)) {
    const known = installedFamilies.get(family.toLowerCase());
    if (known) pending.push(known);
    else if (missing.length < MAX_FAMILIES_PER_LOOKUP) missing.push(family);
  }
  if (missing.length > 0) {
    const batch = registerInstalledFamilies(missing);
    for (const family of missing) {
      installedFamilies.set(family.toLowerCase(), batch);
    }
    pending.push(batch);
  }
  return Promise.all(pending).then(() => undefined);
}

// WKWebView hides user-installed fonts from page content, so a configured
// family only renders once its files are loaded as FontFaces under the same
// name. Off macOS the command returns no faces.
async function registerInstalledFamilies(families: string[]): Promise<void> {
  if (typeof FontFace === "undefined" || !document.fonts) return;
  let found: InstalledFamily[];
  try {
    found = await invoke<InstalledFamily[]>("fonts_installed_families", {
      families,
    });
  } catch (error) {
    console.warn("[fonts] installed font lookup failed", families, error);
    return;
  }
  for (const { family, faces } of found) {
    for (const face of faces) {
      document.fonts.add(
        new FontFace(family, `url("${convertFileSrc(face.path)}")`, {
          weight: String(face.weight),
          style: face.italic ? "italic" : "normal",
        }),
      );
    }
  }
}

export function resolveFontFamily(userInput: string): string {
  const name = userInput.trim();
  if (!name) return detectMonoFontFamily();
  // A comma means the user gave a full stack; otherwise quote the single family.
  // Strip any quotes first so a stray quote can't produce a malformed token.
  const head = name.includes(",") ? name : `"${name.replace(/['"]/g, "")}"`;
  return `${head}, ${FALLBACK_CHAIN}`;
}

export function detectMonoFontFamily(): string {
  if (detected) return detected;
  if (typeof document === "undefined") {
    detected = FALLBACK_CHAIN;
    return detected;
  }
  const context = document.createElement("canvas").getContext("2d");
  if (context) {
    const sample = "Wim0123\ue0a0\ue718";
    const fallbacks = ["monospace", "serif"];
    const widths = fallbacks.map((fallback) => {
      context.font = `16px ${fallback}`;
      return context.measureText(sample).width;
    });
    for (const font of NERD_FONT_CANDIDATES) {
      if (
        fallbacks.some((fallback, index) => {
          context.font = `16px "${font}", ${fallback}`;
          return context.measureText(sample).width !== widths[index];
        })
      ) {
        detected = `"${font}", ${FALLBACK_CHAIN}`;
        return detected;
      }
    }
  }
  detected = FALLBACK_CHAIN;
  return detected;
}
