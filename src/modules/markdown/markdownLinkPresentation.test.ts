import { describe, expect, it } from "vitest";

import { MARKDOWN_LINK_CLASS_NAME } from "./markdownLinkPresentation";

describe("Markdown link presentation", () => {
  it("makes links stand out from normal Markdown text", () => {
    expect(MARKDOWN_LINK_CLASS_NAME).toContain("text-primary");
    expect(MARKDOWN_LINK_CLASS_NAME).toContain("underline");
    expect(MARKDOWN_LINK_CLASS_NAME).toContain("hover:text-primary/80");
    expect(MARKDOWN_LINK_CLASS_NAME).toContain("focus-visible:ring-2");
  });
});
