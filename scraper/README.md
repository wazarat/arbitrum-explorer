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

The scraper tries four strategies and uses the first one that produces a
sizeable list of projects:

1. **RSC payload** (preferred for the Arbitrum portal) — the portal uses the
   Next.js App Router, which streams server-component data as
   `self.__next_f.push([1, "..."])` chunks in the HTML. We concatenate the
   chunks and pull the largest `"projects":[...]` array out of the resulting
   JSON text.
2. **Network capture** — listens for JSON XHR/fetch responses while the SPA
   hydrates and picks the response whose payload looks most like a project
   list.
3. **`__NEXT_DATA__` blob** — legacy Next.js Pages Router sites embed their
   props as a JSON `<script id="__NEXT_DATA__">`.
4. **DOM scrape** — last resort. Selectors live at the top of `scrape.py`
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

Each project record exposes both v1 fields (singular `category`,
`sub_category` — kept for backward compatibility) and v1.1 fields (full
multi-category arrays plus the rich metadata available in the RSC payload).
All v1.1 fields except the booleans default to an empty string when the
source record is missing them.

```jsonc
{
  "scraped_at": "2026-05-28T16:30:00Z",
  "source": "https://portal.arbitrum.io/projects",
  "strategy": "rsc",                           // rsc | network | next_data | dom | none
  "categories": [
    { "name": "DeFi", "sub_categories": ["DEX", "Lending/Borrowing", "..."] }
  ],
  "chains": ["Arbitrum One", "Arbitrum Nova", "..."],
  "filter_metadata": { "groups": [/* raw sidebar groupings */] },
  "projects": [
    {
      // v1 (always present)
      "name": "AI Arena",
      "description": "...",
      "category": "AI & DePIN",                  // = categories[0]
      "sub_category": "AI",                      // = sub_categories[0]
      "chains": ["Arbitrum One"],
      "website": "https://www.aiarena.io/#/",
      "twitter": "https://x.com/aiarena_",
      "discord": "https://discord.gg/aiarenaplaytest",
      "logo_url": "https://portal-data.arbitrum.io/.../ai-arena-logo.webp",
      "portal_url": "https://portal.arbitrum.io/projects/ai-arena",

      // v1.1 multi-category arrays
      "categories": ["AI & DePIN", "Gaming"],
      "sub_categories": ["AI", "Action"],

      // v1.1 identity
      "id": "9b7093ad-305a-4c47-ad78-f836c199ef15",
      "slug": "ai-arena",

      // v1.1 extra links (empty string when missing)
      "github":       "",
      "coingecko":    "https://www.coingecko.com/en/coins/neuron",
      "audit":        "",
      "news":         "",
      "funding_news": "",
      "video":        "",
      "opensea":      "",

      // v1.1 imagery
      "banner_url": "https://portal-data.arbitrum.io/.../ai-arena-banner.webp",

      // v1.1 status flags
      "is_live":              true,
      "is_arbitrum_native":   true,
      "is_publicly_audited":  false,
      "is_trending":          false,
      "is_featured":          false,   // = isFeaturedOnHomePageBanner OR isFeaturedOnCategoryPage

      // v1.1 dates (raw strings as the portal returns them)
      "audit_report_date": "",
      "founded_date":      "",
      "created_time":      "March 08 2023, 04:49 PM EST",
      "nft_mint_date":     "",

      // v1.1 platform & incentives
      "supported_platforms":   [],     // e.g. ["iOS", "Android"]
      "live_incentive_start":  "",     // ISO date
      "live_incentive_end":    ""
    }
  ]
}
```

## Status

- **v1.1 (current)**: RSC strategy added as top-priority. 32 fields per
  project (10 v1 + 22 v1.1). Latest scrape: 941 projects, 6 categories,
  23 chains.
- **v1**: multi-strategy scraper (network → `__NEXT_DATA__` → DOM).
