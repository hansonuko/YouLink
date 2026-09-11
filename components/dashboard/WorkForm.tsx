"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Markdown from "react-markdown";

import { MediaUploader } from "@/components/dashboard/MediaUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { markdownComponents } from "@/components/works/markdown-components";
import type { WorkFormState } from "@/lib/actions/dashboard-works";
import type { WorkDetail } from "@/lib/data/works";
import { slugify } from "@/lib/slug";

interface WorkFormProps {
  action: (prevState: WorkFormState, formData: FormData) => Promise<WorkFormState>;
  work?: WorkDetail;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

const initialState: WorkFormState = { status: "idle" };

const labelClass = "text-sm font-medium";
const selectClass =
  "mt-1.5 h-11 w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 text-sm text-[var(--text-primary)] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500";

/** Create/edit form (BUILD_PHASES.md Phase 2 item 5) — same component for
 * both, only the bound Server Action and initial values differ. */
export function WorkForm({ action, work }: WorkFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [title, setTitle] = useState(work?.title ?? "");
  const [slug, setSlug] = useState(work?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(work));
  const [bodyMd, setBodyMd] = useState(work?.bodyMd ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div>
        <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="title">
          Title
        </label>
        <Input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="mt-1.5"
        />
      </div>

      <div>
        <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="slug">
          Slug
        </label>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
          className="mt-1.5"
        />
      </div>

      <div>
        <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="summary">
          Summary
        </label>
        <Input
          id="summary"
          name="summary"
          defaultValue={work?.summary ?? ""}
          maxLength={280}
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="bodyMd">
            Body (Markdown)
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={tab === "write" ? "secondary" : "ghost"}
              onClick={() => setTab("write")}
            >
              Write
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "preview" ? "secondary" : "ghost"}
              onClick={() => setTab("preview")}
            >
              Preview
            </Button>
          </div>
        </div>
        {tab === "write" ? (
          <Textarea
            id="bodyMd"
            name="bodyMd"
            rows={12}
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
          />
        ) : (
          <>
            {/* Preview mode doesn't submit the textarea's value — keep bodyMd in the form too. */}
            <input type="hidden" name="bodyMd" value={bodyMd} />
            <div
              className="rounded-[var(--radius-md)] border p-4"
              style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}
            >
              {bodyMd ? (
                <Markdown components={markdownComponents}>{bodyMd}</Markdown>
              ) : (
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  Nothing to preview yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div>
        <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="externalUrl">
          External link (optional)
        </label>
        <Input
          id="externalUrl"
          name="externalUrl"
          type="url"
          defaultValue={work?.externalUrl ?? ""}
          placeholder="https://"
          className="mt-1.5"
        />
      </div>

      <div>
        <span className={labelClass} style={{ color: "var(--text-primary)" }}>
          Media
        </span>
        <div className="mt-1.5">
          <MediaUploader initialMedia={work?.media ?? []} />
        </div>
      </div>

      <div>
        <label className={labelClass} style={{ color: "var(--text-primary)" }} htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={work?.status ?? "draft"} className={selectClass}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {state.status === "error" && (
        <p role="status" className="text-sm" style={{ color: "var(--color-red-500)" }}>
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
