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
    const { data, renderItem, keyExtractor, estimatedItemSize, onScroll: onScrollProp, extraData, dragCallbacks, onDragEnd, ...rest } = props;
    if (!estimatedItemSize) {
        console.warn('DraggableFlashList: estimatedItemSize is recommended for performance and correct drag calculations.');
    }
    // resolve getId
    const getId = react_1.default.useMemo(() => {
        if (props.getId)
            return props.getId;
        if (keyExtractor)
            return (item, index) => String(keyExtractor(item, index));
        return (item) => { var _a, _b; return String((_b = (_a = item === null || item === void 0 ? void 0 : item.id) !== null && _a !== void 0 ? _a : item === null || item === void 0 ? void 0 : item.key) !== null && _b !== void 0 ? _b : item); };
    }, [props.getId, keyExtractor]);
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
    const setOrderIds = react_1.default.useCallback((ids) => {
        orderIdsRef.current = ids;
        setOrderIdsState(ids);
    }, []);
    const beginDrag = react_1.default.useCallback((id) => {
        var _a;
        activeIdRef.current = id;
        startIndexRef.current = getIndexById(id);
        translationYRef.current = 0;
        (_a = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragStart) === null || _a === void 0 ? void 0 : _a.call(dragCallbacks, { id, index: startIndexRef.current });
    }, [dragCallbacks, getIndexById]);
    const updateDrag = react_1.default.useCallback((translationY) => {
        var _a;
        if (!activeIdRef.current)
            return;
        translationYRef.current = translationY;
        const from = startIndexRef.current;
        const est = estimatedItemSize || 1;
        const delta = Math.round(translationY / est);
        let to = from + delta;
        const max = orderIdsRef.current.length - 1;
        if (to < 0)
            to = 0;
        else if (to > max)
            to = max;
        if (to !== from) {
            const id = activeIdRef.current;
            const ids = orderIdsRef.current.slice();
            const curIndex = ids.indexOf(id);
            ids.splice(curIndex, 1);
            ids.splice(to, 0, id);
            setOrderIds(ids);
            (_a = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragMove) === null || _a === void 0 ? void 0 : _a.call(dragCallbacks, { id: id, index: to, translationY });
        }
    }, [estimatedItemSize, dragCallbacks, setOrderIds]);
    const endDrag = react_1.default.useCallback(() => {
        var _a;
        if (!activeIdRef.current)
            return;
        const id = activeIdRef.current;
        const from = startIndexRef.current;
        const to = orderIdsRef.current.indexOf(id);
        activeIdRef.current = null;
        translationYRef.current = 0;
        (_a = dragCallbacks === null || dragCallbacks === void 0 ? void 0 : dragCallbacks.onDragEnd) === null || _a === void 0 ? void 0 : _a.call(dragCallbacks, { id, from, to });
        if (onDragEnd) {
            // compute ordered data
            const idToItem = new Map();
            (data || []).forEach((it, i) => idToItem.set(getId(it, i), it));
            const newData = orderIdsRef.current.map((id) => idToItem.get(id));
            onDragEnd({ from, to, ids: orderIdsRef.current.slice(), data: newData });
        }
    }, [dragCallbacks, onDragEnd, data, getId]);
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
        return (<DraggableItem_1.DraggableItem id={id} index={info.index}>
        {renderItem === null || renderItem === void 0 ? void 0 : renderItem(info)}
      </DraggableItem_1.DraggableItem>);
    }, [getId, renderItem]);
    const mergedExtraData = react_1.default.useMemo(() => ({
        user: extraData,
        order: orderIdsState.join(','),
        layoutVersion,
    }), [extraData, orderIdsState, layoutVersion]);
    return (<context_1.DraggableContext.Provider value={contextValue}>
      <flash_list_1.FlashList {...rest} data={orderedData} renderItem={renderItemWrapped} keyExtractor={(item, index) => getId(item, index)} estimatedItemSize={estimatedItemSize} onScroll={onScroll} extraData={mergedExtraData}/>
    </context_1.DraggableContext.Provider>);
}
