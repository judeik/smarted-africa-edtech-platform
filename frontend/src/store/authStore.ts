import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, AuthUser } from '../lib/api';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        // Don't set global isLoading — AuthModal manages its own isSubmitting state.
        // Setting it here causes App to unmount the modal during the API call.
        const data = await authApi.login(email, password);
        localStorage.setItem('smarted_access_token', data.accessToken);
        set({ user: data.user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // proceed even if server errors
        }
        localStorage.removeItem('smarted_access_token');
        set({ user: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('smarted_access_token');
        if (!token) {
          set({ isLoading: false });
          return;
        }
        set({ isLoading: true });
        try {
          const data = await authApi.getMe();
          set({ user: data.user, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('smarted_access_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'smarted-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Listen for forced logout (e.g., 401 from API layer)
if (typeof window !== 'undefined') {
  window.addEventListener('smarted:logout', () => {
    useAuthStore.getState().setUser(null);
  });
}
