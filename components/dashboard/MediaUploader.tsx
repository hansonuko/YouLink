"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { WorkMedia } from "@/lib/data/works";
import { createClient } from "@/lib/supabase/client";

interface MediaUploaderProps {
  initialMedia: WorkMedia[];
}

/**
 * Uploads directly to the `work-media` bucket from the browser using the
 * owner's own session — `storage.objects` RLS (Phase 2 item 1) is what
 * actually enforces that only the owner can write here, this component
 * doesn't need to. Serializes the resulting list into a hidden `media`
 * field the create/update Server Action reads.
 */
export function MediaUploader({ initialMedia }: MediaUploaderProps) {
  const [media, setMedia] = useState<WorkMedia[]>(initialMedia);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const uploaded: WorkMedia[] = [];

    for (const file of Array.from(files)) {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("work-media").upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }
      const { data } = supabase.storage.from("work-media").getPublicUrl(path);
      uploaded.push({
        url: data.publicUrl,
        type: file.type.startsWith("video") ? "video" : "image",
        alt: "",
      });
    }

    setMedia((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function updateAlt(index: number, alt: string) {
    setMedia((prev) => prev.map((item, i) => (i === index ? { ...item, alt } : item)));
  }

  return (
    <div>
      <input type="hidden" name="media" value={JSON.stringify(media)} />

      {media.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item, index) => (
            <div
              key={item.url}
              className="overflow-hidden rounded-[var(--radius-md)] border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary just-uploaded URL, an admin preview thumbnail doesn't need next/image optimization */}
                <img src={item.url} alt={item.alt ?? ""} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={item.alt ?? ""}
                onChange={(e) => updateAlt(index, e.target.value)}
                placeholder="Alt text"
                className="w-full border-t bg-transparent px-2 py-1 text-xs outline-none"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
              />
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        {uploading ? "Uploading…" : "Add images"}
      </Button>
      {error && (
        <p role="status" className="mt-2 text-sm" style={{ color: "var(--color-red-500)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
