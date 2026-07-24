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
}

export interface PickAnnotation {
  packNumber: number;
  pickNumber: number;
  note: string;
  cardNotes: Record<string, string>;
  cardRanks: Record<string, number>;
}

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
