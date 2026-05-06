import { useState, useCallback, useRef, useEffect } from 'react';
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
import { DraftSummaryPanel } from '../components/DraftSummaryPanel';
import { PickNavigator } from '../../ui/components/PickNavigator';
import type { Timeline, Divergence, AnnotationLayer, PickAnnotation, DraftSummary } from '../types';

export function ReviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const {
    review,
    loading,
    error,
    isEditable,
    saveStatus,
    setTimelines,
    setSummary,
    updatePickNote,
    updateCardNote,
    updateCardRank,
  } = useReview(id!);

  const { user: collabUser, needsSetup: needsIdentity, saveUser } = useCollabUser();
  const { remoteLayers, myLayerAnnotations, presence, connected, sendAnnotationUpdate, sendCursorMove } = useCollabSocket(id!, collabUser);

  const [pickIndex, setPickIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [collabAnnotations, setCollabAnnotations] = useState<PickAnnotation[]>([]);

  const activeTimeline = (review && activeTimelineId)
    ? review.timelines.find((t) => t.id === activeTimelineId) ?? null
    : null;

  const { actualPool, alternatePool } = useTimeline(
    review?.draftLog ?? [],
    activeTimeline,
    pickIndex + 1,
  );

  const picks = review?.draftLog ?? [];
  const pick = picks[pickIndex] ?? null;

  const handleAltPick = useCallback((cardName: string) => {
    if (!review || !pick || !activeTimeline || !isEditable) return;
    const packNumber = pick.pack_number;
    const pickNumber = pick.pick_number;

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
  }, [activeTimeline, activeTimelineId, isEditable, pick, review, setTimelines]);

  // Load saved collab annotations from server
  useEffect(() => {
    if (myLayerAnnotations && collabAnnotations.length === 0) {
      setCollabAnnotations(myLayerAnnotations);
    }
  }, [myLayerAnnotations]); // eslint-disable-line react-hooks/exhaustive-deps

  const canAnnotate = isEditable || !!collabUser;

  const myAnnotations = isEditable ? (review?.annotations ?? []) : collabAnnotations;

  const broadcastCollabAnnotations = useCallback((annotations: PickAnnotation[]) => {
    sendAnnotationUpdate(annotations);
  }, [sendAnnotationUpdate]);

  const broadcastMyAnnotations = useCallback(() => {
    if (isEditable && review) {
      setTimeout(() => sendAnnotationUpdate(review.annotations), 100);
    }
  }, [isEditable, review, sendAnnotationUpdate]);

  const handlePickNoteChange = useCallback((note: string) => {
    if (!pick) return;
    if (isEditable) {
      updatePickNote(pick.pack_number, pick.pick_number, note);
      broadcastMyAnnotations();
    } else {
      const updated = upsertCollab(collabAnnotations, pick.pack_number, pick.pick_number, (a) => ({ ...a, note }));
      setCollabAnnotations(updated);
      broadcastCollabAnnotations(updated);
    }
  }, [pick, isEditable, updatePickNote, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations]);

  const handleCardNoteChange = useCallback((cardName: string, note: string) => {
    if (!pick) return;
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
  }, [pick, isEditable, updateCardNote, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations]);

  const handleCardRankChange = useCallback((cardName: string, rank: number | null) => {
    if (!pick) return;
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
  }, [pick, isEditable, updateCardRank, broadcastMyAnnotations, collabAnnotations, broadcastCollabAnnotations]);

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

  const goToNext = useCallback(() => {
    setPickIndex((i) => i + 1);
    setSelectedCard(null);
  }, []);
  const goToPrev = useCallback(() => {
    setPickIndex((i) => i - 1);
    setSelectedCard(null);
  }, []);

  if (loading) {
    return <div style={{ color: '#888', padding: 12 }}>Loading review...</div>;
  }

  if (error || !review) {
    return (
      <div style={{ color: '#f44336', padding: 12 }}>
        {error ?? 'Review not found'}
      </div>
    );
  }

  const showSummary = pickIndex >= picks.length;

  const annotation = pick ? myAnnotations.find(
    (a) => a.packNumber === pick.pack_number && a.pickNumber === pick.pick_number,
  ) : undefined;

  const currentDivergence = pick ? activeTimeline?.divergences.find(
    (d) => d.packNumber === pick.pack_number && d.pickNumber === pick.pick_number,
  ) : undefined;

  const shareUrl = `${window.location.origin}/review/${review.id}`;

  const visibleRemoteLayers = remoteLayers.filter((l) => visibleLayerIds.has(l.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)' }}>
      {needsIdentity && <UserIdentityModal onSave={saveUser} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <h1 style={{ color: '#fff', fontSize: 18, margin: 0 }}>
          DraftRewind
          <span style={{ color: '#666', fontSize: 12, marginLeft: 8 }}>
            {isEditable ? 'editing' : 'read-only'}
          </span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <PresenceBar users={presence} connected={connected} />
          <SaveIndicator status={saveStatus} />
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            style={{
              padding: '4px 12px',
              backgroundColor: '#222',
              color: '#aaa',
              border: '1px solid #333',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            Copy share link
          </button>
          <a
            href="https://buymeacoffee.com/miketanto"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '4px 10px',
              backgroundColor: '#FFDD00',
              color: '#000',
              borderRadius: 4,
              fontFamily: 'monospace',
              fontSize: 11,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Buy me a coffee
          </a>
        </div>
      </div>

      {remoteLayers.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <LayerToggle layers={remoteLayers} visibleLayerIds={visibleLayerIds} onToggle={toggleLayer} />
        </div>
      )}

      <div style={{ marginBottom: 4 }}>
        <TimelineSwitcher
          timelines={review.timelines}
          activeTimelineId={activeTimelineId}
          isEditable={isEditable}
          onSwitch={setActiveTimelineId}
          onTimelinesChange={setTimelines}
        />
      </div>

      <PickNavigator
        packNumber={showSummary ? 0 : pick!.pack_number}
        pickNumber={showSummary ? 0 : pick!.pick_number}
        currentIndex={pickIndex}
        totalPicks={picks.length + 1}
        onPrev={goToPrev}
        onNext={goToNext}
        label={showSummary ? 'Summary' : undefined}
      />

      {showSummary ? (
        <div style={{ flex: 1, overflow: 'auto', marginTop: 6 }}>
          <DraftSummaryPanel
            summary={review.summary}
            isEditable={canAnnotate}
            onChange={(s) => {
              if (isEditable) {
                setSummary(s);
              }
            }}
          />
        </div>
      ) : (
      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0, maxHeight: '80vh', marginTop: 6 }}>
        {/* Pack cards */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 4,
              padding: 4,
            }}
          >
            {pick.available.map((card, i) => {
              const isPicked = card.name === pick.pick.name;
              const isAltPick = currentDivergence?.altPick === card.name;
              const hasNote = !!(annotation?.cardNotes[card.name]);
              const isSelected = selectedCard === card.name;
              const rank = annotation?.cardRanks?.[card.name];
              const remoteColors = visibleRemoteLayers
                .filter((l) => {
                  const ann = l.annotations.find(
                    (a) => a.packNumber === pick.pack_number && a.pickNumber === pick.pick_number,
                  );
                  return ann?.cardNotes[card.name];
                })
                .map((l) => l.userColor);
              return (
                <div
                  key={`${card.name}-${i}`}
                  onClick={() => {
                    if (activeTimelineId && isEditable) {
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
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: isAltPick
                      ? '3px solid #ffb74d'
                      : isPicked
                        ? '3px solid #4CAF50'
                        : isSelected
                          ? '2px solid #64B5F6'
                          : '1px solid #333',
                    borderRadius: 6,
                    overflow: 'hidden',
                    backgroundColor: '#1a1a1a',
                    minHeight: 0,
                  }}
                >
                  <img
                    src={card.image_url}
                    alt={card.name}
                    style={{ width: '100%', display: 'block' }}
                    loading="lazy"
                  />
                  {rank != null && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      left: 6,
                      minWidth: 26,
                      height: 26,
                      borderRadius: 5,
                      backgroundColor: '#64B5F6',
                      color: '#000',
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 5px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                    }}>
                      #{rank}
                    </div>
                  )}
                  {isAltPick && (
                    <div style={{
                      position: 'absolute',
                      bottom: 6,
                      left: 6,
                      padding: '2px 6px',
                      borderRadius: 3,
                      backgroundColor: '#ffb74d',
                      color: '#000',
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                    }}>
                      ALT
                    </div>
                  )}
                  {hasNote && (
                    <div style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: '#ffb74d',
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                  )}
                  {remoteColors.map((color, ci) => (
                    <div key={`remote-${ci}`} style={{
                      position: 'absolute',
                      top: 6,
                      right: (hasNote ? 1 : 0) * 32 + 6 + ci * 32,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: color,
                      color: '#000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Annotation panel */}
        <div style={{ width: 340, flexShrink: 0, overflow: 'auto' }}>
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
          />
        </div>
      </div>
      )}

      <ResizablePool>
        <PoolComparison
          actualPool={actualPool}
          alternatePool={activeTimeline && activeTimeline.divergences.length > 0 ? alternatePool : null}
        />
      </ResizablePool>
    </div>
  );
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
    setHeight(Math.max(80, Math.min(500, startH.current + delta)));
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid #333', marginTop: 4 }}>
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
        {!collapsed && <div style={{ width: 30, height: 3, borderRadius: 2, backgroundColor: '#555' }} />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            padding: '2px 10px',
            backgroundColor: '#2a2a2a',
            color: '#aaa',
            border: '1px solid #444',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          {collapsed ? 'Pool ^' : 'Pool v'}
        </button>
        {!collapsed && <div style={{ width: 30, height: 3, borderRadius: 2, backgroundColor: '#555' }} />}
      </div>
      {!collapsed && (
        <div style={{ height, overflow: 'auto' }}>
          {children}
        </div>
      )}
    </div>
  );
}
