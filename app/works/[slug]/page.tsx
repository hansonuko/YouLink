import { ArrowLeft, Heart, Share2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown, { type Components } from "react-markdown";

import { ThemeToggle } from "@/components/theme-toggle";
import { MediaLightbox } from "@/components/works/MediaLightbox";
import { getWorkBySlug } from "@/lib/data/works";
import { formatRelativeTime } from "@/lib/utils";

interface WorkPageParams {
  params: Promise<{ slug: string }>;
}

// Token-driven element styling instead of a "prose" plugin class, so the
// rendered body stays on the same design-token system as everything else.
const markdownComponents: Components = {
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

export async function generateMetadata({ params }: WorkPageParams): Promise<Metadata> {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);
  if (!work || work.status !== "published") return {};

  return {
    title: work.title,
    description: work.summary ?? undefined,
  };
}

export default async function WorkPage({ params }: WorkPageParams) {
  const { slug } = await params;
  const work = await getWorkBySlug(slug);

  // RLS already hides drafts from anonymous requests (work is null); the
  // status check is defense-in-depth for the case an owner session somehow
  // hits this page for their own unpublished draft — that's a dashboard
  // preview concern (Phase 2 item 5), not a public detail page.
  if (!work || work.status !== "published") {
    notFound();
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-sm text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="size-4" aria-hidden />
          Feed
        </Link>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-24 sm:px-10">
        <h1
          className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: "var(--text-primary)" }}
        >
          {work.title}
        </h1>

        <div
          className="mt-3 flex items-center gap-4 text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          {work.publishedAt && <span>{formatRelativeTime(work.publishedAt)}</span>}
          <span className="flex items-center gap-1">
            <Heart className="size-4" aria-hidden />
            {work.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="size-4" aria-hidden />
            {work.shareCount}
          </span>
        </div>

        {work.media.length > 0 && (
          <div className="mt-6">
            <MediaLightbox media={work.media} />
          </div>
        )}

        {work.bodyMd && (
          <div className="mt-8">
            <Markdown components={markdownComponents}>{work.bodyMd}</Markdown>
          </div>
        )}
      </main>
    </div>
  );
}
