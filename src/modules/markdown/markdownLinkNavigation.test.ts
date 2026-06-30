import { describe, expect, it } from "vitest";
import {
  MARKDOWN_LINK_ORIGIN,
  getMarkdownLinkDefaultOrigin,
  getMarkdownLinkDisplayHref,
  resolveMarkdownLinkTarget,
} from "./markdownLinkNavigation";

describe("resolveMarkdownLinkTarget", () => {
  const exists = (path: string) =>
    Promise.resolve(
      path === "/workspace/docs/guide.md" ||
        path === "/workspace/docs/system_design.md" ||
        path === "/workspace/guide.md" ||
        path === "/outside/note.md",
    );

  it("opens external schemes with the system handler", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "https://example.com/docs",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "external",
      href: "https://example.com/docs",
    });
  });

  it("opens file URLs in the editor, including outside the workspace", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "file:///outside/note.md",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "file",
      path: "/outside/note.md",
    });
  });

  it("tries relative links against the current markdown file before the workspace root", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "./guide.md",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "file",
      path: "/workspace/docs/guide.md",
    });
  });

  it("keeps dot-relative links relative to the current markdown file", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "./system_design.md",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists: (path) =>
          Promise.resolve(path === "/workspace/docs/system_design.md"),
      }),
    ).resolves.toEqual({
      kind: "file",
      path: "/workspace/docs/system_design.md",
    });
  });

  it("opens Streamdown-hardened bare relative links as local files", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: `${MARKDOWN_LINK_ORIGIN}/workspace/docs/system_design.md`,
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "file",
      path: "/workspace/docs/system_design.md",
    });
  });

  it("keeps missing Streamdown-hardened relative links unresolved", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: `${MARKDOWN_LINK_ORIGIN}/workspace/docs/missing.md`,
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "unresolved",
      href: `${MARKDOWN_LINK_ORIGIN}/workspace/docs/missing.md`,
    });
  });

  it("builds a hardening origin from the markdown file directory", () => {
    expect(
      getMarkdownLinkDefaultOrigin("/workspace/docs/my notes/readme.md"),
    ).toBe(`${MARKDOWN_LINK_ORIGIN}/workspace/docs/my%20notes/`);
  });

  it("displays Streamdown-hardened relative links as local paths", () => {
    expect(
      getMarkdownLinkDisplayHref(
        `${MARKDOWN_LINK_ORIGIN}/workspace/docs/system_design.md`,
      ),
    ).toBe("/workspace/docs/system_design.md");
  });

  it("treats streamdown blocked relative hrefs as unresolved original links", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "blocked",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "unresolved",
      href: "blocked",
    });
  });

  it("falls back to the workspace root for relative links", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "guide.md",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists: (path) => Promise.resolve(path === "/workspace/guide.md"),
      }),
    ).resolves.toEqual({
      kind: "file",
      path: "/workspace/guide.md",
    });
  });

  it("returns an unresolved result when a relative link cannot be found", async () => {
    await expect(
      resolveMarkdownLinkTarget({
        href: "./missing.md",
        markdownPath: "/workspace/docs/readme.md",
        workspaceRoot: "/workspace",
        exists,
      }),
    ).resolves.toEqual({
      kind: "unresolved",
      href: "./missing.md",
    });
  });
});
