import { create } from "zustand";

interface AuthState {
    user: null | { id: string; name: string };
    isAuthenticated: boolean;
    login: () => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    login: () => set({ isAuthenticated: true, user: { id: "1", name: "User" } }),
    logout: () => set({ isAuthenticated: false, user: null }),
}));
