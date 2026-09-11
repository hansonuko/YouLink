import type { Metadata } from "next";

import { WorkForm } from "@/components/dashboard/WorkForm";
import { createWork } from "@/lib/actions/dashboard-works";

export const metadata: Metadata = { title: "New work" };

export default function NewWorkPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1
        className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        New work
      </h1>
      <WorkForm action={createWork} />
    </div>
  );
}
