import React from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { FlashList, FlashListProps, ListRenderItemInfo } from '@shopify/flash-list';
import { DraggableContext, DragCallbacks, PositionEntry } from './context';
import { DraggableItem } from './DraggableItem';

export type DraggableFlashListProps<T> = FlashListProps<T> & {
  // Optional override to derive a stable id for an item. Defaults to keyExtractor or item.id
  getId?: (item: T, index: number) => string;
  // Drag callbacks
  dragCallbacks?: DragCallbacks;
  // Called when drag finishes with new order indices and arrays
  onDragEnd?: (params: { from: number; to: number; ids: string[]; data: T[] }) => void;
};

export function DraggableFlashList<T>(props: DraggableFlashListProps<T>) {
  const {
    data,
    renderItem,
    keyExtractor,
    estimatedItemSize,
    onScroll: onScrollProp,
    extraData,
    dragCallbacks,
    onDragEnd,
    ...rest
  } = props as any;

  if (!estimatedItemSize) {
    console.warn('DraggableFlashList: estimatedItemSize is recommended for performance and correct drag calculations.');
  }

  // resolve getId
  const getId = React.useMemo(() => {
    if (props.getId) return props.getId;
    if (keyExtractor) return (item: T, index: number) => String(keyExtractor(item, index));
    return (item: any) => String(item?.id ?? item?.key ?? item);
  }, [props.getId, keyExtractor]);

  // internal order of ids
  const [orderIdsState, setOrderIdsState] = React.useState<string[]>(() => (data || []).map((it: T, i: number) => getId(it, i)));
  const orderIdsRef = React.useRef<string[]>(orderIdsState);
  if (orderIdsRef.current !== orderIdsState) orderIdsRef.current = orderIdsState;

  // reconcile order when data changes (pagination etc.)
  React.useEffect(() => {
    const newIds = (data || []).map((it: T, i: number) => getId(it, i));
    setOrderIdsState((prev: string[]) => {
      if (prev.length === 0) return newIds;
      const prevSet = new Set(prev);
      const merged: string[] = [];
      // keep previous order for existing ids
      for (const id of prev) if (newIds.includes(id)) merged.push(id);
      // append new ids in the order they appear
      for (const id of newIds) if (!prevSet.has(id)) merged.push(id);
      // if equal, return prev to avoid rerender
      if (merged.length === prev.length && merged.every((v, i) => v === prev[i])) return prev;
      return merged;
    });
  }, [data, getId]);

  // scrolling offset
  const scrollYRef = React.useRef(0);
  const onScroll = React.useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset?.y || 0;
    onScrollProp?.(e);
  }, [onScrollProp]);

  // measurements map
  const layoutsRef = React.useRef<Map<string, { index: number; y: number; height: number }>>(new Map());
  const [layoutVersion, setLayoutVersion] = React.useState(0);

  const setItemLayout = React.useCallback((id: string, index: number, y: number, height: number) => {
    const prev = layoutsRef.current.get(id);
    if (!prev || prev.y !== y || prev.height !== height || prev.index !== index) {
      layoutsRef.current.set(id, { index, y, height });
      setLayoutVersion((v: number) => v + 1);
    }
  }, []);

  const removeItemLayout = React.useCallback((id: string) => {
    if (layoutsRef.current.delete(id)) setLayoutVersion((v: number) => v + 1);
  }, []);

  const getIndexById = React.useCallback((id: string) => {
    return orderIdsRef.current.indexOf(id);
  }, []);

  // dragging state
  const activeIdRef = React.useRef<string | null>(null);
  const startIndexRef = React.useRef(0);
  const translationYRef = React.useRef(0);

  const setOrderIds = React.useCallback((ids: string[]) => {
    orderIdsRef.current = ids;
    setOrderIdsState(ids);
  }, []);

  const beginDrag = React.useCallback((id: string) => {
    activeIdRef.current = id;
    startIndexRef.current = getIndexById(id);
    translationYRef.current = 0;
    dragCallbacks?.onDragStart?.({ id, index: startIndexRef.current });
  }, [dragCallbacks, getIndexById]);

  const updateDrag = React.useCallback((translationY: number) => {
    if (!activeIdRef.current) return;
    translationYRef.current = translationY;
    const from = startIndexRef.current;
    const est = estimatedItemSize || 1;
    const delta = Math.round(translationY / est);
    let to = from + delta;
    const max = orderIdsRef.current.length - 1;
    if (to < 0) to = 0; else if (to > max) to = max;
    if (to !== from) {
      const id = activeIdRef.current;
      const ids = orderIdsRef.current.slice();
      const curIndex = ids.indexOf(id!);
      ids.splice(curIndex, 1);
      ids.splice(to, 0, id!);
      setOrderIds(ids);
      dragCallbacks?.onDragMove?.({ id: id!, index: to, translationY });
    }
  }, [estimatedItemSize, dragCallbacks, setOrderIds]);

  const endDrag = React.useCallback(() => {
    if (!activeIdRef.current) return;
    const id = activeIdRef.current;
    const from = startIndexRef.current;
    const to = orderIdsRef.current.indexOf(id);
    activeIdRef.current = null;
    translationYRef.current = 0;
    dragCallbacks?.onDragEnd?.({ id, from, to });
    if (onDragEnd) {
      // compute ordered data
      const idToItem = new Map<string, T>();
      (data || []).forEach((it: T, i: number) => idToItem.set(getId(it, i), it));
      const newData = orderIdsRef.current.map((id: string) => idToItem.get(id) as T);
      onDragEnd({ from, to, ids: orderIdsRef.current.slice(), data: newData });
    }
  }, [dragCallbacks, onDragEnd, data, getId]);

  const getPositionsSnapshot = React.useCallback((): PositionEntry[] => {
    const out: PositionEntry[] = [];
    const est = estimatedItemSize || 0;
    orderIdsRef.current.forEach((id: string, index: number) => {
      const lay = layoutsRef.current.get(id);
      if (lay) {
        out.push({ id, index, y: lay.y, height: lay.height, isEstimated: false });
      } else {
        out.push({ id, index, y: index * est, height: est, isEstimated: true });
      }
    });
    return out;
  }, [estimatedItemSize]);

  // assemble context value
  const contextValue = React.useMemo(() => ({
    getId,
    estimatedItemSize: estimatedItemSize || 0,
    orderIdsRef,
    setOrderIds,
    positionsVersion: layoutVersion,
    orderSignature: orderIdsState.join(','),
    scrollYRef,
    setItemLayout,
    removeItemLayout,
    getIndexById,
    activeIdRef,
    startIndexRef,
    translationYRef,
    beginDrag,
    updateDrag,
    endDrag,
    dragCallbacksRef: { current: dragCallbacks },
    getPositionsSnapshot,
  }), [getId, estimatedItemSize, setOrderIds, layoutVersion, orderIdsState, setItemLayout, removeItemLayout, getIndexById, beginDrag, updateDrag, endDrag, dragCallbacks, getPositionsSnapshot]);

  // ordered data computation
  const idToItem = React.useMemo(() => {
    const map = new Map<string, T>();
    (data || []).forEach((it: T, i: number) => map.set(getId(it, i), it));
    return map;
  }, [data, getId]);

  const orderedData: T[] = React.useMemo(() => {
    return orderIdsState.map((id: string) => idToItem.get(id) as T).filter(Boolean);
  }, [orderIdsState, idToItem]);

  // wrap renderItem
  const renderItemWrapped = React.useCallback((info: ListRenderItemInfo<T>) => {
    const id = getId(info.item, info.index);
    return (
      <DraggableItem id={id} index={info.index}>
        {renderItem?.(info) as any}
      </DraggableItem>
    );
  }, [getId, renderItem]);

  const mergedExtraData = React.useMemo(() => ({
    user: extraData,
    order: orderIdsState.join(','),
    layoutVersion,
  }), [extraData, orderIdsState, layoutVersion]);

  return (
    <DraggableContext.Provider value={contextValue as any}>
      <FlashList
        {...(rest as any)}
        data={orderedData as any}
        renderItem={renderItemWrapped}
        keyExtractor={(item: T, index: number) => getId(item, index)}
        estimatedItemSize={estimatedItemSize}
        onScroll={onScroll}
        extraData={mergedExtraData}
      />
    </DraggableContext.Provider>
  );
}
