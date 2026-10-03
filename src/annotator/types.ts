import type { RawDraftPick } from '../data/types';

export interface DraftReview {
  id: string;
  editToken?: string;
  draftId: string;
  /** 17Lands expansion code; null for reviews created before multi-set support */
  expansion?: string | null;
  draftLog: RawDraftPick[];
  annotations: PickAnnotation[];
  timelines: Timeline[];
  summary: DraftSummary;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSummary {
  rating: number | null;
  closingThoughts: string;
  improvements: string;
  /** Sealed-style deck versions built from the pool; absent on older reviews */
  decks?: DeckVersion[];
  /** End-of-pack reflections, indexed by 0-based pack number */
  checkpoints?: PackCheckpointNote[];
}

export interface PackCheckpointNote {
  thinking: string;
  nextPack: string;
}

export interface DeckVersion {
  id: string;
  name: string;
  /** Main-deck card names (repeats allowed); everything else in the pool is sideboard */
  main: string[];
  /** Basic land counts by color letter */
  basics: Partial<Record<'W' | 'U' | 'B' | 'R' | 'G', number>>;
}

export interface PickAnnotation {
  packNumber: number;
  pickNumber: number;
  note: string;
  cardNotes: Record<string, string>;
  cardRanks: Record<string, number>;
  /** Quick-review verdict on the actual pick; the comment lives in `note` */
  verdict?: PickVerdict;
}

export type PickVerdict = 'good' | 'maybe' | 'no';

export interface Timeline {
  id: string;
  name: string;
  divergences: Divergence[];
}

export interface Divergence {
  packNumber: number;
  pickNumber: number;
  altPick: string;
}

// --- Collaborative Annotations ---

export interface CollabUser {
  id: string;
  name: string;
  color: string;
}

export interface AnnotationLayer {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userColor: string;
  annotations: PickAnnotation[];
  updatedAt: string;
}

export type ClientMessage =
  | { type: 'join'; reviewId: string; user: CollabUser }
  | { type: 'leave' }
  | { type: 'annotation-update'; layer: AnnotationLayer }
  | { type: 'cursor-move'; packNumber: number; pickNumber: number };

export type ServerMessage =
  | { type: 'presence'; users: CollabUser[] }
  | { type: 'layer-update'; layer: AnnotationLayer }
  | { type: 'cursor'; userId: string; packNumber: number; pickNumber: number }
  | { type: 'layers-snapshot'; layers: AnnotationLayer[] };
