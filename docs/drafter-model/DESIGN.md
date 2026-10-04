# Learned drafter for DraftRewind — design

Status: design agreed in discussion (2026-10-04), no model code yet. Goal is **both** a paper and a DraftRewind feature.
Companion docs: [PLAN.md](PLAN.md) (staged work), [HANDOFF.md](HANDOFF.md) (prompt for the GPU machine).

## 1. Core idea

Don't rebuild pick imitation — **DraftFM already solved it** (Apache-2.0, ONNX, ships SOS + FRA card assets).
Build a *signal* model on top of it that reads the pick history, keeps a belief over neighbouring seats, and
adds a residual to DraftFM's score.

```
 card table (DraftFM 775-d features, frozen; optional: CardGuru graph feats)
        │
        ├── current pack + pool + skill ──► DraftFM (frozen) ──► base logit  s_base(c)
        │
        └── pick history t=1..T ──► History encoder (small causal transformer, ≤42 tokens)
              token_s = [received pack, my pick, passed cards,                │
                         wheel delta (knownMissing), pack/pick, direction]    │
                                                                              ▼
                                                     Seat-belief bottleneck  b_t
                                                     seats ±1, ±2 × 5 colours
                                                                              │
              ┌──────────────────┬──────────────────┬────────────────────────┤
              ▼                  ▼                  ▼                        ▼
      Δ-signal logit       Openness head       Self-archetype head      Value head
      s_sig(c | h, b)      (future supply      (my final colours)       (deck win-rate;
                            per colour × dir)                            phase 2)

   logit(c) = s_base(c) + s_sig(c)
```

## 2. Design decisions

1. **Additive decomposition `s_base + s_sig`.** Card quality (DraftFM, given pack/pool/skill) vs signal adjustment
   (learned from history only). Mirrors the handover principle "separate openness from card quality", gives
   `PickSuggestion.components` an honest base/signal split, and is a direct test of the belief idea:
   if history is useless, `s_sig → 0` (a publishable null).
2. **Belief indexed by physical seat (±1, ±2), not by role.** Seat +1 is downstream in packs 1/3 and upstream in
   pack 2, so "who I fed in pack 1 now cuts me" is structural. Inputs per history token:
   - *received* pack → what upstream didn't take
   - *passed* cards → what downstream was fed (and might move into)
   - *wheel delta* (`knownMissing`) → exact set of cards the other 7 seats took from a known pack
3. **Self-supervised belief targets** (neighbour picks are never observed in 17Lands data):
   - **Wheel reconstruction:** predict which cards vanished between pick s and s+8 from the original pack and
     `b_t` *only* — the bottleneck forces `b_t` to carry neighbour information.
   - **Future supply (openness head):** predict colour-quality of packs *received later in the same draft*
     (observed in the log). Gives openness a real forward-looking target; replaces `directionSignals`.
   - "Later picks mean less" is **measured, not hand-coded**: read the history encoder's attention by pick
     number. Hypothesis to test: a pick's information about a neighbour *rises* later in the pack, while the
     value of acting on it *falls* as your own pool commits.
4. **Reviewer labels are preference losses / eval, never the main signal:**

   | DraftRewind field (`src/annotator/types.ts`) | Loss | Use |
   |---|---|---|
   | `Divergence.altPick` | Bradley-Terry: alt ≻ actual given context | eval → KL-anchored fine-tune |
   | `cardRanks` (1–5) | Plackett-Luce listwise | same |
   | `verdict` good/maybe/no | ordinal on chosen card's advantage | same |
   | `DeckVersion.main` | pool → deck target; value-head input | phase 2 |
   | multiple `AnnotationLayer`s | inter-rater agreement = noise ceiling | eval |

5. **Skill conditioning, not filtering** (Maia-2 style). DraftFM already takes a win-rate bucket; set it high at
   inference instead of discarding average drafters.

## 3. Heads → existing interfaces (`src/model/types.ts`), no UI rewrite

- `PickSuggestion` ← logit ranking; components = base / signal
- `ArchetypePosterior` ← self-archetype head (target: `main_colors` from the game dump, joined by `draft_id`)
- `VelocityMetrics.directionSignals` ← openness head per direction
- New panel: seat belief ("seat +1: likely UG")

## 4. Data (verified 2026-10-04)

- Draft dump `draft_data_public.{SET}.PremierDraft.csv.gz` columns: `expansion, event_type, draft_id, draft_time,
  rank, event_match_wins, event_match_losses, pack_number, pick_number` (0-indexed), `pick, pick_2,
  pick_maindeck_rate, pick_sideboard_in_rate, pack_card_*, pool_*, user_n_games_bucket, user_game_win_rate_bucket`.
  → **History is reconstructable** by grouping on `draft_id`, ordering by pack/pick. Wheel delta = pack at pick
  p+8 vs pick p of the same pack. `pick_maindeck_rate` is a free per-pick "made the deck" signal.
- Game dump `game_data_public.{SET}.PremierDraft.csv.gz` has `draft_id, build_index, main_colors, splash_colors,
  won, opp_colors, num_turns`, per-card `deck_*` counts. → joins to drafts for final colours, deck and outcomes.
- Quick Draft dumps are **not** at `draft_data_public.{SET}.QuickDraft.csv.gz` (403 for SOS/MSH/ECL/TDM/FIN/EOE/DSK).
  Check the 17Lands public datasets page; DraftFM also trains on `TradDraft`.
- Sizes (compressed): SOS 163MB, MSH 108MB, ECL 128MB, FIN 216MB, TDM 148MB, EOE 142MB, DSK 250MB. FRA not published.
- 17Lands terms: show "Data from 17Lands.com" wherever the data is used user-facing.

## 5. DraftFM facts that matter

- Repo `github.com/brianward92/mtga` (Apache-2.0), weights `huggingface.co/brianward92/draftfm`,
  per-pick predictions `huggingface.co/datasets/brianward92/draftfm-frozen-eval`.
- Latest model in-repo: `electron/resources/draftfm/model/v20260809_final_d256/` (`card_encoder.onnx`,
  `scorer.onnx`, ~7MB). Trained on 62 set/format pairs **including SOS and MSH** → not zero-shot on those.
  For research use the paper's held-out checkpoint (held out BRO, FDN, MSH).
- Card features: `mtga/foundation/featurize.py` (391 structured, needs Scryfall) + `textemb.py`
  (bge-small, 384-d, precomputed offline). Per-set `assets.npz` in `electron/resources/draftfm/sets/{SOS,FRA}/`.
- Model: `mtga/foundation/model.py` (`CardEncoder`, `QueryPool`, `DraftFM.forward(table, set_summary, batch)`).
  Context = pack#, pick#, skill bucket, games bucket, format. **No pack history, no seat model.**
- Extending: extra context features / heads are easy (widen `context_mlp`, zero-pad new weights); wider card
  features need padding the first Linear and relaxing width checks in `predict.py`/`export.py`.
- Training: `scripts/train_draftfm.py`, MPS-default (CUDA is a config change), hardcoded `/opt/$USER/dat/mtga`
  paths in `mtga/lands/paths.py`. SOS fine-tune (`init_from`, 4.7M picks, lr 1e-4) took 161s → 70.7% expert top-1.
- Serving: TS wrapper `electron/main/model/draftfm.ts` (`scorePack`, `setLogits`), keyed by card name like DraftRewind.
- Eval: `mtga/foundation/evalproto.py` (top-1/3, log-loss, ECE, draft-clustered bootstrap CIs, expert = WR ≥ .55 & ≥100 games).

## 6. Related work (condensed)

**MTG drafting**
- Ward et al., *AI solutions for drafting in MTG*, CoG 2021 — arXiv 2009.00655. Lists opponent inference as future work.
- Bertram, Fürnkranz, Müller, *Contextual Preference Ranking*, CoG 2021 — arXiv 2105.11864. Siamese triplet, 83.8% top-1 on DraftSim (not comparable to 17Lands).
- Bertram et al., *Generalised Card Representations*, CoG 2024 — arXiv 2407.05879. 55.4% on unseen BRO; text features barely beat meta stats on unseen sets (42.9 vs 42.1).
- Bertram, *UrzaGPT*, 2025 — arXiv 2508.08382. LoRA LLM, 66.2%.
- Ward, *DraftFM*, Aug 2026 — arXiv 2608.19568. 1.6M params, 170M picks, held-out top-1 BRO 50.8 / FDN 60.4 / MSH 56.7; HOB P1P1 grades vs reviewers ρ 0.40–0.64 (best human pair 0.785).
- Rigaux & Kashima, *Predicting Drafted Deck Strength*, CoG 2026 — arXiv 2607.04782. Censored-binomial deck win-rate, in-set ρ≈0.21 vs noise ceiling ≈0.23; cross-set 0.088 → 0.153 with meta → 0.181 after 4-day fine-tune. **Candidate value head / reward.**
- Ramos et al., *Embarrassingly Causal*, 2026 — arXiv 2604.18314. 17Lands win-rates are confounded.
- RyanSaxe/mtg (GitHub) — seq2seq transformer drafter, sample weights by win-rate bucket × rank; Mythic #27 claim, no numbers.

**Other drafting games**
- Vieira et al., *RL approaches for drafting in CCGs*, Entertainment Computing 2023 (LOCM, 2-player, no passing).
- Rezai & Wang, *Closed Drafting… Deep RL*, 2023 — arXiv 2310.20654 (Sushi Go; tests memory of others' hands).
- ZeusAI, *7 Wonders Duel*, 2024 — arXiv 2406.00741.
- Chen et al., *The Art of Drafting*, RecSys 2018 — arXiv 1806.10130 (MOBA, MCTS + win predictor).
- JueWuDraft, IEEE ToG 2021 — arXiv 2012.10171; DraftRec, WWW 2022 — arXiv 2204.12750.

**Belief / opponent modelling**
- Foerster et al., *Bayesian Action Decoder*, ICML 2019 — arXiv 1811.01458 (best template for seat belief).
- Southey et al., *Bayes' Bluff*, UAI 2005 — arXiv 1207.1411; Albrecht & Stone survey, AIJ 2018 — arXiv 1709.08071.
- Budish & Cantillon, AER 2012 — strategic behaviour in real course drafts.
- 17Lands blog, *Do the Bots Send Signals?* — bots signal more readably than humans.

**Reward learning / offline RL / skill-conditioned imitation**
- Christiano et al., NeurIPS 2017 — arXiv 1706.03741; White et al., *Rating-Based RL*, AAAI 2024 — arXiv 2307.16348 (closest to review-score reward).
- Maia (KDD 2020), Maia-2 (NeurIPS 2024, arXiv 2409.20553) — skill-conditioned imitation.
- piKL, ICML 2022 — arXiv 2112.07544 — KL-anchor RL to human-imitation policy.
- AWR (arXiv 1910.00177), CQL (arXiv 2006.04779), Decision Transformer (arXiv 2106.01345).

**Novelty verdict:** no published neighbour-seat belief for MTG draft; no RL from expert-review reward for any
drafting game; no full 8-seat pass-the-pack RL against human-like seats. Card semantics (text/features) is crowded —
build on it, don't claim it.

## 7. User's prior assets

- CardGuru (`~/Documents/CardGuru*`): Forge-script ability graphs (`data/dataset.jsonl.gz`), Scryfall attribute
  store (`data/cards.sqlite`), synergy/role detectors (`recommend.py:detect_hooks`, `deck.py:detect_roles`),
  opponent-archetype classifier (`believe.py`). Pure Python stdlib, no learned embeddings, no RL.
- Graph coverage of DraftRewind signal-map cards: SOS 341/341, MSH 334/334, ECL 288/288, DSK 281/281,
  **FRA 41/290** (Forge pin `670429bf` predates FRA).
- Own finding to respect: oracle-text TF-IDF (MAP 0.243) beat the graph re-ranker (0.125) in `similar.py`
  → graph features must win an ablation before being claimed.

## 8. Code location & serving

- Model code: separate Python repo forked from `brianward92/mtga` (not inside DraftRewind).
- DraftRewind consumes exported ONNX via `onnxruntime-node` in the Express server; predictions precomputed once
  at review creation (42 picks, sub-ms each), stored with a model-version tag. No live Python service.
- UI must show "Data from 17Lands.com" and DraftFM's Apache-2.0 notice.
