export type MarkdownLinkTarget =
  | { kind: "external"; href: string }
  | { kind: "file"; path: string }
  | { kind: "unresolved"; href: string };

export const MARKDOWN_LINK_ORIGIN = "https://markdown.local";

type ResolveInput = {
  href: string;
  markdownPath: string;
  workspaceRoot?: string | null;
  exists: (path: string) => Promise<boolean>;
};

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

function dirname(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return "/";
  return normalized.slice(0, index);
}

function normalizePath(path: string): string {
  const absolute = path.startsWith("/");
  const parts: string[] = [];

  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (parts.length > 0) parts.pop();
      continue;
    }
    parts.push(part);
  }

  return `${absolute ? "/" : ""}${parts.join("/")}`;
}

function joinPath(base: string, path: string): string {
  if (path.startsWith("/")) return normalizePath(path);
  return normalizePath(`${base.replace(/\/+$/, "")}/${path}`);
}

function encodePathForUrl(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function stripFragmentAndQuery(href: string): string {
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const indexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const end = indexes.length > 0 ? Math.min(...indexes) : href.length;
  return href.slice(0, end);
}

function fileUrlToPath(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "file:") return null;
    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

export function getMarkdownLinkDefaultOrigin(markdownPath: string): string {
  const dir = dirname(markdownPath);
  return `${MARKDOWN_LINK_ORIGIN}${encodePathForUrl(dir)}/`;
}

export function getMarkdownLinkDisplayHref(href: string): string {
  if (!href.startsWith(`${MARKDOWN_LINK_ORIGIN}/`)) return href;
  const url = new URL(href);
  return decodeURIComponent(url.pathname);
}

export async function resolveMarkdownLinkTarget({
  href,
  markdownPath,
  workspaceRoot,
  exists,
}: ResolveInput): Promise<MarkdownLinkTarget> {
  const target = href.trim();
  if (!target) return { kind: "unresolved", href };

  if (target.startsWith("file:")) {
    const path = fileUrlToPath(target);
    return path ? { kind: "file", path } : { kind: "unresolved", href };
  }

  if (target.startsWith(`${MARKDOWN_LINK_ORIGIN}/`)) {
    const url = new URL(target);
    const path = decodeURIComponent(url.pathname);
    return (await exists(path))
      ? { kind: "file", path }
      : { kind: "unresolved", href };
  }

  if (SCHEME_RE.test(target)) return { kind: "external", href: target };

  const relativePath = decodeURIComponent(stripFragmentAndQuery(target));
  const candidates = [
    joinPath(dirname(markdownPath), relativePath),
    workspaceRoot ? joinPath(workspaceRoot, relativePath) : null,
  ].filter((path): path is string => Boolean(path));

  for (const candidate of candidates) {
    if (await exists(candidate)) return { kind: "file", path: candidate };
  }

  return { kind: "unresolved", href };
}
