import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WorkForm } from "@/components/dashboard/WorkForm";
import { updateWork } from "@/lib/actions/dashboard-works";
import { getWorkById } from "@/lib/data/works";

interface EditWorkPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit work" };

export default async function EditWorkPage({ params }: EditWorkPageProps) {
  const { id } = await params;
  const work = await getWorkById(id);

  if (!work) notFound();

  const boundUpdateWork = updateWork.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1
        className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        Edit work
      </h1>
      <WorkForm action={boundUpdateWork} work={work} />
    </div>
  );
}
