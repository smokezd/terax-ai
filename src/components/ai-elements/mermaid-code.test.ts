import { describe, expect, it } from "vitest";

import {
  clampMermaidFullscreenScale,
  getMermaidConfig,
  getMermaidInlineSvgClassName,
  getMermaidModeToggleLabel,
  getMermaidPointerAnchoredTransform,
  isMermaidLanguage,
  MERMAID_FULLSCREEN_MAX_SCALE,
  MERMAID_FULLSCREEN_MIN_SCALE,
  sanitizeMermaidSvg,
} from "./mermaid-code";

describe("Mermaid code helpers", () => {
  it("detects Mermaid fenced block languages case-insensitively", () => {
    expect(isMermaidLanguage("mermaid")).toBe(true);
    expect(isMermaidLanguage("MMD")).toBe(true);
    expect(isMermaidLanguage("bash")).toBe(false);
    expect(isMermaidLanguage(null)).toBe(false);
  });

  it("uses strict Mermaid rendering settings for direct browser rendering", () => {
    expect(getMermaidConfig("dark")).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
    });
    expect(getMermaidConfig("light")).toMatchObject({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "default",
    });
  });

  it("removes active SVG content and unsafe URLs before insertion", () => {
    const sanitized = sanitizeMermaidSvg(
      '<svg><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()"><text>ok</text></a><image href="https://example.com/x.png" /></svg>',
    );

    expect(sanitized).toContain("<svg");
    expect(sanitized).toContain("<text>ok</text>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("https://example.com");
  });
});

describe("Mermaid preview actions", () => {
  it("uses Preview as the source-mode action and Code as the preview-mode action", () => {
    expect(getMermaidModeToggleLabel("source")).toBe("Preview");
    expect(getMermaidModeToggleLabel("preview")).toBe("Code");
  });
});

describe("Mermaid inline SVG fit", () => {
  it("uses a strict viewport fit class while preserving SVG scaling", () => {
    expect(getMermaidInlineSvgClassName()).toContain("[&_svg]:max-w-full");
    expect(getMermaidInlineSvgClassName()).toContain("[&_svg]:h-auto");
    expect(getMermaidInlineSvgClassName()).toContain("[&_svg]:mx-auto");
  });
});

describe("Mermaid fullscreen transform", () => {
  it("bounds wheel zoom to the supported fullscreen range", () => {
    expect(clampMermaidFullscreenScale(0.1)).toBe(MERMAID_FULLSCREEN_MIN_SCALE);
    expect(clampMermaidFullscreenScale(10)).toBe(MERMAID_FULLSCREEN_MAX_SCALE);
  });

  it("anchors zoom at the pointer position", () => {
    const next = getMermaidPointerAnchoredTransform(
      { scale: 1, x: 0, y: 0 },
      2,
      { x: 50, y: 25 },
    );

    expect(next).toEqual({ scale: 2, x: -50, y: -25 });
  });
});
