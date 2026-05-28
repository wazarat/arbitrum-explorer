"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { downloadCsv, projectsToCsv, todayStamp } from "@/lib/csv";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  filtered: Project[];
  all: Project[];
}

export function ExportButton({ filtered, all }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sameAsAll = filtered.length === all.length;

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const exportProjects = (which: "filtered" | "all") => {
    const list = which === "all" ? all : filtered;
    const suffix = which === "all" ? "all" : `filtered-${list.length}`;
    downloadCsv(`arbitrum-projects-${todayStamp()}-${suffix}.csv`, projectsToCsv(list));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-stretch overflow-hidden rounded-md border border-border bg-card">
        <button
          type="button"
          onClick={() => exportProjects("filtered")}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
          title={`Export ${filtered.length} filtered project${filtered.length === 1 ? "" : "s"} as CSV`}
        >
          <Download className="h-4 w-4" />
          Export CSV
          <span className="text-xs text-muted-foreground">
            ({filtered.length.toLocaleString()})
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="More export options"
          aria-haspopup="menu"
          aria-expanded={open}
          className="border-l border-border px-2 hover:bg-secondary/60"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => exportProjects("filtered")}
            disabled={filtered.length === 0}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>Filtered list</span>
            <span className="text-xs text-muted-foreground">
              {filtered.length.toLocaleString()}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => exportProjects("all")}
            disabled={all.length === 0}
            className="flex w-full items-center justify-between border-t border-border px-3 py-2 text-left text-sm hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{sameAsAll ? "All projects (same)" : "All projects"}</span>
            <span className="text-xs text-muted-foreground">
              {all.length.toLocaleString()}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
