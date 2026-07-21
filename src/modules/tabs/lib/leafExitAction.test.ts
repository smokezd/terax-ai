import { describe, expect, it } from "vitest";
import { leafExitAction } from "./leafExitAction";
import type { TerminalTab } from "./useTabs";

function term(id: number, spaceId: string): TerminalTab {
  return {
    id,
    kind: "terminal",
    spaceId,
    title: "shell",
    paneTree: { kind: "leaf", id: id * 10 },
    activeLeafId: id * 10,
  } as TerminalTab;
}

// A terminal tab with two panes (a split of two leaves).
function split(id: number, spaceId: string): TerminalTab {
  return {
    id,
    kind: "terminal",
    spaceId,
    title: "shell",
    paneTree: {
      kind: "split",
      id: id * 10,
      dir: "row",
      children: [
        { kind: "leaf", id: id * 10 + 1 },
        { kind: "leaf", id: id * 10 + 2 },
      ],
    },
    activeLeafId: id * 10 + 1,
  } as TerminalTab;
}

describe("leafExitAction", () => {
  it("closes just the pane when the tab has other panes", () => {
    const tab = split(1, "a");
    expect(leafExitAction([tab], tab)).toBe("close-pane");
  });

  it("quits when it is the only pane of the only tab", () => {
    const tab = term(1, "a");
    expect(leafExitAction([tab], tab)).toBe("quit");
  });

  it("closes the tab when its space has other tabs", () => {
    const tab = term(1, "a");
    expect(leafExitAction([tab, term(2, "a")], tab)).toBe("close-pane");
  });

  it("respawns when it is the last tab of its space but not the last tab overall", () => {
    // Regression: the last tab of a space cannot be removed (space must keep
    // >=1 tab), so removing it would freeze the pane. Respawn instead.
    const tab = term(1, "a");
    expect(leafExitAction([tab, term(2, "b")], tab)).toBe("respawn");
  });
});
