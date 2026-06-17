/**
 * 终端用户登录态（localStorage + useSyncExternalStore）
 * 沿用 user-level.ts 的轻量 store 范式，不引第三方状态库。
 */
import { useSyncExternalStore } from 'react';

export interface AuthUser {
  id: string;
  username?: string | null;
  nickname: string;
  avatar: string;
  phone?: string | null;
  age?: number | null;
  learningStage?: string | null;
  gradeStage?: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

const KEY = 'oisee-auth-v1';

function read(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

let current: AuthSession | null = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): AuthSession | null {
  return current;
}

export function getToken(): string | null {
  return current?.accessToken ?? null;
}

export function setSession(session: AuthSession) {
  current = session;
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* quota */ }
  emit();
}

export function clearSession() {
  current = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useAuth() {
  const session = useSyncExternalStore(subscribe, getSession, () => null);
  return {
    user: session?.user ?? null,
    isAuthed: !!session,
    setSession,
    logout: clearSession,
  };
}
