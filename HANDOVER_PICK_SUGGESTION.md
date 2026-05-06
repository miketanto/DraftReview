# Handover: Pick Suggestion System with Signal Velocity & Pool-Aware Picks

## Current state of the project

A working post-draft review tool for SOS Premier Draft (Secrets of Strixhaven). User pastes a 17Lands draft URL and walks through every pick seeing archetype signals. Fully functional at `http://localhost:5173` with proxy on port 3001.

### What's built

- **Data pipeline**: Express CORS proxy → 17Lands API. Static card cache (`data/sos_card_data.json`, 339 cards) with per-archetype GIHWR breakdowns. Signal map (`public/data/sos_signal_map.json`) classifying each card's archetype affinity.
- **Signal engine** (`src/signals/signal-engine.ts`): Per-pick analysis producing signal strength scores per archetype, wheel detection, converge viability tracking.
- **UI**: Pick-by-pick navigator with card images, signal badges, three sidebar panels (cumulative archetype openness bars, per-pick signal distribution bar chart with strong/weak split, top 3 win-rate cards), card detail popover, and a summary view with Recharts timeline.

### Architecture

```
src/data/       → 17Lands fetching + static JSON cache
src/signals/    → signal classification (signal-map.ts) + per-pick engine (signal-engine.ts)  
src/ui/         → React SPA (Vite + TypeScript + Recharts)
server/proxy.ts → Express CORS proxy to 17Lands
scripts/        → build-cache.ts, build-signal-map.ts (offline data pipeline)
```

### Current signal formula

```
signalStrength = max(0, pickNumber - card.ALSA) × card.GIHWR_in_archetype × archetypeTierWeight
```

Cards are classified as staple/strong/moderate/weak/fixing based on GIHWR delta from overall average. Converge detection uses weighted average GIHWR across 3+ color combos vs best 2-color GIHWR (3% threshold).

### Key files

- `src/shared/constants.ts` — thresholds, archetype definitions (6 archetypes: Silverquill WB, Lorehold WR, Prismari UR, Quandrix UG, Witherbloom BG, Converge 3-5c)
- `src/shared/types.ts` — Card, DraftPick, Draft, ArchetypeId
- `src/signals/types.ts` — SignalTier, CardSignalEntry, PickSignal, PickAnalysis, DraftAnalysis
- `src/signals/signal-map.ts` — `buildSignalMap()` classifies all cards statically
- `src/signals/signal-engine.ts` — `analyzeDraft()` runs per-pick analysis, `computeSignalStrength()`, `detectWheels()`, `inferUserArchetype()`
- `src/data/types.ts` — CachedCardData (note: `color` is `string` not `string[]`, e.g. "WB")
- `src/ui/views/DraftReview.tsx` — main pick-by-pick view
- `src/ui/components/PickSignalChart.tsx` — per-pick archetype bar chart
- `src/ui/components/TopWinrateCards.tsx` — top 3 by GIHWR per pick
- `data/sos_card_data.json` — 339 cards with full archetype stats (join to draft data by exact card name)

### Data constraints

**No 17Lands public deck dataset is available for SOS yet.** The public_datasets page does not have downloadable deck-level CSVs for this set. All modeling must work with the data we already have:
- Per-card stats: GIHWR (overall + per archetype), ALSA, ATA, game counts
- Per-card archetype breakdown: win rates in each 2-color pair and multicolor combo
- Draft logs: full pick-by-pick data with available cards and picked card

This means deck-level co-occurrence data (which cards appear together in winning decks) is NOT available. The system must be built from per-card statistics and the draft pick sequence itself.

---

## What to build next

Two interconnected improvements:

### 1. Signal velocity & recency-aware scoring
The current engine tracks cumulative signal totals. It needs to track the *rate of change* — which archetypes are trending up RIGHT NOW, not just which have the highest historical total.

### 2. Pool-aware pick evaluation
The current engine scores each available card in isolation. It doesn't know what the drafter already has. Suggestions need to consider: color commitment, curve, role coverage, and diminishing returns on redundant effects.

---

## Critical context: How signals SHOULD work (from domain expert analysis)

The following mental model comes from an experienced drafter's breakdown of signal reading. This should deeply inform both the signal engine improvements and the pick suggestion system.

### Two key moments in every draft

1. **Initial signal** — the first shred of information that another archetype might be better than what you're currently in. As simple as noticing one strong card in a different color late in pack 1. You collect MANY candidate initial signals during a draft.

2. **Strongest signal / velocity confirmation** — the moment where the alternative archetype is clearly pulling ahead with increasing speed. This is when you need to jump immediately. Waiting 2-3 picks after this costs enormous value because you're about to pass to the players who WEREN'T passing you this color in pack 1, and they'll lock in.

### Signal velocity matters more than individual card quality

The key insight: **signals are about the RATE OF CHANGE, not absolute values.**

- Getting 1 bomb in a color means nothing on its own
- Getting a steady stream of playable-to-good cards in a color, especially accelerating over time, means the archetype is open
- 4 mediocre cards of one color pair at pick 10 is a STRONGER signal than 1 great card at pick 3
- Volume of cards in a color late in a pack carries more information than a single good card early

### Not every card is a signal — informational content matters

- A dual land at P1P3 is NOT a signal (nobody P1P2s a dual land)
- An uncommon at P1P2 is NOT a signal (someone just took their rare over it)
- A bad card in a color passing late is NOT a signal (it's just a bad card nobody wants)
- A GOOD card still available when it shouldn't be IS a signal (compare to ALSA)
- Multiple cards of one archetype in a late pack IS a signal (volume matters)

### False signals and sunk cost

- Early picks can create false confidence — "I got 3 Boros cards in picks 1-5" doesn't mean Boros is open, it might just mean you took the best cards
- The trap is ossifying on early investment and missing that signals have dried up
- The current engine's cumulative scoring can reinforce this trap — once an archetype gets ahead in cumulative signal, it stays ahead even if the signals stopped
- Need some form of recency weighting or velocity tracking

### Pack-specific dynamics

- **Pack 1**: You're receiving from the left. Signals tell you what the left side of the table isn't taking.
- **Pack 2**: Direction reverses. Signals from pack 1 may not hold. But if they DO hold (same colors open from both directions), that's extremely strong confirmation.
- **Pack 3**: Direction matches pack 1 again. If you read pack 1 correctly and positioned well, you get rewarded. If you misread, the players to your right who correctly read their signals are now cutting you.

### ALSA importance varies by pack

1. **Pack 1**: ALSA-based lateness is the primary signal-reading tool ("this card should be gone by now"). Most important here.
2. **Pack 2-3**: You should already have an archetype read. A high-GIHWR card for your archetype matters even if its ALSA is low — it confirms openness from the other direction. Card quality in your archetype > lateness.

---

## Signal engine improvements needed

### Recency weighting / windowed scoring
Signals from the last 5 picks should be weighted much higher than signals from 15 picks ago. A color that was open in early pack 1 but dried up by pick 8 is NOT open — but the current cumulative scoring says it is.

### Velocity as a first-class metric
Track the derivative of archetype signal over time. If an archetype went from 0 signals to 3 signals in the last 4 picks, that trajectory matters enormously — possibly more than another archetype that has 5 total signals spread evenly.

### Pack-direction awareness
Pack 1 signals come from the left, pack 2 from the right, pack 3 from the left again. A signal confirmed from BOTH directions (open in pack 1 AND pack 2) is very strong. The engine should track left-signal and right-signal separately.

### Informational content filtering
Not every card in a color is a signal. ALSA-based lateness captures some of this ("this card is late for what it is"), but we should also consider volume-in-pack context — many mediocre cards of one archetype in a late pick is a stronger signal than one good card early.

### Separate openness from card quality
"This archetype is open" and "this card is good for my deck" are different questions that the current engine conflates into one score. They should be tracked separately and combined at suggestion time.

---

## Pool-aware pick evaluation (using only per-card data)

Since we don't have deck-level co-occurrence data, the pool evaluator must work from per-card statistics and structural heuristics.

### What we CAN derive from the data we have

**Color commitment score**: How invested is the pool in each color? Count picks by color, weight by pick order (early picks = stronger commitment). This tells us the cost of pivoting.

**Curve analysis**: Map each card to its mana value. Compare the pool's curve to a generic limited curve (roughly: 0-1 one-drops, 3-4 two-drops, 4-5 three-drops, 3-4 four-drops, 2-3 five+drops for a 17-land deck). Identify gaps.

**Role coverage**: Classify cards by role using card types and keywords from the cached data — creature, removal (heuristic: cards with "destroy", "exile", "damage" in name/type patterns), card draw, fixing. Track how many of each role the pool has vs rough targets.

**Archetype GIHWR fit**: For each candidate card, look up its GIHWR specifically in the archetype the drafter appears to be in (not just overall). A card that's mediocre overall but great in Witherbloom is a better pick if you're in Witherbloom.

**Diminishing returns**: The 3rd copy of a role (e.g., 3rd piece of removal) is less valuable than the 1st. The 5th four-drop is less valuable than the 1st two-drop if you have zero two-drops.

### What we CANNOT do without deck data

- Card-card synergy scoring ("Pest token generators are better when you already have sacrifice outlets")
- Archetype sub-strategy detection ("you're the aggressive Silverquill build, not the grindy one")
- Win-rate prediction conditioned on deck composition

---

## ML approaches that work with per-card data only

Without deck composition datasets, full supervised learning on "deck → win rate" isn't possible. But there are ML-adjacent approaches that work with what we have:

### Approach 1: Contextual bandit / pick-value estimation

Frame each pick as a contextual bandit problem:
- **Context**: pick number, pack number, archetype openness scores (from signal engine), pool color distribution, pool curve shape, pool size
- **Action**: which card to take
- **Reward proxy**: card's GIHWR in the archetype the drafter ends up in

This doesn't require training data beyond what we have. The "model" is a scoring function:

```
pickValue(card, pool, signals) = 
    α × card.archetypeGihwr[bestArchetype]     // raw card quality in context
  + β × signalVelocity[card.archetype]          // is this archetype trending?
  + γ × poolFit(card, pool)                     // curve/color/role fit
  + δ × optionality(card)                       // flexible cards worth more early
  - ε × pivotCost(card, pool)                   // cost if this commits to a new color
```

The weights (α, β, γ, δ, ε) can be hand-tuned or optimized against a small set of expert-reviewed drafts. This is essentially a linear model with engineered features — interpretable, fast, no training dataset needed.

### Approach 2: Card embeddings from GIHWR co-performance

We have each card's GIHWR in ~15-20 archetype keys (WB, WR, UR, UG, BG, WB+, WR+, etc.). This is effectively a card × archetype matrix. We can:

1. Treat each card as a vector of its archetype GIHWRs (dimension ~20)
2. Cards with similar archetype profiles are "similar" — they go in the same decks
3. Use cosine similarity between a candidate card's vector and the average vector of the pool to measure fit
4. Cards that are similar to what you already have = good fit, cards that are orthogonal = pivot/splash

This gives us a lightweight "embedding" without any neural network training. It captures things like "this card performs well in exactly the same archetypes as your other cards."

### Approach 3: Bayesian archetype inference

Instead of hard-classifying "you are Silverquill," maintain a probability distribution over archetypes that updates with each pick and each signal:

```
P(archetype | picks_so_far, signals_so_far) ∝ P(signals | archetype) × P(picks | archetype) × P(archetype)
```

- `P(signals | archetype)`: likelihood of seeing these signals if this archetype is truly open (from signal velocity data)
- `P(picks | archetype)`: likelihood of these cards being picked by someone in this archetype (from GIHWR — high GIHWR cards in an archetype are more likely picks)
- `P(archetype)`: prior, starts uniform, could be biased by seat position heuristics

Each candidate card is then scored by: "how much does picking this card improve the expected quality of my final deck, integrated over the archetype distribution?"

This naturally handles uncertainty early in the draft (flat distribution → value optionality) and becomes more decisive later (peaked distribution → value archetype-specific cards).

### Approach 4: Monte Carlo rollout (aspirational)

Simulate the rest of the draft:
1. For each candidate card, tentatively add it to the pool
2. For remaining picks, assume you take the best available card for your archetype (using GIHWR + ALSA to model what will be available)
3. Score the final simulated pool
4. Pick the card that leads to the best expected final pool

This is computationally expensive but could run with aggressive pruning (only simulate top 5 candidates, only roll out 5-8 future picks). Doesn't need deck data — just card stats to model what's likely available and what's good.

### Recommended: Start with Approach 1, layer in Approach 3

The contextual scoring function (Approach 1) is the foundation — it's the simplest thing that can work and is immediately useful. The Bayesian archetype inference (Approach 3) adds the key missing piece: probabilistic archetype tracking instead of hard classification, which naturally handles the "should I pivot?" question.

These two compose well: the Bayesian posterior tells you WHERE you should be drafting, and the scoring function tells you WHICH card to take given that belief.

---

## Suggested implementation plan

### Phase 1: Signal velocity (no ML, pure engine improvement)

Add to `signal-engine.ts`:
- Windowed signal scoring (last 5 picks weighted 3x vs older picks)
- Per-archetype velocity metric (signal delta over last 4 picks)
- Pack-direction tagging (left-signal vs right-signal)

New UI component: velocity indicator showing which archetypes are trending up/down/flat.

### Phase 2: Pool evaluator (heuristic, no ML)

New `src/model/pool-evaluator.ts`:
- Track pool color commitment, curve, role counts
- Score each candidate card for pool fit: does it fill a gap, match colors, improve curve?
- Output a `poolFitScore` per candidate card

Wire into the sidebar as a new panel showing pool state (curve chart, color pie, role checklist).

### Phase 3: Pick scoring function (Approach 1)

New `src/model/pick-suggester.ts`:
- Combine: card GIHWR in best archetype + signal velocity + pool fit + optionality - pivot cost
- Output ranked suggestions with explanations
- Weight ALSA heavily in pack 1, decrease in packs 2-3

New UI component: "SUGGESTED PICK" panel with top 3 recommendations and reasoning.

### Phase 4: Bayesian archetype tracking (Approach 3)

New `src/model/archetype-inference.ts`:
- Maintain posterior distribution over 6 archetypes
- Update with each pick (what you took) and each signal observation (what you saw)
- Feed posterior into pick-suggester to weight cards by archetype probability

UI: Replace or augment the archetype openness bars with posterior probabilities. Show "confidence" in current archetype.

---

## Suggested files

```
src/model/                          — new layer
src/model/types.ts                  — PoolState, PickSuggestion, ArchetypePosterior types
src/model/pool-evaluator.ts         — analyze pool: curve, colors, roles, commitment
src/model/pick-suggester.ts         — scoring function: GIHWR + velocity + pool fit → ranked picks
src/model/archetype-inference.ts    — Bayesian posterior over archetypes
src/model/signal-velocity.ts        — windowed signal scoring, velocity computation
src/signals/signal-engine.ts        — extend with velocity metrics, pack-direction tagging
src/ui/components/PickSuggestion.tsx — suggestion display with explanations
src/ui/components/PoolState.tsx      — curve chart, color commitment, role checklist
src/ui/components/SignalVelocity.tsx  — trending archetypes indicator
src/ui/views/DraftReview.tsx         — wire in new panels
```
