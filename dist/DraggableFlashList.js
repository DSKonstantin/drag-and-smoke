"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraggableFlashList = DraggableFlashList;
const react_1 = __importDefault(require("react"));
const flash_list_1 = require("@shopify/flash-list");
const context_1 = require("./context");
const DraggableItem_1 = require("./DraggableItem");
function DraggableFlashList(props) {
    var _a;
    const { data, renderItem, keyExtractor, estimatedItemSize, onScroll: onScrollProp, extraData, dragCallbacks, onDragEnd, autoScrollEnabled, autoScrollEdgeDistance, autoScrollMaxStep, ...rest } = props;
    if (!estimatedItemSize) {
        console.warn('DraggableFlashList: estimatedItemSize is recommended for performance and correct drag calculations.');
    }
    // resolve getId
    const getId = react_1.default.useMemo(() => {
        if (props.getId)
            return props.getId;
        // IMPORTANT: do not use user-provided keyExtractor for internal IDs,
        // as it may depend on index and become unstable during reordering.
        return (item) => { var _a, _b; return String((_b = (_a = item === null || item === void 0 ? void 0 : item.id) !== null && _a !== void 0 ? _a : item === null || item === void 0 ? void 0 : item.key) !== null && _b !== void 0 ? _b : item); };
    }, [props.getId]);
    // internal order of ids
    const [orderIdsState, setOrderIdsState] = react_1.default.useState(() => (data || []).map((it, i) => getId(it, i)));
    const orderIdsRef = react_1.default.useRef(orderIdsState);
    if (orderIdsRef.current !== orderIdsState)
        orderIdsRef.current = orderIdsState;
    // reconcile order when data changes (pagination etc.)
    react_1.default.useEffect(() => {
        const newIds = (data || []).map((it, i) => getId(it, i));
        setOrderIdsState((prev) => {
            if (prev.length === 0)
                return newIds;
            const prevSet = new Set(prev);
            const merged = [];
            // keep previous order for existing ids
            for (const id of prev)
                if (newIds.includes(id))
                    merged.push(id);
            // append new ids in the order they appear
            for (const id of newIds)
                if (!prevSet.has(id))
                    merged.push(id);
            // if equal, return prev to avoid rerender
            if (merged.length === prev.length && merged.every((v, i) => v === prev[i]))
                return prev;
            return merged;
        });
    }, [data, getId]);
    // scrolling offset
    const scrollYRef = react_1.default.useRef(0);
    const onScroll = react_1.default.useCallback((e) => {
        var _a;
        scrollYRef.current = ((_a = e.nativeEvent.contentOffset) === null || _a === void 0 ? void 0 : _a.y) || 0;
        onScrollProp === null || onScrollProp === void 0 ? void 0 : onScrollProp(e);
    }, [onScrollProp]);
    // measurements map
    const layoutsRef = react_1.default.useRef(new Map());
    const [layoutVersion, setLayoutVersion] = react_1.default.useState(0);
    const setItemLayout = react_1.default.useCallback((id, index, y, height) => {
        const prev = layoutsRef.current.get(id);
        if (!prev || prev.y !== y || prev.height !== height || prev.index !== index) {
            layoutsRef.current.set(id, { index, y, height });
            setLayoutVersion((v) => v + 1);
        }
    }, []);
    const removeItemLayout = react_1.default.useCallback((id) => {
        if (layoutsRef.current.delete(id))
            setLayoutVersion((v) => v + 1);
    }, []);
    const getIndexById = react_1.default.useCallback((id) => {
        return orderIdsRef.current.indexOf(id);
    }, []);
    // dragging state
    const activeIdRef = react_1.default.useRef(null);
    const startIndexRef = react_1.default.useRef(0);
    const translationYRef = react_1.default.useRef(0);
    // auto-scroll refs
    const listRef = react_1.default.useRef(null);
    const viewportHeightRef = react_1.default.useRef(0);
    const rafIdRef = react_1.default.useRef(null);
    const autoScrollActiveRef = react_1.default.useRef(false);
    const targetIndexRef = react_1.default.useRef(0);
    const setOrderIds = react_1.default.useCallback((ids) => {
        orderIdsRef.current = ids;
        setOrderIdsState(ids);
    }, []);
    // measure viewport height via FlashList onLayout
    const onListLayout = react_1.default.useCallback((e) => {
        var _a, _b, _c;
        const h = ((_b = (_a = e === null || e === void 0 ? void 0 : e.nativeEvent) === null || _a === void 0 ? void 0 : _a.layout) === null || _b === void 0 ? void 0 : _b.height) || 0;
        if (h && h !== viewportHeightRef.current)
            viewportHeightRef.current = h;
        (_c = rest === null || rest === void 0 ? void 0 : rest.onLayout) === null || _c === void 0 ? void 0 : _c.call(rest, e);
    }, [rest]);
    const getContentHeight = react_1.default.useCallback(() => {
        // Try measured layouts
        let maxBottom = 0;
        layoutsRef.current.forEach((v) => {
            const bottom = ((v === null || v === void 0 ? void 0 : v.y) || 0) + ((v === null || v === void 0 ? void 0 : v.height) || 0);
            if (bottom > maxBottom)
                maxBottom = bottom;
        });
        if (maxBottom > 0)
            return maxBottom;
        const est = estimatedItemSize || 0;
        return est * (orderIdsRef.current.length || 0);
    }, [estimatedItemSize]);
    const tickAutoScroll = react_1.default.useCallback(() => {
        var _a, _b, _c;
        rafIdRef.current = null;
        if (!autoScrollActiveRef.current)
            return;
        const id = activeIdRef.current;
        if (!id)
            return;
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
        const activeHeight = (_a = lay === null || lay === void 0 ? void 0 : lay.height) !== null && _a !== void 0 ? _a : est;
        const activeStartY = (_b = lay === null || lay === void 0 ? void 0 : lay.y) !== null && _b !== void 0 ? _b : from * est;
        const centerGlobal = activeStartY + (translationYRef.current || 0) + activeHeight / 2;
        const centerInViewport = centerGlobal - scrollY;
        // compute edge threshold and step from props
        const enabled = autoScrollEnabled !== false;
        if (!enabled) {
            rafIdRef.current = requestAnimationFrame(tickAutoScroll);
            return;
        }
        let threshold;
        const edge = autoScrollEdgeDistance;
        if (typeof edge === 'number' && edge > 0) {
            if (edge > 0 && edge <= 1)
                threshold = viewportH * edge;
            else
                threshold = edge;
        }
        else {
            threshold = Math.min(80, Math.max(40, viewportH * 0.2));
        }
        // clamp threshold to reasonable range
        threshold = Math.max(12, Math.min(viewportH / 2, threshold));
        const maxStep = Math.max(1, Math.min(64, (autoScrollMaxStep !== null && autoScrollMaxStep !== void 0 ? autoScrollMaxStep : 24))); // px per frame at most
        let nextOffset = scrollY;
        if (centerInViewport > viewportH - threshold) {
            const dist = Math.min(threshold, centerInViewport - (viewportH - threshold));
            const step = Math.max(2, (dist / threshold) * maxStep);
            nextOffset = scrollY + step;
        }
        else if (centerInViewport < threshold) {
            const dist = Math.min(threshold, threshold - centerInViewport);
            const step = Math.max(2, (dist / threshold) * maxStep);
            nextOffset = scrollY - step;
        }
        const contentH = getContentHeight();
        const maxOffset = Math.max(0, contentH - viewportH);
        if (nextOffset < 0)
            nextOffset = 0;
        if (nextOffset > maxOffset)
            nextOffset = maxOffset;
        if (nextOffset !== scrollY) {
            try {
                (_c = listRef.current) === null || _c === void 0 ? void 0 : _c.scrollToOffset({ offset: nextOffset, animated: false });
            }
            catch { }
        }
        rafIdRef.current = requestAnimationFrame(tickAutoScroll);
    }, [estimatedItemSize, getContentHeight, autoScrollEnabled, autoScrollEdgeDistance, autoScrollMaxStep]);
    const beginDrag = react_1.default.useCallback((id) => {
        var _a;
        activeIdRef.current = id;
        startIndexRef.current = getIndexById(id);
        targetIndexRef.current = startIndexRef.current;
        translationYRef.current = 0;
        const enabled = autoScrollEnabled !== false;
        autoScrollActiveRef.current = enabled;
        if (enabled && rafIdRef.current == null) {
            rafIdRef.current = requestAnimationFrame(tickAutoScroll);
        }
        (_a = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragStart) === null || _a === void 0 ? void 0 : _a.call(dragCallbacks, { id, index: startIndexRef.current });
    }, [dragCallbacks, getIndexById, tickAutoScroll, autoScrollEnabled]);
    const updateDrag = react_1.default.useCallback((translationY) => {
        var _a, _b, _c, _d, _e;
        if (!activeIdRef.current)
            return;
        translationYRef.current = translationY;
        const id = activeIdRef.current;
        const from = startIndexRef.current;
        const est = estimatedItemSize || 1;
        // Determine active item layout
        const activeLayout = layoutsRef.current.get(id);
        const activeHeight = (_a = activeLayout === null || activeLayout === void 0 ? void 0 : activeLayout.height) !== null && _a !== void 0 ? _a : est;
        const activeStartY = (_b = activeLayout === null || activeLayout === void 0 ? void 0 : activeLayout.y) !== null && _b !== void 0 ? _b : from * est;
        // Active center after translation
        const activeCenter = activeStartY + (translationY || 0) + activeHeight / 2;
        // Find the closest index by center comparison
        const idsNow = orderIdsRef.current;
        let targetIndex = 0;
        let minDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < idsNow.length; i++) {
            const otherId = idsNow[i];
            const lay = layoutsRef.current.get(otherId);
            const h = (_c = lay === null || lay === void 0 ? void 0 : lay.height) !== null && _c !== void 0 ? _c : est;
            const y = (_d = lay === null || lay === void 0 ? void 0 : lay.y) !== null && _d !== void 0 ? _d : i * est;
            const center = y + h / 2;
            const dist = Math.abs(center - activeCenter);
            if (dist < minDist) {
                minDist = dist;
                targetIndex = i;
            }
        }
        const max = idsNow.length - 1;
        if (targetIndex < 0)
            targetIndex = 0;
        else if (targetIndex > max)
            targetIndex = max;
        // Track target index during drag, don't reorder now
        targetIndexRef.current = targetIndex;
        (_e = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragMove) === null || _e === void 0 ? void 0 : _e.call(dragCallbacks, { id: id, index: targetIndex, translationY });
    }, [estimatedItemSize, dragCallbacks, setOrderIds]);
    const endDrag = react_1.default.useCallback(() => {
        var _a;
        if (!activeIdRef.current)
            return;
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
            if (to < 0)
                to = 0;
            else if (to > newIds.length)
                to = newIds.length;
            newIds.splice(to, 0, id);
            setOrderIds(newIds);
        }
        activeIdRef.current = null;
        translationYRef.current = 0;
        (_a = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragEnd) === null || _a === void 0 ? void 0 : _a.call(dragCallbacks, { id, from, to });
        if (onDragEnd) {
            // compute ordered data
            const idToItem = new Map();
            (data || []).forEach((it, i) => idToItem.set(getId(it, i), it));
            const idsOrdered = orderIdsRef.current.slice();
            const newData = idsOrdered.map((id) => idToItem.get(id));
            onDragEnd({ from, to, ids: idsOrdered, data: newData });
        }
    }, [dragCallbacks, onDragEnd, data, getId, setOrderIds]);
    const getPositionsSnapshot = react_1.default.useCallback(() => {
        const out = [];
        const est = estimatedItemSize || 0;
        orderIdsRef.current.forEach((id, index) => {
            const lay = layoutsRef.current.get(id);
            if (lay) {
                out.push({ id, index, y: lay.y, height: lay.height, isEstimated: false });
            }
            else {
                out.push({ id, index, y: index * est, height: est, isEstimated: true });
            }
        });
        return out;
    }, [estimatedItemSize]);
    // assemble context value
    const contextValue = react_1.default.useMemo(() => ({
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
    const idToItem = react_1.default.useMemo(() => {
        const map = new Map();
        (data || []).forEach((it, i) => map.set(getId(it, i), it));
        return map;
    }, [data, getId]);
    const orderedData = react_1.default.useMemo(() => {
        return orderIdsState.map((id) => idToItem.get(id)).filter(Boolean);
    }, [orderIdsState, idToItem]);
    // wrap renderItem
    const renderItemWrapped = react_1.default.useCallback((info) => {
        const id = getId(info.item, info.index);
        const child = renderItem === null || renderItem === void 0 ? void 0 : renderItem(info);
        // If user already wrapped with DraggableItem, respect it to avoid double handlers
        if (child && child.type === DraggableItem_1.DraggableItem)
            return child;
        return (<DraggableItem_1.DraggableItem id={id} index={info.index}>
        {child}
      </DraggableItem_1.DraggableItem>);
    }, [getId, renderItem]);
    const mergedExtraData = react_1.default.useMemo(() => ({
        user: extraData,
        order: orderIdsState.join(','),
        layoutVersion,
    }), [extraData, orderIdsState, layoutVersion]);
    const mergedScrollEventThrottle = (_a = props === null || props === void 0 ? void 0 : props.scrollEventThrottle) !== null && _a !== void 0 ? _a : 16;
    return (<context_1.DraggableContext.Provider value={contextValue}>
      <flash_list_1.FlashList ref={listRef} {...rest} data={orderedData} renderItem={renderItemWrapped} keyExtractor={(item, index) => getId(item, index)} estimatedItemSize={estimatedItemSize} onScroll={onScroll} onLayout={onListLayout} extraData={mergedExtraData} scrollEventThrottle={mergedScrollEventThrottle}/>
    </context_1.DraggableContext.Provider>);
}
