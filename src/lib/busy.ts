"use client";

import { create } from "zustand";

type BusyState = {
  /** Current overlay label, or null when idle. */
  text: string | null;
  show: (text?: string) => void;
  hide: () => void;
};

/** Global "in flight" overlay state. The overlay blocks all clicks while an
 *  action runs, so the same button cannot be triggered twice. */
export const useBusy = create<BusyState>((set) => ({
  text: null,
  show: (text) => set({ text: text || "Working…" }),
  hide: () => set({ text: null }),
}));

let depth = 0;

/** Wrap an async action in the busy glass overlay: shows the spinner with the
 *  given label, blocks all interaction, and always hides when the promise
 *  settles (success or failure). Nested actions keep the overlay up. */
export function withBusy<T>(text: string, fn: () => Promise<T>): Promise<T> {
  depth += 1;
  useBusy.getState().show(text);
  return fn().finally(() => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) useBusy.getState().hide();
  });
}
