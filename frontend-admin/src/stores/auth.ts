import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminInfo {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: AdminInfo | null;
  login: (data: { accessToken: string; refreshToken: string; admin: AdminInfo }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      admin: null,
      login: (data) =>
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          admin: data.admin,
        }),
      logout: () => set({ accessToken: null, refreshToken: null, admin: null }),
    }),
    { name: 'oisee-admin-auth' }
  )
);
