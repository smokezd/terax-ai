"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent } from "react";
import type { MermaidConfig } from "mermaid";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useTheme } from "@/modules/theme";

import { ChatCodeBlock } from "./chat-code";

type MermaidMode = "preview" | "source";
type MermaidThemeMode = "dark" | "default" | "light";
type MermaidRenderState =
  | { kind: "idle" | "loading" }
  | { kind: "ready"; svg: string }
  | { kind: "error"; message: string };

export type MermaidFullscreenTransform = {
  scale: number;
  x: number;
  y: number;
};

export const MERMAID_FULLSCREEN_MIN_SCALE = 0.25;
export const MERMAID_FULLSCREEN_MAX_SCALE = 4;
const MERMAID_FULLSCREEN_ZOOM_STEP = 1.2;
const MERMAID_DEFAULT_TRANSFORM: MermaidFullscreenTransform = {
  scale: 1,
  x: 0,
  y: 0,
};

const MERMAID_LANGUAGES = new Set(["mermaid", "mmd"]);
const UNSAFE_TAGS = /<\/?(script|foreignObject|iframe|object|embed)\b[^>]*>/gi;
const UNSAFE_ATTRIBUTES = /\s+on[a-z]+\s*=\s*(["']).*?\1/gi;
const UNSAFE_URL_ATTRIBUTES =
  /\s+(href|xlink:href|src)\s*=\s*(["'])(?:javascript:|data:|https?:|\/\/)[\s\S]*?\2/gi;

export function isMermaidLanguage(lang: string | null | undefined): boolean {
  return MERMAID_LANGUAGES.has((lang ?? "").trim().toLowerCase());
}

export function getMermaidKeyboardZoomScale(
  currentScale: number,
  key: string,
): number {
  if (key === "0") {
    return 1;
  }

  if (key === "+" || key === "=") {
    return clampMermaidFullscreenScale(currentScale * MERMAID_FULLSCREEN_ZOOM_STEP);
  }

  if (key === "-") {
    return clampMermaidFullscreenScale(currentScale / MERMAID_FULLSCREEN_ZOOM_STEP);
  }

  return clampMermaidFullscreenScale(currentScale);
}

export function shouldUseMermaidPreview({
  enableMermaidPreview,
  lang,
}: {
  enableMermaidPreview: boolean;
  lang: string | null | undefined;
}): boolean {
  return enableMermaidPreview && isMermaidLanguage(lang);
}

export function getMermaidInitialMode(): MermaidMode {
  return "preview";
}

export function getMermaidConfig(mode: MermaidThemeMode): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: mode === "dark" ? "dark" : "default",
    maxTextSize: 100_000,
    flowchart: {
      htmlLabels: false,
    },
  };
}

export function sanitizeMermaidSvg(svg: string): string {
  return svg
    .replace(UNSAFE_TAGS, "")
    .replace(UNSAFE_ATTRIBUTES, "")
    .replace(UNSAFE_URL_ATTRIBUTES, "");
}

export function getMermaidModeToggleLabel(mode: MermaidMode): "Preview" | "Code" {
  return mode === "preview" ? "Code" : "Preview";
}

export function getMermaidInlineSvgClassName(): string {
  return cn(
    "flex min-h-[240px] items-center justify-center overflow-x-hidden overflow-y-auto",
    "[&_svg]:mx-auto [&_svg]:max-h-[70vh] [&_svg]:max-w-full",
  );
}

export function clampMermaidFullscreenScale(scale: number): number {
  return Math.min(
    MERMAID_FULLSCREEN_MAX_SCALE,
    Math.max(MERMAID_FULLSCREEN_MIN_SCALE, scale),
  );
}

export function getMermaidPointerAnchoredTransform(
  current: MermaidFullscreenTransform,
  nextScale: number,
  pointer: { x: number; y: number },
): MermaidFullscreenTransform {
  const scale = clampMermaidFullscreenScale(nextScale);
  const scaleRatio = scale / current.scale;

  return {
    scale,
    x: pointer.x - (pointer.x - current.x) * scaleRatio,
    y: pointer.y - (pointer.y - current.y) * scaleRatio,
  };
}

export function formatMermaidError(error: unknown): string {
  const normalized =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  if (!normalized) {
    return "Unable to render Mermaid diagram.";
  }

  const detail = normalized.trim().replace(/\s+/g, " ");
  const message = `Unable to render Mermaid diagram. ${detail}`;
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

function useNearViewport(rootMargin = "600px"): [boolean, (node: HTMLDivElement | null) => void] {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [nearViewport, setNearViewport] = useState(false);

  const setNode = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;

      if (!node) {
        return;
      }

      if (nearViewport || typeof IntersectionObserver === "undefined") {
        setNearViewport(true);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setNearViewport(true);
            observer.disconnect();
          }
        },
        { rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [nearViewport, rootMargin],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [nearViewport, setNode];
}

export function MermaidCodeBlock({
  code,
  lang,
}: {
  code: string;
  lang?: string | null;
}) {
  const stableId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const { resolvedMode } = useTheme();
  const [mode, setMode] = useState<MermaidMode>(getMermaidInitialMode());
  const [state, setState] = useState<MermaidRenderState>({ kind: "idle" });
  const [nearViewport, setViewportNode] = useNearViewport();
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const requestIdRef = useRef(0);

  const themeMode: MermaidThemeMode = resolvedMode === "dark" ? "dark" : "default";
  const config = useMemo(() => getMermaidConfig(themeMode), [themeMode]);

  useEffect(() => {
    if (!nearViewport) {
      return;
    }

    const currentRequest = ++requestIdRef.current;
    setState({ kind: "loading" });

    import("mermaid")
      .then((mermaidModule) => {
        const mermaid = mermaidModule.default ?? mermaidModule;
        mermaid.initialize(config);
        return mermaid.render(`mermaid-${stableId}-${currentRequest}`, code);
      })
      .then(({ svg }) => {
        if (requestIdRef.current !== currentRequest) {
          return;
        }
        setState({ kind: "ready", svg: sanitizeMermaidSvg(svg) });
      })
      .catch((error) => {
        if (requestIdRef.current !== currentRequest) {
          return;
        }
        setState({ kind: "error", message: formatMermaidError(error) });
      });
  }, [code, config, nearViewport, stableId]);

  const canInspectFullscreen = mode === "preview" && state.kind === "ready";

  return (
    <div className="my-2" ref={setViewportNode}>
      <div className="overflow-hidden rounded-md border border-border/50 bg-muted/40">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 bg-muted/20 px-3 py-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {lang ?? "mermaid"}
          </span>
          <div className="flex items-center gap-1">
            {canInspectFullscreen ? (
              <MermaidFullscreenDialog
                open={fullscreenOpen}
                onOpenChange={setFullscreenOpen}
                svg={state.svg}
              />
            ) : null}
            <MermaidModeToggle mode={mode} onModeChange={setMode} />
          </div>
        </div>
        <div className="bg-background/40 p-3">
          {mode === "source" ? (
            <ChatCodeBlock code={code} lang={lang ?? null} />
          ) : (
            <MermaidPreview state={state} />
          )}
        </div>
      </div>

      {state.kind === "error" && <ChatCodeBlock code={code} lang={lang ?? null} />}
    </div>
  );
}

function MermaidPreview({ state }: { state: MermaidRenderState }) {
  if (state.kind === "ready") {
    return (
      <div
        className={getMermaidInlineSvgClassName()}
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    );
  }

  if (state.kind === "error") {
    return (
      <p className="text-[12px] text-destructive" role="alert">
        {state.message}
      </p>
    );
  }

  return <p className="text-[12px] text-muted-foreground">Rendering Mermaid diagram...</p>;
}

function MermaidModeToggle({
  mode,
  onModeChange,
}: {
  mode: MermaidMode;
  onModeChange: (mode: MermaidMode) => void;
}) {
  const nextMode = mode === "preview" ? "source" : "preview";

  return (
    <Button
      className="h-5 px-1.5 text-[10px]"
      onClick={() => onModeChange(nextMode)}
      size="sm"
      type="button"
      variant="ghost"
    >
      {getMermaidModeToggleLabel(mode)}
    </Button>
  );
}

function MermaidFullscreenDialog({
  open,
  onOpenChange,
  svg,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  svg: string;
}) {
  const [transform, setTransform] = useState<MermaidFullscreenTransform>(
    MERMAID_DEFAULT_TRANSFORM,
  );
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const reset = useCallback(() => {
    setTransform(MERMAID_DEFAULT_TRANSFORM);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset, svg]);

  const zoomFromCenter = useCallback((factor: number) => {
    setTransform((current) => ({
      ...current,
      scale: clampMermaidFullscreenScale(current.scale * factor),
    }));
  }, []);

  const onWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const factor = event.deltaY < 0 ? MERMAID_FULLSCREEN_ZOOM_STEP : 1 / MERMAID_FULLSCREEN_ZOOM_STEP;

    setTransform((current) =>
      getMermaidPointerAnchoredTransform(current, current.scale * factor, pointer),
    );
  }, []);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setTransform((current) => ({
      ...current,
      x: current.x + dx,
      y: current.y + dy,
    }));
  }, []);

  const stopDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          aria-label="Open Mermaid fullscreen preview"
          className="h-5 px-1.5 text-[10px]"
          size="sm"
          type="button"
          variant="ghost"
        >
          Fullscreen
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex h-[min(92vh,900px)] max-w-[min(94vw,1200px)] flex-col gap-3 p-4"
        onKeyDown={(event) => {
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            zoomFromCenter(MERMAID_FULLSCREEN_ZOOM_STEP);
          } else if (event.key === "-") {
            event.preventDefault();
            zoomFromCenter(1 / MERMAID_FULLSCREEN_ZOOM_STEP);
          } else if (event.key === "0") {
            event.preventDefault();
            reset();
          }
        }}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm">Mermaid preview</DialogTitle>
          <DialogDescription className="sr-only">
            Inspect the rendered Mermaid diagram. Use mouse wheel or plus and minus keys to
            zoom, right-button drag to pan, and Escape to close.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1">
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => zoomFromCenter(MERMAID_FULLSCREEN_ZOOM_STEP)}
            size="sm"
            type="button"
            variant="outline"
          >
            +
          </Button>
          <Button
            className="h-7 px-2 text-xs"
            onClick={() => zoomFromCenter(1 / MERMAID_FULLSCREEN_ZOOM_STEP)}
            size="sm"
            type="button"
            variant="outline"
          >
            -
          </Button>
          <Button
            className="h-7 px-2 text-xs"
            onClick={reset}
            size="sm"
            type="button"
            variant="outline"
          >
            Reset
          </Button>
        </div>
        <div
          className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-background"
          onContextMenu={(event) => event.preventDefault()}
          onPointerCancel={stopDrag}
          onPointerDown={onPointerDown}
          onPointerLeave={stopDrag}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onWheel={onWheel}
        >
          <div
            className={cn(
              "absolute left-1/2 top-1/2 max-w-full origin-center",
              "[&_svg]:h-auto [&_svg]:max-h-[75vh] [&_svg]:max-w-[85vw]",
            )}
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{
              transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.scale})`,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
