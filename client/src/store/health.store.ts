import { create } from "zustand";

interface HealthState {
    vitals: any[];
    loadVitals: () => void;
}

export const useHealthStore = create<HealthState>((set) => ({
    vitals: [],
    loadVitals: () => set({ vitals: [] }), // Placeholder
}));
