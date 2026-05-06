# SOS Draft Signal Review Tool — Product Spec

## Overview

A personal draft review tool for Secrets of Strixhaven (SOS) Premier Draft. Paste a 17Lands draft URL, and the tool walks you through every pick showing what signals were present in each pack — which archetypes were open, which cards were screaming to be picked, and what you might have missed.

**This is NOT a live drafting tool.** It's a post-draft review helper that replaces manually clicking through 17Lands, cross-referencing win rates, and keeping a notebook.

---

## Two-Phase Flow

### Phase 1: Pick-by-Pick Signal Scan
- Walk through each pick (P1P1 through P3P14)
- For each pick, display the full pack of available cards
- Highlight the card that was actually picked
- On each card, show **archetype signal indicators** — what does this card being available at this pick number tell you?
- Show a running **archetype openness tracker** that updates with each pick (a simple bar or score per archetype)
- No recommendations, no "you should have done X" — just signals. The user reads them and learns.

### Phase 2: Archetype Summary (after full walkthrough)
- Aggregate view: which archetype had the strongest cumulative signals across the whole draft?
- Timeline/chart showing archetype openness signals over all 42 picks
- Identify the **optimal archetype** based on signal strength
- Identify **pivot points** — the pick(s) where it became clear you should switch archetypes
- Compare: what archetype you ended up in vs what was most open

---

## Archetypes to Track

The tool tracks **6 archetypes** (5 colleges + Converge):

| Archetype | Colors | Mechanic | Playstyle |
|-----------|--------|----------|-----------|
| **Silverquill** | WB | Repartee (targeted spells matter) | Aggro-tempo |
| **Lorehold** | RW | Flashback / graveyard leaves | Aggressive curve-out + value |
| **Prismari** | UR | Opus / big instants & sorceries | Spells matter, big mana payoffs |
| **Quandrix** | GU | Increment (+1/+1 counters) | Ramp, X-costs, go-big |
| **Witherbloom** | BG | Infusion (lifegain matters) | Grindy midrange, Pest tokens |
| **Converge (Multicolor Soup)** | 3-5 colors | Converge (colors of mana spent) | Greedy multicolor goodstuff, prioritizes fixing + powerful payoffs. Usually base G or R for fixing, splashing as many colors as the mana supports. Could be 3c, 4c, or full 5c. |

### Key Meta Context (early format data)
- **Tier 1:** Lorehold (RW), Silverquill (WB), Converge (multicolor soup)
- **Tier 2:** Prismari (UR), Quandrix (GU) — these often become the base for Converge builds by adding a 3rd+ color
- **Tier 3:** Witherbloom (BG) — only good when completely uncontested due to hyper-synergistic nature
- Converge is not strictly 5-color — it's any greedy multicolor build that prioritizes fixing and converge payoffs over staying in two colors. A Prismari deck that splashes white and green for converge cards IS a converge deck.
- The slower colleges (Prismari, Quandrix) naturally become converge bases because they already want to play longer games and have ramp/card advantage
- Converge detection should trigger when: fixing is flowing + converge payoff cards are available + the drafter's pool already touches 3+ colors
- White has the most power outlier commons (Elite Interceptor, Pursue the Past, Practiced Offense)

---

## Data Sources

### 1. Draft Log — Per-Draft Pick Data
- **Endpoint:** `GET https://www.17lands.com/data/draft?draft_id={draft_id}`
- **Source:** User provides 17Lands draft URL, we extract the draft_id
- **Returns:** JSON array of picks, each containing:
  - `pack_number` (0-2 = Pack 1-3)
  - `pick_number` (0-13 = Pick 1-14)
  - `pick` — the card that was picked (object with `name`, `types`, `mana_cost`, `image_url`, `url_back`, `layout`, `color`)
  - `available` — array of all cards in the pack at time of pick (same card object structure)
  - `known_missing` — cards known to have been taken by others
  - `section_cards` — array (usually empty)
  - `suggested_pick` — null or card object
- **URL format from user input:** `https://www.17lands.com/draft/{draft_id}/{pack}/{pick}` → extract `{draft_id}`
- **Card object structure in draft data:**
  ```json
  {
    "image_url": "https://cards.scryfall.io/large/front/...",
    "url_back": "",
    "name": "Card Name",
    "types": ["Creature - Human Wizard"],
    "mana_cost": "{1}{W}",
    "layout": "standard"
  }
  ```
- **Note:** Draft data card objects do NOT include `mtga_id` or `color`. We need to join with card ratings data by `name` to get full stats.

### 2. Card Ratings — Bulk Set Data (All Cards)
- **Endpoint (CONFIRMED):** `GET https://www.17lands.com/card_ratings/data?expansion=SOS&event_type=PremierDraft&start_date=2026-04-21&end_date=2026-04-29`
- **Query parameters:**
  - `expansion` — set code (e.g., `SOS`)
  - `event_type` — draft format (e.g., `PremierDraft`)
  - `start_date` — format `YYYY-MM-DD`
  - `end_date` — format `YYYY-MM-DD`
- **Returns:** JSON array with EVERY card in the set, each with basic aggregate stats (ALSA, ATA, GIHWR, etc.)
- **Use case:** First pass — get the full card list with overall win rates and draft position data. This gives us ALSA (avg_seen) and ATA (avg_pick) for signal strength calculations.
- **Key fields per card (expected — confirm exact field names from response):**
  - `name`, `color`, `rarity`, `mtga_id`
  - `avg_seen` (ALSA), `avg_pick` (ATA)
  - `ever_drawn_win_rate` (GIHWR), `opening_hand_win_rate`, `drawn_win_rate`
  - `never_drawn_win_rate`, `game_count`, `ever_drawn_game_count`

### 3. Card-Based Performance — Per-Card Archetype Breakdown (CONFIRMED)
- **Endpoint:** `GET https://www.17lands.com/data/card_based_performance?expansion=SOS&event_type=PremierDraft&start_date=2026-04-21&end_date=2026-04-29&card_id={mtga_id}`
- **Query parameters:**
  - `expansion`, `event_type`, `start_date`, `end_date` — same as above
  - `card_id` — the card's MTGA ID (e.g., `102484` for Practiced Offense)
- **Returns:** Single card object with:
  - `name`, `mtga_id`, `color`, `rarity`, `url`, `url_back`, `types`, `layout`
  - `performances` — object keyed by color combination, each containing an array of daily stats
  - `draft_stats` — array of daily draft position data
- **The `performances` object is the KEY data for archetype mapping.** Structure:
  ```json
  {
    "performances": {
      "all": [{ "date": "...", "game_count": N, "win_rate": 0.XX, "ever_drawn_win_rate": 0.XX, ... }],
      "WB": [{ ... daily stats ... }],
      "WR": [{ ... daily stats ... }],
      "UR": [{ ... daily stats ... }],
      "UG": [{ ... daily stats ... }],
      "BG": [{ ... daily stats ... }],
      "WB+": [{ ... }],  // WB splashing a 3rd+ color
      "WR+": [{ ... }],  // WR splashing
      "WBR": [{ ... }],  // exact 3-color Mardu
      "WUR": [{ ... }],  // exact 3-color Jeskai
      "URG+": [{ ... }], // Temur+
      "WUBRG": [{ ... }] // full 5-color
      // ... many more color combos
    },
    "draft_stats": [
      { "date": "...", "total_times_seen": N, "avg_seen_position": X.X, "total_times_picked": N, "avg_pick_position": X.X }
    ]
  }
  ```
- **Daily stats fields per color combo:**
  - `date` — YYYY-MM-DD
  - `game_count` — total games in this color combo with this card in the deck
  - `win_rate` — overall deck win rate when card is in the deck
  - `opening_hand_game_count`, `opening_hand_win_rate`
  - `drawn_game_count`, `drawn_win_rate`
  - `ever_drawn_game_count`, `ever_drawn_win_rate` — **this is GIHWR, the key metric**
  - `never_drawn_game_count`, `never_drawn_win_rate`

### Color Combination Key in Performances Data

The `+` suffix means "this color pair plus one or more additional colors." This is CRITICAL for Converge detection:

| Key | Meaning | Maps to Archetype |
|-----|---------|-------------------|
| `WB` | Exactly Orzhov (2-color) | Silverquill |
| `WR` | Exactly Boros (2-color) | Lorehold |
| `UR` | Exactly Izzet (2-color) | Prismari |
| `UG` | Exactly Simic (2-color) | Quandrix |
| `BG` | Exactly Golgari (2-color) | Witherbloom |
| `WB+` | Orzhov + splash(es) | Silverquill-based Converge |
| `WR+` | Boros + splash(es) | Lorehold-based Converge |
| `UR+` | Izzet + splash(es) | Prismari-based Converge |
| `UG+` | Simic + splash(es) | Quandrix-based Converge |
| `BG+` | Golgari + splash(es) | Witherbloom-based Converge |
| `WBR` | Exact Mardu 3-color | Specific 3c combo |
| `WUR` | Exact Jeskai 3-color | Specific 3c combo |
| `URG+` | Temur + splash | Converge soup |
| `WUBRG` | Full 5-color | Full Converge |
| `all` | All decks combined | Overall card quality |

**Converge mapping strategy:** To detect if a card is a Converge signal:
- Sum game_count across all 3+ color combos (any key with 3+ letters or `+` suffix)
- Compare `ever_drawn_win_rate` in multicolor combos vs 2-color combos
- If the card's GIHWR is HIGHER in 3+ color decks than in any single 2-color pair, it's a Converge signal card
- If a card has most of its game_count in `+` suffixed or 3+ color keys, it lives in Converge territory

### Data Fetching Strategy

**Two-phase data collection approach:**

**Phase A: Bulk fetch (one request)** — Hit the card_ratings endpoint to get ALL cards with overall stats (ALSA, ATA, overall GIHWR). This gives us the card list and signal strength baseline.

**Phase B: Per-card walkdown (one request per card)** — For each card in the set, hit the card_based_performance endpoint to get the full per-archetype breakdown. This gives us the GIHWR-per-color-pair data needed for archetype mapping.

**Rate limiting:** 17Lands will likely rate-limit aggressive requests. Implementation should:
- Add a delay between requests (e.g., 200-500ms)
- Cache results aggressively — card data doesn't change rapidly
- Consider fetching Phase B data lazily (on first load, then cache) rather than on every draft review
- Store the processed archetype signal map as a static JSON file after initial generation, only refreshing periodically (e.g., daily or weekly)

**Card count estimate:** SOS likely has ~280-320 cards. At 300ms per request, Phase B takes ~90-120 seconds for initial build. This is a one-time cost — cache the result.

### 4. Color Ratings — Overall Archetype Performance
- **Endpoint (needs confirmation):** Likely `GET https://www.17lands.com/color_ratings/data?expansion=SOS&event_type=PremierDraft&start_date=2026-04-21&end_date=2026-04-29`
- **Returns:** Win rates per color pair — used to weight archetype baseline strength
- **Confirm via DevTools** on `https://www.17lands.com/color_ratings`

---

## Signal Logic

### Core Concept: "Expected vs Actual Availability"
A card's signal strength = how surprising it is that this card is still in the pack at this pick number.

```
signal_strength = ALSA - current_pick_number
```

- If a card's ALSA is 3.5 (usually gone by pick 3-4) and it's still here at pick 7, that's a **strong signal** that its archetype is open.
- If a card's ALSA is 10.2 and it's here at pick 7, that's **no signal** — it always goes late.

### Archetype Signal Calculation

For each card in a pack, determine which archetype(s) it signals:

1. **Get the card's GIHWR in each color pair** from the card ratings data
2. **Find the card's "home archetype"** — the color pair where it has the highest GIHWR
3. **Calculate signal strength** — how late this card is relative to its ALSA
4. **Weight by card quality** — a premium card (high GIHWR) being late is a stronger signal than a mediocre card being late

```
archetype_signal(card, pick_number) = 
    max(0, card.ALSA - pick_number) × card.GIHWR_in_archetype × archetype_weight
```

### Card-to-Archetype Mapping

A card belongs to an archetype based on its GIHWR **delta** across color pairs:

- **Strong archetype card:** GIHWR in one color pair is 3%+ higher than in other pairs (e.g., 62% in WB vs 56% average → strong Silverquill card)
- **Flexible/generic card:** Similar GIHWR across all pairs (e.g., good removal that's 58-60% everywhere → no specific archetype signal, but still a quality signal)
- **Converge signal card:** Cards that specifically have converge mechanic, mana fixing cards, or cards whose GIHWR spikes in 3+ color decks

### Archetype Categories for Signal Cards

Each card gets classified into signal tiers:

| Tier | Description | Example |
|------|-------------|---------|
| **Archetype Staple** | Gold/multicolor card or mechanic-specific card that only goes in one archetype | Silverquill signpost uncommon |
| **Strong Signal** | Card with 3%+ GIHWR delta favoring one archetype | A repartee creature late in pack |
| **Moderate Signal** | Card with 1-3% GIHWR delta, or a mono-color card that leans toward an archetype | Good white creature (could be Silverquill or Lorehold) |
| **Weak/No Signal** | Generic good card with flat GIHWR across archetypes | Basic removal, generic curve filler |
| **Fixing Signal** | Mana fixing that signals Converge is viable | Dual lands, mana rocks, color fixing |

### Special Signal Rules

- **Wheeling cards (Pack X Pick 9+):** If a card you saw in picks 1-8 comes back, that's a VERY strong signal. Flag these prominently.
- **Gold cards late:** Multicolor uncommons/rares available after pick 4-5 = their archetype is likely open.
- **Converge detection:** If fixing cards are available late AND converge payoff cards are flowing, flag "Converge/multicolor soup is open." This isn't binary 5-color — it's a spectrum. Track how many colors the drafter could reasonably support based on available fixing, and flag converge when the fixing + payoffs justify going beyond 2 colors.
- **Converge from a college base:** Flag when a 2-color college (especially Prismari or Quandrix) has natural on-ramps to converge — e.g., you're in UR and green fixing + converge payoffs are flowing. The signal isn't "abandon your college" but "your college can upgrade to multicolor soup."
- **Pack 2 confirmation:** Pack 2 signals should confirm or contradict Pack 1 reads. Flag when Pack 2 contradicts.
- **Archetype-specific key cards:** Some cards are SO tied to an archetype that seeing them late is an unmistakable signal regardless of pick number:
  - Repartee creatures → Silverquill
  - Flashback spells / "leaves graveyard" payoffs → Lorehold
  - Opus payoffs / big instant/sorcery rewards → Prismari
  - Increment creatures / X-cost spells → Quandrix
  - Infusion creatures / Pest makers / lifegain payoffs → Witherbloom
  - Converge cards / mana fixing → 5-Color

---

## UI / UX

### Input
- Text field: paste a 17Lands draft URL
- Extract draft_id, fetch data
- Loading state while fetching

### Main View: Pick Navigator

```
┌─────────────────────────────────────────────────┐
│  Pack 1, Pick 5                    [< Prev] [Next >]  │
├─────────────────────────────────────────────────┤
│                                                         │
│  YOUR PICK: [Card Name + Image]                        │
│                                                         │
│  PACK CONTENTS:                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Card 1│ │Card 2│ │Card 3│ │Card 4│ │Card 5│        │
│  │ SQ ● │ │      │ │ LH ●●│ │ PR ● │ │      │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │Card 6│ │Card 7│ │Card 8│ │Card 9│ │Cd 10 │        │
│  │CV ●● │ │ WB ● │ │      │ │ QX ● │ │      │        │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                         │
│  Signal legend: SQ=Silverquill LH=Lorehold             │
│  PR=Prismari QX=Quandrix WB=Witherbloom CV=Converge   │
│  ● = mild signal  ●● = strong  ●●● = screaming        │
│                                                         │
├─────────────────────────────────────────────────┤
│  ARCHETYPE OPENNESS (running total):                    │
│  Silverquill [████████░░░░] 67%                        │
│  Lorehold    [██████████░░] 83%  ← STRONGEST           │
│  Prismari    [████░░░░░░░░] 33%                        │
│  Quandrix    [█████░░░░░░░] 42%                        │
│  Witherbloom [██░░░░░░░░░░] 17%                        │
│  Converge    [███████░░░░░] 58%                        │
└─────────────────────────────────────────────────┘
```

- Cards show image (from Scryfall URL in draft data) + archetype signal badges
- Picked card is highlighted/bordered
- Clicking a card shows detail: GIHWR per archetype, ALSA, why it's a signal
- Arrow keys or buttons to navigate picks
- Running archetype openness bars update each pick

### Phase 2 View: Archetype Summary

Shown after navigating through all picks (or accessible via tab):

```
┌─────────────────────────────────────────────────┐
│  DRAFT SIGNAL SUMMARY                                   │
│                                                         │
│  Most Open Archetype: LOREHOLD (RW)                    │
│  Your Archetype: PRISMARI (UR)                         │
│                                                         │
│  Signal Strength Over Time:                             │
│  (line chart showing archetype openness per pick)       │
│                                                         │
│  Suggested Pivot Point: Pack 1, Pick 6                  │
│  "Lorehold signals peaked here — Practiced Scrollsmith  │
│   + Pursue the Past both available at pick 6"           │
│                                                         │
│  Key Missed Signals:                                    │
│  • P1P5: Practiced Scrollsmith (ALSA 2.8) still here   │
│  • P1P9: Your P1P2 pass wheeled — archetype empty      │
│  • P2P3: Gold Lorehold uncommon tabled                  │
└─────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Frontend:** React (single page app)
- **Data fetching:** Direct calls to 17Lands API endpoints from the browser (CORS permitting) or a lightweight proxy
- **Card images:** Scryfall URLs (already provided in draft data)
- **State management:** React state (useState/useReducer) — no backend needed
- **Charting:** Recharts for the Phase 2 timeline
- **Hosting:** Can run locally or deploy to Vercel/Netlify

### CORS Consideration
17Lands may block cross-origin requests from a browser. If so, options:
1. **Lightweight proxy:** Simple Node/Express server that forwards requests to 17Lands
2. **Pre-fetch approach:** User pastes the raw JSON from DevTools instead of the URL (worse UX but works immediately)
3. **Browser extension:** Could bypass CORS but more complex to build

---

## Implementation Plan

### Step 1: Build Card Data Cache (Phase A + B)
- [ ] **Phase A:** Hit `card_ratings/data` endpoint once to get full card list with overall stats (ALSA, ATA, overall GIHWR, name, mtga_id, color, rarity)
- [ ] **Phase B:** For each card in the set, hit `data/card_based_performance` with `card_id={mtga_id}` to get the full `performances` object (GIHWR per color combo) and `draft_stats` (ALSA/ATA daily)
- [ ] Throttle Phase B requests (200-500ms delay) to avoid rate limiting
- [ ] Save the combined result as a static JSON cache file (`sos_card_data.json`)
- [ ] Build a refresh script that can re-run this periodically (e.g., weekly) as meta evolves
- [ ] Total time estimate: ~280-320 cards × 300ms = ~90-120 seconds for initial build

### Step 2: Build Card-Archetype Signal Map (from cached data)
- [ ] For each card, aggregate daily stats into cumulative totals per color combo (sum game_count, weighted average GIHWR)
- [ ] Filter out color combos with insufficient sample size (e.g., < 50 ever_drawn_game_count)
- [ ] Calculate each card's GIHWR delta: best 2-color archetype GIHWR minus overall GIHWR
- [ ] Classify each card into signal tier (staple / strong / moderate / weak / fixing)
- [ ] Assign primary archetype (highest GIHWR 2-color pair) and secondary if close
- [ ] Detect Converge signal cards: cards whose GIHWR in `+` suffix combos or 3+ color combos exceeds their best 2-color GIHWR
- [ ] Detect fixing cards from card types/names (lands, mana rocks, color fixing)
- [ ] Store processed signal map as `sos_signal_map.json`

### Step 3: Build Signal Engine
- [ ] Implement signal_strength calculation: `max(0, card.ALSA - pick_number) × card.GIHWR_in_archetype × archetype_weight`
- [ ] Implement running archetype openness score that accumulates per-pick signals
- [ ] Implement wheel detection (compare pack 1 early picks with pick 9+ contents by card name)
- [ ] Implement converge detection: track fixing density + converge payoff availability across picks
- [ ] Implement pack 2/3 confirmation logic: compare pack 2 signals vs pack 1 read

### Step 4: Build UI — Phase 1 (Pick Navigator)
- [ ] Draft URL input + draft_id extraction (regex: `/draft/([a-f0-9]+)/`)
- [ ] Fetch and parse draft log data from `data/draft` endpoint
- [ ] Join draft card names to signal map for archetype data
- [ ] Pick-by-pick navigation (prev/next, keyboard arrows)
- [ ] Card display with Scryfall images (URLs from draft data) and signal badges
- [ ] Picked card highlight
- [ ] Running archetype openness bars
- [ ] Card detail on click/hover: GIHWR breakdown per archetype, ALSA, signal explanation

### Step 5: Build UI — Phase 2 (Summary)
- [ ] Aggregate signal data across all 42 picks
- [ ] Archetype openness timeline chart (Recharts line chart, one line per archetype)
- [ ] Determine most-open archetype
- [ ] Detect user's actual archetype from picked card colors
- [ ] Calculate pivot point(s) — where the most-open archetype overtook the user's archetype
- [ ] List key missed signals (high-signal cards that were available but not picked)

### Step 6: Polish & Iterate
- [ ] Handle CORS (lightweight Node proxy or paste-JSON fallback for draft data)
- [ ] Error handling for invalid URLs / missing data / rate limits
- [ ] Cache card data in localStorage so it doesn't re-fetch every session
- [ ] Add support for other sets beyond SOS (parameterize expansion code)

---

## Open Questions / Future Ideas

- **Live draft mode:** Could eventually read MTGA logs in real-time and show signals as you draft
- **Comparison mode:** Compare two drafts side by side
- **Community tier lists:** Let users import custom archetype weights
- **Historical learning:** Track signal reading accuracy over many drafts
- **Multi-set support:** Parameterize everything so it works for any set, not just SOS
- **Wheel prediction:** Based on what you passed, predict what might wheel and flag when it does/doesn't

---

## Appendix: Key Cards by Archetype (to be populated from 17Lands data)

This section should be auto-generated from Step 2 (card-archetype signal map). Placeholder structure:

### Silverquill (WB) — Repartee
**Staple signals:** (gold WB cards, repartee creatures)
**Strong signals:** (high GIHWR delta cards)
**Commons to watch:** (Elite Interceptor, etc.)

### Lorehold (RW) — Flashback
**Staple signals:** (gold RW cards, flashback spells, "leaves graveyard" payoffs)
**Strong signals:** (Practiced Scrollsmith, Pursue the Past, etc.)
**Commons to watch:** (Practiced Offense, etc.)

### Prismari (UR) — Opus / Big Spells
**Staple signals:** (gold UR cards, opus payoffs)
**Strong signals:** (big instant/sorcery rewards)
**Commons to watch:** (spell-based value cards)

### Quandrix (GU) — Increment
**Staple signals:** (gold GU cards, increment creatures, X-cost spells)
**Strong signals:** (ramp pieces that specifically enable increment)
**Commons to watch:** (Studious First-Year, Snarl Song, etc.)

### Witherbloom (BG) — Infusion
**Staple signals:** (gold BG cards, infusion creatures, pest makers)
**Strong signals:** (lifegain payoffs)
**Commons to watch:** (pest token generators)

### Converge (Multicolor Soup — 3-5 colors)
**Staple signals:** (converge payoff cards — Arcane Omens, Archaic's Agony, Strixhaven Skycoach, Together as One, etc.)
**Fixing signals:** (dual lands, mana rocks, Studious First-Year, any color fixing)
**Key indicator:** Fixing flowing late + converge payoffs available = multicolor soup is viable. Not strictly 5-color — a 3-color deck with converge payoffs counts. Track how naturally a 2-color base (especially Prismari/Quandrix) can expand into more colors.

---

## Starter Prompt for Claude Code

Use this prompt when starting the implementation session:

---

**Prompt:**

I'm building a personal MTG draft review tool for Secrets of Strixhaven. The full spec is in `SOS_Draft_Signal_Tool_Spec.md` — read it thoroughly before writing any code.

Here's what matters most for how you build this:

### Architecture Principles

**Data layer is separate from everything else.** All 17Lands API fetching, caching, and processing should live in its own module. The signal calculations should be a separate module that consumes processed data. The UI should be a separate layer that consumes signal output. I want to be able to swap out how I visualize the data without touching the signal logic or data layer.

**Think in interfaces, not implementations.** Define clear TypeScript types/interfaces for:
- Raw 17Lands API responses (card ratings, card performance, draft log)
- Processed card data (aggregated stats per archetype)
- Signal map entries (card → archetype mapping with signal tiers)
- Signal engine output (per-pick signals, running archetype scores)
- Draft state (what the UI needs to render a pick)

These interfaces are the contracts between layers. If I want to replace the React UI with a CLI, or add a different chart library, or change the signal algorithm, I should only need to touch one layer.

**Make the data pipeline reproducible.** The card data cache build (fetching all cards from 17Lands) should be a standalone script I can re-run when the meta shifts. It outputs a static JSON file. The app reads from that file, not from live API calls (except for the draft log itself, which is per-session).

### Design Philosophy

**Functional, not pretty.** This is a personal tool. Don't spend tokens on animations, gradients, or polish. Spend them on making the data clear and scannable. Cards should show their signal badges at a glance. The archetype openness bars should be immediately readable.

**Data density over whitespace.** I want to see as much signal information as possible without scrolling. Think Bloomberg terminal, not Apple marketing page. Pack contents should all be visible at once. Signal badges should be compact. The archetype tracker should always be visible.

**Composable views.** Build the UI so that each piece (card display, signal badge, archetype tracker, pick navigator) is its own component. I'll want to rearrange these, add new views (timeline chart, color wheel, pick-vs-signal heatmap), or embed them differently later. Don't hard-wire the layout.

### File Structure

Suggested structure (adapt as needed but keep separation clean):

```
/src
  /data
    fetcher.ts         — 17Lands API calls (draft log, card ratings, card performance)
    cache-builder.ts   — Script to build sos_card_data.json from 17Lands
    types.ts           — Raw API response types
  /signals
    signal-map.ts      — Processes cached card data into archetype signal assignments
    signal-engine.ts   — Takes a draft + signal map → per-pick signals + running scores
    types.ts           — Signal output types (SignalStrength, ArchetypeScore, etc.)
  /ui
    components/        — React components (CardDisplay, SignalBadge, ArchetypeTracker, PickNavigator, etc.)
    views/             — Page-level compositions (DraftReview, Summary)
    hooks/             — useSignalEngine, useDraftData, etc.
  /shared
    types.ts           — Shared types (Card, Archetype, ColorCombo, etc.)
    constants.ts       — Archetype definitions, color mappings, thresholds
/scripts
  build-cache.ts       — CLI script: fetches all card data → outputs sos_card_data.json
/data
  sos_card_data.json   — Cached card data (generated, not committed)
  sos_signal_map.json  — Processed signal map (generated)
```

### What to Build First

1. **Shared types and constants** — define the data shapes
2. **Data fetcher + cache builder script** — get real data flowing
3. **Signal map builder** — process cached data into archetype assignments
4. **Signal engine** — core logic: draft + signal map → pick-by-pick signals
5. **Minimal UI** — just enough to navigate picks and see signals
6. **Summary view** — Phase 2 aggregate analysis

Don't try to build everything at once. Get the data pipeline working first (steps 1-3), verify the signal map makes sense with real card data, then build the engine and UI on top of solid data.

### Key Technical Decisions

- **CORS:** 17Lands likely blocks browser requests. Build a lightweight Express proxy server that forwards requests. Keep it simple — just a passthrough with rate limiting.
- **Card name matching:** Draft log cards don't have mtga_id. Join to signal map by card `name` (exact string match). Watch out for double-faced cards where names might differ.
- **Daily stats aggregation:** The card_based_performance endpoint returns daily arrays. Sum `game_count` and `ever_drawn_game_count` across all dates, compute weighted average `ever_drawn_win_rate` for the cumulative GIHWR.
- **Sample size filtering:** Ignore color combos with fewer than 50 `ever_drawn_game_count` total — the win rates are noise below that threshold.
- **Converge detection:** A card is a "converge signal" if its best GIHWR comes from a `+` suffix key or 3+ letter key, AND that GIHWR exceeds its best strict 2-color GIHWR by 1%+.

---
