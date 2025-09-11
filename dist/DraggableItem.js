"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraggableItem = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_native_reanimated_1 = __importDefault(require("react-native-reanimated"));
const context_1 = require("./context");
const DraggableItem = ({ id, index, children }) => {
    const ctx = react_1.default.useContext(context_1.DraggableContext);
    const onGestureEvent = react_1.default.useCallback((e) => {
        if (!ctx)
            return;
        const { translationY, state } = e.nativeEvent || {};
        // state: 2=active, 5=end in RNGH v2
        if (state === 2) {
            if (ctx.activeIdRef.current == null) {
                ctx.beginDrag(id);
            }
            ctx.updateDrag(translationY || 0);
        }
        else if (state === 5 || state === 3) {
            // end/cancel
            ctx.endDrag();
        }
    }, [ctx, id]);
    const onLayout = react_1.default.useCallback((evt) => {
        const { y, height } = evt.nativeEvent.layout;
        if (ctx)
            ctx.setItemLayout(id, index, y, height);
    }, [ctx, id, index]);
    react_1.default.useEffect(() => {
        return () => {
            // cleanup layout when unmounts
            ctx === null || ctx === void 0 ? void 0 : ctx.removeItemLayout(id);
        };
    }, [ctx, id]);
    // Basic visual feedback while dragging this item (scale up)
    const isActive = (ctx === null || ctx === void 0 ? void 0 : ctx.activeIdRef.current) === id;
    return (<react_native_gesture_handler_1.PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onGestureEvent}>
      <react_native_reanimated_1.default.View style={{ transform: [{ scale: isActive ? 1.02 : 1 }] }} onLayout={onLayout}>
        <react_native_1.View>
          {children}
        </react_native_1.View>
      </react_native_reanimated_1.default.View>
    </react_native_gesture_handler_1.PanGestureHandler>);
};
exports.DraggableItem = DraggableItem;
