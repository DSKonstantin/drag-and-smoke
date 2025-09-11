"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useItemPositions = useItemPositions;
const react_1 = __importDefault(require("react"));
const context_1 = require("./context");
function useItemPositions() {
    const ctx = react_1.default.useContext(context_1.DraggableContext);
    const positionsVersion = ctx === null || ctx === void 0 ? void 0 : ctx.positionsVersion;
    const orderSignature = ctx === null || ctx === void 0 ? void 0 : ctx.orderSignature;
    const positions = react_1.default.useMemo(() => {
        if (!ctx)
            return [];
        return ctx.getPositionsSnapshot();
    }, [ctx, positionsVersion, orderSignature]);
    const byId = react_1.default.useMemo(() => {
        const map = {};
        for (const p of positions)
            map[p.id] = p;
        return map;
    }, [positions]);
    const ids = react_1.default.useMemo(() => positions.map((p) => p.id), [positions]);
    const getById = react_1.default.useCallback((id) => byId[id], [byId]);
    return { positions, byId, getById, ids };
}
