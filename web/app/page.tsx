import { projectsPayload } from "@/lib/data";

export default function HomePage() {
  const { projects, categories, chains, scraped_at, strategy } = projectsPayload;

  return (
    <main className="container mx-auto py-10">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Arbitrum Ecosystem Explorer
        </h1>
        <p className="text-muted-foreground">
          Filterable, searchable directory of every project listed on
          portal.arbitrum.io.
        </p>
        <div className="text-xs text-muted-foreground">
          <span>{projects.length} projects</span>
          <span className="mx-2">·</span>
          <span>{categories.length} categories</span>
          <span className="mx-2">·</span>
          <span>{chains.length} chains</span>
          {scraped_at && (
            <>
              <span className="mx-2">·</span>
              <span>Last scraped {new Date(scraped_at).toLocaleString()}</span>
            </>
          )}
          {strategy && (
            <>
              <span className="mx-2">·</span>
              <span>strategy: {strategy}</span>
            </>
          )}
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-lg font-semibold">No projects loaded yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Run the scraper to populate{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              data/projects.json
            </code>
            :
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">
            {`cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python scrape.py`}
          </pre>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 60).map((p) => (
            <li
              key={p.portal_url || p.name}
              className="rounded-lg border border-border bg-card p-4 text-card-foreground"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="truncate font-semibold">{p.name}</h3>
                {p.sub_category && (
                  <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                    {p.sub_category}
                  </span>
                )}
              </div>
              {p.description && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {p.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {projects.length > 60 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Showing first 60 of {projects.length}. Filters + search land in
          Milestone 4.
        </p>
      )}
    </main>
  );
}
