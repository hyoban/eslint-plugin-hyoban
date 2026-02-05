# prefer-tailwind-icons

Prefer Tailwind icon classes instead of rendering icon components directly.

## Why

When a JSX icon component comes from configured icon libraries, this rule reports it and suggests replacing it with a `<span>` + `className` icon class.

## Rule Behavior

- This rule only works for libraries you configure in `options.libraries`.
- If `libraries` is not provided (or is empty), this rule does nothing.
- It provides **suggestions** (`hasSuggestions: true`), not automatic fixes.

## Options

```ts
type Options = [{
  libraries?: Array<{
    pattern: string
    prefix: string
    suffix?: string
    extractSubPath?: boolean
  }>
  propMappings?: Record<string, string>
}]
```

### `libraries` (required for effect)

Defines which import sources are treated as icon libraries and how to build icon class names.

- `pattern`: import source match rule. Supports exact match and sub-path prefix match.
- `prefix`: class prefix, e.g. `i-ri-`.
- `suffix`: optional class suffix.
- `extractSubPath`: when `true`, appends sub-path segments (joined by `-`) after `prefix`.

### `propMappings` (optional)

Maps numeric JSX props to Tailwind class prefixes.

Example:

```json
{
  "size": "size",
  "width": "w",
  "height": "h"
}
```

For mapped props:

- If value is divisible by `4`: `value / 4` is used (e.g. `size={16}` -> `size-4`)
- Otherwise: arbitrary value syntax is used (e.g. `width={18}` -> `w-[18px]`)

## Configuration Example (Flat Config)

```js
import hyoban from 'eslint-plugin-hyoban'

export default [
  {
    plugins: {
      hyoban,
    },
    rules: {
      'hyoban/prefer-tailwind-icons': ['warn', {
        libraries: [
          {
            pattern: '@remixicon/react',
            prefix: 'i-ri-',
          },
          {
            pattern: '@heroicons/react',
            prefix: 'i-heroicons-',
          },
          {
            pattern: '@/app/components/base/icons/src/public',
            prefix: 'i-custom-public-',
            extractSubPath: true,
          },
        ],
        propMappings: {
          size: 'size',
          width: 'w',
          height: 'h',
        },
      }],
    },
  },
]
```

## Example

Input:

```tsx
import { SearchIcon } from '@acme/icons'

const App = () => <SearchIcon size={16} className="text-red-500" />
```

Suggested output:

```tsx
import { SearchIcon } from '@acme/icons'

const App = () => <span className={"i-acme-search-icon size-4 text-red-500"} />
```
