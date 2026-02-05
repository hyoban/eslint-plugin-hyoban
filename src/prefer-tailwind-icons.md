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
    source: string
    sourceReplace?: string
    name?: string
    nameReplace?: string
  }>
  propMappings?: Record<string, string>
}]
```

### `libraries` (required for effect)

Defines which import sources are treated as icon libraries and how to build icon class names.

- All matcher strings are treated as **regex** (not exact string).
  - You can write regex source directly, e.g. `^@acme/icons$`
  - Or use regex literal string, e.g. `/^@acme\\/icons$/i`
- `source`: regex for import source matching (required).
- `sourceReplace`: replacement string for matched source (supports `$1`, `$<name>`). Default: `''`.
- `name`: regex for imported name matching/filtering. Default: `.*`.
- `nameReplace`: replacement string for imported name (supports `$1`, `$<name>`). Default: `$&`.

Final class is built as:

```txt
normalize(importSource.replace(sourceRegex, sourceReplace)) + '-' + kebab(importName.replace(nameRegex, nameReplace))
```

When `sourceReplace` resolves to empty string, class is only the kebab-case name part.

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
            source: '^@remixicon/react$',
            sourceReplace: 'i-ri',
            name: '^(.*?)(?:Icon)?$',
            nameReplace: '$1',
          },
          {
            source: '^@heroicons/react$',
            sourceReplace: 'i-heroicons',
            name: '^(.*?)(?:Icon)?$',
            nameReplace: '$1',
          },
          {
            source: '^@/app/components/base/icons/src/public(?:/(.*))?$',
            sourceReplace: 'i-custom-public-$1',
            name: '^(.*?)(?:Icon)?$',
            nameReplace: '$1',
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

Regex replace example:

```js
const config = {
  source: '^@acme/icons/(?<subpath>solid|outline)$',
  sourceReplace: 'i-acme-$<subpath>',
  name: '^(.*)Icon$',
  nameReplace: '$1',
}
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
