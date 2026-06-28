import { describe, expect, it } from "vitest";

import {
  clampMermaidFullscreenScale,
  formatMermaidError,
  getMermaidConfig,
  getMermaidInitialMode,
  getMermaidFullscreenSurfaceClassName,
  getMermaidFullscreenSvgClassName,
  getMermaidFullscreenViewportClassName,
  getMermaidInlineSvgClassName,
  getMermaidKeyboardZoomScale,
  getMermaidModeToggleLabel,
  getMermaidPointerAnchoredTransform,
  getMermaidPointerAnchoredTransformFromRect,
  isMermaidLanguage,
  MERMAID_FULLSCREEN_MAX_SCALE,
  MERMAID_FULLSCREEN_MIN_SCALE,
  shouldUseMermaidPreview,
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
      htmlLabels: false,
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
    });
    expect(getMermaidConfig("light")).toMatchObject({
      htmlLabels: false,
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

  it("defaults Mermaid code blocks to preview mode", () => {
    expect(getMermaidInitialMode()).toBe("preview");
  });

  it("routes only Mermaid aliases through the preview renderer when enabled", () => {
    expect(shouldUseMermaidPreview({ enableMermaidPreview: true, lang: "mermaid" })).toBe(true);
    expect(shouldUseMermaidPreview({ enableMermaidPreview: true, lang: "MMD" })).toBe(true);
    expect(shouldUseMermaidPreview({ enableMermaidPreview: true, lang: "bash" })).toBe(false);
    expect(shouldUseMermaidPreview({ enableMermaidPreview: false, lang: "mermaid" })).toBe(false);
  });

  it("keeps invalid Mermaid fallback messages concise and source-safe", () => {
    const message = formatMermaidError(new Error("Parse error on line 2: expected SEMI"));

    expect(message).toContain("Unable to render Mermaid diagram");
    expect(message).toContain("Parse error on line 2");
    expect(message.length).toBeLessThanOrEqual(180);
  });
});

describe("Mermaid inline SVG fit", () => {
  it("uses a strict viewport fit class while preserving SVG scaling", () => {
    expect(getMermaidInlineSvgClassName()).toContain("[&_svg]:max-w-full");
    expect(getMermaidInlineSvgClassName()).toContain("[&_svg]:max-h-[70vh]");
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

  it("maps fullscreen keyboard zoom actions into the supported scale range", () => {
    expect(getMermaidKeyboardZoomScale(1, "+")).toBe(1.2);
    expect(getMermaidKeyboardZoomScale(1, "-")).toBeCloseTo(1 / 1.2);
    expect(getMermaidKeyboardZoomScale(2, "0")).toBe(1);
    expect(getMermaidKeyboardZoomScale(10, "+")).toBe(MERMAID_FULLSCREEN_MAX_SCALE);
    expect(getMermaidKeyboardZoomScale(0.1, "-")).toBe(MERMAID_FULLSCREEN_MIN_SCALE);
  });
});
it("keeps wide inline diagrams readable instead of collapsing them vertically", () => {
  const className = getMermaidInlineSvgClassName();

  expect(className).toContain("min-h-[240px]");
  expect(className).toContain("[&_svg]:max-h-[70vh]");
  expect(className).not.toContain("[&_svg]:h-auto");
});

it("isolates Mermaid foreignObject labels from Markdown prose styles", () => {
  const className = getMermaidInlineSvgClassName();

  expect(className).toContain("[&_svg_foreignObject_p]:m-0");
  expect(className).toContain("[&_svg_foreignObject_p]:leading-normal");
  expect(className).toContain("[&_svg_foreignObject_p]:text-inherit");
});

it("uses a true viewport fullscreen surface for Mermaid charts", () => {
  const surfaceClassName = getMermaidFullscreenSurfaceClassName();
  const svgClassName = getMermaidFullscreenSvgClassName();
  const viewportClassName = getMermaidFullscreenViewportClassName();

  expect(surfaceClassName).toContain("fixed");
  expect(surfaceClassName).toContain("inset-0");
  expect(surfaceClassName).toContain("z-50");
  expect(surfaceClassName).not.toContain("max-w-");
  expect(viewportClassName).toContain("flex-1");
  expect(viewportClassName).toContain("overflow-hidden");
  expect(svgClassName).toContain("h-full");
  expect(svgClassName).toContain("w-full");
  expect(svgClassName).toContain("[&_svg]:h-full");
  expect(svgClassName).toContain("[&_svg]:w-full");
});

it("keeps the fullscreen zoom anchor fixed when the transform origin is offset", () => {
  expect(
    getMermaidPointerAnchoredTransform(
      { scale: 1, x: 10, y: 20 },
      2,
      { x: 150, y: 125 },
      { x: 100, y: 100 },
    ),
  ).toEqual({ scale: 2, x: -30, y: 15 });
});

it("keeps the actual transformed SVG point fixed while zooming", () => {
  const pointer = { x: 1055, y: 215 };
  const rect = { left: 1055, top: 215 };

  expect(
    getMermaidPointerAnchoredTransformFromRect(
      { scale: 1, x: 0, y: 0 },
      1.2,
      pointer,
      rect,
    ),
  ).toEqual({ scale: 1.2, x: 0, y: 0 });

  const anchored = getMermaidPointerAnchoredTransformFromRect(
    { scale: 1, x: 0, y: 0 },
    1.2,
    { x: 1155, y: 265 },
    rect,
  );

  expect(anchored.scale).toBeCloseTo(1.2);
  expect(anchored.x).toBeCloseTo(-20);
  expect(anchored.y).toBeCloseTo(-10);
});
