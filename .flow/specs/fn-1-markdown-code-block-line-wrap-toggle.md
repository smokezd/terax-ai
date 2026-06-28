## Problem
The Markdown viewer renders fenced code blocks through the shared chat code block component, which currently exposes a copy action in the block header and keeps code horizontally scrollable. Long lines can be hard to read in the viewer on narrow panes because there is no per-block way to wrap them to the available viewport width.

## Goals
Add a compact code block header option next to the existing copy action that toggles line wrapping for that individual code block. Wrapping is off by default. When enabled, long lines should wrap within the code block width while preserving whitespace and copy behavior.

## Acceptance Criteria
- **R1:** Markdown viewer fenced code blocks show a new header action next to the existing copy action that toggles line wrapping for that code block.
- **R2:** Line wrapping defaults to off for each rendered code block, preserving the current horizontally scrollable code presentation until the user toggles it on.
- **R3:** When wrapping is on, long lines fit within the visible code block width without causing page-level horizontal overflow, while preserving indentation and newline semantics.
- **R4:** The toggle is accessible as a real button with a stable label/title and pressed state semantics; it remains usable at narrow pane widths without overlapping the copy button or language label.
- **R5:** Copy still copies the original raw code string regardless of the wrap state.
- **R6:** The implementation covers both highlighted and fallback/plain code block render paths used by the Markdown viewer.

## Key Context
- `src/modules/markdown/MarkdownPreviewPane.tsx` imports `MarkdownCode` and passes it to Streamdown as the `code` renderer, so Markdown viewer fenced blocks flow through the shared code component.
- The repo uses Streamdown rather than direct `react-markdown`; Streamdown is a drop-in markdown renderer with `components` overrides and an `inlineCode` slot, so the implementation should keep fenced-code behavior separate from inline code.
- `src/components/ai-elements/markdown-code.tsx` maps fenced code to `ChatCodeBlock` and inline code to a separate inline span; the feature should target fenced blocks only.
- `src/components/ai-elements/chat-code.tsx` contains `ChatCodeBlock`, `BlockChrome`, `HighlightedPre`, and `CopyButton`. The header action belongs in `BlockChrome`, where the current copy button is rendered.
- Existing code blocks use horizontal overflow around the rendered `<pre>` content. The task should apply wrap/no-wrap styling to the element that owns text flow, not just the outer wrapper.
- Practice guidance from scout research: prefer block-local React state, `aria-pressed` for the toggle, `white-space: pre` when off, `white-space: pre-wrap` with `overflow-wrap: anywhere` when on, and keep copy based on the original string.

## Non-Goals
- Do not add a global or persisted “wrap code blocks by default” preference.
- Do not change inline code rendering.
- Do not rewrite syntax highlighting or alter token text.
- Do not add README/product documentation unless implementation review decides this small viewer affordance should be advertised.

## Implementation Notes
- Reuse the existing header styling and icon button pattern in `BlockChrome`.
- Prefer a small icon-only toggle with `title`/`aria-label` and `aria-pressed` over visible explanatory text.
- Keep state local to each rendered block so toggling one block does not affect other blocks.
- Ensure the fallback plain `<pre>` path and `HighlightedPre` path receive the same wrap state.
- Prefer Tailwind utilities for wrap states, such as `whitespace-pre`, `whitespace-pre-wrap`, and `wrap-anywhere`/`wrap-break-word`; avoid `word-break: break-all` unless explicitly justified.

## Verification Notes
- Add or update focused component tests if the project has an established test harness for these components; otherwise manually verify in the Markdown viewer.
- Run `pnpm check-types` for TypeScript coverage.
- Manually verify a Markdown file with a long one-line code block, a long URL/token, deep indentation, syntax-highlighted code, and a narrow viewer pane.
