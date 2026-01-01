import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
  duration: number;
  timeoutId: number;
  showToast: (params: {
    message: string;
    type: ToastType;
    duration?: number;
  }) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  message: "",
  type: "info",
  isVisible: false,
  duration: 3000,
  timeoutId: 0,
  showToast: ({ message, type, duration = 3000 }) => {
    set({ message, type, isVisible: true, duration });

    if (duration > 0) {
      get().timeoutId && clearTimeout(get().timeoutId);
      const id = setTimeout(() => {
        set((state) => {
          // Only hide if it's still the same toast (simple check)
          // Ideally we'd use IDs, but for this simple version, this works
          if (state.isVisible && state.message === message) {
            return { isVisible: false };
          }
          return state;
        });
      }, duration);
      set({ timeoutId: id });
    }
  },
  hideToast: () => set({ isVisible: false }),
}));
