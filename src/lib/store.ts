"use client";

import { create } from "zustand";

export type ViewName =
  | "discover"
  | "browse"
  | "saved"
  | "alerts"
  | "profile"
  | "publisher"
  | "admin"
  | "auth"
  | "magazine"
  | "page";

export type View = { name: ViewName; params?: Record<string, string> };

type AppState = {
  stack: View[];
  reader: { url: string; title: string; magazine: string } | null;
  current: View;
  push: (v: View) => void;
  replace: (v: View) => void;
  back: () => void;
  openReader: (r: { url: string; title: string; magazine: string }) => void;
  closeReader: () => void;
};

export const useApp = create<AppState>((set) => ({
  stack: [{ name: "discover" }],
  reader: null,
  current: { name: "discover" },
  push: (v) => set((s) => ({ stack: [...s.stack, v], current: v })),
  replace: (v) => set((s) => ({ stack: [...s.stack.slice(0, -1), v], current: v })),
  back: () =>
    set((s) => {
      if (s.stack.length <= 1) return { current: s.stack[0] };
      return { stack: s.stack.slice(0, -1), current: s.stack[s.stack.length - 2] };
    }),
  openReader: (reader) => set({ reader }),
  closeReader: () => set({ reader: null }),
}));
