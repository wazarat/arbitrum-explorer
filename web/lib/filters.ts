import type { Project } from "./types";

export interface FilterState {
  query: string;
  /** "Category~SubCategory" pairs. */
  subCategories: Set<string>;
  chains: Set<string>;
}

export const SUB_SEP = "~";
export const LIST_SEP = "|";

export function emptyFilterState(): FilterState {
  return { query: "", subCategories: new Set(), chains: new Set() };
}

export function subKey(category: string, subCategory: string): string {
  return `${category}${SUB_SEP}${subCategory}`;
}

export function isFilterEmpty(state: FilterState): boolean {
  return !state.query && state.subCategories.size === 0 && state.chains.size === 0;
}

export function filterProjects(projects: Project[], state: FilterState): Project[] {
  const q = state.query.trim().toLowerCase();
  const subs = state.subCategories;
  const chains = state.chains;

  return projects.filter((p) => {
    if (q) {
      const hay = (p.name + " " + p.description).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (subs.size > 0) {
      if (!subs.has(subKey(p.category, p.sub_category))) return false;
    }
    if (chains.size > 0) {
      if (!p.chains.some((c) => chains.has(c))) return false;
    }
    return true;
  });
}

/**
 * Count how many projects match each (category, sub_category) pair.
 * Counts are absolute — they ignore the currently selected sub_categories
 * (so the screenshot-style "(60)" stays stable as you click), but they DO
 * respect the search query and selected chains.
 */
export function computeSubCounts(
  projects: Project[],
  state: FilterState
): Map<string, number> {
  const out = new Map<string, number>();
  const subless: FilterState = { ...state, subCategories: new Set() };
  const candidates = filterProjects(projects, subless);
  for (const p of candidates) {
    const k = subKey(p.category, p.sub_category);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

export function computeChainCounts(
  projects: Project[],
  state: FilterState
): Map<string, number> {
  const out = new Map<string, number>();
  const chainless: FilterState = { ...state, chains: new Set() };
  const candidates = filterProjects(projects, chainless);
  for (const p of candidates) {
    for (const c of p.chains) {
      out.set(c, (out.get(c) ?? 0) + 1);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// URL <-> state
// ---------------------------------------------------------------------------

export function encodeFilters(state: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.subCategories.size > 0) {
    params.set("sub", Array.from(state.subCategories).join(LIST_SEP));
  }
  if (state.chains.size > 0) {
    params.set("chain", Array.from(state.chains).join(","));
  }
  return params;
}

export function decodeFilters(params: URLSearchParams): FilterState {
  return {
    query: params.get("q") ?? "",
    subCategories: new Set(
      (params.get("sub") ?? "").split(LIST_SEP).filter(Boolean)
    ),
    chains: new Set((params.get("chain") ?? "").split(",").filter(Boolean)),
  };
}
