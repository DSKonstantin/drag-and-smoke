import { PositionEntry } from './context';
export type UseItemPositionsResult = {
    positions: PositionEntry[];
    byId: Record<string, PositionEntry>;
    getById: (id: string) => PositionEntry | undefined;
    ids: string[];
};
export declare function useItemPositions(): UseItemPositionsResult;
