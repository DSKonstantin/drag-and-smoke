import { FlashListProps } from '@shopify/flash-list';
import { DragCallbacks } from './context';
export type DraggableFlashListProps<T> = FlashListProps<T> & {
    getId?: (item: T, index: number) => string;
    dragCallbacks?: DragCallbacks;
    onDragEnd?: (params: {
        from: number;
        to: number;
        ids: string[];
        data: T[];
    }) => void;
    autoScrollEnabled?: boolean;
    autoScrollEdgeDistance?: number;
    autoScrollMaxStep?: number;
};
export declare function DraggableFlashList<T>(props: DraggableFlashListProps<T>): any;
