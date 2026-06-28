# fn-2-markdown-mermaid-chart-preview.1 Add Mermaid SVG preview rendering

## Description
Add the Mermaid rendering foundation for fenced `mermaid` Markdown blocks.

Scope:
- Add or confirm Mermaid as a direct frontend dependency before importing it.
- Create a dedicated Mermaid SVG render path/component for `language-mermaid` fenced blocks, integrated from the existing `MarkdownCode`/`ChatCodeBlock` path without changing non-Mermaid code blocks.
- Render via Mermaid browser APIs (`startOnLoad: false`, direct `render`) with stable unique IDs and async stale-result protection.
- Use strict Mermaid security configuration and a safe SVG insertion path.
- Wire light/dark resolved theme into rendering so diagrams re-render when the app theme changes.
- Provide loading and invalid-diagram fallback states that preserve source readability.

Primary files likely involved:
- `src/components/ai-elements/markdown-code.tsx`
- `src/components/ai-elements/chat-code.tsx`
- New Mermaid-specific component/lib under the Markdown or ai-elements component area
- `package.json` / `pnpm-lock.yaml` if Mermaid is not already direct

Keep fullscreen pan/zoom controls for task 2 unless a minimal shell is required for clean component boundaries.
## Acceptance
- Mermaid fenced blocks render SVG preview by default through a dedicated Mermaid path. [R1, R3]
- Non-Mermaid fenced blocks, including Bash blocks with existing actions, continue using the current `ChatCodeBlock` behavior. [R1, R2]
- Preview/source mode is represented per block, with source visible for fallback/error states. [R2, R3]
- Rendering uses stable IDs, handles React effect cleanup/stale async results, and does not use Mermaid global DOM scanning. [R3]
- Mermaid output is safely inserted with strict Mermaid configuration and SVG sanitization or an equivalent documented safe path. [R8]
- Rendering derives theme from existing theme context/resolved mode and re-renders on light/dark changes. [R7]
- Mermaid is a direct dependency or otherwise explicitly justified, and imports are lazy enough not to expand startup/eager bundles unexpectedly. [R9]
## Done summary
Added a Markdown-viewer-only Mermaid SVG preview path for fenced mermaid/mmd code blocks with lazy Mermaid loading, strict render configuration, SVG sanitization, theme-aware re-rendering, and per-block Preview/Code state. Non-Mermaid and chat code blocks continue through the existing ChatCodeBlock behavior.
## Evidence
- Commits: da8c88d3b9aa81d14309ee52c27ff53a6083cfe3
- Tests: pnpm test -- src/components/ai-elements/mermaid-code.test.ts (red: missing ./mermaid-code module before implementation; green after implementation), pnpm check-types (pass), pnpm test (pass: 32 files, 250 tests), pnpm lint (fails on pre-existing unrelated diagnostics outside this task path)
- PRs: