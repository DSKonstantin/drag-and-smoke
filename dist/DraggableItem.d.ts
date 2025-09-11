import React from 'react';
export type DraggableItemProps = {
    id: string;
    index: number;
    children?: React.ReactNode;
};
export declare const DraggableItem: React.FC<DraggableItemProps>;
