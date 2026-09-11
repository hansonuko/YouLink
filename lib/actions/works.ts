"use server";

import { getPublishedWorksPage, type WorksPage } from "@/lib/data/works";

/** Called from FeedList's "Load more" button — a read, not a mutation, but
 * Server Actions are the natural way to fetch more data imperatively from
 * a Client Component without hand-rolling a Route Handler for it. */
export async function loadMoreWorks(cursor: string): Promise<WorksPage> {
  return getPublishedWorksPage(cursor);
}
