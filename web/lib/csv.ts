import type { Project } from "./types";

// Column order is the same as documented in the v1.1 plan:
// identity → categories → description → links → chains/platforms → dates → flags → audit → nft → incentives → media → portal.
const COLUMNS: Array<{ key: keyof Project; label: string }> = [
  { key: "name", label: "Name" },
  { key: "slug", label: "Slug" },
  { key: "id", label: "ID" },
  { key: "category", label: "Category" },
  { key: "categories", label: "Categories" },
  { key: "sub_category", label: "Sub-category" },
  { key: "sub_categories", label: "Sub-categories" },
  { key: "description", label: "Description" },
  { key: "website", label: "Website" },
  { key: "twitter", label: "Twitter" },
  { key: "discord", label: "Discord" },
  { key: "github", label: "GitHub" },
  { key: "coingecko", label: "CoinGecko" },
  { key: "audit", label: "Audit URL" },
  { key: "news", label: "News" },
  { key: "funding_news", label: "Funding News" },
  { key: "video", label: "Video" },
  { key: "opensea", label: "OpenSea" },
  { key: "chains", label: "Chains" },
  { key: "supported_platforms", label: "Supported Platforms" },
  { key: "founded_date", label: "Founded Date" },
  { key: "created_time", label: "Created Time" },
  { key: "is_live", label: "Is Live" },
  { key: "is_arbitrum_native", label: "Is Arbitrum Native" },
  { key: "is_featured", label: "Is Featured" },
  { key: "is_trending", label: "Is Trending" },
  { key: "is_publicly_audited", label: "Is Publicly Audited" },
  { key: "audit_report_date", label: "Audit Report Date" },
  { key: "nft_mint_date", label: "NFT Mint Date" },
  { key: "live_incentive_start", label: "Live Incentive Start" },
  { key: "live_incentive_end", label: "Live Incentive End" },
  { key: "logo_url", label: "Logo URL" },
  { key: "banner_url", label: "Banner URL" },
  { key: "portal_url", label: "Portal URL" },
];

function escapeCell(value: unknown): string {
  let s: string;
  if (value == null) {
    s = "";
  } else if (typeof value === "boolean") {
    s = value ? "TRUE" : "FALSE";
  } else if (Array.isArray(value)) {
    // Pipe-delimit so a single cell holds the full list and Excel can split on " | ".
    s = value.map((v) => (v == null ? "" : String(v))).join(" | ");
  } else {
    s = String(value);
  }
  // CSV quoting: wrap in quotes if it contains comma, quote, or newline.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function projectsToCsv(projects: Project[]): string {
  const header = COLUMNS.map((c) => escapeCell(c.label)).join(",");
  const rows = projects.map((p) =>
    COLUMNS.map((c) => escapeCell(p[c.key])).join(",")
  );
  // Prepend a UTF-8 BOM so Excel opens it with the right encoding.
  return "\uFEFF" + [header, ...rows].join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function todayStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
