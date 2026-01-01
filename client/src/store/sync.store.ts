import { create } from "zustand";

interface SyncState {
    isSyncing: boolean;
    startSync: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    isSyncing: false,
    startSync: () => set({ isSyncing: true }),
}));
