import { describe, expect, it } from "vitest";

import {
  getMermaidFullscreenKeyboardAction,
  getMermaidFullscreenButtonZoomScale,
  getMermaidFullscreenKeyboardTransform,
} from "./mermaid-code";

describe("Mermaid fullscreen zoom controls", () => {
  it("maps zoom button actions into the supported scale range", () => {
    expect(getMermaidFullscreenButtonZoomScale(1, "in")).toBe(1.2);
    expect(getMermaidFullscreenButtonZoomScale(1, "out")).toBeCloseTo(1 / 1.2);
  });

  it("maps fullscreen keyboard shortcuts to transform updates", () => {
    expect(
      getMermaidFullscreenKeyboardTransform({ scale: 1, x: 10, y: 20 }, "+"),
    ).toEqual({ scale: 1.2, x: 10, y: 20 });
    expect(
      getMermaidFullscreenKeyboardTransform({ scale: 1, x: 10, y: 20 }, "-"),
    ).toEqual({ scale: 1 / 1.2, x: 10, y: 20 });
    expect(
      getMermaidFullscreenKeyboardTransform({ scale: 2, x: 10, y: 20 }, "0"),
    ).toEqual({ scale: 1, x: 0, y: 0 });
    expect(
      getMermaidFullscreenKeyboardTransform({ scale: 1, x: 10, y: 20 }, "a"),
    ).toBeNull();
  });
  it("closes fullscreen mode when Escape is pressed", () => {
    expect(
      getMermaidFullscreenKeyboardAction({ scale: 1, x: 10, y: 20 }, "Escape"),
    ).toEqual({ kind: "close" });
  });
});
