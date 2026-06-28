# fn-2-markdown-mermaid-chart-preview.2 Add Mermaid code block actions and fullscreen preview

## Description
Add the user-facing Mermaid code-block actions, inline fit behavior, and fullscreen inspection experience.

Scope:
- Add a compact Preview action for Mermaid blocks using the existing code-block action/button visual language.
- Keep preview default ON and allow per-block toggle to source view.
- Ensure inline Mermaid SVGs fit the Markdown viewport width when oversized without breaking layout.
- Add a fullscreen action for rendered Mermaid blocks using shared dialog/overlay primitives.
- In fullscreen, support bounded mouse-wheel zoom and right-button drag repositioning within the diagram viewport.
- Scope context-menu suppression and wheel scroll prevention only to the fullscreen diagram interaction area.
- Provide accessible close/Escape handling and focus restoration.

Primary files likely involved:
- Mermaid preview component from task 1
- `src/components/ai-elements/chat-code.tsx` or adjacent code-block chrome helpers
- Shared UI primitives from `src/components/ui/*` as needed
## Acceptance
- Mermaid blocks show a Preview action alongside existing compact code-block actions and the action toggles only that block. [R2]
- Inline rendered SVGs fit within the Markdown pane width and preserve scalable SVG/viewBox behavior. [R4]
- Fullscreen action opens the rendered chart in a fullscreen/modal preview and can be closed with the visible close control and Escape. [R5]
- Focus returns to the fullscreen action after closing. [R5]
- Mouse wheel zoom in fullscreen is bounded and does not scroll the underlying page while the pointer is over the diagram viewport. [R6]
- Right-button drag repositions the chart in fullscreen and native context-menu suppression is limited to that interaction viewport. [R6]
- Fullscreen rendering remains theme-appropriate when opened from light and dark themes. [R7]
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
