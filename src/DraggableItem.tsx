import React from 'react';
import { View } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { DraggableContext } from './context';

export type DraggableItemProps = {
  id: string;
  index: number;
  children?: React.ReactNode;
};

export const DraggableItem: React.FC<DraggableItemProps> = ({ id, index, children }) => {
  const ctx = React.useContext(DraggableContext);

  const translateY = useSharedValue(0);
  const isActiveSV = useSharedValue(0);
  const heightRef = React.useRef(0);
  const [measuredHeight, setMeasuredHeight] = React.useState(0);
  const [isActiveJS, setIsActiveJS] = React.useState(false);

  // Handle continuous gesture updates only
  const onGestureEvent = React.useCallback((e: PanGestureHandlerGestureEvent) => {
    if (!ctx) return;
    const { translationY } = (e as any).nativeEvent || {};
    translateY.value = translationY || 0;
    if (isActiveJS && measuredHeight > 0) {
      ctx.updateDrag(translationY || 0);
    }
  }, [ctx, translateY, isActiveJS, measuredHeight]);

  // Handle state changes (begin/end/cancel)
  const onHandlerStateChange = React.useCallback((e: PanGestureHandlerGestureEvent) => {
    if (!ctx) return;
    const { state, translationY } = (e as any).nativeEvent || {};
    // RNGH v2 states: 2=BEGAN, 4=ACTIVE, 5=END, 3=CANCELLED
    if (state === 2) {
      if (ctx.activeIdRef.current == null) {
        ctx.beginDrag(id);
        isActiveSV.value = 1;
        setIsActiveJS(true);
      }
      translateY && (translateY.value = translationY || 0);
    } else if (state === 5 || state === 3) {
      // end/cancel
      translateY.value = withTiming(0, { duration: 150 });
      isActiveSV.value = 0;
      setIsActiveJS(false);
      ctx.endDrag();
    }
  }, [ctx, id, translateY, isActiveSV]);

  const onLayout = React.useCallback((evt: any) => {
    const { y, height } = evt.nativeEvent.layout;
    heightRef.current = height || 0;
    if (height && height !== measuredHeight) setMeasuredHeight(height);
    if (ctx) ctx.setItemLayout(id, index, y, height);
  }, [ctx, id, index, measuredHeight]);

  React.useEffect(() => {
    return () => {
      // cleanup layout when unmounts
      ctx?.removeItemLayout(id);
    };
  }, [ctx, id]);

  const animatedStyle = useAnimatedStyle(() => {
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
    } as any;
  }, []);

  const containerStyle: any = isActiveJS && measuredHeight > 0 ? { height: measuredHeight } : null;

  return (
    <PanGestureHandler minDist={2} onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
      <View onLayout={onLayout} style={containerStyle}>
        <Animated.View style={animatedStyle}>
          <View>
            {children}
          </View>
        </Animated.View>
      </View>
    </PanGestureHandler>
  );
};
