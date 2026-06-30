import { cn } from "@/lib/utils";
import type { MarkdownTab, Tab } from "@/modules/tabs";
import { useCallback, useRef } from "react";
import {
  MarkdownPreviewPane,
  type MarkdownPreviewPaneHandle,
} from "./MarkdownPreviewPane";

type Props = {
  tabs: Tab[];
  activeId: number;
  registerHandle?: (
    id: number,
    handle: MarkdownPreviewPaneHandle | null,
  ) => void;
  onOpenPath: (path: string) => void;
  onSetMarkdownView: (id: number, mode: "rendered" | "raw") => void;
};

export function MarkdownStack({
  tabs,
  activeId,
  registerHandle,
  onOpenPath,
  onSetMarkdownView,
}: Props) {
  const handles = useRef(new Map<number, MarkdownPreviewPaneHandle | null>());
  const setHandle = useCallback(
    (id: number) => (handle: MarkdownPreviewPaneHandle | null) => {
      if (handles.current.get(id) === handle) return;
      handles.current.set(id, handle);
      registerHandle?.(id, handle);
    },
    [registerHandle],
  );
  const markdowns = tabs.filter(
    (t): t is MarkdownTab => t.kind === "markdown" && !t.cold,
  );
  if (markdowns.length === 0) return null;
  return (
    <div className="relative h-full w-full">
      {markdowns.map((t) => {
        const visible = t.id === activeId;
        return (
          <div
            key={t.id}
            className={cn(
              "absolute inset-0",
              !visible && "invisible pointer-events-none",
            )}
            aria-hidden={!visible}
          >
            <MarkdownPreviewPane
              ref={setHandle(t.id)}
              path={t.path}
              visible={visible}
              onOpenPath={onOpenPath}
              onSetView={(mode) => onSetMarkdownView(t.id, mode)}
            />
          </div>
        );
      })}
    </div>
  );
}
