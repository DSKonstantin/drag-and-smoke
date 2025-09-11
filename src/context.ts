import React from 'react';

export type PositionEntry = {
  id: string;
  index: number;
  y: number;
  height: number;
  isEstimated?: boolean;
};

export type DragCallbacks = {
  onDragStart?: (params: { id: string; index: number }) => void;
  onDragMove?: (params: { id: string; index: number; translationY: number }) => void;
  onDragEnd?: (params: { id: string; from: number; to: number }) => void;
};

export type DraggableContextValue = {
  getId: (item: any, index: number) => string;
  estimatedItemSize: number;
  // order and mutations
  orderIdsRef: React.MutableRefObject<string[]>;
  setOrderIds: (ids: string[]) => void;
  // versions to trigger updates in hooks
  positionsVersion: number; // increments when layouts change
  orderSignature: string; // e.g., comma-joined ids
  // scrolling
  scrollYRef: React.MutableRefObject<number>;
  // measurements
  setItemLayout: (id: string, index: number, y: number, height: number) => void;
  removeItemLayout: (id: string) => void;
  getIndexById: (id: string) => number;
  // dragging state
  activeIdRef: React.MutableRefObject<string | null>;
  startIndexRef: React.MutableRefObject<number>;
  translationYRef: React.MutableRefObject<number>;
  beginDrag: (id: string) => void;
  updateDrag: (translationY: number) => void;
  endDrag: () => void;
  // user callbacks
  dragCallbacksRef: React.MutableRefObject<DragCallbacks | undefined>;
  // access positions snapshot
  getPositionsSnapshot: () => PositionEntry[];
};

export const DraggableContext = React.createContext<DraggableContextValue | null>(null);
