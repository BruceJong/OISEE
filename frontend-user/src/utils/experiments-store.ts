/**
 * 实验完成记录（localStorage 持久化）
 * 存储格式：localStorage['oisee-experiments-v1'] = { done: { [slug]: { completedAt } } }
 */
import { useSyncExternalStore } from 'react';

const KEY = 'oisee-experiments-v1';

type Store = { done: Record<string, { completedAt: number }> };

function load(): Store {
  if (typeof window === 'undefined') return { done: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { done: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.done) return { done: {} };
    return parsed;
  } catch {
    return { done: {} };
  }
}

function save(s: Store) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

const listeners = new Set<() => void>();
let snap: string | null = null;
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
function getSnap() {
  if (snap === null) snap = JSON.stringify(load());
  return snap;
}
function invalidate() { snap = null; listeners.forEach((l) => l()); }

export function markExperimentDone(slug: string) {
  const s = load();
  if (!s.done[slug]) {
    s.done[slug] = { completedAt: Date.now() };
    save(s);
    invalidate();
  }
}

export function isExperimentDone(slug: string): boolean {
  return !!load().done[slug];
}

export function getDoneExperimentSlugs(): string[] {
  return Object.keys(load().done);
}

export function useExperimentsStore() {
  useSyncExternalStore(subscribe, getSnap, () => '{"done":{}}');
  return { markExperimentDone, isExperimentDone, getDoneExperimentSlugs };
}
