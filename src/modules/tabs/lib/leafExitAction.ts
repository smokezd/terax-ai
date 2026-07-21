import { leafIds } from "@/modules/terminal";
import type { Tab, TerminalTab } from "./useTabs";
import { nextActiveInSpace } from "./useTabs";

export type LeafExitAction = "quit" | "respawn" | "close-pane";

// Decide what to do when a terminal pane's shell exits.
//
// - Tab still has other panes: drop just that pane.
// - Only pane of the only tab (app-wide): quit.
// - Only pane, last tab of its space (but other tabs exist elsewhere):
//   the space must keep >=1 tab, so the tab cannot be removed. Removing the
//   pane anyway would leave a frozen (stdin-disabled) shell, so respawn a
//   fresh shell in place instead.
// - Otherwise (space has other tabs): drop the tab.
export function leafExitAction(tabs: Tab[], tab: TerminalTab): LeafExitAction {
  const lastPane = leafIds(tab.paneTree).length === 1;
  if (!lastPane) return "close-pane";
  if (tabs.length === 1) return "quit";
  if (nextActiveInSpace(tabs, tab.id) === null) return "respawn";
  return "close-pane";
}
