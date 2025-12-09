import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  username: string;
  role: 'admin' | 'atleta';
}

interface AuthState {
  user: User | null;
  login: (username: string, pass: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      
      login: (username, pass) => {
        const u = username.toLowerCase().trim();
        const p = pass.trim();

        if (u === 'admin' && p === 'nimda') {
          set({ user: { name: 'Administrador', username: 'admin', role: 'admin' } });
          return true;
        }

        if (u === 'atleta' && p === '123') {
          set({ user: { name: 'Atleta', username: 'atleta', role: 'atleta' } });
          return true;
        }

        return false;
      },

      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);