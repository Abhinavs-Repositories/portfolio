import { useSyncExternalStore } from 'react';
import type { RefObject } from 'react';

// External (module-level) store for the project View tracking.
// Lives outside React Context so children of <Canvas> can read it
// without paying for a context bridge.

export type ProjectViewEntry = {
  id: string;
  panelRef: RefObject<HTMLElement>;
  hovered: boolean;
  kind: 'RacingLine' | 'StateMachine' | 'RetrievalManifold' | 'TokenRiver';
};

const entries = new Map<string, ProjectViewEntry>();
const listeners = new Set<() => void>();
let snapshot: ProjectViewEntry[] = [];

function recompute() {
  snapshot = Array.from(entries.values());
  listeners.forEach((l) => l());
}

export function registerProjectView(entry: Omit<ProjectViewEntry, 'hovered'>) {
  entries.set(entry.id, { ...entry, hovered: false });
  recompute();
  return () => {
    entries.delete(entry.id);
    recompute();
  };
}

export function setProjectHover(id: string, hovered: boolean) {
  const cur = entries.get(id);
  if (!cur || cur.hovered === hovered) return;
  entries.set(id, { ...cur, hovered });
  recompute();
}

export function useProjectViews(): ProjectViewEntry[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}
