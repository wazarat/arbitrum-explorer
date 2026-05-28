# Arbitrum Ecosystem Explorer

A filterable, searchable web app of every project listed on
[portal.arbitrum.io/projects](https://portal.arbitrum.io/projects). Built to
make exploring the Arbitrum ecosystem easier — filter by category, sub-category
and chain, search by name/description, and export the filtered list as CSV.

> Status: **v1 — work in progress.** This is the first milestone in a larger
> project to build out Arbitrum market-research tooling.

## Architecture

```
arbitrum-explorer/
├── scraper/          # Python + Playwright scraper -> data/projects.json
├── data/             # Scraped JSON, checked into the repo
├── web/              # Next.js 14 (App Router) frontend, deployed to Vercel
└── README.md
```

### Tech stack (v1)

- **Scraper**: Python 3.11+, Playwright
- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui, Lucide
- **Storage**: Static `data/projects.json` committed to the repo
- **Deployment**: Vercel (frontend only)

## Data refresh model

`data/projects.json` is **manually refreshed** for v1. Run the scraper locally
when you want fresh data, commit the updated JSON, push, and Vercel will
redeploy automatically.

See [`scraper/README.md`](scraper/README.md) for run instructions.

## Roadmap

- v1: Static explorer with filters, search, CSV export. *(current)*
- v2: Scheduled re-scraping (GitHub Action), project detail pages.
- v3: On-chain enrichment (TVL via DefiLlama, etc.), news/market feed.
