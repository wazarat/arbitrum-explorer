# Scraper

Python + Playwright scraper that reads
[portal.arbitrum.io/projects](https://portal.arbitrum.io/projects) and writes
`../data/projects.json`.

## Setup (one-time)

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Run

```bash
# from scraper/, with .venv activated
python scrape.py
```

This writes `../data/projects.json`. Commit the result and push to refresh
the deployed site.

### Flags

- `--output PATH` — write JSON somewhere other than `../data/projects.json`.
- `--headed` — show the browser window (useful for debugging selectors).

## Output schema

```jsonc
{
  "scraped_at": "2026-05-28T16:30:00Z",
  "source": "https://portal.arbitrum.io/projects",
  "categories": [
    { "name": "DeFi", "sub_categories": ["DEX", "Lending/Borrowing", ...] }
  ],
  "chains": ["Arbitrum One", "Arbitrum Nova", "..."],
  "projects": [
    {
      "name": "Example",
      "description": "...",
      "category": "DeFi",
      "sub_category": "DEX",
      "chains": ["Arbitrum One"],
      "website": "https://...",
      "twitter": "https://twitter.com/...",
      "discord": "https://discord.gg/...",
      "logo_url": "https://...",
      "portal_url": "https://portal.arbitrum.io/..."
    }
  ]
}
```

## Status

- **v1 (current)**: skeleton CLI; scraping logic lands in Milestone 2.
