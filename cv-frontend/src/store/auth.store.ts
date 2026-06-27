import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { authApi } from '@/api';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          set({ user: data });
        } catch {
          localStorage.removeItem('token');
          set({ user: null, token: null });
        }
      },
    }),
    { name: 'auth-store', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);