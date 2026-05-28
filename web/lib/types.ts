// Schema matches scraper/scrape.py output.

export interface Project {
  // ----- v1 fields (always present) -----
  name: string;
  description: string;
  /** First entry of `categories` (back-compat). */
  category: string;
  /** First entry of `sub_categories` (back-compat). */
  sub_category: string;
  chains: string[];
  website: string;
  twitter: string;
  discord: string;
  logo_url: string;
  portal_url: string;

  // ----- v1.1 fields (optional; populated by the RSC strategy) -----
  /** Full list of top-level categories the project belongs to. */
  categories?: string[];
  /** Full list of sub-categories the project belongs to. */
  sub_categories?: string[];
  /** Portal UUID. */
  id?: string;
  /** Portal slug (used to build `portal_url`). */
  slug?: string;
  github?: string;
  coingecko?: string;
  audit?: string;
  news?: string;
  funding_news?: string;
  video?: string;
  opensea?: string;
  banner_url?: string;
  is_live?: boolean;
  is_arbitrum_native?: boolean;
  is_publicly_audited?: boolean;
  is_trending?: boolean;
  is_featured?: boolean;
  audit_report_date?: string;
  founded_date?: string;
  created_time?: string;
  nft_mint_date?: string;
  supported_platforms?: string[];
  live_incentive_start?: string;
  live_incentive_end?: string;
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
  strategy?: "rsc" | "network" | "next_data" | "dom" | "none";
  categories: CategoryGroup[];
  chains: string[];
  filter_metadata?: { groups: FilterMetadataGroup[] };
  projects: Project[];
}
