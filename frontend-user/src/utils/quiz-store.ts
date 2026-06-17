/**
 * 「考考你」答题记录持久化（localStorage 版）
 *
 * 结构：
 *   localStorage[STORE_KEY] = {
 *     [kpSlug]: {
 *       attempts: [
 *         { startedAt, finishedAt, answers: { [questionId]: chosenIndex }, correct, total }
 *       ],
 *       best: { correct, total },
 *       completed: boolean   // 是否曾经满分过
 *     }
 *   }
 *
 * 用法：
 *   const store = useQuizStore();
 *   store.recordAnswer(kpSlug, qid, chosenIdx)
 *   store.finalize(kpSlug, quizzes)   // 当全部题已答 → 写入一次 attempt
 *   store.reset(kpSlug)               // 「再做一次」清空当前进度（attempts 仍保留）
 *   store.getCurrent(kpSlug)          // 当前作答中的答案 + 已交状态
 *   store.getLatest(kpSlug)           // 最近一次正式提交的 attempt（无则 null）
 *   store.getBest(kpSlug)             // 历史最佳 { correct, total } / null
 *   store.isCompleted(kpSlug)         // 是否曾经满分
 */
import { useSyncExternalStore } from 'react';

const STORE_KEY = 'oisee-quiz-v1';

export type QuizAttempt = {
  startedAt: number;
  finishedAt: number;
  answers: Record<string, number>;
  correct: number;
  total: number;
};

type CurrentAttempt = {
  startedAt: number;
  answers: Record<string, number>;          // 已选答案
  submitted: Record<string, boolean>;       // 已提交（逐题）
  // 服务端判分结果（提交后回填；答案不再随题目下发）
  results?: Record<string, QuizResult>;
};

export type QuizResult = {
  correct: boolean;
  correctIndex: number;
  explanation?: string | null;
};

type KpRecord = {
  current?: CurrentAttempt;
  attempts: QuizAttempt[];
  best?: { correct: number; total: number };
  completed?: boolean;
};

type Store = { kps: Record<string, KpRecord> };

/* ── 底层 IO ── */
function load(): Store {
  if (typeof window === 'undefined') return { kps: {} };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { kps: {} };
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !parsed.kps) return { kps: {} };
    return parsed;
  } catch { return { kps: {} }; }
}
function save(s: Store) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

/* ── 订阅广播 ── */
const listeners = new Set<() => void>();
function notify() { listeners.forEach(l => l()); }
function subscribe(cb: () => void) { listeners.add(cb); return () => listeners.delete(cb); }
let snap: string | null = null;
function getSnap() {
  if (snap === null) snap = JSON.stringify(load());
  return snap;
}
function invalidate() { snap = null; notify(); }

/* ── 帮助函数 ── */
function ensureRec(s: Store, kpSlug: string): KpRecord {
  if (!s.kps[kpSlug]) s.kps[kpSlug] = { attempts: [] };
  return s.kps[kpSlug]!;
}
function ensureCurrent(rec: KpRecord): CurrentAttempt {
  if (!rec.current) rec.current = { startedAt: Date.now(), answers: {}, submitted: {} };
  return rec.current;
}

/* ── 写操作 ── */
export function selectAnswer(kpSlug: string, qid: string, idx: number) {
  const s = load();
  const rec = ensureRec(s, kpSlug);
  const cur = ensureCurrent(rec);
  if (cur.submitted[qid]) return;   // 已交不能改
  cur.answers[qid] = idx;
  save(s); invalidate();
}

/** 提交某题：写入服务端判分结果并标记已交 */
export function submitAnswer(kpSlug: string, qid: string, result: QuizResult) {
  const s = load();
  const rec = ensureRec(s, kpSlug);
  const cur = ensureCurrent(rec);
  if (cur.answers[qid] === undefined) return;
  cur.submitted[qid] = true;
  cur.results = cur.results ?? {};
  cur.results[qid] = result;
  save(s); invalidate();
}

/**
 * 全部题目已提交后，调用 finalize 把当前 current 转为一次 attempt，
 * 并更新 best / completed。返回结算结果。
 */
export function finalizeAttempt(
  kpSlug: string,
  quizzes: Array<{ id: string }>,
): { correct: number; total: number; completed: boolean } {
  const s = load();
  const rec = ensureRec(s, kpSlug);
  const cur = ensureCurrent(rec);
  let correct = 0;
  for (const q of quizzes) {
    if (cur.results?.[q.id]?.correct) correct++;
  }
  const total = quizzes.length;
  const attempt: QuizAttempt = {
    startedAt: cur.startedAt,
    finishedAt: Date.now(),
    answers: { ...cur.answers },
    correct, total,
  };
  rec.attempts.push(attempt);
  if (!rec.best || correct > rec.best.correct) rec.best = { correct, total };
  if (correct === total) rec.completed = true;
  // 保留 current 让用户看到本次答题状态；reset() 时再清
  save(s); invalidate();
  return { correct, total, completed: rec.completed === true };
}

export function resetAttempt(kpSlug: string) {
  const s = load();
  const rec = ensureRec(s, kpSlug);
  delete rec.current;
  save(s); invalidate();
}

/* ── 读操作 ── */
export function getCurrent(kpSlug: string): CurrentAttempt | undefined {
  return load().kps[kpSlug]?.current;
}
export function getLatest(kpSlug: string): QuizAttempt | undefined {
  const a = load().kps[kpSlug]?.attempts;
  return a && a.length ? a[a.length - 1] : undefined;
}
export function getBest(kpSlug: string): { correct: number; total: number } | undefined {
  return load().kps[kpSlug]?.best;
}
export function getCompletedKpSlugs(): string[] {
  const s = load();
  return Object.keys(s.kps).filter((slug) => s.kps[slug]?.completed === true);
}
export function isCompleted(kpSlug: string): boolean {
  return load().kps[kpSlug]?.completed === true;
}
export function getAttempts(kpSlug: string): QuizAttempt[] {
  return load().kps[kpSlug]?.attempts ?? [];
}

/* ── React 订阅 ── */
export function useQuizStore() {
  useSyncExternalStore(subscribe, getSnap, () => '{"kps":{}}');
  return {
    selectAnswer, submitAnswer, finalizeAttempt, resetAttempt,
    getCurrent, getLatest, getBest, isCompleted, getAttempts,
  };
}
