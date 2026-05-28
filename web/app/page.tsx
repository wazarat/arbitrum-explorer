import { Suspense } from "react";
import { ExplorerView } from "@/components/explorer-view";
import { projectsPayload } from "@/lib/data";

export default function HomePage() {
  const { projects, categories, chains, scraped_at, strategy } = projectsPayload;

  return (
    <main className="min-h-screen">
      <Suspense fallback={<div className="container mx-auto py-10">Loading…</div>}>
        <ExplorerView
          projects={projects}
          categories={categories}
          chains={chains}
          scrapedAt={scraped_at}
          strategy={strategy}
        />
      </Suspense>
    </main>
  );
}
