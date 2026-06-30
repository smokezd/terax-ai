import { MarkdownCode } from "@/components/ai-elements/markdown-code";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { currentWorkspaceEnv } from "@/modules/workspace";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from "react";
import { toast } from "sonner";
import { defaultRehypePlugins, Streamdown } from "streamdown";
import {
  getMarkdownLinkDisplayHref,
  getMarkdownLinkDefaultOrigin,
  resolveMarkdownLinkTarget,
} from "./markdownLinkNavigation";
import { MarkdownViewToggle } from "./MarkdownViewToggle";

type ReadResult =
  | { kind: "text"; content: string; size: number }
  | { kind: "binary"; size: number }
  | { kind: "toolarge"; size: number; limit: number };

type Status =
  | { kind: "loading" }
  | { kind: "ready"; content: string }
  | { kind: "binary" }
  | { kind: "toolarge"; size: number; limit: number }
  | { kind: "error"; message: string };

type Props = {
  path: string;
  visible: boolean;
  ref?: Ref<MarkdownPreviewPaneHandle>;
  onOpenPath: (path: string) => void;
  onSetView: (mode: "rendered" | "raw") => void;
};

export type MarkdownPreviewPaneHandle = {
  reload: () => void;
};

type MarkdownLinkProps = ComponentProps<"a"> & {
  onOpenHref: (href: string) => void;
};

function MarkdownLink({
  href,
  children,
  onClick,
  onOpenHref,
  ...props
}: MarkdownLinkProps) {
  const [open, setOpen] = useState(false);
  if (!href) return <a {...props}>{children}</a>;
  const displayHref = getMarkdownLinkDisplayHref(href);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <a
          {...props}
          href={href}
          onClick={(event) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            setOpen(true);
          }}
        >
          {children}
        </a>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open Link</AlertDialogTitle>
          <AlertDialogDescription className="break-all">
            {displayHref}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              void onOpenHref(href);
            }}
          >
            Open Link
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MarkdownPreviewPane({
  path,
  visible,
  ref,
  onOpenPath,
  onSetView,
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const requestIdRef = useRef(0);

  const handleOpenHref = useCallback(
    async (href: string) => {
      const workspaceRoot = await invoke<string>("workspace_current_dir").catch(
        () => null,
      );
      const target = await resolveMarkdownLinkTarget({
        href,
        markdownPath: path,
        workspaceRoot,
        exists: async (candidate) => {
          try {
            await invoke<string>("fs_canonicalize", {
              path: candidate,
              workspace: currentWorkspaceEnv(),
            });
            return true;
          } catch {
            return false;
          }
        },
      });

      if (target.kind === "external") {
        await openUrl(target.href);
        return;
      }

      if (target.kind === "file") {
        onOpenPath(target.path);
        return;
      }

      toast.error(`Could not resolve link: ${target.href}`);
    },
    [onOpenPath, path],
  );

  const components = useMemo(
    () => ({
      a: (props: ComponentProps<"a">) => (
        <MarkdownLink {...props} onOpenHref={handleOpenHref} />
      ),
      code: (props: Parameters<typeof MarkdownCode>[0]) => (
        <MarkdownCode {...props} enableMermaidPreview />
      ),
    }),
    [handleOpenHref],
  );

  const rehypePlugins = useMemo(() => {
    const harden = defaultRehypePlugins.harden as [
      unknown,
      Record<string, unknown>,
    ];
    return [
      defaultRehypePlugins.raw,
      defaultRehypePlugins.sanitize,
      [
        harden[0],
        {
          ...harden[1],
          defaultOrigin: getMarkdownLinkDefaultOrigin(path),
        },
      ],
    ] as ComponentProps<typeof Streamdown>["rehypePlugins"];
  }, [path]);

  const reload = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus({ kind: "loading" });
    invoke<ReadResult>("fs_read_file", {
      path,
      workspace: currentWorkspaceEnv(),
    })
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        if (res.kind === "text") {
          setStatus({ kind: "ready", content: res.content });
        } else if (res.kind === "binary") {
          setStatus({ kind: "binary" });
        } else {
          setStatus({ kind: "toolarge", size: res.size, limit: res.limit });
        }
      })
      .catch((e) => {
        if (requestId === requestIdRef.current) {
          setStatus({ kind: "error", message: String(e) });
        }
      });
  }, [path]);

  useImperativeHandle(ref, () => ({ reload }), [reload]);

  useEffect(() => {
    reload();
    return () => {
      requestIdRef.current += 1;
    };
  }, [reload]);

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-background",
        !visible && "pointer-events-none",
      )}
    >
      <MarkdownViewToggle mode="rendered" onChange={onSetView} />
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          {status.kind === "loading" && (
            <p className="text-[12px] text-muted-foreground">Loading…</p>
          )}
          {status.kind === "error" && (
            <p className="text-[12px] text-destructive">
              Failed to read file: {status.message}
            </p>
          )}
          {status.kind === "binary" && (
            <p className="text-[12px] text-muted-foreground">
              Binary file — cannot render as markdown.
            </p>
          )}
          {status.kind === "toolarge" && (
            <p className="text-[12px] text-muted-foreground">
              File is {status.size} bytes; limit {status.limit}.
            </p>
          )}
          {status.kind === "ready" && (
            <Streamdown
              className="select-text [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              components={components}
              mode="static"
              parseIncompleteMarkdown={false}
              rehypePlugins={rehypePlugins}
            >
              {status.content}
            </Streamdown>
          )}
        </div>
      </div>
    </div>
  );
}
