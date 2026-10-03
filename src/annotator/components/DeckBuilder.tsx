import { useMemo, useState } from 'react';
import { T, label } from '../../shared/theme';
import { useSignals } from '../SignalContext';
import type { RawDraftCard } from '../../data/types';
import type { DeckVersion } from '../types';
import {
  COLORS, BASIC_NAMES, cmcOf, isLand, sideboardOf, splitBasics, suggestDecks, toArenaText,
  type ManaColor,
} from '../deck';

interface DeckBuilderProps {
  pool: RawDraftCard[];
  decks: DeckVersion[] | undefined;
  isEditable: boolean;
  onChange: (decks: DeckVersion[]) => void;
}

const MANA_DOT: Record<ManaColor, string> = { W: T.mana.W, U: T.mana.U, B: T.mana.B, R: T.mana.R, G: T.mana.G };

/**
 * Sealed-style deck tech: several named 40-card versions of the same pool.
 * Until the owner edits anything, auto-built versions are shown (unsaved);
 * the first edit persists the whole list into summary.decks.
 */
export function DeckBuilder({ pool, decks, isEditable, onChange }: DeckBuilderProps) {
  const { signalMap, config } = useSignals();
  const suggested = useMemo(() => suggestDecks(pool, signalMap, config), [pool, signalMap, config]);
  const versions = decks?.length ? decks : suggested;
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const deck = versions[Math.min(active, versions.length - 1)];

  const byName = useMemo(() => new Map(pool.map((c) => [c.name, c])), [pool]);
  const mainCards = useMemo(
    () => (deck?.main ?? []).map((n) => byName.get(n)).filter((c): c is RawDraftCard => !!c),
    [deck, byName],
  );
  const side = useMemo(() => sideboardOf(pool, deck?.main ?? []), [pool, deck]);

  const save = (next: DeckVersion[]) => isEditable && onChange(next);
  const update = (patch: Partial<DeckVersion>) =>
    save(versions.map((d) => (d.id === deck.id ? { ...d, ...patch } : d)));

  const moveToSide = (name: string) => {
    const i = deck.main.indexOf(name);
    if (i >= 0) update({ main: [...deck.main.slice(0, i), ...deck.main.slice(i + 1)] });
  };
  const moveToMain = (name: string) => update({ main: [...deck.main, name] });
  const setBasic = (col: ManaColor, n: number) => update({ basics: { ...deck.basics, [col]: Math.max(0, n) } });
  const addVersion = (base?: DeckVersion) => {
    const id = crypto.randomUUID();
    const next = base
      ? { ...base, id, name: `${base.name} copy` }
      : { id, name: `Version ${versions.length + 1}`, main: [], basics: {} };
    save([...versions, next]);
    setActive(versions.length);
  };
  const removeVersion = () => {
    save(versions.filter((d) => d.id !== deck.id));
    setActive(0);
  };

  const copyArena = () => {
    navigator.clipboard.writeText(toArenaText(deck, pool)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }, () => window.prompt('Copy this deck list:', toArenaText(deck, pool)));
  };

  const basicsTotal = Object.values(deck?.basics ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const nonbasicLands = mainCards.filter(isLand).length;
  const total = mainCards.length + basicsTotal;
  const creatures = mainCards.filter((c) => c.types.some((t) => t.includes('Creature'))).length;

  const btn = (primary = false): React.CSSProperties => ({
    minHeight: 36,
    padding: '6px 10px',
    backgroundColor: primary ? T.sel : T.bg2,
    color: primary ? T.bg0 : T.ink1,
    border: `1px solid ${primary ? T.sel : T.line1}`,
    borderRadius: T.radius.m,
    cursor: 'pointer',
    fontFamily: T.mono,
    fontSize: T.fs.t3,
    fontWeight: 700,
  });

  if (!deck) {
    return (
      <Panel>
        <div style={{ ...label, color: T.ink1 }}>Deck builder</div>
        <div style={{ color: T.ink2, fontSize: T.fs.t3, marginTop: 8 }}>No playable cards in this pool.</div>
      </Panel>
    );
  }

  return (
    <Panel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ ...label, color: T.ink1 }}>Deck builder</div>
        {!decks?.length && (
          <span style={{ fontSize: T.fs.t1, color: T.ink2 }}>auto-built from your pool — edit to save</span>
        )}
      </div>

      {/* Version tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {versions.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActive(i)}
            style={{
              ...btn(),
              color: d.id === deck.id ? T.ink0 : T.ink2,
              borderColor: d.id === deck.id ? T.sel : T.line1,
              boxShadow: d.id === deck.id ? T.selGlow : 'none',
            }}
          >
            {d.name}
          </button>
        ))}
        {isEditable && (
          <>
            <button onClick={() => addVersion(deck)} style={btn()}>Duplicate</button>
            <button onClick={() => addVersion()} style={btn()}>+ Empty</button>
          </>
        )}
      </div>

      {/* Stats + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {isEditable ? (
          <input
            value={deck.name}
            onChange={(e) => update({ name: e.target.value })}
            aria-label="Deck name"
            style={{
              minHeight: 36, padding: '0 8px', width: 180, backgroundColor: T.bg3, color: T.ink0,
              border: `1px solid ${T.line1}`, borderRadius: T.radius.m, fontFamily: T.mono, fontSize: T.fs.t3,
            }}
          />
        ) : (
          <div style={{ color: T.ink0, fontWeight: 700 }}>{deck.name}</div>
        )}
        <span style={{ color: total === 40 ? T.picked : T.amber, fontWeight: 700, fontSize: T.fs.t4 }}>
          {total}/40
        </span>
        <span style={{ color: T.ink2, fontSize: T.fs.t2 }}>
          {mainCards.length - nonbasicLands} spells · {creatures} creatures · {basicsTotal + nonbasicLands} lands
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {isEditable && versions.length > 1 && (
            <button onClick={removeVersion} style={{ ...btn(), color: T.danger }}>Delete</button>
          )}
          <button onClick={copyArena} style={btn(true)}>
            {copied ? 'Copied ✓' : 'Copy for Arena'}
          </button>
        </div>
      </div>

      {/* Basics */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        {COLORS.map((col) => (
          <div
            key={col}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px',
              border: `1px solid ${T.line1}`, borderRadius: T.radius.m, backgroundColor: T.bg2,
            }}
          >
            <span title={BASIC_NAMES[col]} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: MANA_DOT[col] }} />
            {isEditable && (
              <button onClick={() => setBasic(col, (deck.basics[col] ?? 0) - 1)} style={stepBtn} aria-label={`Remove ${BASIC_NAMES[col]}`}>−</button>
            )}
            <span style={{ minWidth: 16, textAlign: 'center', color: T.ink0, fontSize: T.fs.t3 }}>{deck.basics[col] ?? 0}</span>
            {isEditable && (
              <button onClick={() => setBasic(col, (deck.basics[col] ?? 0) + 1)} style={stepBtn} aria-label={`Add ${BASIC_NAMES[col]}`}>+</button>
            )}
          </div>
        ))}
        {isEditable && (
          <button
            onClick={() => update({ basics: splitBasics(mainCards.filter((c) => !isLand(c)), 17 - nonbasicLands) })}
            style={btn()}
          >
            Auto lands
          </button>
        )}
      </div>

      <CardRows
        title={`Main deck · ${mainCards.length}`}
        cards={mainCards}
        hint={isEditable ? 'tap a card to sideboard it' : undefined}
        onTap={isEditable ? moveToSide : undefined}
      />
      <CardRows
        title={`Sideboard · ${side.length}`}
        cards={side}
        dim
        hint={isEditable ? 'tap a card to add it' : undefined}
        onTap={isEditable ? moveToMain : undefined}
      />
    </Panel>
  );
}

const stepBtn: React.CSSProperties = {
  width: 32, height: 32, padding: 0, backgroundColor: T.bg3, color: T.ink1,
  border: `1px solid ${T.line1}`, borderRadius: T.radius.m, cursor: 'pointer', fontFamily: T.mono, fontSize: T.fs.t4,
};

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 12, fontFamily: T.mono, backgroundColor: T.bg1,
        border: `1px solid ${T.line0}`, borderRadius: T.radius.l,
      }}
    >
      {children}
    </div>
  );
}

/** Cards grouped into mana-value rows (lands last), wrapping thumbnails */
function CardRows({
  title, cards, onTap, hint, dim,
}: {
  title: string;
  cards: RawDraftCard[];
  onTap?: (name: string) => void;
  hint?: string;
  dim?: boolean;
}) {
  const rows = new Map<string, RawDraftCard[]>();
  for (const c of [...cards].sort((a, b) => cmcOf(a) - cmcOf(b) || a.name.localeCompare(b.name))) {
    const key = isLand(c) ? 'Land' : cmcOf(c) >= 6 ? '6+' : String(cmcOf(c));
    rows.set(key, [...(rows.get(key) ?? []), c]);
  }
  const order = ['0', '1', '2', '3', '4', '5', '6+', 'Land'].filter((k) => rows.has(k));

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
        <div style={label}>{title}</div>
        {hint && <div style={{ fontSize: T.fs.t1, color: T.ink3 }}>{hint}</div>}
      </div>
      {order.map((k) => (
        <div key={k} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 6 }}>
          <div style={{ width: 28, flexShrink: 0, paddingTop: 4, color: T.ink2, fontSize: T.fs.t2, textAlign: 'right' }}>
            {k}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minWidth: 0 }}>
            {rows.get(k)!.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                onClick={onTap ? () => onTap(c.name) : undefined}
                title={c.name}
                style={{
                  padding: 0, border: 'none', background: 'none', borderRadius: T.radius.m,
                  cursor: onTap ? 'pointer' : 'default', opacity: dim ? 0.6 : 1, lineHeight: 0,
                }}
              >
                <img
                  src={c.image_url}
                  alt={c.name}
                  loading="lazy"
                  style={{ width: 84, borderRadius: T.radius.m, display: 'block' }}
                />
              </button>
            ))}
          </div>
        </div>
      ))}
      {cards.length === 0 && <div style={{ color: T.ink3, fontSize: T.fs.t2 }}>Empty</div>}
    </div>
  );
}
