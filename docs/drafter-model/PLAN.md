# Learned drafter — plan

See [DESIGN.md](DESIGN.md) for rationale. Stages are ordered so each one produces a usable result on its own.

## Stage 0 — Setup on the GPU machine (½ day)

- [ ] Fork/clone `github.com/brianward92/mtga` into a separate repo (e.g. `~/Documents/draftrewind-model`).
- [ ] Patch hardcoded data paths (`mtga/lands/paths.py`) and set device to `cuda`.
- [ ] Download 17Lands dumps for SOS, MSH, ECL, DSK (draft + game data). Note FRA not yet published.
- [ ] Run DraftFM's ETL → shards for those sets; download the paper's held-out checkpoint from HF.
- [ ] Reproduce DraftFM's MSH held-out top-1 (≈56.7%) with `scripts/eval_draftfm.py`. **Gate: numbers match.**
- [ ] Merge in the heuristic-baseline results (highest GIHWR, lowest ATA, pool-aware GIHWR) from the other session.

## Stage 1 — Signal model (A-ablations) (1–2 weeks)

- [ ] History shards: group draft rows by `draft_id`, order by pack/pick, emit per-pick token features
      (received pack, my pick, passed cards, wheel delta, pack/pick, direction). Verify wheel delta = pack@p+8 vs pack@p.
- [ ] Future-supply targets: colour-quality of packs received after pick t, per direction.
- [ ] Final-colour targets: join game dump `main_colors` on `draft_id`.
- [ ] Model: frozen DraftFM base + causal history transformer + seat-belief bottleneck + `s_sig` residual,
      openness head, self-archetype head. Losses: pick CE (residual), wheel reconstruction, future supply, final colours.
- [ ] Ablations, same splits and seeds (≥3):
  - A0 DraftFM base
  - A1 + history, no bottleneck
  - A2 + belief bottleneck + wheel loss
  - A3 + CardGuru graph features (SOS/MSH/ECL/DSK only)
- [ ] Report: top-1, log-loss, ECE overall / expert subset / signal-sensitive picks (P1 p5–10, P2 p1–4);
      wheel-reconstruction accuracy; attention-by-pick-number curve (tests "later picks mean less").
- [ ] Held-out evaluation on MSH with the held-out checkpoint; FRA as day-zero test when its dump appears.

## Stage 2 — Value head + offline improvement (1–2 weeks)

- [ ] Value head: deck win-rate from state, censored-binomial loss (Rigaux & Kashima). Sanity check ρ vs their ≈0.21.
- [ ] AWR-reweighted picks using the value head as critic, KL-anchored to the Stage-1 policy (piKL-style).
- [ ] Compare vs Stage 1 on: imitation metrics (should drop little) and predicted deck strength (should rise).

## Stage 3 — DraftRewind integration (≈1 week, can start after Stage 1)

- [ ] Export ONNX (DraftFM's `export.py` pattern) + per-set assets.
- [ ] Server: `onnxruntime-node`, score all 42 picks at review creation, store with model-version tag in SQLite.
- [ ] Map outputs onto `src/model/types.ts`: `PickSuggestion` (base/signal components), `ArchetypePosterior`,
      `VelocityMetrics.directionSignals`; new seat-belief panel.
- [ ] Flag model-vs-drafter disagreements → prioritise those picks for review (active learning).
- [ ] Quick mode: tap-to-select alt pick → writes a `Divergence` (structured "should have taken X").
- [ ] Attribution: "Data from 17Lands.com" + DraftFM Apache-2.0 notice.

## Stage 4 — Reviewer-label evaluation & fine-tune (ongoing)

- [ ] Eval set: contested picks (model ≠ drafter) with ≥1 reviewer `altPick`/`verdict`. Rough target ≈300 contested
      picks (≈25–30 fully reviewed drafts) to separate models ~10pp apart — recompute once real contest rates are known.
- [ ] Inter-rater agreement across annotation layers = noise ceiling.
- [ ] Once labels exist: Bradley-Terry (altPick), Plackett-Luce (cardRanks), ordinal (verdict) fine-tune, KL-anchored.

## Stage 5 — Simulated pod RL (research stretch)

- [ ] 8-seat pod sim: packs sampled from P1P1 rows (complete fresh packs), 7 seats = Stage-1 policy.
- [ ] Reward = value head (+ reviewer-derived shaping); KL-anchored PPO or MCTS over picks.
- [ ] Compare against Stage 2 on held-out human drafts and reviewer agreement.

## Open questions

- Quick Draft dump location (not at the expected S3 path) — bot pods as a cleaner testbed for the belief model.
- Seat-belief granularity: 5 colours vs colour pairs vs archetypes; ±1/±2 only or all 7 seats.
- Whether to update CardGuru's Forge pin to cover FRA for the A3 ablation.
- Paper venue/timeline (CoG 2027?).
