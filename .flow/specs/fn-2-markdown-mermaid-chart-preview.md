## Problem

Markdown rendered view currently treats fenced `mermaid` blocks as ordinary code. Users need Mermaid diagrams to render inline as scalable SVG previews in Markdown file tabs. Preview mode should be ON by default, preserve access to the original source code, fit oversized diagrams to the available inline width, and provide a fullscreen inspection mode with zoom/reset controls and right-button drag repositioning.

## Acceptance Criteria

- **R1:** Fenced Markdown code blocks whose language resolves case-insensitively to `mermaid` or `mmd` render an inline Mermaid chart preview by default in rendered Markdown file tabs, while non-Mermaid fenced blocks continue to use the existing code block rendering path unchanged.
- **R2:** Mermaid preview applies to the Markdown file viewer only; chat messages and other surfaces using the shared code renderer keep their current source-code behavior unless explicitly opted in later.
- **R3:** Each Mermaid block exposes a compact Preview/Code action in the same code-block action area/style as existing actions such as Bash Run and line wrap; the action toggles between SVG preview and the existing source code block chrome for that block only.
- **R4:** Preview/source mode does not persist across reloads, file opens, or separate render sessions; Mermaid blocks default back to preview mode when rendered.
- **R5:** Mermaid rendering uses bundled Mermaid APIs to produce SVG, does not use global DOM scanning, uses stable collision-free render IDs, handles async render cancellation/stale results, lazy-loads Mermaid only when a Mermaid block is present, and shows a compact loading state while loading/rendering.
- **R6:** Mermaid blocks render when near/inside the viewport rather than eagerly rendering every diagram in large Markdown files.
- **R7:** Invalid diagrams, render errors, or over-limit diagrams show a concise sanitized error/explanation plus the original source; failures are isolated per block and the rest of the Markdown document continues rendering.
- **R8:** Mermaid SVG output is constrained to fit the inline Markdown viewport width when wider than the available space, preserves SVG scalability/viewBox behavior, and does not cause horizontal layout breakage. Smaller inline diagrams render at natural size and are centered.
- **R9:** Inline Mermaid preview does not expose fit/reset controls; detailed navigation controls belong to fullscreen mode.
- **R10:** Each successfully rendered Mermaid preview exposes a fullscreen action. Fullscreen is unavailable when the diagram has not rendered successfully or when the block is in source mode.
- **R11:** Fullscreen opens as an app modal overlay, not native OS/window fullscreen, starts reset on each open, initially fits the chart to the viewport, supports visible zoom controls, and includes a reset control that returns to the centered initial fit-to-viewport transform.
- **R12:** Fullscreen Mermaid preview supports mouse-wheel zoom from 25% to 400%, anchored at the mouse pointer so the pointed diagram location stays under the pointer during zoom.
- **R13:** Fullscreen Mermaid preview supports right-button-only drag repositioning across the fullscreen viewport area; native context-menu suppression and wheel scroll prevention are scoped to that interaction viewport.
- **R14:** Fullscreen supports minimal keyboard controls: Escape closes, `+` zooms in, `-` zooms out, and `0` resets to the centered fit-to-viewport transform. The fullscreen toolbar remains visible.
- **R15:** Mermaid rendering respects the current app light/dark theme and custom Terax themes by using existing theme context/resolved mode and semantic CSS variable mapping where practical. Inline and fullscreen diagrams re-render immediately when the theme changes.
- **R16:** While a re-render is pending, the last successful SVG may remain visible to avoid flicker; if the new render fails, replace it with error plus source rather than showing a stale chart.
- **R17:** Mermaid rendering keeps the app security posture: use Mermaid strict security settings, do not enable raw Markdown HTML, sanitize injected SVG output with an SVG-aware sanitizer or equivalent safe insertion path, allow only safe/limited Mermaid directives, block directives from overriding security/theme/startup/size limits, avoid binding Mermaid click/link callbacks, and disallow external resources in rendered output.
- **R18:** Mermaid is added or confirmed as a direct frontend dependency before import, preferably lazy-loaded from the Markdown/Mermaid preview path so the startup/eager bundle budget is not meaningfully expanded. Add a direct sanitizer dependency if no suitable SVG-safe sanitizer exists.
- **R19:** Conservative Mermaid source/complexity limits are enforced. When limits are exceeded, show source plus explanation and do not provide a Render Anyway escape hatch.
- **R20:** Copy behavior remains source-only; no SVG copy/export/print support is added in this feature.
- **R21:** Render failures show concise sanitized messages and may log development-friendly debugging details without noisy production console output.
- **R22:** Focused automated coverage and manual verification cover Mermaid/mmd detection, default preview mode, Preview/Code toggle, invalid and over-limit fallbacks, theme re-render behavior, fullscreen open/close/reset, zoom/pan basics, keyboard controls, and non-Mermaid code-block regression.
- **R23:** Tests should mock Mermaid for component/unit behavior and include one real-render smoke test if practical. Fullscreen pan/zoom should have automated basics plus manual verification for wheel/right-drag geometry.
- **R24:** Lightweight README, ROADMAP, and TERAX notes are updated after implementation where applicable, and repeatable sample diagrams cover small, wide, invalid, and themed cases.

## Repo Context

- Markdown files open in rendered view by default and can switch to raw per tab from `src/app/App.tsx:524` and the Markdown stack in `src/modules/markdown/MarkdownStack.tsx`.
- Rendered Markdown is handled by `src/modules/markdown/MarkdownPreviewPane.tsx`, which imports `MarkdownCode` and passes it into Streamdown for fenced code rendering.
- Fenced code language extraction is centralized in `src/components/ai-elements/markdown-code.tsx:12-33`, which currently delegates block rendering to `ChatCodeBlock`.
- Code block chrome/actions live in `src/components/ai-elements/chat-code.tsx`; the closest existing action patterns are copy/wrap/run controls around `src/components/ai-elements/chat-code.tsx:220-313`.
- Chat markdown also uses the same `MarkdownCode` component via `src/components/ai-elements/message.tsx:329-337`; this spec intentionally keeps Mermaid preview scoped to Markdown file tabs.
- Theme state comes from `src/modules/theme/ThemeProvider.tsx`, especially `useTheme()` and `resolvedMode`; root light/dark classes and CSS variables are applied there.
- `mermaid@11.15.0` is present in `pnpm-lock.yaml` but not direct in `package.json`; add/confirm a direct dependency if importing Mermaid.
- There is no first-party table fullscreen implementation under `src/` to reuse directly; use shared dialog/button primitives and app UI conventions instead.

## Approach

Introduce a dedicated Mermaid preview path for `language-mermaid` and `language-mmd` fenced blocks in the Markdown file viewer. Keep ordinary code blocks flowing through `ChatCodeBlock`, and keep chat code blocks unchanged unless a future task explicitly opts that surface in.

For Mermaid blocks, render with a dedicated component that owns SVG rendering state, preview/source mode, loading/error state, visibility-triggered render start, and fullscreen state. Preview/source mode is per block and ephemeral. Source mode and all fallback states should reuse the existing source code block chrome so copy/wrap behavior stays familiar and source copy remains source-only.

Use Mermaid's browser API directly, with `startOnLoad: false` and direct `render(id, definition)` rather than global DOM scanning. Treat rendering as asynchronous and cancellable in React effects. Lazy-load Mermaid only for Mermaid blocks, render only when visible, preserve the last successful SVG while a new render is pending, and discard stale SVG when the new render fails.

Fit inline SVG with container CSS plus Mermaid/SVG sizing that preserves `viewBox`, `max-width: 100%`, and `height: auto`. Oversized diagrams strictly fit the Markdown viewport width; smaller diagrams render natural-size and centered. Fullscreen should reuse the sanitized rendered SVG in an app modal overlay and apply pan/zoom with CSS transforms in an isolated viewport.

Theme rendering should derive from `useTheme().resolvedMode` and semantic Terax CSS variables where practical, with immediate re-render in inline and fullscreen views on theme changes. Mermaid built-ins may be used as fallback only where variable mapping is insufficient.

Security is part of the rendering contract: keep Mermaid strict, do not add raw HTML Markdown support, sanitize injected SVG with a proper SVG-aware sanitizer if using innerHTML, allow only limited safe directives, prevent directives from overriding security/theme/startup/size limits, do not bind Mermaid link/callback functions, and block external resources in SVG output.

Fullscreen interaction details:

- Use an app modal overlay, not native window fullscreen.
- Reset zoom/pan every time it opens.
- Initial and reset transform is centered fit-to-viewport.
- Wheel zoom range is 25% to 400%.
- Wheel zoom anchors on the mouse pointer so the diagram point under the cursor stays fixed during zoom.
- Panning uses right-button drag only, starting anywhere in the diagram viewport area.
- Suppress the native context menu only inside that fullscreen interaction viewport.
- Keep toolbar controls always visible, including zoom in, zoom out, and reset.
- Support Escape, `+`, `-`, and `0` keyboard controls.

## Non-Goals

- Do not add raw HTML Markdown support.
- Do not implement Mermaid editing, print/export, SVG/PNG download, source persistence, minimap, touch gestures, or diagram click/link behavior.
- Do not add a Render Anyway escape hatch for over-limit diagrams.
- Do not replace the existing Streamdown Markdown renderer.
- Do not change chat Markdown rendering as part of this spec.
- Do not refactor unrelated chat/code-block behavior beyond what is needed for gated Markdown-viewer Mermaid handling.

## Risks and Notes

- Mermaid config is global. Avoid concurrent block races by centralizing configuration/render calls or otherwise ensuring renders use the intended theme/security config.
- SVG insertion is security-sensitive. If using `dangerouslySetInnerHTML`, sanitize Mermaid output with an SVG-aware sanitizer and keep `securityLevel: "strict"`.
- Mermaid is relatively large. Lazy import from the Mermaid preview path and verify existing eager bundle tests such as `src/app/eager-budget.test.ts` if affected.
- Visibility-triggered rendering should not make small Markdown files feel delayed; compact loading state should be short and unobtrusive.
- Right-button drag is required but nonstandard; keep it scoped to fullscreen and preserve ordinary context-menu behavior elsewhere.
- Streamdown has public Mermaid/fullscreen examples, but public issues note overlay accessibility concerns, so implement with local accessibility expectations rather than copying wholesale.

## Verification

Run at least:

- `pnpm lint`
- `pnpm check-types`
- `pnpm test`

Manual verification should include a Markdown file with small, wide, invalid, over-limit, and themed Mermaid/mmd diagrams, a normal Bash block with Run action, a source toggle check, theme switching while inline and fullscreen previews are open, fullscreen Escape/close/focus behavior, zoom anchored under the mouse pointer, right-button drag panning, reset-to-fit behavior, and confirmation that chat Mermaid fences still render as source code.

## Resolved via Codebase

- Markdown file tabs already open rendered by default and have a per-tab raw/rendered toggle: `src/app/App.tsx:524`, `src/modules/markdown/MarkdownStack.tsx`.
- Rendered Markdown code fences flow through `MarkdownPreviewPane` -> `MarkdownCode` -> `ChatCodeBlock`: `src/modules/markdown/MarkdownPreviewPane.tsx`, `src/components/ai-elements/markdown-code.tsx:12-33`, `src/components/ai-elements/chat-code.tsx`.
- Existing code-block action style should be copied from `ChatCodeBlock`/`BlockChrome` actions, including the Bash Run action pattern: `src/components/ai-elements/chat-code.tsx:220-313`.
- Chat messages also use `MarkdownCode`, so implementation needs an explicit Markdown-viewer gate to satisfy the interview decision to keep chat unchanged: `src/components/ai-elements/message.tsx:329-337`.
- Theme integration should use the existing theme provider/hook and CSS variable system rather than an independent theme store: `src/modules/theme/ThemeProvider.tsx`, `src/styles/globals.css`.
- Mermaid is already in the lockfile but is not a direct package dependency in `package.json`; importing it should add/confirm a direct dependency.

## Decision Context

Technical interview decisions refined this spec toward a viewer-scoped, conservative Mermaid preview: default preview ON, ephemeral per-block source toggles, strict fit inline, app-modal fullscreen, right-button-only pan, pointer-anchored wheel zoom, Terax-variable-aware theming, sanitized SVG insertion, no external resources, no Mermaid callbacks, no export/print, and source-only copy. These choices keep the feature aligned with the existing lightweight Markdown/code-block surface while avoiding broad chat behavior changes and minimizing security and bundle-size risk.
