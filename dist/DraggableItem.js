"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraggableItem = void 0;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_native_reanimated_1 = __importStar(require("react-native-reanimated"));
const context_1 = require("./context");
const DraggableItem = ({ id, index, children }) => {
    const ctx = react_1.default.useContext(context_1.DraggableContext);
    const translateY = (0, react_native_reanimated_1.useSharedValue)(0);
    const isActiveSV = (0, react_native_reanimated_1.useSharedValue)(0);
    const heightRef = react_1.default.useRef(0);
    const [measuredHeight, setMeasuredHeight] = react_1.default.useState(0);
    const [isActiveJS, setIsActiveJS] = react_1.default.useState(false);
    // Handle continuous gesture updates only
    const onGestureEvent = react_1.default.useCallback((e) => {
        if (!ctx)
            return;
        const { translationY } = e.nativeEvent || {};
        translateY.value = translationY || 0;
        if (isActiveJS && measuredHeight > 0) {
            ctx.updateDrag(translationY || 0);
        }
    }, [ctx, translateY, isActiveJS, measuredHeight]);
    // Handle state changes (begin/end/cancel)
    const onHandlerStateChange = react_1.default.useCallback((e) => {
        if (!ctx)
            return;
        const { state, translationY } = e.nativeEvent || {};
        // RNGH v2 states: 2=BEGAN, 4=ACTIVE, 5=END, 3=CANCELLED
        if (state === 2) {
            if (ctx.activeIdRef.current == null) {
                ctx.beginDrag(id);
                isActiveSV.value = 1;
                setIsActiveJS(true);
            }
            translateY && (translateY.value = translationY || 0);
        }
        else if (state === 5 || state === 3) {
            // end/cancel
            translateY.value = (0, react_native_reanimated_1.withTiming)(0, { duration: 150 });
            isActiveSV.value = 0;
            setIsActiveJS(false);
            ctx.endDrag();
        }
    }, [ctx, id, translateY, isActiveSV]);
    const onLayout = react_1.default.useCallback((evt) => {
        const { y, height } = evt.nativeEvent.layout;
        heightRef.current = height || 0;
        if (height && height !== measuredHeight)
            setMeasuredHeight(height);
        if (ctx)
            ctx.setItemLayout(id, index, y, height);
    }, [ctx, id, index, measuredHeight]);
    react_1.default.useEffect(() => {
        return () => {
            // cleanup layout when unmounts
            ctx === null || ctx === void 0 ? void 0 : ctx.removeItemLayout(id);
        };
    }, [ctx, id]);
    const animatedStyle = (0, react_native_reanimated_1.useAnimatedStyle)(() => {
        const active = isActiveSV.value === 1;
        return {
            position: active ? 'absolute' : 'relative',
            left: 0,
            right: 0,
            top: 0,
            transform: [
                { translateY: active ? translateY.value : 0 },
                { scale: active ? 1.03 : 1 },
            ],
            zIndex: active ? 10 : 0,
        };
    }, []);
    const containerStyle = isActiveJS && measuredHeight > 0 ? { height: measuredHeight } : null;
    return (<react_native_gesture_handler_1.PanGestureHandler minDist={2} onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <react_native_1.View onLayout={onLayout} style={containerStyle}>
        <react_native_reanimated_1.default.View style={animatedStyle}>
          <react_native_1.View>
            {children}
          </react_native_1.View>
        </react_native_reanimated_1.default.View>
      </react_native_1.View>
    </react_native_gesture_handler_1.PanGestureHandler>);
};
exports.DraggableItem = DraggableItem;
