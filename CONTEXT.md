# Terax Workspace Glossary

**Refresh**: Reload a single tab's own content source. Refreshing a Markdown tab re-reads its file from disk; refreshing an editor tab re-reads through the editor document reload path; refreshing a preview tab reloads that preview surface. Refresh must not reload the whole application window or restart shells in other tabs.

**Global reload**: Reloading the application UI/window. This is distinct from Refresh and is not a tab header action.

**Markdown link navigation**: Resolving a link clicked from rendered Markdown. External links open outside Terax with the system default handler; `file:` links open inside Terax's editor for local files, including files outside the current workspace. Relative file links resolve against the current Markdown file's directory first, then against the workspace root. If a relative link cannot be resolved to a local file, Terax shows an error instead of handing the unresolved path to the operating system.
