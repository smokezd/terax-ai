import { afterEach, describe, expect, it, vi } from "vitest";
import { installedFamilyCandidates, resolveFontFamily } from "./fonts";

const core = vi.hoisted(() => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => `asset://localhost${path}`,
}));
vi.mock("@tauri-apps/api/core", () => core);

const FALLBACK = '"JetBrains Mono", SFMono-Regular, Menlo, monospace';

afterEach(() => {
  core.invoke.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("terminal font availability", () => {
  it("does not accept an absent font when FontFaceSet.check returns true", async () => {
    const context = {
      font: "",
      measureText: () => ({
        width:
          context.font.endsWith("serif") && !context.font.endsWith("monospace")
            ? 110
            : 100,
      }),
    };
    vi.stubGlobal("document", {
      fonts: { check: () => true },
      createElement: () => ({ getContext: () => context }),
    });
    const { detectMonoFontFamily } = await import("./fonts");
    expect(detectMonoFontFamily()).toBe(FALLBACK);
  });

  it("finds an installed later candidate and caches its measurements", async () => {
    const context = {
      font: "",
      measureText: vi.fn(() => ({
        width: context.font.includes('"Hack Nerd Font"')
          ? 130
          : context.font.endsWith(", serif") || context.font === "16px serif"
            ? 110
            : 100,
      })),
    };
    vi.stubGlobal("document", {
      createElement: () => ({ getContext: () => context }),
    });
    const { detectMonoFontFamily } = await import("./fonts");
    expect(detectMonoFontFamily()).toBe(`"Hack Nerd Font", ${FALLBACK}`);
    const calls = context.measureText.mock.calls.length;
    detectMonoFontFamily();
    expect(context.measureText).toHaveBeenCalledTimes(calls);
  });

  it("loads text fonts before canvas rasterization, only once per window", async () => {
    const load = vi.fn(async () => []);
    vi.stubGlobal("document", { fonts: { load } });
    const { ensureMonoFontsLoaded } = await import("./fonts");
    const first = ensureMonoFontsLoaded();
    expect(ensureMonoFontsLoaded()).toBe(first);
    await first;
    expect(load).toHaveBeenCalledWith('400 14px "JetBrains Mono"');
    expect(load).toHaveBeenCalledWith('700 14px "JetBrains Mono"');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("resolveFontFamily", () => {
  it("quotes a bare family and appends the mono fallback", () => {
    expect(resolveFontFamily("JetBrainsMono Nerd Font")).toBe(
      `"JetBrainsMono Nerd Font", ${FALLBACK}`,
    );
  });

  it("does not double-quote an already-quoted family", () => {
    expect(resolveFontFamily('"Fira Code"')).toBe(`"Fira Code", ${FALLBACK}`);
  });

  it("passes a comma-separated stack through and still appends fallback", () => {
    expect(resolveFontFamily("Foo, Bar")).toBe(`Foo, Bar, ${FALLBACK}`);
  });

  it("strips stray internal quotes to avoid a malformed token", () => {
    expect(resolveFontFamily('Foo"Bar')).toBe(`"FooBar", ${FALLBACK}`);
  });

  it("trims surrounding whitespace before quoting", () => {
    expect(resolveFontFamily("  Hack Nerd Font  ")).toBe(
      `"Hack Nerd Font", ${FALLBACK}`,
    );
  });

  it("falls back to the mono chain for empty input", () => {
    expect(resolveFontFamily("")).toBe(FALLBACK);
    expect(resolveFontFamily("   ")).toBe(FALLBACK);
  });
});

describe("installedFamilyCandidates", () => {
  it("keeps named families and drops bundled, OS and generic ones", () => {
    expect(
      installedFamilyCandidates(
        `"JetBrainsMono Nerd Font Mono", 'Herdr Agent Icons Max', Plain Name, ${FALLBACK}, serif`,
      ),
    ).toEqual([
      "JetBrainsMono Nerd Font Mono",
      "Herdr Agent Icons Max",
      "Plain Name",
    ]);
  });

  it("dedupes repeated families and ignores empty entries", () => {
    expect(installedFamilyCandidates('"A", , a, ""')).toEqual(["A"]);
  });
});

describe("registerInstalledFonts", () => {
  function stubFonts() {
    const added: { family: string; source: string; descriptors: unknown }[] =
      [];
    vi.stubGlobal(
      "FontFace",
      class {
        constructor(family: string, source: string, descriptors: unknown) {
          added.push({ family, source, descriptors });
        }
      },
    );
    vi.stubGlobal("document", { fonts: { add: vi.fn() } });
    return added;
  }

  it("registers each installed face under the configured family name", async () => {
    const added = stubFonts();
    core.invoke.mockResolvedValue([
      {
        family: "Mono NF",
        faces: [
          { path: "/f/Regular.ttf", weight: 400, italic: false },
          { path: "/f/BoldItalic.ttf", weight: 700, italic: true },
        ],
      },
      { family: "Icons", faces: [] },
    ]);
    const { registerInstalledFonts } = await import("./fonts");
    await registerInstalledFonts(`"Mono NF", "Icons", ${FALLBACK}`);

    expect(core.invoke).toHaveBeenCalledExactlyOnceWith(
      "fonts_installed_families",
      { families: ["Mono NF", "Icons"] },
    );
    expect(added).toEqual([
      {
        family: "Mono NF",
        source: 'url("asset://localhost/f/Regular.ttf")',
        descriptors: { weight: "400", style: "normal" },
      },
      {
        family: "Mono NF",
        source: 'url("asset://localhost/f/BoldItalic.ttf")',
        descriptors: { weight: "700", style: "italic" },
      },
    ]);
  });

  it("looks each family up once per window", async () => {
    stubFonts();
    core.invoke.mockResolvedValue([]);
    const { registerInstalledFonts } = await import("./fonts");
    await registerInstalledFonts('"Mono NF"');
    await registerInstalledFonts('"mono nf", "Icons"');
    expect(core.invoke).toHaveBeenCalledTimes(2);
    expect(core.invoke).toHaveBeenLastCalledWith("fonts_installed_families", {
      families: ["Icons"],
    });
  });

  it("makes no lookup for the default fallback chain", async () => {
    stubFonts();
    const { registerInstalledFonts } = await import("./fonts");
    await registerInstalledFonts(FALLBACK);
    expect(core.invoke).not.toHaveBeenCalled();
  });

  it("resolves when the lookup fails", async () => {
    const added = stubFonts();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    core.invoke.mockRejectedValue(new Error("boom"));
    const { registerInstalledFonts } = await import("./fonts");
    await expect(registerInstalledFonts('"Mono NF"')).resolves.toBeUndefined();
    expect(added).toEqual([]);
  });
});
