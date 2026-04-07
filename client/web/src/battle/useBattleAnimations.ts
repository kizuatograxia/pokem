import { useEffect, useRef, useState } from 'react';
import type { BattleAnimationCue, EntryDirection } from './types.js';

export interface SpriteAnim {
  kind: 'switch-in' | 'faint' | 'hit' | 'move-use';
  from?: EntryDirection;
  flashColor?: string;
}

export type AnimMap = Map<string, SpriteAnim>;

const DURATIONS: Partial<Record<BattleAnimationCue['kind'], number>> = {
  'switch-in': 350,
  'switch-out': 250,
  'faint': 480,
  'move-use': 220,
  'damage-hit': 320,
  'heal': 280,
  'status-apply': 180,
  'boost': 200,
  'weather-change': 100,
  'terrain-change': 100,
  'message': 80,
};

function slotKey(cue: BattleAnimationCue): string | null {
  switch (cue.kind) {
    case 'switch-in':
    case 'switch-out':
    case 'faint':
    case 'move-use':
    case 'damage-hit':
    case 'heal':
    case 'status-apply':
    case 'boost':
      return `${cue.side}:${cue.slot}`;
    default:
      return null;
  }
}

export function useBattleAnimations(animationQueue: BattleAnimationCue[] | undefined): {
  animMap: AnimMap;
  keepVisible: Set<string>;
  isAnimating: boolean;
} {
  const [animMap, setAnimMap] = useState<AnimMap>(new Map());
  const [keepVisible, setKeepVisible] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  const pendingRef = useRef<BattleAnimationCue[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const animMapRef = useRef<AnimMap>(new Map());
  const keepVisRef = useRef<Set<string>>(new Set());
  const lastQueueRef = useRef<typeof animationQueue>(undefined);

  // Store playNext in a ref so setTimeout always calls the latest version.
  const playNextRef = useRef<() => void>(null!);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  // Reassign on every render so the ref always holds the latest closure.
  playNextRef.current = () => {
    if (!mountedRef.current) return;

    const cue = pendingRef.current.shift();
    if (!cue) {
      runningRef.current = false;
      setIsAnimating(false);
      animMapRef.current = new Map();
      keepVisRef.current = new Set();
      setAnimMap(new Map());
      setKeepVisible(new Set());
      return;
    }

    const am = new Map(animMapRef.current);
    const kv = new Set(keepVisRef.current);
    const k = slotKey(cue);

    switch (cue.kind) {
      case 'switch-in':
        if (k) am.set(k, { kind: 'switch-in', from: cue.entryFrom });
        break;
      case 'faint':
        if (k) {
          kv.add(k);
          am.set(k, { kind: 'faint' });
        }
        break;
      case 'damage-hit':
        if (k) am.set(k, { kind: 'hit', flashColor: cue.flashColor });
        break;
      case 'move-use':
        if (k) am.set(k, { kind: 'move-use' });
        break;
      default:
        break;
    }

    animMapRef.current = am;
    keepVisRef.current = kv;
    setAnimMap(new Map(am));
    setKeepVisible(new Set(kv));

    const duration = DURATIONS[cue.kind] ?? 150;
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      const after = new Map(animMapRef.current);
      const afterKv = new Set(keepVisRef.current);
      if (k) {
        after.delete(k);
        if (cue.kind === 'faint') afterKv.delete(k);
      }

      animMapRef.current = after;
      keepVisRef.current = afterKv;
      setAnimMap(new Map(after));
      setKeepVisible(new Set(afterKv));

      playNextRef.current();
    }, duration);
  };

  useEffect(() => {
    if (animationQueue === lastQueueRef.current) return;
    lastQueueRef.current = animationQueue;
    if (!animationQueue?.length) return;

    pendingRef.current.push(...animationQueue);
    if (!runningRef.current) {
      runningRef.current = true;
      setIsAnimating(true);
      playNextRef.current();
    }
  }, [animationQueue]);

  return { animMap, keepVisible, isAnimating };
}
