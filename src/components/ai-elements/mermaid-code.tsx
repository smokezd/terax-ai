"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/modules/theme";

import { ChatCodeBlock } from "./chat-code";

type MermaidThemeMode = "dark" | "light";
type MermaidRenderState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; svg: string }
  | { kind: "error"; message: string };

type MermaidConfig = {
  startOnLoad: false;
  securityLevel: "strict";
  theme: "dark" | "default";
  htmlLabels: false;
  maxTextSize: number;
  flowchart: {
    htmlLabels: false;
    useMaxWidth: true;
  };
};

const UNSAFE_SVG_ELEMENTS = new Set([
  "script",
  "style",
  "foreignobject",
  "iframe",
  "object",
  "embed",
]);

const UNSAFE_URL = /^(?:javascript:|data:|https?:|\/\/)/i;

export function isMermaidLanguage(lang: string | null | undefined): boolean {
  const normalized = lang?.trim().toLowerCase();
  return normalized === "mermaid" || normalized === "mmd";
}

export function getMermaidConfig(mode: MermaidThemeMode): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: mode === "dark" ? "dark" : "default",
    htmlLabels: false,
    maxTextSize: 100_000,
    flowchart: {
      htmlLabels: false,
      useMaxWidth: true,
    },
  };
}

export function sanitizeMermaidSvg(svg: string): string {
  if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
    return stripUnsafeSvgText(svg);
  }

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) return "";

  for (const element of Array.from(doc.querySelectorAll("*"))) {
    if (UNSAFE_SVG_ELEMENTS.has(element.tagName.toLowerCase())) {
      element.remove();
      continue;
    }

    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "xlink:href" || name === "src") &&
          UNSAFE_URL.test(value))
      ) {
        element.removeAttribute(attr.name);
      }
    }
  }

  return new XMLSerializer().serializeToString(doc.documentElement);
}

function stripUnsafeSvgText(svg: string): string {
  return svg
    .replace(/<\s*(script|style|foreignObject|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(
      /\s+(href|xlink:href|src)\s*=\s*(["'])(?:javascript:|data:|https?:|\/\/)[\s\S]*?\2/gi,
      "",
    );
}

function useNearViewport(rootMargin = "600px"): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return [ref, isNear];
}

function formatMermaidError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "Unable to render Mermaid diagram.";
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

export function MermaidCodeBlock({ code, lang }: { code: string; lang: string | null }) {
  const { resolvedMode } = useTheme();
  const stableId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const requestId = useRef(0);
  const [mode, setMode] = useState<"preview" | "code">("preview");
  const [state, setState] = useState<MermaidRenderState>({ kind: "idle" });
  const [containerRef, isNearViewport] = useNearViewport();
  const config = useMemo(() => getMermaidConfig(resolvedMode), [resolvedMode]);

  useEffect(() => {
    if (mode !== "preview" || !isNearViewport) return;

    let cancelled = false;
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    setState({ kind: "loading" });

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        if (cancelled || requestId.current !== currentRequest) return;
        mermaid.initialize(config);
        const { svg } = await mermaid.render(`mermaid-${stableId}-${currentRequest}`, code);
        if (cancelled || requestId.current !== currentRequest) return;
        const sanitized = sanitizeMermaidSvg(svg);
        if (!sanitized) {
          setState({ kind: "error", message: "Mermaid returned invalid SVG." });
          return;
        }
        setState({ kind: "ready", svg: sanitized });
      })
      .catch((error) => {
        if (!cancelled && requestId.current === currentRequest) {
          setState({ kind: "error", message: formatMermaidError(error) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, config, isNearViewport, mode, stableId]);

  if (mode === "code") {
    return (
      <div ref={containerRef}>
        <MermaidModeToggle mode={mode} onModeChange={setMode} />
        <ChatCodeBlock code={code} lang={lang} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="my-2">
      <div className="overflow-hidden rounded-md border border-border/50 bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-border/40 border-b bg-muted/20 px-3 py-1.5">
          <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-normal">
            {lang ?? "mermaid"}
          </span>
          <MermaidModeToggle mode={mode} onModeChange={setMode} />
        </div>
        <div className="bg-background/40 p-3">
          {state.kind === "ready" ? (
            <div
              className="mermaid-preview overflow-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
              dangerouslySetInnerHTML={{ __html: state.svg }}
            />
          ) : (
            <div className="text-[12px] text-muted-foreground">
              {state.kind === "error"
                ? `Unable to render Mermaid diagram: ${state.message}`
                : "Rendering Mermaid diagram..."}
            </div>
          )}
        </div>
      </div>
      {state.kind === "error" && <ChatCodeBlock code={code} lang={lang} />}
    </div>
  );
}

function MermaidModeToggle({
  mode,
  onModeChange,
}: {
  mode: "preview" | "code";
  onModeChange: (mode: "preview" | "code") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded border border-border/40 bg-background/40 p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-5 px-1.5 text-[10px]", mode === "preview" && "bg-muted text-foreground")}
        onClick={() => onModeChange("preview")}
      >
        Preview
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-5 px-1.5 text-[10px]", mode === "code" && "bg-muted text-foreground")}
        onClick={() => onModeChange("code")}
      >
        Code
      </Button>
    </div>
  );
}
