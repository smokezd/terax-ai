import { describe, expect, it } from "vitest";

import { sanitizeMermaidSvg } from "./mermaid-code";

describe("sanitizeMermaidSvg", () => {
  it("preserves Mermaid foreignObject labels while removing executable content", () => {
    const sanitized = sanitizeMermaidSvg(
      '<svg><script>alert(1)</script><foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><p>Node label</p></div></foreignObject><a href="javascript:alert(1)" onclick="x()"><text>ok</text></a></svg>',
    );

    expect(sanitized).toContain("<foreignObject>");
    expect(sanitized).toContain("<p>Node label</p>");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("onclick=");
  });
});
