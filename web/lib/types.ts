// Schema matches scraper/scrape.py output.

export interface Project {
  name: string;
  description: string;
  category: string;
  sub_category: string;
  chains: string[];
  website: string;
  twitter: string;
  discord: string;
  logo_url: string;
  portal_url: string;
}

export interface CategoryGroup {
  name: string;
  sub_categories: string[];
}

export interface FilterMetadataGroup {
  name: string;
  sub_categories: string[];
}

export interface ProjectsPayload {
  scraped_at: string | null;
  source: string;
  strategy?: "network" | "next_data" | "dom" | "none";
  categories: CategoryGroup[];
  chains: string[];
  filter_metadata?: { groups: FilterMetadataGroup[] };
  projects: Project[];
}
