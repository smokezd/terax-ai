import { describe, expect, it } from "vitest";

import {
  getMermaidConfig,
  isMermaidLanguage,
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
