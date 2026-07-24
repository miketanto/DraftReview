import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useReview } from '../hooks/useReview';
import { useTimeline } from '../hooks/useTimeline';
import { useCollabUser } from '../hooks/useCollabUser';
import { useCollabSocket } from '../hooks/useCollabSocket';
import { AnnotationPanel } from '../components/AnnotationPanel';
import { SaveIndicator } from '../components/SaveIndicator';
import { TimelineSwitcher } from '../components/TimelineSwitcher';
import { PoolComparison } from '../components/PoolComparison';
import { PresenceBar } from '../components/PresenceBar';
import { LayerToggle } from '../components/LayerToggle';
import { UserIdentityModal } from '../components/UserIdentityModal';
import { SummaryTab } from '../components/SummaryTab';
import { CardHoverCard } from '../components/CardHoverCard';
import { PickScrubber } from '../components/PickScrubber';
import { GlossaryPopover } from '../components/GlossaryPopover';
import { Toast } from '../components/Toast';
import type { ToastState } from '../components/Toast';
import { SignalBadge } from '../../ui/components/SignalBadge';
import { SignalProvider, useSignals } from '../SignalContext';
import { ARCHETYPE_COLORS } from '../../shared/constants';
import { T, label } from '../../shared/theme';
import type { Divergence, PickAnnotation } from '../types';
import type { RawDraftCard } from '../../data/types';

export function ReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const reviewState = useReview(id!);

  if (reviewState.loading) {
    return <div style={{ color: T.ink2, padding: 12 }}>Loading review…</div>;
  }
  if (reviewState.error || !reviewState.review) {
    return (
      <div style={{ color: T.danger, padding: 12 }}>
        {reviewState.error ?? 'Review not found'}
      </div>
    );
  }

  return (
    <SignalProvider review={reviewState.review}>
      <WorkspaceInner id={id!} reviewState={reviewState} />
    </SignalProvider>
  );
}

function WorkspaceInner({
  id,
  reviewState,
}: {
  id: string;
  reviewState: ReturnType<typeof useReview>;
}) {
  const {
    review,
    isEditable,
    saveStatus,
    setTimelines,
    setSummary,
    updatePickNote,
    updateCardNote,
    updateCardRank,
  } = reviewState;

  const signals = useSignals();
  const { user: collabUser, saveUser } = useCollabUser();
  const {
    remoteLayers,
    myLayerAnnotations,
    presence,
    cursors,
    connected,
    sendAnnotationUpdate,
    sendCursorMove,
  } = useCollabSocket(id, collabUser);

  const [pickIndex, setPickIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [collabAnnotations, setCollabAnnotations] = useState<PickAnnotation[]>([]);
  const [joinPrompt, setJoinPrompt] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((t: ToastState) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  // Owners get a silent default identity — never ambush the creator with
  // a modal on their own review.
  useEffect(() => {
    if (isEditable && !collabUser) saveUser('Creator', T.picked);
  }, [isEditable, collabUser, saveUser]);

  // Card hover-stats popover: 150ms open intent, 60ms close grace,
  // instant retarget when already open
  const [hoverCard, setHoverCard] = useState<{ card: RawDraftCard; rect: DOMRect } | null>(null);
  const hoverOpenRef = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const handleCardEnter = useCallback((card: RawDraftCard, el: HTMLElement) => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    const rect = el.getBoundingClientRect();
    if (hoverOpenRef.current) {
      setHoverCard({ card, rect });
    } else {
      openTimer.current = window.setTimeout(() => {
        hoverOpenRef.current = true;
        setHoverCard({ card, rect });
      }, 150);
    }
  }, []);

  const handleCardLeave = useCallback(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    closeTimer.current = window.setTimeout(() => {
      hoverOpenRef.current = false;
      setHoverCard(null);
    }, 60);
  }, []);

  const dismissHover = useCallback(() => {
    if (openTimer.current) { window.clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    hoverOpenRef.current = false;
    setHoverCard(null);
  }, []);

  const activeTimeline = (review && activeTimelineId)
    ? review.timelines.find((t) => t.id === activeTimelineId) ?? null
    : null;

  const { actualPool, alternatePool } = useTimeline(
    review?.draftLog ?? [],
    activeTimeline,
    pickIndex + 1,
  );

  const picks = useMemo(() => review?.draftLog ?? [], [review?.draftLog]);
  const pick = picks[pickIndex] ?? null;

  const handleAltPick = useCallback((cardName: string) => {
    if (!review || !pick || !activeTimeline || !isEditable) return;
    const packNumber = pick.pack_number;
    const pickNumber = pick.pick_number;
    const prevTimelines = review.timelines;

    const updatedTimelines = review.timelines.map((t) => {
      if (t.id !== activeTimelineId) return t;
      const existingIdx = t.divergences.findIndex(
        (d) => d.packNumber === packNumber && d.pickNumber === pickNumber,
      );
      let divergences: Divergence[];
      if (cardName === pick.pick.name) {
        divergences = t.divergences.filter(
          (d) => !(d.packNumber === packNumber && d.pickNumber === pickNumber),
        );
      } else if (existingIdx >= 0) {
        divergences = [...t.divergences];
        divergences[existingIdx] = { packNumber, pickNumber, altPick: cardName };
      } else {
        divergences = [...t.divergences, { packNumber, pickNumber, altPick: cardName }];
      }
      return { ...t, divergences };
    });
    setTimelines(updatedTimelines);

    if (cardName !== pick.pick.name) {
      showToast({
        message: `ALT SET: ${cardName}`,
        actionLabel: 'UNDO',
        onAction: () => {
          setTimelines(prevTimelines);
          setToast(null);
        },
      });
    }
  }, [activeTimeline, activeTimelineId, isEditable, pick, review, setTimelines, showToast]);

  // Load saved collab annotations from server
  useEffect(() => {
    if (myLayerAnnotations && collabAnnotations.length === 0) {
      setCollabAnnotations(myLayerAnnotations);
    }
  }, [myLayerAnnotations]); // eslint-disable-line react-hooks/exhaustive-deps

  const canAnnotate = isEditable || !!collabUser;
  const myAnnotations = useMemo(
    () => (isEditable ? review?.annotations ?? [] : collabAnnotations),
    [isEditable, review?.annotations, collabAnnotations]
  );

  const broadcastCollabAnnotations = useCallback((annotations: PickAnnotation[]) => {
    sendAnnotationUpdate(annotations);
  }, [sendAnnotationUpdate]);

  const broadcastMyAnnotations = useCallback(() => {
    if (isEditable && review) {
      setTimeout(() => sendAnnotationUpdate(review.annotations), 100);
    }
  }, [isEditable, review, sendAnnotationUpdate]);

  const requireIdentity = useCallback((): boolean => {
    if (isEditable || collabUser) return false;
    setJoinPrompt(true);
    return true;
  }, [isEditable, collabUser]);

  const handlePickNoteChange = useCallback((note: string) => {
    if (!pick || requireIdentity()) return;
    if (isEditable) {
      updatePickNote(pick.pack_number, pick.pick_number, note);
      broadcastMyAnnotations();
    } else {
      const updated = upsertCollab(collabAnnotations, pick.pack_number, pick.pick_number, (a) => ({ ...a, note }));
      setCollabAnnotations(updated);
      broadcastCollabAnnotations(updated);
    }
  }, [pick, isEditable, updatePickNote, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations, requireIdentity]);

  const handleCardNoteChange = useCallback((cardName: string, note: string) => {
    if (!pick || requireIdentity()) return;
    if (isEditable) {
      updateCardNote(pick.pack_number, pick.pick_number, cardName, note);
      broadcastMyAnnotations();
    } else {
      const updated = upsertCollab(collabAnnotations, pick.pack_number, pick.pick_number, (a) => ({
        ...a, cardNotes: { ...a.cardNotes, [cardName]: note },
      }));
      setCollabAnnotations(updated);
      broadcastCollabAnnotations(updated);
    }
  }, [pick, isEditable, updateCardNote, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations, requireIdentity]);

  const handleCardRankChange = useCallback((cardName: string, rank: number | null) => {
    if (!pick || requireIdentity()) return;
    if (isEditable) {
      updateCardRank(pick.pack_number, pick.pick_number, cardName, rank);
      broadcastMyAnnotations();
    } else {
      const updated = upsertCollab(collabAnnotations, pick.pack_number, pick.pick_number, (a) => {
        const cardRanks = { ...a.cardRanks };
        if (rank === null) delete cardRanks[cardName];
        else cardRanks[cardName] = rank;
        return { ...a, cardRanks };
      });
      setCollabAnnotations(updated);
      broadcastCollabAnnotations(updated);
    }
  }, [pick, isEditable, updateCardRank, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations, requireIdentity]);

  // Broadcast cursor position when pick changes
  useEffect(() => {
    if (pick) sendCursorMove(pick.pack_number, pick.pick_number);
  }, [pickIndex, pick, sendCursorMove]);

  // Auto-show new remote layers
  useEffect(() => {
    setVisibleLayerIds((prev) => {
      const next = new Set(prev);
      for (const l of remoteLayers) next.add(l.id);
      return next;
    });
  }, [remoteLayers]);

  const toggleLayer = useCallback((layerId: string) => {
    setVisibleLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  const jumpTo = useCallback((i: number) => {
    setPickIndex(i);
    setSelectedCard(null);
    dismissHover();
  }, [dismissHover]);

  // Last viewed pick — so the PICKS tab returns where you left off
  const lastPickIndexRef = useRef(0);
  useEffect(() => {
    if (pickIndex < picks.length) lastPickIndexRef.current = pickIndex;
  }, [pickIndex, picks.length]);

  // Keyboard: arrows navigate, Esc backs out, ? opens the glossary
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      if (e.key === 'ArrowLeft' && pickIndex > 0) {
        e.preventDefault();
        jumpTo(pickIndex - 1);
      } else if (e.key === 'ArrowRight' && pickIndex < picks.length) {
        e.preventDefault();
        jumpTo(pickIndex + 1);
      } else if (e.key === 'Escape') {
        if (glossaryOpen) setGlossaryOpen(false);
        else if (activeTimelineId) setActiveTimelineId(null);
        else setSelectedCard(null);
      } else if (e.key === '?') {
        setGlossaryOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickIndex, picks.length, jumpTo, glossaryOpen, activeTimelineId]);

  const copyShareLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/review/${review!.id}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [review]);

  // --- Scrubber data (set-aware: colors only when signals are ready) ---
  const cellColors = useMemo(() => {
    return picks.map((p) => {
      if (signals.status !== 'ready' || !signals.signalMap) return null;
      const arch = signals.signalMap[p.pick.name]?.primaryArchetype;
      return arch ? ARCHETYPE_COLORS[arch] ?? null : null;
    });
  }, [picks, signals.status, signals.signalMap]);

  const visibleRemoteLayers = remoteLayers.filter((l) => visibleLayerIds.has(l.id));

  const noteTicks = useMemo(() => {
    const ticks: Record<number, string[]> = {};
    const add = (packNumber: number, pickNumber: number, color: string) => {
      const idx = picks.findIndex(
        (p) => p.pack_number === packNumber && p.pick_number === pickNumber,
      );
      if (idx < 0) return;
      (ticks[idx] ??= []).push(color);
    };
    const hasContent = (a: PickAnnotation) =>
      !!a.note || Object.keys(a.cardNotes).length > 0;

    for (const a of myAnnotations) if (hasContent(a)) add(a.packNumber, a.pickNumber, T.amber);
    if (!isEditable && review) {
      for (const a of review.annotations) if (hasContent(a)) add(a.packNumber, a.pickNumber, T.picked);
    }
    for (const l of visibleRemoteLayers) {
      for (const a of l.annotations) if (hasContent(a)) add(a.packNumber, a.pickNumber, l.userColor);
    }
    return ticks;
  }, [picks, myAnnotations, isEditable, review, visibleRemoteLayers]);

  const scrubberCursors = useMemo(() => {
    return cursors
      .filter((c) => c.userId !== collabUser?.id)
      .map((c) => {
        const idx = picks.findIndex(
          (p) => p.pack_number === c.packNumber && p.pick_number === c.pickNumber,
        );
        const u = presence.find((p) => p.id === c.userId);
        return idx >= 0 && u ? { index: idx, color: u.color, name: u.name } : null;
      })
      .filter((x): x is { index: number; color: string; name: string } => x !== null);
  }, [cursors, picks, presence, collabUser]);

  const packBreaks = useMemo(() => {
    const breaks: number[] = [];
    for (let i = 0; i < picks.length - 1; i++) {
      if (picks[i + 1].pack_number !== picks[i].pack_number) breaks.push(i);
    }
    return breaks;
  }, [picks]);

  const showSummary = pickIndex >= picks.length;

  const annotation = pick ? myAnnotations.find(
    (a) => a.packNumber === pick.pack_number && a.pickNumber === pick.pick_number,
  ) : undefined;

  const creatorAnnotation = (!isEditable && review && pick)
    ? review.annotations.find(
        (a) => a.packNumber === pick.pack_number && a.pickNumber === pick.pick_number,
      )
    : undefined;

  const currentDivergence = pick ? activeTimeline?.divergences.find(
    (d) => d.packNumber === pick.pack_number && d.pickNumber === pick.pick_number,
  ) : undefined;

  const altMode = !!(activeTimeline && isEditable);
  const pa = signals.analysis?.picks[pickIndex] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 24px)', fontFamily: T.mono }}>
      {joinPrompt && (
        <UserIdentityModal
          onSave={(name, color) => { saveUser(name, color); setJoinPrompt(false); }}
          onCancel={() => setJoinPrompt(false)}
        />
      )}

      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 0',
          borderBottom: `1px solid ${T.line0}`,
          marginBottom: 6,
        }}
      >
        <span style={{ color: T.ink0, fontSize: T.fs.t5, fontWeight: 700, letterSpacing: '0.06em' }}>
          DRAFTREWIND_<span className="dr-cursor" />
        </span>
        <SetChip />
        <span
          style={{
            ...label,
            color: isEditable ? T.ink0 : T.ink2,
            border: `1px solid ${T.line1}`,
            borderRadius: T.radius.m,
            padding: '3px 8px',
          }}
        >
          {isEditable ? 'Your review' : collabUser ? `Viewing as ${collabUser.name}` : 'Viewing'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <PresenceBar users={presence} connected={connected} />
          <SaveIndicator status={saveStatus} />
          {!canAnnotate && (
            <button onClick={() => setJoinPrompt(true)} style={btnStyle(T.sel)}>
              JOIN
            </button>
          )}
          <button
            onClick={copyShareLink}
            style={btnStyle(copied ? T.picked : undefined)}
          >
            {copied ? 'COPIED ✓' : 'COPY SHARE LINK'}
          </button>
          <button onClick={() => setGlossaryOpen((v) => !v)} title="Glossary (?)" style={btnStyle()}>
            ?
          </button>
          <a
            href="https://buymeacoffee.com/miketanto"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...btnStyle(),
              textDecoration: 'none',
              backgroundColor: '#FFDD00',
              color: '#1A1400',
              border: '1px solid #FFDD00',
              borderBottom: '2px solid #C9AE00',
              fontWeight: 700,
            }}
          >
            Leave a tip
          </a>
        </div>
      </div>

      {glossaryOpen && (
        <GlossaryPopover config={signals.config} onClose={() => setGlossaryOpen(false)} />
      )}

      {remoteLayers.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <LayerToggle layers={remoteLayers} visibleLayerIds={visibleLayerIds} onToggle={toggleLayer} />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <TimelineSwitcher
          timelines={review!.timelines}
          activeTimelineId={activeTimelineId}
          isEditable={isEditable}
          onSwitch={setActiveTimelineId}
          onTimelinesChange={setTimelines}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            <button
              onClick={() => jumpTo(Math.min(lastPickIndexRef.current, Math.max(picks.length - 1, 0)))}
              style={tabStyle(!showSummary)}
            >
              PICKS
            </button>
            <button onClick={() => jumpTo(picks.length)} style={tabStyle(showSummary)}>
              SUMMARY
            </button>
          </div>
          <span style={{ ...label }}>
            Pick{' '}
            <span style={{ color: T.ink0, fontSize: T.fs.t3 }}>
              {showSummary ? 'Σ' : `P${pick!.pack_number + 1}P${pick!.pick_number + 1}`}
            </span>{' '}
            <span style={{ color: T.ink3 }}>· {Math.min(pickIndex + 1, picks.length)} / {picks.length}</span>
          </span>
        </div>
      </div>

      {/* ALT-PICK MODE STRIP — the click-semantics switch made visible */}
      {altMode && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(224,163,59,0.10)',
            border: `1px solid ${T.amber}`,
            borderRadius: T.radius.m,
            color: T.amber,
            fontSize: T.fs.t1,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            marginBottom: 4,
          }}
        >
          <span>
            Timeline: {activeTimeline!.name} — click a card to set the alt pick · right-click to note
          </span>
          <span style={{ opacity: 0.7 }}>[ESC exits]</span>
        </div>
      )}

      {showSummary ? (
        <div style={{ flex: 1, overflow: 'auto', marginTop: 6 }}>
          <SummaryTab
            summary={review!.summary}
            isEditable={canAnnotate}
            onChange={(s) => {
              if (isEditable) setSummary(s);
            }}
          />
        </div>
      ) : (
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, marginTop: 2 }}>
        {/* Pack cards */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
            border: altMode ? `1px solid ${T.amber}` : `1px solid transparent`,
            borderRadius: T.radius.l,
            transition: `border-color ${T.fast} ${T.ease}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              padding: 6,
            }}
          >
            {pick!.available.map((card, i) => {
              const isPicked = card.name === pick!.pick.name;
              const isAltPick = currentDivergence?.altPick === card.name;
              const hasMyNote = !!(annotation?.cardNotes[card.name]);
              const hasCreatorNote = !!(creatorAnnotation?.cardNotes[card.name]);
              const isSelected = selectedCard === card.name;
              const rank = annotation?.cardRanks?.[card.name];
              const remoteColors = visibleRemoteLayers
                .filter((l) => {
                  const ann = l.annotations.find(
                    (a) => a.packNumber === pick!.pack_number && a.pickNumber === pick!.pick_number,
                  );
                  return ann?.cardNotes[card.name];
                })
                .map((l) => l.userColor);

              const entry = signals.status === 'ready' ? signals.signalMap?.[card.name] : undefined;
              const archColor = entry?.primaryArchetype
                ? ARCHETYPE_COLORS[entry.primaryArchetype] ?? null
                : null;
              const isWheel = pa?.wheelDetections.includes(card.name) ?? false;
              const showBadge = !!entry?.primaryArchetype &&
                (entry.signalTier === 'staple' || entry.signalTier === 'strong' || isWheel);

              const ring = isAltPick
                ? T.amberGlow
                : isPicked
                  ? T.pickedGlow
                  : isSelected
                    ? T.selGlow
                    : entry?.signalTier === 'staple'
                      ? T.goldGlow
                      : 'none';

              return (
                <div
                  key={`${card.name}-${i}`}
                  className="dr-card"
                  onClick={() => {
                    if (altMode) {
                      handleAltPick(card.name);
                    } else {
                      setSelectedCard(isSelected ? null : card.name);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (activeTimelineId) {
                      e.preventDefault();
                      setSelectedCard(isSelected ? null : card.name);
                    }
                  }}
                  onMouseEnter={(e) => handleCardEnter(card, e.currentTarget)}
                  onMouseLeave={handleCardLeave}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: `1px solid ${T.line1}`,
                    boxShadow: ring,
                    borderRadius: T.radius.l,
                    overflow: 'hidden',
                    backgroundColor: T.bg2,
                    minHeight: 0,
                  }}
                >
                  <img
                    src={card.image_url}
                    alt={card.name}
                    style={{ width: '100%', display: 'block' }}
                    loading="lazy"
                  />

                  {/* rank chip — small, top-left */}
                  {rank != null && (
                    <div style={{
                      position: 'absolute',
                      top: 5,
                      left: 5,
                      minWidth: 18,
                      height: 18,
                      borderRadius: T.radius.s,
                      backgroundColor: T.bg3,
                      border: `1px solid ${T.sel}`,
                      color: T.sel,
                      fontSize: 10,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                    }}>
                      #{rank}
                    </div>
                  )}

                  {/* PICKED / ALT chips */}
                  {isPicked && (
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 5,
                      padding: '2px 6px',
                      borderRadius: T.radius.s,
                      backgroundColor: T.picked,
                      color: '#04120A',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                    }}>
                      PICKED
                    </div>
                  )}
                  {isAltPick && (
                    <div style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 5,
                      padding: '2px 6px',
                      borderRadius: T.radius.s,
                      backgroundColor: T.amber,
                      color: '#1A1103',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                    }}>
                      ALT
                    </div>
                  )}

                  {/* note dots — mine amber, creator green, remote per-user */}
                  <div style={{ position: 'absolute', top: 7, right: 6, display: 'flex', gap: 3 }}>
                    {hasMyNote && <NoteDot color={T.amber} title="Your note" />}
                    {hasCreatorNote && <NoteDot color={T.picked} title="Creator's note" />}
                    {remoteColors.map((c, ci) => (
                      <NoteDot key={ci} color={c} title="Collaborator note" />
                    ))}
                  </div>

                  {/* signal tier badge */}
                  {showBadge && entry?.primaryArchetype && (
                    <div style={{ position: 'absolute', bottom: 8, right: 5 }}>
                      <SignalBadge
                        archetype={entry.primaryArchetype}
                        tier={entry.signalTier}
                        isWheel={isWheel}
                      />
                    </div>
                  )}

                  {/* archetype rail — the signal IS the chrome */}
                  {archColor && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 3,
                        backgroundColor: archColor,
                        opacity: 0.9,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Annotation panel */}
        <div style={{ width: 'clamp(280px, 26vw, 380px)', flexShrink: 0, overflow: 'auto' }}>
          <AnnotationPanel
            pick={pick!}
            annotation={annotation}
            isEditable={canAnnotate}
            onPickNoteChange={handlePickNoteChange}
            onCardNoteChange={handleCardNoteChange}
            onCardRankChange={handleCardRankChange}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
            remoteLayers={visibleRemoteLayers}
            creatorAnnotation={creatorAnnotation}
            onRequestJoin={!canAnnotate ? () => setJoinPrompt(true) : undefined}
          />
        </div>
      </div>
      )}

      {/* SCRUBBER — the draft's color story as navigation */}
      <PickScrubber
        totalPicks={picks.length}
        currentIndex={pickIndex}
        onJump={jumpTo}
        cellColors={cellColors}
        noteTicks={noteTicks}
        cursors={scrubberCursors}
        packBreaks={packBreaks}
      />

      <ResizablePool>
        <PoolComparison
          actualPool={actualPool}
          alternatePool={activeTimeline && activeTimeline.divergences.length > 0 ? alternatePool : null}
        />
      </ResizablePool>

      {hoverCard && pick && signals.status === 'ready' && signals.config && (
        <CardHoverCard
          card={hoverCard.card}
          anchorRect={hoverCard.rect}
          signalEntry={signals.signalMap?.[hoverCard.card.name] ?? null}
          pickSignal={pa?.cardSignals.find((s) => s.cardName === hoverCard.card.name) ?? null}
          isWheel={pa?.wheelDetections.includes(hoverCard.card.name) ?? false}
          config={signals.config}
          packNumber={pick.pack_number}
          pickNumber={pick.pick_number}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

/** Header chip reporting the detected set + signal availability */
function SetChip() {
  const { status, setCode, config } = useSignals();
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: `1px solid ${T.line1}`,
    borderRadius: T.radius.m,
    padding: '3px 8px',
    fontSize: T.fs.t1,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
  if (status === 'ready' && config) {
    return (
      <span style={{ ...base, color: T.ink1 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: T.picked }} />
        {config.code} · signals on
      </span>
    );
  }
  if (status === 'unsupported') {
    return (
      <span style={{ ...base, color: T.ink2 }}>
        {setCode ? `${setCode} · ` : ''}annotator only
      </span>
    );
  }
  if (status === 'error') {
    return <span style={{ ...base, color: T.danger }}>signal data failed</span>;
  }
  return <span style={{ ...base, color: T.ink3 }}>loading signals…</span>;
}

function NoteDot({ color, title }: { color: string; title: string }) {
  return (
    <span
      title={title}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        backgroundColor: color,
        border: '1px solid rgba(0,0,0,0.5)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
        display: 'inline-block',
      }}
    />
  );
}

/** PICKS | SUMMARY keycap-tab chip */
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 10px',
    backgroundColor: active ? T.bg3 : 'transparent',
    color: active ? T.ink0 : T.ink2,
    border: `1px solid ${active ? T.line2 : T.line1}`,
    borderBottom: `2px solid ${active ? T.sel : T.line1}`,
    borderRadius: T.radius.m,
    cursor: 'pointer',
    fontFamily: T.mono,
    fontSize: T.fs.t1,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
}

function btnStyle(accent?: string): React.CSSProperties {
  return {
    padding: '4px 10px',
    backgroundColor: T.bg3,
    color: accent ?? T.ink1,
    border: `1px solid ${accent ?? T.line1}`,
    borderBottom: `2px solid ${accent ?? T.line2}`,
    borderRadius: T.radius.m,
    cursor: 'pointer',
    fontFamily: T.mono,
    fontSize: T.fs.t1,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  };
}

function upsertCollab(
  annotations: PickAnnotation[],
  packNumber: number,
  pickNumber: number,
  updater: (a: PickAnnotation) => PickAnnotation,
): PickAnnotation[] {
  const idx = annotations.findIndex(
    (a) => a.packNumber === packNumber && a.pickNumber === pickNumber,
  );
  if (idx >= 0) {
    const copy = [...annotations];
    copy[idx] = updater(copy[idx]);
    return copy;
  }
  const blank: PickAnnotation = { packNumber, pickNumber, note: '', cardNotes: {}, cardRanks: {} };
  return [...annotations, updater(blank)];
}

function ResizablePool({ children }: { children: React.ReactNode }) {
  const [height, setHeight] = useState(180);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const cap = Math.min(500, Math.round(window.innerHeight * 0.4));
    setHeight(Math.max(80, Math.min(cap, startH.current + delta)));
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div style={{ flexShrink: 0, borderTop: `1px solid ${T.line0}` }}>
      <div
        onPointerDown={collapsed ? undefined : onPointerDown}
        onPointerMove={collapsed ? undefined : onPointerMove}
        onPointerUp={collapsed ? undefined : onPointerUp}
        style={{
          height: 14,
          cursor: collapsed ? 'default' : 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {!collapsed && <div style={{ width: 30, height: 3, borderRadius: 2, backgroundColor: T.line2 }} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            padding: '2px 10px',
            backgroundColor: T.bg3,
            color: T.ink1,
            border: `1px solid ${T.line1}`,
            borderRadius: T.radius.s,
            cursor: 'pointer',
            fontFamily: T.mono,
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          {collapsed ? 'Pool ^' : 'Pool v'}
        </button>
        {!collapsed && <div style={{ width: 30, height: 3, borderRadius: 2, backgroundColor: T.line2 }} />}
      </div>
      {!collapsed && (
        <div style={{ height, overflow: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}
