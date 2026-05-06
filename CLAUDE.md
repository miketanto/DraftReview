# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal post-draft review tool for Secrets of Strixhaven (SOS) Premier Draft on Magic: The Gathering Arena. Users paste a 17Lands draft URL and walk through every pick seeing archetype openness signals. This is NOT a live drafting tool — it's a retrospective analysis tool.

## Two-Phase User Flow

1. **Pick-by-Pick Signal Scan** — navigate P1P1 through P3P14, see signal badges on each card, track running archetype openness scores
2. **Archetype Summary** — aggregate signal timeline, optimal archetype identification, pivot points, missed signals

## Architecture

Three cleanly separated layers with TypeScript interfaces as contracts between them:

- **Data layer** (`src/data/`) — 17Lands API fetching, caching, processing. Card data is cached as static JSON files (`sos_card_data.json`, `sos_signal_map.json`), not fetched live (except the per-draft log)
- **Signal layer** (`src/signals/`) — processes cached card data into archetype signal assignments, runs signal engine per-pick
- **UI layer** (`src/ui/`) — React components consuming signal output. Composable components (CardDisplay, SignalBadge, ArchetypeTracker, PickNavigator) that can be rearranged

## Tech Stack

- React SPA, TypeScript, Recharts for charts
- Lightweight Express proxy for 17Lands CORS
- Card images from Scryfall URLs (provided in draft data)
- State management: useState/useReducer (no backend)

## Data Sources (17Lands API)

- **Draft log:** `GET https://www.17lands.com/data/draft?draft_id={id}` — per-draft picks, available cards
- **Card ratings:** `GET https://www.17lands.com/card_ratings/data?expansion=SOS&event_type=PremierDraft&start_date=...&end_date=...` — bulk card stats (ALSA, ATA, GIHWR)
- **Card performance:** `GET https://www.17lands.com/data/card_based_performance?expansion=SOS&event_type=PremierDraft&start_date=...&end_date=...&card_id={mtga_id}` — per-card archetype breakdown with `performances` object keyed by color combo
- Draft data cards lack `mtga_id` — join to signal map by exact card `name`

## Key Signal Logic

- Signal strength = `max(0, card.ALSA - pick_number) × card.GIHWR_in_archetype × archetype_weight`
- Archetype classification by GIHWR delta across color pairs (3%+ = strong, 1-3% = moderate)
- Converge detection: cards whose best GIHWR comes from `+` suffix or 3+ color keys, exceeding best 2-color GIHWR by 1%+
- Sample size filter: ignore color combos with < 50 `ever_drawn_game_count`
- Wheel detection: compare early-pack cards with pick 9+ contents

## Six Tracked Archetypes

Silverquill (WB, repartee), Lorehold (RW, flashback), Prismari (UR, opus/big spells), Quandrix (GU, increment), Witherbloom (BG, infusion), Converge (3-5 colors, multicolor soup)

## Design Philosophy

- **Functional over pretty** — data clarity over polish, Bloomberg terminal density
- **Data density over whitespace** — all pack contents visible without scrolling
- **Cache-first data pipeline** — `scripts/build-cache.ts` fetches all cards (~300) with 200-500ms throttling, outputs static JSON. App reads cache, only fetches draft log live
