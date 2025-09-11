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
  // Auto-scroll configuration
  autoScrollEnabled?: boolean; // default true
  autoScrollEdgeDistance?: number; // if 0..1 => fraction of viewport height; otherwise pixels
  autoScrollMaxStep?: number; // max px per frame, default 24
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
    autoScrollEnabled,
    autoScrollEdgeDistance,
    autoScrollMaxStep,
    ...rest
  } = props as any;

  if (!estimatedItemSize) {
    console.warn('DraggableFlashList: estimatedItemSize is recommended for performance and correct drag calculations.');
  }

  // resolve getId
  const getId = React.useMemo(() => {
    if (props.getId) return props.getId;
    // IMPORTANT: do not use user-provided keyExtractor for internal IDs,
    // as it may depend on index and become unstable during reordering.
    return (item: any) => String(item?.id ?? item?.key ?? item);
  }, [props.getId]);

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
  // auto-scroll refs
  const listRef = React.useRef<any>(null);
  const viewportHeightRef = React.useRef(0);
  const rafIdRef = React.useRef<number | null>(null);
  const autoScrollActiveRef = React.useRef(false);
  const targetIndexRef = React.useRef(0);

  const setOrderIds = React.useCallback((ids: string[]) => {
    orderIdsRef.current = ids;
    setOrderIdsState(ids);
  }, []);

  // measure viewport height via FlashList onLayout
  const onListLayout = React.useCallback((e: any) => {
    const h = e?.nativeEvent?.layout?.height || 0;
    if (h && h !== viewportHeightRef.current) viewportHeightRef.current = h;
    (rest as any)?.onLayout?.(e);
  }, [rest]);

  const getContentHeight = React.useCallback(() => {
    // Try measured layouts
    let maxBottom = 0;
    layoutsRef.current.forEach((v) => {
      const bottom = (v?.y || 0) + (v?.height || 0);
      if (bottom > maxBottom) maxBottom = bottom;
    });
    if (maxBottom > 0) return maxBottom;
    const est = estimatedItemSize || 0;
    return est * (orderIdsRef.current.length || 0);
  }, [estimatedItemSize]);

  const tickAutoScroll = React.useCallback(() => {
    rafIdRef.current = null;
    if (!autoScrollActiveRef.current) return;
    const id = activeIdRef.current;
    if (!id) return;

    const est = estimatedItemSize || 1;
    const viewportH = viewportHeightRef.current || 0;
    const scrollY = scrollYRef.current || 0;

    // Need viewport height to decide
    if (viewportH <= 0) {
      rafIdRef.current = requestAnimationFrame(tickAutoScroll);
      return;
    }

    const lay = layoutsRef.current.get(id);
    const from = startIndexRef.current;
    const activeHeight = lay?.height ?? est;
    const activeStartY = lay?.y ?? from * est;
    const centerGlobal = activeStartY + (translationYRef.current || 0) + activeHeight / 2;
    const centerInViewport = centerGlobal - scrollY;

    // compute edge threshold and step from props
    const enabled = autoScrollEnabled !== false;
    if (!enabled) {
      rafIdRef.current = requestAnimationFrame(tickAutoScroll);
      return;
    }
    let threshold: number;
    const edge = autoScrollEdgeDistance;
    if (typeof edge === 'number' && edge > 0) {
      if (edge > 0 && edge <= 1) threshold = viewportH * edge; else threshold = edge;
    } else {
      threshold = Math.min(80, Math.max(40, viewportH * 0.2));
    }
    // clamp threshold to reasonable range
    threshold = Math.max(12, Math.min(viewportH / 2, threshold));

    const maxStep = Math.max(1, Math.min(64, (autoScrollMaxStep ?? 24))); // px per frame at most
    let nextOffset = scrollY;

    if (centerInViewport > viewportH - threshold) {
      const dist = Math.min(threshold, centerInViewport - (viewportH - threshold));
      const step = Math.max(2, (dist / threshold) * maxStep);
      nextOffset = scrollY + step;
    } else if (centerInViewport < threshold) {
      const dist = Math.min(threshold, threshold - centerInViewport);
      const step = Math.max(2, (dist / threshold) * maxStep);
      nextOffset = scrollY - step;
    }

    const contentH = getContentHeight();
    const maxOffset = Math.max(0, contentH - viewportH);
    if (nextOffset < 0) nextOffset = 0;
    if (nextOffset > maxOffset) nextOffset = maxOffset;

    if (nextOffset !== scrollY) {
      try {
        (listRef.current as any)?.scrollToOffset({ offset: nextOffset, animated: false });
      } catch {}
    }

    rafIdRef.current = requestAnimationFrame(tickAutoScroll);
  }, [estimatedItemSize, getContentHeight, autoScrollEnabled, autoScrollEdgeDistance, autoScrollMaxStep]);

  const beginDrag = React.useCallback((id: string) => {
    activeIdRef.current = id;
    startIndexRef.current = getIndexById(id);
    targetIndexRef.current = startIndexRef.current;
    translationYRef.current = 0;
    const enabled = autoScrollEnabled !== false;
    autoScrollActiveRef.current = enabled;
    if (enabled && rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tickAutoScroll);
    }
    dragCallbacks?.onDragStart?.({ id, index: startIndexRef.current });
  }, [dragCallbacks, getIndexById, tickAutoScroll, autoScrollEnabled]);

  const updateDrag = React.useCallback((translationY: number) => {
    if (!activeIdRef.current) return;
    translationYRef.current = translationY;
    const id = activeIdRef.current;
    const from = startIndexRef.current;
    const est = estimatedItemSize || 1;

    // Determine active item layout
    const activeLayout = layoutsRef.current.get(id!);
    const activeHeight = activeLayout?.height ?? est;
    const activeStartY = activeLayout?.y ?? from * est;

    // Active center after translation
    const activeCenter = activeStartY + (translationY || 0) + activeHeight / 2;

    // Find the closest index by center comparison
    const idsNow = orderIdsRef.current;
    let targetIndex = 0;
    let minDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < idsNow.length; i++) {
      const otherId = idsNow[i];
      const lay = layoutsRef.current.get(otherId);
      const h = lay?.height ?? est;
      const y = lay?.y ?? i * est;
      const center = y + h / 2;
      const dist = Math.abs(center - activeCenter);
      if (dist < minDist) {
        minDist = dist;
        targetIndex = i;
      }
    }

    const max = idsNow.length - 1;
    if (targetIndex < 0) targetIndex = 0; else if (targetIndex > max) targetIndex = max;

    // Track target index during drag, don't reorder now
    targetIndexRef.current = targetIndex;
    dragCallbacks?.onDragMove?.({ id: id!, index: targetIndex, translationY });
  }, [estimatedItemSize, dragCallbacks, setOrderIds]);

  const endDrag = React.useCallback(() => {
    if (!activeIdRef.current) return;
    const id = activeIdRef.current;
    const from = startIndexRef.current;
    let to = targetIndexRef.current;

    // stop auto-scroll
    autoScrollActiveRef.current = false;
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // Perform a single reorder based on target index
    const idsNow = orderIdsRef.current;
    const currentIndex = idsNow.indexOf(id);
    if (currentIndex !== to) {
      const newIds = idsNow.slice();
      newIds.splice(currentIndex, 1);
      if (to < 0) to = 0; else if (to > newIds.length) to = newIds.length;
      newIds.splice(to, 0, id);
      setOrderIds(newIds);
    }

    activeIdRef.current = null;
    translationYRef.current = 0;

    dragCallbacks?.onDragEnd?.({ id, from, to });
    if (onDragEnd) {
      // compute ordered data
      const idToItem = new Map<string, T>();
      (data || []).forEach((it: T, i: number) => idToItem.set(getId(it, i), it));
      const idsOrdered = orderIdsRef.current.slice();
      const newData = idsOrdered.map((id: string) => idToItem.get(id) as T);
      onDragEnd({ from, to, ids: idsOrdered, data: newData });
    }
  }, [dragCallbacks, onDragEnd, data, getId, setOrderIds]);

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
    const child = renderItem?.(info) as any;
    // If user already wrapped with DraggableItem, respect it to avoid double handlers
    if (child && child.type === DraggableItem) return child;
    return (
      <DraggableItem id={id} index={info.index}>
        {child}
      </DraggableItem>
    );
  }, [getId, renderItem]);

  const mergedExtraData = React.useMemo(() => ({
    user: extraData,
    order: orderIdsState.join(','),
    layoutVersion,
  }), [extraData, orderIdsState, layoutVersion]);

  const mergedScrollEventThrottle = (props as any)?.scrollEventThrottle ?? 16;

  return (
    <DraggableContext.Provider value={contextValue as any}>
      <FlashList
        ref={listRef as any}
        {...(rest as any)}
        data={orderedData as any}
        renderItem={renderItemWrapped}
        keyExtractor={(item: T, index: number) => getId(item, index)}
        estimatedItemSize={estimatedItemSize}
        onScroll={onScroll}
        onLayout={onListLayout}
        extraData={mergedExtraData}
        scrollEventThrottle={mergedScrollEventThrottle}
      />
    </DraggableContext.Provider>
  );
}
