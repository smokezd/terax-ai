# fn-1-markdown-code-block-line-wrap-toggle.1 Add code block wrap toggle

## Description
## Scope
Implement the Markdown viewer code block line-wrap toggle in the shared fenced-code block renderer.

## Files and Reuse Points
- Primary target: `src/components/ai-elements/chat-code.tsx`.
  - `ChatCodeBlock` is the shared fenced-code renderer.
  - `BlockChrome` owns the code block header where the copy action currently lives.
  - The current content wrapper and `<pre>` classes are the styling anchors for horizontal scroll/no-wrap behavior.
  - `CopyButton` already demonstrates local per-block UI state and header button styling.
- Call chain to preserve:
  - `src/modules/markdown/MarkdownPreviewPane.tsx` maps markdown `code` nodes to `MarkdownCode`.
  - `src/components/ai-elements/markdown-code.tsx` maps fenced blocks to `ChatCodeBlock` and inline code to a separate inline span.

## Required Behavior
Add an icon button next to the existing copy header action for fenced code blocks. The button toggles wrapping for only that rendered block and defaults off.

When wrapping is off, preserve the current code behavior: whitespace is preserved and long lines can scroll horizontally inside the code block.

When wrapping is on, preserve whitespace/newlines while allowing long lines, URLs, and tokens to wrap within the block width. Do not change the raw copied text.

## Accessibility and UI Notes
Use a real button with a stable accessible label/title and `aria-pressed` for the toggle state. Keep the button compact and visually consistent with the existing copy action. Use an existing icon from the project icon set if suitable.

## Implementation Constraints
- Keep state local to the rendered code block; do not add app-level persistence or settings.
- Do not change inline code rendering.
- Cover both highlighted and fallback/plain `<pre>` render paths.
- Prefer Tailwind utility classes already used in the codebase, such as `whitespace-pre`, `whitespace-pre-wrap`, and the existing word-wrap/break pattern. Add minimal custom CSS only if the existing utilities cannot express the needed wrapping.
- Keep copy behavior based on the original `code` string.

## Verification
Run `pnpm check-types`. Run `pnpm lint` and `pnpm test` if the change touches lint-sensitive JSX or adds tests. Manually verify the Markdown viewer with a fenced code block containing a long single line, a long URL/token, deep indentation, and syntax-highlighted language content at a narrow pane width.
## Acceptance
- Adds an icon-only code block header toggle button next to the existing copy action for fenced code blocks rendered through the shared `ChatCodeBlock`, so Markdown viewer and other shared fenced-code surfaces get consistent behavior. [R1]
- The toggle uses an existing suitable Hugeicons icon, keeps a stable accessible label/title such as “Toggle line wrapping”, exposes state with `aria-pressed`, and remains visually usable beside the copy button and language label at narrow widths. [R1, R4]
- The toggle defaults off for each code block, uses block-local ephemeral state, and returns to off when the block/view remounts; no app-level preference, per-tab persistence, or session persistence is added. [R2]
- Toggling one code block affects only that rendered block; it does not affect other code blocks in the same Markdown viewer, chat message, or app session. [R2]
- Off state preserves the current no-wrap/horizontal-scroll code presentation, including existing typography, padding, line height, and syntax-highlight styling. [R2]
- On state wraps long lines within the block width using whitespace-preserving wrapping and anywhere-style token breaking, so long URLs, minified JSON, hashes, and generated tokens stay inside the visible block. [R3]
- On state should remove practical horizontal scrolling for wrapped content while retaining defensive overflow handling only for unavoidable rendering edge cases. [R3]
- Wrapping preserves indentation, spaces, and newline semantics; it must not collapse code whitespace or alter highlighted token text. [R3, R6]
- Copy action still writes the original raw code string in both wrap states. [R5]
- Copy and wrap interactions are independent: toggling wrap does not clear copied feedback, and copying does not change wrap state. [R5]
- Inline code rendering is unchanged and does not receive a header or wrap toggle. [R6]
- Both syntax-highlighted and fallback/plain code block render paths respect the same wrap state. [R6]
- `pnpm check-types` passes after implementation; `pnpm lint` and `pnpm test` are run when applicable to the final code changes.
## Done summary
Added a block-local line wrap toggle to ChatCodeBlock chrome. Fenced code remains no-wrap by default and wraps long lines/tokens only when the per-block toggle is enabled.
## Evidence
- Commits: bf8e9bb310f6be1dbdb0b66e532bca617486f71b
- Tests: pnpm check-types, pnpm test, pnpm lint (fails on pre-existing unrelated lint issues), pnpm exec biome check src/components/ai-elements/chat-code.tsx (path ignored by Biome config), pnpm exec prettier --check src/components/ai-elements/chat-code.tsx (prettier not installed)
- PRs: