import React from 'react';
export type PositionEntry = {
    id: string;
    index: number;
    y: number;
    height: number;
    isEstimated?: boolean;
};
export type DragCallbacks = {
    onDragStart?: (params: {
        id: string;
        index: number;
    }) => void;
    onDragMove?: (params: {
        id: string;
        index: number;
        translationY: number;
    }) => void;
    onDragEnd?: (params: {
        id: string;
        from: number;
        to: number;
    }) => void;
};
export type DraggableContextValue = {
    getId: (item: any, index: number) => string;
    estimatedItemSize: number;
    orderIdsRef: React.MutableRefObject<string[]>;
    setOrderIds: (ids: string[]) => void;
    positionsVersion: number;
    orderSignature: string;
    scrollYRef: React.MutableRefObject<number>;
    setItemLayout: (id: string, index: number, y: number, height: number) => void;
    removeItemLayout: (id: string) => void;
    getIndexById: (id: string) => number;
    activeIdRef: React.MutableRefObject<string | null>;
    startIndexRef: React.MutableRefObject<number>;
    translationYRef: React.MutableRefObject<number>;
    beginDrag: (id: string) => void;
    updateDrag: (translationY: number) => void;
    endDrag: () => void;
    dragCallbacksRef: React.MutableRefObject<DragCallbacks | undefined>;
    getPositionsSnapshot: () => PositionEntry[];
};
export declare const DraggableContext: React.Context<DraggableContextValue | null>;
