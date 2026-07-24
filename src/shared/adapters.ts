import type { Card, Draft, DraftPick } from './types';
import type { RawDraftCard, RawDraftPick } from '../data/types';

/**
 * The single boundary between 17Lands raw draft-log shapes (snake_case,
 * 0-based pack/pick numbers) and the app's shared shapes (camelCase,
 * 1-based). Convert here and nowhere else.
 */
export function rawCardToCard(raw: RawDraftCard): Card {
  return {
    name: raw.name,
    imageUrl: raw.image_url,
    urlBack: raw.url_back,
    manaCost: raw.mana_cost,
    types: raw.types,
    color: raw.color || [],
    rarity: '',
    layout: raw.layout,
  };
}

export function rawPickToDraftPick(raw: RawDraftPick): DraftPick {
  return {
    packNumber: raw.pack_number + 1,
    pickNumber: raw.pick_number + 1,
    pickedCard: rawCardToCard(raw.pick),
    availableCards: raw.available.map(rawCardToCard),
    knownMissing: (raw.known_missing ?? []).map(rawCardToCard),
  };
}

export function rawPicksToDraft(
  draftId: string,
  rawPicks: RawDraftPick[]
): Draft {
  return {
    draftId,
    picks: rawPicks.map(rawPickToDraftPick),
  };
}
