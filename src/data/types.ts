export interface RawDraftCard {
  image_url: string;
  url_back: string;
  name: string;
  types: string[];
  mana_cost: string;
  layout: string;
  color?: string[];
}

export interface RawDraftPick {
  pack_number: number;
  pick_number: number;
  pick: RawDraftCard;
  available: RawDraftCard[];
  known_missing: RawDraftCard[];
  section_cards: RawDraftCard[];
  suggested_pick: RawDraftCard | null;
}

export interface RawCardRating {
  name: string;
  color: string;
  rarity: string;
  mtga_id: number;
  avg_seen: number;
  avg_pick: number;
  ever_drawn_win_rate: number;
  opening_hand_win_rate: number;
  drawn_win_rate: number;
  never_drawn_win_rate: number;
  game_count: number;
  ever_drawn_game_count: number;
  url: string;
}

export interface RawDailyStat {
  date: string;
  game_count: number;
  win_rate: number;
  opening_hand_game_count: number;
  opening_hand_win_rate: number;
  drawn_game_count: number;
  drawn_win_rate: number;
  ever_drawn_game_count: number;
  ever_drawn_win_rate: number;
  never_drawn_game_count: number;
  never_drawn_win_rate: number;
}

export interface RawCardPerformance {
  name: string;
  mtga_id: number;
  color: string[];
  rarity: string;
  url: string;
  url_back: string;
  types: string[];
  layout: string;
  performances: Record<string, RawDailyStat[]>;
  draft_stats: Array<{
    date: string;
    total_times_seen: number;
    avg_seen_position: number;
    total_times_picked: number;
    avg_pick_position: number;
  }>;
}

export interface CachedCardData {
  name: string;
  mtgaId: number;
  color: string;
  rarity: string;
  types: string[];
  alsa: number;
  ata: number;
  overallGihwr: number;
  gameCount: number;
  everDrawnGameCount: number;
  archetypeStats: Record<
    string,
    {
      gameCount: number;
      everDrawnGameCount: number;
      gihwr: number;
    }
  >;
}
