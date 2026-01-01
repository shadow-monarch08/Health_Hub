import { create } from "zustand";

interface ProfileState {
    currentProfile: null | { id: string; name: string };
    setProfile: (profile: { id: string; name: string }) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
    currentProfile: null,
    setProfile: (profile) => set({ currentProfile: profile }),
}));
