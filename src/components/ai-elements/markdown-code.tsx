"use client";

import { isValidElement, type ReactNode } from "react";

import { ChatCodeBlock } from "./chat-code";
import { isMermaidLanguage, MermaidCodeBlock } from "./mermaid-code";

export function markdownCodeText(children?: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) => markdownCodeText(child)).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return markdownCodeText(children.props.children);
  }
  return "";
}

/**
 * Streamdown `components.code` override. Handles both inline (`code`) and
 * fenced blocks (className "language-X"). Fenced blocks delegate to the
 * Lezer-based renderer; inline stays a plain pill.
 */
export function MarkdownCode({
  className,
  children,
  enableMermaidPreview = false,
  ...rest
}: {
  className?: string;
  children?: ReactNode;
  enableMermaidPreview?: boolean;
}) {
  const match = className?.match(/language-(\w+)/);
  if (!match) {
    return (
      <code
        className="rounded bg-muted/70 px-1.5 py-0.5 font-mono text-[0.875em] text-foreground"
        {...rest}
      >
        {children}
      </code>
    );
  }

  const code = markdownCodeText(children).replace(/\n$/, "");
  const lang = match[1] ?? null;
  if (enableMermaidPreview && isMermaidLanguage(lang)) {
    return <MermaidCodeBlock code={code} lang={lang} />;
  }
  return <ChatCodeBlock code={code} lang={lang} />;
}
