# drag-and-smoke

Draggable FlashList wrapper with Reanimated for React Native. It mirrors @shopify/flash-list API and adds grab-and-drag reordering for each item. Pagination (onEndReached) continues to work.

## Install

Once you publish this package to npm, consumers can install with:

- npm: `npm install drag-and-smoke`
- yarn: `yarn add drag-and-smoke`

You can also install directly from a Git repository (the package builds on install via the `prepare` script):

- npm: `npm install <git-url>`
- yarn: `yarn add <git-url>`

Peer dependencies you must already have in your React Native app:
- react (>=17)
- react-native (>=0.68)
- @shopify/flash-list (>=1.6.0)
- react-native-reanimated (>=3.0.0)
- react-native-gesture-handler (>=2.0.0)

## Usage

```tsx
import { DraggableFlashList, useItemPositions } from 'drag-and-smoke';

function MyList({ items, setItems }) {
  const { positions } = useItemPositions();

  return (
    <DraggableFlashList
      data={items}
      estimatedItemSize={64}
      renderItem={({ item }) => (
        // your row component
        <Row item={item} />
      )}
      keyExtractor={(item) => String(item.id)}
      onEndReached={() => {/* pagination logic */}}
      onDragEnd={({ data }) => setItems(data)}
    />
  );
}
```

The `useItemPositions` hook returns current IDs and their y/height (measured where available, otherwise estimated from `estimatedItemSize`).

## Publish (for maintainers)

1. Ensure TypeScript is installed in devDependencies (already configured).
2. Build locally (optional): `npm run build`.
3. Publish: `npm publish` (remove or keep `private` field off; it is already removed).

Note: The package has a `prepare` script that runs `tsc` so installing from a Git URL will build the `dist` folder automatically.

## Notes
- For large lists, provide a good `estimatedItemSize`.
- All FlashList props pass through, so pagination and performance features remain functional.
- IDs must be stable. Internally we use `props.getId` (if provided) or `item.id`/`item.key`. Avoid using index in your `keyExtractor`.
- Do not double wrap items: `DraggableFlashList` already wraps rows with `DraggableItem`. If you prefer manual control, you can wrap yourself; the list will detect and not double-wrap.
- Requires Reanimated + Gesture Handler properly configured in your app (plugin in Babel, and `react-native-gesture-handler` import first).
- Auto-scroll during drag: when you drag an item near the top/bottom edge, the list will automatically scroll to reveal more items.

### Auto-scroll configuration
- autoScrollEnabled?: boolean — enable/disable auto-scroll (default: true)
- autoScrollEdgeDistance?: number — distance from edges to start scrolling. If 0–1, treated as a fraction of viewport height (e.g., 0.2 = 20%); otherwise treated as pixels. If omitted, defaults to min(80, max(40, 0.2 * viewport)).
- autoScrollMaxStep?: number — max pixels per frame to scroll while dragging (default: 24; clamped 1–64)

Note: DraggableFlashList also sets scrollEventThrottle to 16 by default for responsive drag updates. You can override by passing scrollEventThrottle prop.
