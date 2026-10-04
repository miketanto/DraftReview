# Handoff prompt — GPU machine

Copy everything in the block below into a new Claude Code session on the GPU machine.

```
I'm continuing research on a learned MTG draft-pick model for my app DraftRewind, on a new machine with a GPU.
Treat me as a peer researcher. Design is already agreed; this session starts Stage 0 of the plan.

1. Clone my app repo and read the design docs first:
   git clone https://github.com/miketanto/DraftReview.git && cd DraftReview && git checkout research/drafter-model
   Read docs/drafter-model/DESIGN.md, docs/drafter-model/PLAN.md, and CLAUDE.md before doing anything.

2. Context in one paragraph: DraftRewind (React/TS) reviews 17Lands Arena drafts pick by pick. We will NOT
   re-implement pick imitation: DraftFM (github.com/brianward92/mtga, Apache-2.0, weights on
   huggingface.co/brianward92/draftfm) is the frozen base. Our contribution is a signal model on top:
   a causal history encoder over the pick sequence, a seat-belief bottleneck (physical seats ±1/±2 × colours)
   trained with self-supervised wheel-reconstruction and future-supply losses, and a residual logit
   logit = s_base (DraftFM) + s_sig (history). Later: value head (censored-binomial deck win-rate),
   AWR/KL-anchored offline improvement, reviewer-label preference losses, simulated-pod RL.

3. Model code lives in a SEPARATE repo, not inside DraftReview. Create it by forking/cloning
   brianward92/mtga into ~/draftrewind-model (or similar). DraftReview later consumes exported ONNX only.

4. Do Stage 0 from PLAN.md, in order, and stop at the gate:
   a. Check GPU (nvidia-smi / torch.cuda.is_available()). DraftFM defaults to Apple MPS; switch device to cuda.
   b. Patch hardcoded data paths in mtga/lands/paths.py (/opt/$USER/dat/mtga) to a local data dir.
   c. Download 17Lands dumps (draft + game data) for SOS, MSH, ECL, DSK:
      https://17lands-public.s3.amazonaws.com/analysis_data/draft_data/draft_data_public.{SET}.PremierDraft.csv.gz
      https://17lands-public.s3.amazonaws.com/analysis_data/game_data/game_data_public.{SET}.PremierDraft.csv.gz
      (check 17Lands usage terms; user-facing use must credit "Data from 17Lands.com")
   d. Run DraftFM's ETL (run_17lands_etl.py → build_card_features.py → build_foundation_data.py).
      The bge-small text embedding step runs in its own venv (scripts/setup_embed.sh).
   e. Download the paper's HELD-OUT checkpoint (held out BRO/FDN/MSH) from HF — not the final model,
      which trained on SOS and MSH.
   f. GATE: reproduce MSH held-out top-1 ≈ 56.7% with scripts/eval_draftfm.py / mtga/foundation/evalproto.py.
      Report the numbers to me before starting Stage 1.

5. Verified data facts (2026-10-04): draft dump rows have draft_id + 0-indexed pack_number/pick_number
   (history is reconstructable by grouping on draft_id); also pick_maindeck_rate. Game dump has draft_id,
   main_colors, splash_colors, won, per-card deck_* counts. Quick Draft dumps are NOT at the
   ...{SET}.QuickDraft.csv.gz path — find the right location on 17lands.com/public_datasets if needed.

Working style: ask before big downloads (>1 GB total) or long training runs; keep a running RESULTS.md in the
model repo with every eval number, config, and seed; no model code beyond Stage 0 until I confirm the gate.
```
