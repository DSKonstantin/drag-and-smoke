declare namespace React {
  type ReactNode = any;
  interface MutableRefObject<T> { current: T }
  interface Context<T> { Provider: any; Consumer: any }
  interface FC<P = {}> { (props: P & { children?: ReactNode }): any }
  function createContext<T>(defaultValue: T): Context<T>;
  function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  function useRef<T>(initialValue: T): MutableRefObject<T>;
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useMemo<T>(factory: () => T, deps: any[]): T;
  function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T;
  function useContext<T>(ctx: Context<T>): T;
}

declare module 'react' {
  export = React;
}

declare module 'react-native' {
  export type NativeScrollEvent = any;
  export type NativeSyntheticEvent<T> = any;
  export const View: any;
}

declare module '@shopify/flash-list' {
  export const FlashList: any;
  export type FlashListProps<T = any> = any;
  export type ListRenderItemInfo<T = any> = any;
}

declare module 'react-native-reanimated' {
  const Animated: any;
  export default Animated;
}

declare module 'react-native-gesture-handler' {
  export const PanGestureHandler: any;
  export type PanGestureHandlerGestureEvent = any;
}
