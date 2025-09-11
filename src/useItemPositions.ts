import React from 'react';
import { DraggableContext, PositionEntry } from './context';

export type UseItemPositionsResult = {
  positions: PositionEntry[];
  byId: Record<string, PositionEntry>;
  getById: (id: string) => PositionEntry | undefined;
  ids: string[];
};

export function useItemPositions(): UseItemPositionsResult {
  const ctx = React.useContext(DraggableContext);
  const positionsVersion = ctx?.positionsVersion;
  const orderSignature = ctx?.orderSignature;

  const positions = React.useMemo<PositionEntry[]>(() => {
    if (!ctx) return [];
    return ctx.getPositionsSnapshot();
  }, [ctx, positionsVersion, orderSignature]);

  const byId = React.useMemo(() => {
    const map: Record<string, PositionEntry> = {};
    for (const p of positions) map[p.id] = p;
    return map;
  }, [positions]);

  const ids = React.useMemo(() => positions.map((p: PositionEntry) => p.id), [positions]);

  const getById = React.useCallback((id: string) => byId[id], [byId]);

  return { positions, byId, getById, ids };
}
