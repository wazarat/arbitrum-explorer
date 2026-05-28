"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { CategoryGroup, Project } from "@/lib/types";
import {
  type FilterState,
  computeChainCounts,
  computeSubCounts,
  decodeFilters,
  emptyFilterState,
  encodeFilters,
  filterProjects,
  isFilterEmpty,
  subKey,
} from "@/lib/filters";
import { FilterSidebar } from "./filter-sidebar";
import { ProjectCard } from "./project-card";

interface Props {
  projects: Project[];
  categories: CategoryGroup[];
  chains: string[];
  scrapedAt: string | null;
  strategy?: string;
}

const PAGE_SIZE = 60;

export function ExplorerView({ projects, categories, chains, scrapedAt, strategy }: Props) {
  const searchParams = useSearchParams();

  // ---- Filter state, seeded from URL on first render. -----------------------
  const initial = useMemo<FilterState>(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    return decodeFilters(sp);
  }, [searchParams]);

  const [state, setState] = useState<FilterState>(initial);
  const [searchInput, setSearchInput] = useState(initial.query);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Debounce search input -> committed query in state.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setState((s) => (s.query === searchInput ? s : { ...s, query: searchInput }));
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Sync state -> URL (replaceState, no history spam).
  useEffect(() => {
    const params = encodeFilters(state);
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [state]);

  // Reset pagination whenever filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [state]);

  // ---- Filter / count derivations ------------------------------------------
  const filtered = useMemo(() => filterProjects(projects, state), [projects, state]);
  const subCounts = useMemo(() => computeSubCounts(projects, state), [projects, state]);
  const chainCounts = useMemo(() => computeChainCounts(projects, state), [projects, state]);

  // ---- Handlers -------------------------------------------------------------
  const toggleSub = useCallback((key: string) => {
    setState((s) => {
      const next = new Set(s.subCategories);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...s, subCategories: next };
    });
  }, []);

  const toggleAllInCategory = useCallback((cat: CategoryGroup) => {
    setState((s) => {
      const next = new Set(s.subCategories);
      const allKeys = cat.sub_categories.map((sc) => subKey(cat.name, sc));
      const allChecked = allKeys.every((k) => next.has(k));
      if (allChecked) {
        allKeys.forEach((k) => next.delete(k));
      } else {
        allKeys.forEach((k) => next.add(k));
      }
      return { ...s, subCategories: next };
    });
  }, []);

  const toggleChain = useCallback((chain: string) => {
    setState((s) => {
      const next = new Set(s.chains);
      if (next.has(chain)) next.delete(chain);
      else next.add(chain);
      return { ...s, chains: next };
    });
  }, []);

  const clearAll = useCallback(() => {
    setState(emptyFilterState());
    setSearchInput("");
  }, []);

  // ---- Render ---------------------------------------------------------------
  const totalCount = projects.length;
  const filteredCount = filtered.length;
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="container mx-auto py-8">
      <header className="mb-6 flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Arbitrum Ecosystem Explorer
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Filter, search, and export every project listed on{" "}
              <a
                href="https://portal.arbitrum.io/projects"
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                portal.arbitrum.io
              </a>
              .
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-xs text-muted-foreground">
            <span>
              {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} projects
            </span>
            {scrapedAt && (
              <span title={scrapedAt}>
                Updated {new Date(scrapedAt).toLocaleDateString()}
              </span>
            )}
            {strategy && <span className="opacity-60">strategy: {strategy}</span>}
          </div>
        </div>

        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          onClear={() => setSearchInput("")}
        />
      </header>

      <div className="flex flex-col gap-6 lg:flex-row">
        <FilterSidebar
          categories={categories}
          chains={chains}
          state={state}
          subCounts={subCounts}
          chainCounts={chainCounts}
          onToggleSub={toggleSub}
          onToggleAllInCategory={toggleAllInCategory}
          onToggleChain={toggleChain}
          onClearAll={clearAll}
        />

        <section className="min-w-0 flex-1">
          {projects.length === 0 ? (
            <EmptyDataState />
          ) : filteredCount === 0 ? (
            <NoMatchState onClear={clearAll} hasFilters={!isFilterEmpty(state)} />
          ) : (
            <>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((p) => (
                  <li key={p.portal_url || p.name}>
                    <ProjectCard project={p} />
                  </li>
                ))}
              </ul>
              {visibleCount < filteredCount && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                    className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-card/80"
                  >
                    Show more ({filteredCount - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SearchInput({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by name or description…"
        className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function EmptyDataState() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-card-foreground">
      <h2 className="text-lg font-semibold">No projects loaded yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Run the scraper to populate{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-xs">data/projects.json</code>.
        See <code className="rounded bg-muted px-1 py-0.5 text-xs">scraper/README.md</code>.
      </p>
    </div>
  );
}

function NoMatchState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-card-foreground">
      <h2 className="text-lg font-semibold">No projects match your filters</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Try clearing some filters or adjusting your search.
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
