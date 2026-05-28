"""Scraper for portal.arbitrum.io/projects.

Multi-strategy scraper. We try, in priority order:

1. Intercept JSON network responses while the page loads (Next.js sites
   typically fetch their data from an API endpoint).
2. Parse the `__NEXT_DATA__` blob embedded in the HTML.
3. Fall back to DOM scraping of project cards using CSS selectors.

After scraping we normalise everything into the schema documented in
`scraper/README.md` and write it to `../data/projects.json`.

Usage:
    python scrape.py                  # scrape and write ../data/projects.json
    python scrape.py --headed         # show the browser (debugging selectors)
    python scrape.py --debug          # save HTML/screenshot/network log
    python scrape.py --output out.json
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from playwright.async_api import (
    Page,
    Response,
    TimeoutError as PWTimeout,
    async_playwright,
)

PORTAL_URL = "https://portal.arbitrum.io/projects"
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "data" / "projects.json"
DEBUG_DIR = Path(__file__).resolve().parent / "debug"

# Heuristic: keys we expect on a project record from an API response.
PROJECT_KEY_HINTS = {"name", "title", "slug", "description", "category", "subCategory", "subcategory", "chains"}


# ---------------------------------------------------------------------------
# Network capture
# ---------------------------------------------------------------------------

class NetworkCapture:
    """Records JSON responses that look like they contain project data."""

    def __init__(self) -> None:
        self.records: list[dict[str, Any]] = []

    async def on_response(self, response: Response) -> None:
        try:
            ct = (response.headers or {}).get("content-type", "")
            if "json" not in ct.lower():
                return
            url = response.url
            # Skip obvious analytics / telemetry endpoints.
            if any(x in url for x in ("google-analytics", "segment.io", "sentry", "datadog")):
                return
            body = await response.json()
        except Exception:
            return
        self.records.append({"url": url, "body": body})


# ---------------------------------------------------------------------------
# Strategy 1: extract from captured network responses
# ---------------------------------------------------------------------------

def _looks_like_project(obj: Any) -> bool:
    if not isinstance(obj, dict):
        return False
    keys = {k.lower() for k in obj.keys()}
    has_name = any(k in keys for k in ("name", "title"))
    has_info = any(k in keys for k in ("description", "category", "subcategory", "sub_category", "chains", "url", "website"))
    return has_name and has_info


def _find_project_arrays(node: Any, path: str = "") -> list[tuple[str, list[dict]]]:
    """Recursively walk a JSON structure and return arrays that look like
    project lists. Each entry is (json-path, list-of-projects)."""
    out: list[tuple[str, list[dict]]] = []
    if isinstance(node, list):
        project_like = [x for x in node if _looks_like_project(x)]
        if project_like and len(project_like) >= max(5, len(node) // 2):
            out.append((path or "$", node))
        for i, item in enumerate(node):
            out.extend(_find_project_arrays(item, f"{path}[{i}]"))
    elif isinstance(node, dict):
        for k, v in node.items():
            out.extend(_find_project_arrays(v, f"{path}.{k}" if path else k))
    return out


def extract_from_network(capture: NetworkCapture) -> list[dict] | None:
    best: list[dict] | None = None
    for rec in capture.records:
        arrays = _find_project_arrays(rec["body"])
        for _, arr in arrays:
            if best is None or len(arr) > len(best):
                best = arr
    return best


# ---------------------------------------------------------------------------
# Strategy 2: __NEXT_DATA__
# ---------------------------------------------------------------------------

async def extract_from_next_data(page: Page) -> list[dict] | None:
    try:
        raw = await page.evaluate(
            "() => { const el = document.getElementById('__NEXT_DATA__'); return el ? el.textContent : null; }"
        )
    except Exception:
        return None
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except Exception:
        return None
    arrays = _find_project_arrays(data)
    if not arrays:
        return None
    arrays.sort(key=lambda x: -len(x[1]))
    return arrays[0][1]


# ---------------------------------------------------------------------------
# Strategy 3: DOM scrape (fallback). Selectors live here so they're easy
# to tune if the portal markup changes.
# ---------------------------------------------------------------------------

DOM_SELECTORS = {
    # Container holding each project. We try several plausible patterns.
    "card": (
        "[data-testid*='project'], "
        "a[href*='/projects/'], "
        "article[class*='project'], "
        "div[class*='ProjectCard'], "
        "div[class*='project-card']"
    ),
    "name": "h1, h2, h3, h4, [class*='title'], [class*='name']",
    "description": "p, [class*='description'], [class*='subtitle']",
    "logo": "img",
    "category_badge": "[class*='category'], [class*='tag'], [class*='badge']",
}


async def extract_from_dom(page: Page) -> list[dict]:
    js = """
        (sel) => {
          const out = [];
          const cards = document.querySelectorAll(sel.card);
          const seen = new Set();
          cards.forEach((card) => {
            const link = card.tagName === 'A' ? card : card.querySelector('a[href]');
            const href = link ? link.getAttribute('href') : null;
            const key = href || (card.textContent || '').slice(0, 80);
            if (seen.has(key)) return;
            seen.add(key);

            const pick = (root, q) => {
              const el = root.querySelector(q);
              return el ? (el.textContent || '').trim() : null;
            };
            const name = pick(card, sel.name);
            if (!name) return;
            const description = pick(card, sel.description);
            const logoEl = card.querySelector(sel.logo);
            const logo_url = logoEl ? logoEl.src : null;
            const badges = Array.from(card.querySelectorAll(sel.category_badge))
              .map((b) => (b.textContent || '').trim())
              .filter(Boolean);

            out.push({
              name,
              description,
              logo_url,
              portal_url: href ? (href.startsWith('http') ? href : new URL(href, location.origin).href) : null,
              _badges: badges,
            });
          });
          return out;
        }
    """
    try:
        return await page.evaluate(js, DOM_SELECTORS)
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Filter sidebar — read category groups + chains from the page so we don't
# hardcode them.
# ---------------------------------------------------------------------------

async def extract_filter_metadata(page: Page) -> dict[str, Any]:
    """Best-effort: read the filter sidebar to learn category groupings + chains."""
    js = """
        () => {
          // Look for headings followed by checkbox lists.
          const groups = [];
          const headings = document.querySelectorAll('h1, h2, h3, h4, [role="heading"]');
          headings.forEach((h) => {
            const title = (h.textContent || '').trim();
            if (!title) return;
            // Walk forward siblings collecting checkbox labels.
            const subs = [];
            let n = h.nextElementSibling;
            let steps = 0;
            while (n && steps < 8) {
              const labels = n.querySelectorAll
                ? n.querySelectorAll('label, [role="checkbox"], li')
                : [];
              labels.forEach((l) => {
                const t = (l.textContent || '').trim();
                if (t && t.length < 80 && !subs.includes(t)) subs.push(t);
              });
              if (subs.length) break;
              n = n.nextElementSibling;
              steps++;
            }
            if (subs.length >= 2) groups.push({ name: title, sub_categories: subs });
          });
          return { groups };
        }
    """
    try:
        return await page.evaluate(js)
    except Exception:
        return {"groups": []}


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

SOCIAL_HOSTS = {
    "twitter": ("twitter.com", "x.com"),
    "discord": ("discord.com", "discord.gg"),
    "telegram": ("t.me", "telegram.me"),
    "github": ("github.com",),
}


def _classify_link(url: str) -> str | None:
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return None
    for kind, hosts in SOCIAL_HOSTS.items():
        if any(host.endswith(h) for h in hosts):
            return kind
    return None


def _pluck(d: dict, *keys: str) -> Any:
    for k in keys:
        if k in d and d[k] not in (None, "", []):
            return d[k]
        # case-insensitive fallback
        for actual, v in d.items():
            if actual.lower() == k.lower() and v not in (None, "", []):
                return v
    return None


def normalise_project(raw: dict) -> dict:
    """Map a raw record to our canonical schema."""
    name = _pluck(raw, "name", "title") or ""
    description = _pluck(raw, "description", "summary", "tagline") or ""
    category = _pluck(raw, "category", "categoryName", "primaryCategory") or ""
    sub_category = (
        _pluck(raw, "subCategory", "subcategory", "sub_category", "subCategoryName") or ""
    )
    chains_raw = _pluck(raw, "chains", "networks", "chain") or []
    if isinstance(chains_raw, str):
        chains = [chains_raw]
    elif isinstance(chains_raw, list):
        chains = [c if isinstance(c, str) else (c.get("name") or c.get("slug") or "") for c in chains_raw]
        chains = [c for c in chains if c]
    else:
        chains = []

    website = _pluck(raw, "website", "url", "homepage", "link") or ""
    twitter = _pluck(raw, "twitter", "twitterUrl") or ""
    discord = _pluck(raw, "discord", "discordUrl") or ""
    logo_url = _pluck(raw, "logo", "logoUrl", "image", "icon", "logo_url") or ""
    portal_url = _pluck(raw, "portal_url", "portalUrl") or ""
    if not portal_url:
        slug = _pluck(raw, "slug", "id")
        if slug:
            portal_url = f"https://portal.arbitrum.io/projects/{slug}"

    # Sometimes socials live under a `socials` / `links` dict.
    socials = _pluck(raw, "socials", "social", "links") or {}
    if isinstance(socials, dict):
        twitter = twitter or socials.get("twitter") or socials.get("x") or ""
        discord = discord or socials.get("discord") or ""
    elif isinstance(socials, list):
        for item in socials:
            if not isinstance(item, dict):
                continue
            url = item.get("url") or item.get("href") or ""
            kind = (item.get("type") or _classify_link(url) or "").lower()
            if kind == "twitter" and not twitter:
                twitter = url
            elif kind == "discord" and not discord:
                discord = url

    return {
        "name": str(name).strip(),
        "description": str(description).strip(),
        "category": str(category).strip(),
        "sub_category": str(sub_category).strip(),
        "chains": chains,
        "website": website,
        "twitter": twitter,
        "discord": discord,
        "logo_url": logo_url,
        "portal_url": portal_url,
    }


def dedupe_projects(projects: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for p in projects:
        if not p.get("name"):
            continue
        key = (p.get("portal_url") or p["name"]).lower()
        # Prefer the record with more populated fields.
        if key in seen:
            existing = seen[key]
            score_new = sum(1 for v in p.values() if v)
            score_old = sum(1 for v in existing.values() if v)
            if score_new > score_old:
                seen[key] = p
        else:
            seen[key] = p
    return sorted(seen.values(), key=lambda p: p["name"].lower())


# ---------------------------------------------------------------------------
# Scrolling helper
# ---------------------------------------------------------------------------

async def auto_scroll(page: Page, max_idle_rounds: int = 4, step_px: int = 1200) -> None:
    """Scroll down until page height stops growing for `max_idle_rounds` rounds."""
    prev_height = -1
    idle = 0
    for _ in range(200):  # hard cap
        height = await page.evaluate("() => document.body.scrollHeight")
        if height == prev_height:
            idle += 1
            if idle >= max_idle_rounds:
                break
        else:
            idle = 0
            prev_height = height
        await page.mouse.wheel(0, step_px)
        await page.wait_for_timeout(400)


# ---------------------------------------------------------------------------
# Main scrape
# ---------------------------------------------------------------------------

async def scrape(headed: bool = False, debug: bool = False) -> dict:
    capture = NetworkCapture()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=not headed)
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1440, "height": 900},
            locale="en-US",
        )
        page = await context.new_page()
        page.on("response", lambda r: asyncio.create_task(capture.on_response(r)))

        print(f"→ Navigating to {PORTAL_URL}", flush=True)
        try:
            await page.goto(PORTAL_URL, wait_until="domcontentloaded", timeout=60_000)
        except PWTimeout:
            print("  ! goto timed out on domcontentloaded; continuing", flush=True)

        # Give SPA time to hydrate / fire its API requests.
        try:
            await page.wait_for_load_state("networkidle", timeout=20_000)
        except PWTimeout:
            pass

        print("→ Auto-scrolling to trigger lazy loads", flush=True)
        await auto_scroll(page)

        # Try strategies in order.
        projects_raw: list[dict] = []
        used_strategy = "none"

        net_projects = extract_from_network(capture)
        if net_projects:
            projects_raw = net_projects
            used_strategy = "network"

        if not projects_raw:
            nd_projects = await extract_from_next_data(page)
            if nd_projects:
                projects_raw = nd_projects
                used_strategy = "next_data"

        if not projects_raw:
            dom_projects = await extract_from_dom(page)
            if dom_projects:
                projects_raw = dom_projects
                used_strategy = "dom"

        filter_meta = await extract_filter_metadata(page)

        if debug:
            DEBUG_DIR.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(DEBUG_DIR / "page.png"), full_page=True)
            (DEBUG_DIR / "page.html").write_text(await page.content())
            (DEBUG_DIR / "network.json").write_text(
                json.dumps(
                    [{"url": r["url"], "preview": str(r["body"])[:500]} for r in capture.records],
                    indent=2,
                )
            )
            print(f"  • Debug artifacts written to {DEBUG_DIR}", flush=True)

        await browser.close()

    print(f"→ Strategy used: {used_strategy}  (raw records: {len(projects_raw)})", flush=True)

    projects = [normalise_project(r) for r in projects_raw]
    projects = dedupe_projects(projects)

    # Derive categories + chains from the projects themselves.
    cat_to_subs: dict[str, set[str]] = {}
    chains: set[str] = set()
    for proj in projects:
        if proj["category"]:
            cat_to_subs.setdefault(proj["category"], set())
            if proj["sub_category"]:
                cat_to_subs[proj["category"]].add(proj["sub_category"])
        for c in proj["chains"]:
            chains.add(c)

    categories = [
        {"name": cat, "sub_categories": sorted(subs)}
        for cat, subs in sorted(cat_to_subs.items())
    ]

    return {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": PORTAL_URL,
        "strategy": used_strategy,
        "categories": categories,
        "chains": sorted(chains),
        "filter_metadata": filter_meta,
        "projects": projects,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape portal.arbitrum.io/projects")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Path to write the JSON output (default: ../data/projects.json)",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Launch a visible browser (useful for debugging selectors)",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Write page HTML, screenshot, and network log to scraper/debug/",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    payload = asyncio.run(scrape(headed=args.headed, debug=args.debug))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(
        f"✓ Wrote {len(payload['projects'])} projects "
        f"({len(payload['categories'])} categories, {len(payload['chains'])} chains) "
        f"to {args.output}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
