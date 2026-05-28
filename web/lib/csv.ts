import type { Project } from "./types";

const COLUMNS: Array<{ key: keyof Project; label: string }> = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "category", label: "Category" },
  { key: "sub_category", label: "Sub-category" },
  { key: "chains", label: "Chains" },
  { key: "website", label: "Website" },
  { key: "twitter", label: "Twitter" },
  { key: "discord", label: "Discord" },
  { key: "portal_url", label: "Portal URL" },
];

function escapeCell(value: unknown): string {
  let s: string;
  if (value == null) s = "";
  else if (Array.isArray(value)) s = value.join("; ");
  else s = String(value);
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
