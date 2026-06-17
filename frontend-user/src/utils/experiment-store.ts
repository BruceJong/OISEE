/**
 * 实验完成度记录（localStorage 版）
 *
 *   localStorage[STORE_KEY] = {
 *     [expSlug]: { status: 'not-started' | 'in-progress' | 'done', updatedAt }
 *   }
 *
 * 暂时只有"标记完成 / 重置"两个写操作；后续可扩展打卡步骤、上传作品等。
 */
import { useSyncExternalStore } from 'react';

const STORE_KEY = 'oisee-experiment-v1';

export type ExpStatus = 'not-started' | 'in-progress' | 'done';
type Store = { exps: Record<string, { status: ExpStatus; updatedAt: number }> };

function load(): Store {
  if (typeof window === 'undefined') return { exps: {} };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { exps: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.exps) return { exps: {} };
    return parsed;
  } catch { return { exps: {} }; }
}
function save(s: Store) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
let snap: string | null = null;
function getSnap() { if (snap === null) snap = JSON.stringify(load()); return snap; }
function invalidate() { snap = null; notify(); }

export function setExperimentStatus(slug: string, status: ExpStatus) {
  const s = load();
  s.exps[slug] = { status, updatedAt: Date.now() };
  save(s); invalidate();
}
export function getExperimentStatus(slug: string): ExpStatus {
  return load().exps[slug]?.status ?? 'not-started';
}

export function useExperimentStore() {
  useSyncExternalStore(subscribe, getSnap, () => '{"exps":{}}');
  return { setExperimentStatus, getExperimentStatus };
}
