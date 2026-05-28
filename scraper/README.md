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
- `--debug` — dump full-page HTML, a screenshot, and a network log to
  `scraper/debug/` so you can inspect what the page actually returned.

## How it works

The scraper tries three strategies and uses the first one that produces a
sizeable list of projects:

1. **Network capture** (preferred) — listens for JSON XHR/fetch responses
   while the SPA hydrates and picks the response whose payload looks most
   like a project list.
2. **`__NEXT_DATA__` blob** — Next.js sites often embed their props as a
   JSON `<script id="__NEXT_DATA__">`. We parse it and look for project-shaped
   arrays.
3. **DOM scrape** — last resort. Selectors live at the top of `scrape.py`
   in `DOM_SELECTORS` so they're easy to tweak.

The output `strategy` field tells you which one was used so you can verify.

## Troubleshooting

If the first run yields 0 projects:

```bash
python scrape.py --headed --debug
```

Then inspect `scraper/debug/`:

- `page.png` — what the browser actually saw (Cloudflare? login?).
- `page.html` — the rendered DOM for selector tuning.
- `network.json` — every JSON response URL + a preview of its body. Look for
  the endpoint that returns the project list and we can hardcode it as a
  fast-path if needed.

## Output schema

```jsonc
{
  "scraped_at": "2026-05-28T16:30:00Z",
  "source": "https://portal.arbitrum.io/projects",
  "strategy": "network",                       // network | next_data | dom | none
  "categories": [
    { "name": "DeFi", "sub_categories": ["DEX", "Lending/Borrowing", ...] }
  ],
  "chains": ["Arbitrum One", "Arbitrum Nova", "..."],
  "filter_metadata": { "groups": [/* raw sidebar groupings */] },
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

- **v1 (current)**: multi-strategy scraper implemented (network capture →
  `__NEXT_DATA__` → DOM fallback). Selectors may need tuning after the
  first real run; use `--debug` to iterate.
