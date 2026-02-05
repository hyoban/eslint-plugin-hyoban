# prefer-tailwind-icons

Prefer Tailwind icon classes instead of rendering icon components directly.

## Why

When a JSX icon component comes from configured icon libraries, this rule reports it and suggests replacing it with a `<span>` + `className` icon class.

## Rule Behavior

- This rule only works for libraries you configure in `options.libraries`.
- If `libraries` is not provided (or is empty), this rule does nothing.
- It provides **suggestions** (`hasSuggestions: true`), not automatic fixes.
- For `className={cn(...)}`, generated class is inserted as the first argument.
- For other `className={...}` expressions, suggestion uses template-literal fallback: ``className={`generated ${expr}`}``.

## Options

```ts
type Options = [{
  libraries?: Array<{
    source: string
    name?: string
    prefix?: string
  }>
  prefix?: string
  propMappings?: Record<string, string>
}]
```

### `libraries` (required for effect)

Defines which import sources are treated as icon libraries and how to build icon class names.

- `prefix`: global class prefix added before every generated icon class (e.g. `i-`).
- `libraries[].prefix`: per-library class prefix override (falls back to global `prefix`).
- All matcher strings are treated as **regex** (not exact string).
  - You can write regex source directly, e.g. `^@acme/icons$`
  - Or use regex literal string, e.g. `/^@acme\\/icons$/i`
- `source`: regex for import source matching (required).
- `name`: regex for imported name matching/filtering (default: `.*`).
- Named groups are used to extract segments:
  - `set` / `iconSet`: icon set segment.
  - `name` / `icon`: icon name segment.
  - `variant`: optional variant segment.

Final class is built as:

```txt
prefix + set + '-' + kebab(name) + optional('-' + variant)
```

When `set` is missing, class falls back to `prefix + kebab(importedName)`.

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
        prefix: 'i-',
        libraries: [
          {
            source: '^@(?<set>ri)/react$',
            name: '^(?<name>.*?)(?:Icon)?$',
          },
          {
            source: '^@(?<set>heroicons)/react/(?<variant>\\d+/(?:solid|outline))$',
            name: '^(?<name>.*)Icon$',
          },
          {
            source: '^@/app/components/base/icons/src/(?<set>public|vender)(?:/(?<variant>.*))?$',
            name: '^(?<name>.*?)(?:Icon)?$',
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

Named groups example:

```js
const config = {
  prefix: 'i-',
  source: '^@(?<set>heroicons)/react/(?<variant>\\d+/(?:solid|outline))$',
  name: '^(?<name>.*)Icon$',
}
// ChevronDownIcon -> i-heroicons-chevron-down-20-solid
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

const App = () => <span className="i-acme-search size-4 text-red-500" />
```
