/**
 * 用户难度等级（localStorage，可在「我的书包」切换）
 * L1 启蒙（6-9 岁）/ L2 探索（10-13 岁）/ L3 深化（14-16 岁）
 * 替代原先散落各页面的硬编码 userLevel = 'L2'。
 */
import { useSyncExternalStore } from 'react';

const KEY = 'oisee-user-level-v1';
const DEFAULT_LEVEL = 'L2';

export type UserLevel = 'L1' | 'L2' | 'L3';

const ORDER: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

export function getUserLevel(): UserLevel {
  if (typeof window === 'undefined') return DEFAULT_LEVEL;
  const v = localStorage.getItem(KEY);
  return v === 'L1' || v === 'L2' || v === 'L3' ? v : DEFAULT_LEVEL;
}

const listeners = new Set<() => void>();

export function setUserLevel(level: UserLevel) {
  try { localStorage.setItem(KEY, level); } catch { /* quota */ }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 难度比较：内容难度超过用户等级 → 锁定 */
export function isLevelLocked(contentLevel: string, userLevel: UserLevel = getUserLevel()): boolean {
  return (ORDER[contentLevel] ?? 0) > (ORDER[userLevel] ?? 0);
}

export function useUserLevel(): { level: UserLevel; setLevel: (l: UserLevel) => void } {
  const level = useSyncExternalStore(subscribe, getUserLevel, () => DEFAULT_LEVEL as UserLevel);
  return { level, setLevel: setUserLevel };
}
