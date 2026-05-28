import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface Props {
  project: Project;
}

export function ProjectCard({ project }: Props) {
  const link = project.website || project.portal_url;

  return (
    <article
      className={cn(
        "group flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4",
        "text-card-foreground transition-colors hover:border-primary/40 hover:bg-card/80"
      )}
    >
      <header className="flex items-start gap-3">
        {project.logo_url ? (
          // Plain <img> rather than next/image since logos come from many hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.logo_url}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="h-10 w-10 shrink-0 rounded-lg border border-border bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">{project.name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[project.category, project.sub_category].filter(Boolean).join(" · ")}
          </p>
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-secondary hover:text-foreground"
            aria-label={`Open ${project.name}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </header>

      {project.description && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      {project.chains.length > 0 && (
        <footer className="mt-auto flex flex-wrap gap-1">
          {project.chains.slice(0, 4).map((c) => (
            <span
              key={c}
              className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground"
            >
              {c}
            </span>
          ))}
          {project.chains.length > 4 && (
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              +{project.chains.length - 4}
            </span>
          )}
        </footer>
      )}
    </article>
  );
}
