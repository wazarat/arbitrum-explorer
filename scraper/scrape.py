"""Scraper for portal.arbitrum.io/projects.

v1 skeleton — full scraping logic lands in Milestone 2.

Usage:
    python scrape.py                     # scrape and write ../data/projects.json
    python scrape.py --output out.json   # custom output path
    python scrape.py --headed            # run with a visible browser (debug)
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

PORTAL_URL = "https://portal.arbitrum.io/projects"
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "data" / "projects.json"


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
    return parser.parse_args()


def scrape(headed: bool = False) -> dict:
    """Return the scraped payload. v1 skeleton returns an empty structure."""
    # TODO(milestone-2): implement actual scraping with Playwright.
    return {
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": PORTAL_URL,
        "categories": [],
        "chains": [],
        "projects": [],
    }


def main() -> int:
    args = parse_args()
    payload = scrape(headed=args.headed)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(payload['projects'])} projects to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
