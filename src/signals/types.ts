import type { ArchetypeId } from '../shared/types';

export type SignalTier = 'staple' | 'strong' | 'moderate' | 'weak' | 'fixing';

export interface CardSignalEntry {
  cardName: string;
  primaryArchetype: ArchetypeId | null;
  secondaryArchetype: ArchetypeId | null;
  signalTier: SignalTier;
  isConvergeSignal: boolean;
  isFixing: boolean;
  alsa: number;
  /** Average taken at — absent in maps built before multi-set support */
  ata?: number;
  overallGihwr: number;
  archetypeGihwr: Partial<Record<ArchetypeId, number>>;
  gihwrDelta: number;
}

export type SignalMap = Record<string, CardSignalEntry>;

export interface PickSignal {
  cardName: string;
  signalStrength: number;
  archetype: ArchetypeId;
  tier: SignalTier;
  isWheel: boolean;
  explanation: string;
}

export interface ArchetypeScore {
  archetypeId: ArchetypeId;
  cumulativeSignal: number;
  normalizedScore: number;
  pickCount: number;
}

export interface PickAnalysis {
  packNumber: number;
  pickNumber: number;
  cardSignals: PickSignal[];
  pickedCardSignal: PickSignal | null;
  archetypeScores: ArchetypeScore[];
  wheelDetections: string[];
  convergeViability: number;
}

export interface DraftAnalysis {
  picks: PickAnalysis[];
  summary: DraftSummary;
}

export interface DraftSummary {
  mostOpenArchetype: ArchetypeId;
  userArchetype: ArchetypeId;
  pivotPoints: PivotPoint[];
  missedSignals: MissedSignal[];
  finalScores: ArchetypeScore[];
  signalTimeline: Record<ArchetypeId, number[]>;
}

export interface PivotPoint {
  packNumber: number;
  pickNumber: number;
  fromArchetype: ArchetypeId;
  toArchetype: ArchetypeId;
  reason: string;
}

export interface MissedSignal {
  packNumber: number;
  pickNumber: number;
  cardName: string;
  signalStrength: number;
  archetype: ArchetypeId;
  explanation: string;
}
