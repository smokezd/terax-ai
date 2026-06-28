# fn-2-markdown-mermaid-chart-preview.3 Add Mermaid preview tests and documentation notes

## Description
Add focused regression coverage and user/developer documentation notes for Mermaid preview.

Scope:
- Add tests around Mermaid detection, default preview mode, non-Mermaid regression, invalid diagram fallback, theme-triggered re-render behavior, and fullscreen action presence/interaction where practical.
- If SVG rendering is difficult in jsdom, mock Mermaid at the component boundary and cover DOM state transitions/source fallback rather than full layout physics.
- Add manual verification notes or update lightweight docs after implementation: README capability mention, ROADMAP preview-surface status if appropriate, and TERAX Markdown module notes if Mermaid adds renderer/security/lazy-loading constraints.
- Check eager bundle/startup expectations if adding Mermaid affects existing budget tests.

Primary files likely involved:
- New tests near Markdown/code-block components
- `src/app/eager-budget.test.ts` only if impacted
- `README.md`, `ROADMAP.md`, `TERAX.md` if the implementation warrants docs updates
## Acceptance
- Automated coverage verifies Mermaid block detection and default preview behavior. [R1, R2, R10]
- Automated coverage verifies non-Mermaid code blocks remain on the existing path. [R1, R10]
- Automated coverage verifies invalid Mermaid input does not crash and exposes fallback/source content. [R3, R10]
- Automated coverage or a documented manual check verifies theme changes cause Mermaid previews to refresh/read correctly. [R7, R10]
- Automated coverage or a documented manual check verifies fullscreen open/close and basic zoom/pan behavior. [R5, R6, R10]
- Documentation updates are applied or explicitly judged unnecessary for README, ROADMAP, and TERAX. [R10]
- `pnpm lint`, `pnpm check-types`, and `pnpm test` pass before completion. [R10]
## Done summary
TBD

## Evidence
- Commits:
- Tests:
- PRs:
