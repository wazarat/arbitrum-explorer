"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CategoryGroup } from "@/lib/types";
import { type FilterState, subKey } from "@/lib/filters";

interface Props {
  categories: CategoryGroup[];
  chains: string[];
  state: FilterState;
  subCounts: Map<string, number>;
  chainCounts: Map<string, number>;
  onToggleSub: (key: string) => void;
  onToggleAllInCategory: (category: CategoryGroup) => void;
  onToggleChain: (chain: string) => void;
  onClearAll: () => void;
}

export function FilterSidebar({
  categories,
  chains,
  state,
  subCounts,
  chainCounts,
  onToggleSub,
  onToggleAllInCategory,
  onToggleChain,
  onClearAll,
}: Props) {
  const totalSelected = state.subCategories.size + state.chains.size;

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Filters
        </h2>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-primary hover:underline"
          >
            Clear all ({totalSelected})
          </button>
        )}
      </div>

      {chains.length > 0 && (
        <FilterGroup title="Chains" defaultOpen={state.chains.size > 0}>
          <ul className="flex flex-col gap-1">
            {chains.map((chain) => {
              const count = chainCounts.get(chain) ?? 0;
              const checked = state.chains.has(chain);
              return (
                <li key={chain}>
                  <CheckboxRow
                    label={chain}
                    count={count}
                    checked={checked}
                    onChange={() => onToggleChain(chain)}
                  />
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      )}

      {categories.map((cat) => {
        const allSubs = cat.sub_categories;
        const allChecked =
          allSubs.length > 0 && allSubs.every((s) => state.subCategories.has(subKey(cat.name, s)));
        const anyChecked = allSubs.some((s) => state.subCategories.has(subKey(cat.name, s)));

        return (
          <FilterGroup
            key={cat.name}
            title={cat.name}
            defaultOpen={anyChecked || allSubs.length <= 12}
          >
            <div className="mb-1">
              <CheckboxRow
                label="Select all"
                checked={allChecked}
                indeterminate={!allChecked && anyChecked}
                onChange={() => onToggleAllInCategory(cat)}
                emphasised
              />
            </div>
            <ul className="flex flex-col gap-1">
              {allSubs.map((sub) => {
                const key = subKey(cat.name, sub);
                const count = subCounts.get(key) ?? 0;
                const checked = state.subCategories.has(key);
                return (
                  <li key={sub}>
                    <CheckboxRow
                      label={sub}
                      count={count}
                      checked={checked}
                      dimmed={count === 0 && !checked}
                      onChange={() => onToggleSub(key)}
                    />
                  </li>
                );
              })}
            </ul>
          </FilterGroup>
        );
      })}
    </aside>
  );
}

// ---------------------------------------------------------------------------

interface FilterGroupProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FilterGroup({ title, defaultOpen = true, children }: FilterGroupProps) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-border bg-card/40 px-3 py-2 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-semibold text-foreground">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

// ---------------------------------------------------------------------------

interface CheckboxRowProps {
  label: string;
  count?: number;
  checked: boolean;
  indeterminate?: boolean;
  dimmed?: boolean;
  emphasised?: boolean;
  onChange: () => void;
}

function CheckboxRow({
  label,
  count,
  checked,
  indeterminate,
  dimmed,
  emphasised,
  onChange,
}: CheckboxRowProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm",
        "hover:bg-secondary/60",
        dimmed && "opacity-40",
        emphasised && "font-medium text-primary"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate && !checked;
        }}
        onChange={onChange}
        className="h-4 w-4 shrink-0 rounded border-border bg-background accent-primary"
      />
      <span className="flex-1 truncate">{label}</span>
      {typeof count === "number" && (
        <span className="shrink-0 text-xs text-muted-foreground">({count})</span>
      )}
    </label>
  );
}
