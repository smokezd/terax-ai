import { describe, expect, it } from "vitest";

import { getMermaidKeyboardZoomScale } from "./mermaid-code";

describe("Mermaid fullscreen zoom controls", () => {
  it("maps zoom button actions into the supported scale range", () => {
    expect(getMermaidKeyboardZoomScale(1, "in")).toBe(1.2);
    expect(getMermaidKeyboardZoomScale(1, "out")).toBeCloseTo(1 / 1.2);
  });
});
