import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { CollabUser, AnnotationLayer, PickAnnotation, ServerMessage } from '../types';

interface CursorState {
  userId: string;
  packNumber: number;
  pickNumber: number;
}

export function useCollabSocket(reviewId: string, user: CollabUser | null) {
  const [remoteLayers, setRemoteLayers] = useState<AnnotationLayer[]>([]);
  const [myLayerAnnotations, setMyLayerAnnotations] = useState<PickAnnotation[] | null>(null);
  const [presence, setPresence] = useState<CollabUser[]>([]);
  const [cursors, setCursors] = useState<CursorState[]>([]);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const layerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.PROD ? window.location.host : 'localhost:3001';
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', reviewId, user }));
    };

    ws.onmessage = (evt) => {
      const msg: ServerMessage = JSON.parse(evt.data);

      if (msg.type === 'presence') {
        setPresence(msg.users);
      } else if (msg.type === 'layers-snapshot') {
        setRemoteLayers(msg.layers.filter((l) => l.userId !== user.id));
        const myLayer = msg.layers.find((l) => l.userId === user.id);
        if (myLayer) {
          layerIdRef.current = myLayer.id;
          setMyLayerAnnotations(myLayer.annotations);
        }
      } else if (msg.type === 'layer-update') {
        if (msg.layer.userId === user.id) return;
        setRemoteLayers((prev) => {
          const idx = prev.findIndex((l) => l.id === msg.layer.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = msg.layer;
            return copy;
          }
          return [...prev, msg.layer];
        });
      } else if (msg.type === 'cursor') {
        setCursors((prev) => {
          const filtered = prev.filter((c) => c.userId !== msg.userId);
          return [...filtered, { userId: msg.userId, packNumber: msg.packNumber, pickNumber: msg.pickNumber }];
        });
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [reviewId, user]);

  const sendAnnotationUpdate = useCallback((annotations: PickAnnotation[]) => {
    if (!wsRef.current || !user || wsRef.current.readyState !== WebSocket.OPEN) return;

    if (!layerIdRef.current) {
      layerIdRef.current = uuid();
    }

    const layer: AnnotationLayer = {
      id: layerIdRef.current,
      reviewId,
      userId: user.id,
      userName: user.name,
      userColor: user.color,
      annotations,
      updatedAt: new Date().toISOString(),
    };

    wsRef.current.send(JSON.stringify({ type: 'annotation-update', layer }));
  }, [reviewId, user]);

  const sendCursorMove = useCallback((packNumber: number, pickNumber: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'cursor-move', packNumber, pickNumber }));
  }, []);

  return { remoteLayers, myLayerAnnotations, presence, cursors, connected, sendAnnotationUpdate, sendCursorMove };
}
