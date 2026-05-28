import raw from "../../data/projects.json";
import type { ProjectsPayload } from "./types";

// `raw` is typed as `any` by the JSON import. We coerce + normalise here so
// the rest of the app can rely on a strict shape even if upstream fields are
// missing (e.g. before the first scrape has run).
const payload = raw as Partial<ProjectsPayload>;

export const projectsPayload: ProjectsPayload = {
  scraped_at: payload.scraped_at ?? null,
  source: payload.source ?? "https://portal.arbitrum.io/projects",
  strategy: payload.strategy,
  categories: payload.categories ?? [],
  chains: payload.chains ?? [],
  filter_metadata: payload.filter_metadata,
  projects: payload.projects ?? [],
};

export const projects = projectsPayload.projects;
