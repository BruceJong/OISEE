/**
 * 探索进度跟踪（localStorage 版本）
 *
 * 进度计算公式：
 *   • 物品进度 = 0.5 × 已读 KP 比例 + 0.5 × 视频观看比例
 *     （若该物品无视频，则进度 = KP 比例 100%）
 *   • L2 场景进度 = 该 L2 所有物品进度的平均
 *   • L1 场景进度 = 该 L1 下所有「已解锁」L2 进度的平均
 *
 * 存储格式：localStorage[STORE_KEY] = JSON
 *   { items: { [itemSlug]: { viewedKPSlugs: string[], videoWatchedSec: number } } }
 */
import { useSyncExternalStore } from 'react';

const STORE_KEY = 'oisee-progress-v1';

export type ItemProgressRec = {
  viewedKPSlugs: string[];     // 已浏览的知识点 slug 列表
  videoWatchedSec: number;     // 视频累计观看的秒数
};

type Store = {
  items: Record<string, ItemProgressRec>;
};

/* ── 底层读写 ──────────────────────────────────────────────── */
function load(): Store {
  if (typeof window === 'undefined') return { items: {} };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { items: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.items) return { items: {} };
    return parsed;
  } catch {
    return { items: {} };
  }
}

function save(store: Store) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota 满了不致命 */
  }
}

/* ── 订阅机制（让 useProgress 跨组件感知变化） ──────────────── */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notify() {
  listeners.forEach(l => l());
}

let cachedSnapshot: string | null = null;

function getSnapshot(): string {
  if (cachedSnapshot === null) {
    cachedSnapshot = JSON.stringify(load());
  }
  return cachedSnapshot;
}

function getServerSnapshot(): string {
  return '{"items":{}}';
}

function invalidate() {
  cachedSnapshot = null;
  notify();
}

/* ── 写操作 API ────────────────────────────────────────────── */
export function recordKpViewed(itemSlug: string, kpSlug: string) {
  const s = load();
  const rec = s.items[itemSlug] ?? { viewedKPSlugs: [], videoWatchedSec: 0 };
  if (!rec.viewedKPSlugs.includes(kpSlug)) {
    rec.viewedKPSlugs = [...rec.viewedKPSlugs, kpSlug];
    s.items[itemSlug] = rec;
    save(s);
    invalidate();
  }
}

export function recordVideoProgress(itemSlug: string, sec: number) {
  const s = load();
  const rec = s.items[itemSlug] ?? { viewedKPSlugs: [], videoWatchedSec: 0 };
  const next = Math.max(rec.videoWatchedSec, Math.floor(sec));
  if (next !== rec.videoWatchedSec) {
    rec.videoWatchedSec = next;
    s.items[itemSlug] = rec;
    save(s);
    invalidate();
  }
}

export function resetAll() {
  save({ items: {} });
  invalidate();
}

/* ── 进度计算 ─────────────────────────────────────────────── */
type ItemForProgress = {
  slug: string;
  videoDurationSec?: number | null;
  knowledgePoints?: Array<{ knowledgePoint?: { slug: string } } | { slug: string }>;
};

/** 物品进度 [0, 1] */
export function calcItemProgress(item: ItemForProgress, store?: Store): number {
  const s = store ?? load();
  const rec = s.items[item.slug];

  // 该物品挂载的 KP slug 集合
  const kpSlugs = (item.knowledgePoints ?? []).map(k =>
    'knowledgePoint' in k ? k.knowledgePoint!.slug : (k as { slug: string }).slug
  );
  const kpTotal = kpSlugs.length;
  const viewed = rec?.viewedKPSlugs ?? [];
  const kpViewed = kpSlugs.filter(slug => viewed.includes(slug)).length;
  const kpRatio = kpTotal > 0 ? kpViewed / kpTotal : 0;

  const dur = item.videoDurationSec ?? 0;
  const watched = rec?.videoWatchedSec ?? 0;

  if (dur === 0) {
    // 没有视频：只看 KP 浏览率
    return kpRatio;
  }
  const vidRatio = Math.min(1, watched / dur);
  return 0.5 * kpRatio + 0.5 * vidRatio;
}

/** L2 场景进度 [0, 1]：所有物品进度的平均 */
export function calcSceneProgress(items: ItemForProgress[], store?: Store): number {
  if (items.length === 0) return 0;
  const s = store ?? load();
  const sum = items.reduce((acc, it) => acc + calcItemProgress(it, s), 0);
  return sum / items.length;
}

/** L1 进度：所有未锁定 L2 子场景进度的平均（以 isLocked 为准） */
export function calcL1Progress(
  l1ChildScenes: Array<{ slug: string; isLocked?: boolean; items?: ItemForProgress[] }>,
  store?: Store,
): number {
  const s = store ?? load();
  const unlocked = l1ChildScenes.filter(sc => !sc.isLocked);
  if (unlocked.length === 0) return 0;
  const sum = unlocked.reduce(
    (acc, sc) => acc + calcSceneProgress(sc.items ?? [], s),
    0,
  );
  return sum / unlocked.length;
}

/* ── React Hook ───────────────────────────────────────────── */

/** useProgress() → 任何 progress 变化都会触发组件重渲染 */
export function useProgress() {
  // useSyncExternalStore 返回的字符串变化时触发 re-render
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    recordKpViewed,
    recordVideoProgress,
    resetAll,
    calcItemProgress,
    calcSceneProgress,
    calcL1Progress,
    getStore: load,
  };
}
