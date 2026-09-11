import type { Components } from "react-markdown";

/**
 * Token-driven element styling instead of a "prose" plugin class, so
 * rendered markdown bodies stay on the same design-token system as
 * everything else. Shared by the public work detail page and the
 * dashboard's write/preview toggle.
 */
export const markdownComponents: Components = {
  h2: ({ node: _node, ...props }) => (
    <h2
      className="mt-6 font-[family-name:var(--font-display)] text-xl font-bold"
      style={{ color: "var(--text-primary)" }}
      {...props}
    />
  ),
  h3: ({ node: _node, ...props }) => (
    <h3
      className="mt-5 font-[family-name:var(--font-display)] text-lg font-bold"
      style={{ color: "var(--text-primary)" }}
      {...props}
    />
  ),
  p: ({ node: _node, ...props }) => (
    <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }} {...props} />
  ),
  ul: ({ node: _node, ...props }) => (
    <ul
      className="mt-3 list-disc space-y-1 pl-5 text-sm"
      style={{ color: "var(--text-secondary)" }}
      {...props}
    />
  ),
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold" style={{ color: "var(--text-primary)" }} {...props} />
  ),
  a: ({ node: _node, ...props }) => (
    <a
      target="_blank"
      rel="noreferrer noopener"
      className="rounded-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
      style={{ color: "var(--color-violet-500)" }}
      {...props}
    />
  ),
  code: ({ node: _node, ...props }) => (
    <code
      className="rounded-[var(--radius-sm)] px-1.5 py-0.5 font-mono text-xs"
      style={{ background: "var(--bg-surface-raised)", color: "var(--color-teal-400)" }}
      {...props}
    />
  ),
};
