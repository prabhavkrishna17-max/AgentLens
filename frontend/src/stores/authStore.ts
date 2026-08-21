import { create } from 'zustand';

interface AuthState {
  temporaryApiKey: string | null;
  setTemporaryApiKey: (key: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  temporaryApiKey: null,
  setTemporaryApiKey: (key) => set({ temporaryApiKey: key }),
}));
