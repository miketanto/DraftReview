export type Color = 'W' | 'U' | 'B' | 'R' | 'G';
export type ColorCombo = string;

// Archetype ids are open strings so the engine can serve any set.
// SOS uses named college archetypes; generic sets use the 10 guild ids.
export type ArchetypeId = string;

export interface Archetype {
  id: ArchetypeId;
  name: string;
  colors: ColorCombo;
  mechanic: string;
  playstyle: string;
  tier: 1 | 2 | 3;
}

export interface Card {
  name: string;
  imageUrl: string;
  urlBack: string;
  manaCost: string;
  types: string[];
  color: string[];
  rarity: string;
  layout: string;
  mtgaId?: number;
}

export interface DraftPick {
  packNumber: number;
  pickNumber: number;
  pickedCard: Card;
  availableCards: Card[];
  knownMissing: Card[];
}

export interface Draft {
  draftId: string;
  picks: DraftPick[];
}
