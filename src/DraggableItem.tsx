import React from 'react';
import { View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { DraggableContext } from './context';

export type DraggableItemProps = {
  id: string;
  index: number;
  children?: React.ReactNode;
};

export const DraggableItem: React.FC<DraggableItemProps> = ({ id, index, children }) => {
  const ctx = React.useContext(DraggableContext);

  const onGestureEvent = React.useCallback((e: PanGestureHandlerGestureEvent) => {
    if (!ctx) return;
    const { translationY, state } = (e as any).nativeEvent || {};
    // state: 2=active, 5=end in RNGH v2
    if (state === 2) {
      if (ctx.activeIdRef.current == null) {
        ctx.beginDrag(id);
      }
      ctx.updateDrag(translationY || 0);
    } else if (state === 5 || state === 3) {
      // end/cancel
      ctx.endDrag();
    }
  }, [ctx, id]);

  const onLayout = React.useCallback((evt: any) => {
    const { y, height } = evt.nativeEvent.layout;
    if (ctx) ctx.setItemLayout(id, index, y, height);
  }, [ctx, id, index]);

  React.useEffect(() => {
    return () => {
      // cleanup layout when unmounts
      ctx?.removeItemLayout(id);
    };
  }, [ctx, id]);

  // Basic visual feedback while dragging this item (scale up)
  const isActive = ctx?.activeIdRef.current === id;

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onGestureEvent}>
      <Animated.View style={{ transform: [{ scale: isActive ? 1.02 : 1 }] }} onLayout={onLayout}>
        <View>
          {children}
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};
