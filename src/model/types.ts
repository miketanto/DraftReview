import type { ArchetypeId, Color } from '../shared/types';

// --- Phase 1: Signal Velocity ---

export interface VelocityMetrics {
  windowedScores: Record<ArchetypeId, number>;
  velocity: Record<ArchetypeId, number>;
  directionSignals: Record<ArchetypeId, { left: number; right: number }>;
  dualConfirmed: ArchetypeId[];
  trending: Array<{
    archetype: ArchetypeId;
    velocity: number;
    direction: 'up' | 'down' | 'flat';
  }>;
}

// --- Phase 2: Pool Evaluator ---

export interface PoolState {
  pickCount: number;
  colorCommitment: Record<Color, number>;
  normalizedColorCommitment: Record<Color, number>;
  primaryColors: Color[];
  curve: Record<number, number>;
  curveGaps: Array<{ cmc: number; have: number; ideal: number; deficit: number }>;
  roles: {
    creatures: number;
    removal: number;
    cardDraw: number;
    fixing: number;
    other: number;
  };
  roleDeficits: Array<{ role: string; have: number; target: number; deficit: number }>;
  inferredArchetype: ArchetypeId | null;
}

export interface CardPoolFit {
  cardName: string;
  poolFitScore: number;
  colorFit: number;
  curveFit: number;
  roleFit: number;
  diminishingReturn: number;
  explanation: string;
}

// --- Phase 3: Pick Suggester ---

export interface PickSuggestion {
  cardName: string;
  rank: number;
  totalScore: number;
  components: {
    archetypeGihwr: number;
    signalVelocity: number;
    poolFit: number;
    optionality: number;
    pivotCost: number;
  };
  explanation: string;
  evaluatedArchetype: ArchetypeId;
}

// --- Phase 4: Bayesian Archetype Inference ---

export interface ArchetypePosterior {
  probabilities: Record<ArchetypeId, number>;
  entropy: number;
  mapArchetype: ArchetypeId;
  confidence: number;
  pivotCandidate: ArchetypeId | null;
}
