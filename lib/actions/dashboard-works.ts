"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isOwnerSession } from "@/lib/auth/owner";
import { createClient } from "@/lib/supabase/server";
import { workFormSchema } from "@/lib/validation/works";

export interface WorkFormState {
  status: "idle" | "error";
  message?: string;
}

function parseWorkForm(formData: FormData) {
  let media: unknown = [];
  const rawMedia = formData.get("media");
  if (typeof rawMedia === "string" && rawMedia.trim()) {
    try {
      media = JSON.parse(rawMedia);
    } catch {
      media = [];
    }
  }

  return workFormSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    bodyMd: formData.get("bodyMd"),
    externalUrl: formData.get("externalUrl"),
    status: formData.get("status"),
    media,
  });
}

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Create a work (BUILD_PHASES.md Phase 2 item 5). RLS's own "owner can
 * insert works" policy (`auth.uid() = owner_id`) is the real gate — the
 * isOwnerSession() check here is so a non-owner gets an immediate, clear
 * form error instead of a opaque RLS failure.
 */
export async function createWork(
  _prevState: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  if (!(await isOwnerSession())) {
    return { status: "error", message: "Not authorized." };
  }

  const parsed = parseWorkForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not authorized." };

  const { error } = await supabase.from("works").insert({
    owner_id: user.id,
    title: parsed.data.title,
    slug: parsed.data.slug,
    summary: parsed.data.summary || null,
    body_md: parsed.data.bodyMd || null,
    external_url: parsed.data.externalUrl || null,
    status: parsed.data.status,
    media: parsed.data.media,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  });

  if (error) {
    console.error("[dashboard] createWork failed:", error.message);
    return {
      status: "error",
      message: error.code === UNIQUE_VIOLATION ? "That slug is already taken." : "Couldn't save the work.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/works/${parsed.data.slug}`);
  redirect("/dashboard");
}

/**
 * Update a work. `published_at` is only ever *set* here, never cleared or
 * bumped on a later edit — it records the first time a work went live, so
 * "3 days ago" on the feed doesn't jump every time a typo gets fixed.
 */
export async function updateWork(
  id: string,
  _prevState: WorkFormState,
  formData: FormData,
): Promise<WorkFormState> {
  if (!(await isOwnerSession())) {
    return { status: "error", message: "Not authorized." };
  }

  const parsed = parseWorkForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("works")
    .select("published_at")
    .eq("id", id)
    .maybeSingle();

  const publishedAt =
    parsed.data.status === "published"
      ? (existing?.published_at ?? new Date().toISOString())
      : (existing?.published_at ?? null);

  const { error } = await supabase
    .from("works")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      summary: parsed.data.summary || null,
      body_md: parsed.data.bodyMd || null,
      external_url: parsed.data.externalUrl || null,
      status: parsed.data.status,
      media: parsed.data.media,
      published_at: publishedAt,
    })
    .eq("id", id);

  if (error) {
    console.error("[dashboard] updateWork failed:", error.message);
    return {
      status: "error",
      message: error.code === UNIQUE_VIOLATION ? "That slug is already taken." : "Couldn't save the work.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/works/${parsed.data.slug}`);
  redirect("/dashboard");
}
