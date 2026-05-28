# Arbitrum Ecosystem Explorer

A filterable, searchable web app of every project listed on
[portal.arbitrum.io/projects](https://portal.arbitrum.io/projects). Built to
make exploring the Arbitrum ecosystem easier — filter by category, sub-category
and chain, search by name/description, and export the filtered list as CSV.

> Status: **v1 — ready to deploy.** This is the first milestone in a larger
> project to build out Arbitrum market-research tooling. See
> [Deployment](#deployment-vercel) below.

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

## Deployment (Vercel)

The frontend lives in `web/` but reads `data/projects.json` from the repo
root, so Vercel needs to be told this is a monorepo subdirectory **with
access to files outside it**.

### One-time setup

1. Go to <https://vercel.com/new> and **Import** the
   `wazarat/arbitrum-explorer` repo.
2. On the configuration screen:
   - **Framework Preset**: Next.js (auto-detected).
   - **Root Directory**: click **Edit** → set to `web`.
   - Expand **Build and Output Settings** → leave the defaults.
   - Expand **Root Directory** options → tick
     **"Include source files outside of the Root Directory in the Build
     Step"**. This is what lets `web/lib/data.ts` import
     `../../data/projects.json` during build.
3. Click **Deploy**. Vercel will run `npm install` + `next build` inside
   `web/` and pick up `data/projects.json` from the parent folder.

`next.config.mjs` already sets `outputFileTracingRoot` to the repo root so
Next traces and bundles the JSON correctly.

### Subsequent deploys

Just push to `main`. Vercel auto-deploys on every push.

## Refresh data

`data/projects.json` is a static snapshot committed to the repo. To refresh:

```bash
# 1. Run the scraper locally
cd scraper
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
python scrape.py            # writes ../data/projects.json
cd ..

# 2. Review the diff, then commit + push
git diff --stat data/projects.json
git add data/projects.json
git commit -m "data: refresh projects.json"
git push                    # Vercel auto-redeploys
```

If the scraper yields 0 projects, run `python scrape.py --headed --debug`
and check `scraper/debug/` — see [`scraper/README.md`](scraper/README.md).

## Local development (optional)

Not required for deploy — Vercel builds from the repo — but if you want to
iterate locally:

```bash
cd web
npm install
npm run dev                 # http://localhost:3000
```

## Roadmap

- v1: Static explorer with filters, search, CSV export. *(current)*
- v2: Scheduled re-scraping (GitHub Action), project detail pages.
- v3: On-chain enrichment (TVL via DefiLlama, etc.), news/market feed.
