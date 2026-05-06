import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { CollabUser } from '../types';

const STORAGE_KEY = 'collab-user';

export const COLLAB_COLORS = [
  '#E91E63', '#9C27B0', '#00BCD4', '#CDDC39',
  '#FF5722', '#795548', '#607D8B', '#FFC107',
];

function loadUser(): CollabUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useCollabUser() {
  const [user, setUserState] = useState<CollabUser | null>(loadUser);
  const needsSetup = user === null;

  const saveUser = useCallback((name: string, color: string) => {
    const existing = loadUser();
    const u: CollabUser = { id: existing?.id ?? uuid(), name, color };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUserState(u);
  }, []);

  return { user, needsSetup, saveUser };
}
