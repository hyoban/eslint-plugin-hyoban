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
    importNamePattern?: string
    prefix?: string
    suffix?: string
    extractSubPath?: boolean
    sourceReplace?: string
    importNameReplace?: string
    classNameTemplate?: string
  }>
  propMappings?: Record<string, string>
}]
```

### `libraries` (required for effect)

Defines which import sources are treated as icon libraries and how to build icon class names.

- `pattern`: import source match rule.
  - Plain string: exact match + sub-path prefix match.
  - Regex string literal (`/source/flags`): regular expression match.
- `importNamePattern`: optional import name match rule (plain string or regex string literal).
- `prefix`: class prefix, e.g. `i-ri-` (legacy/simple mode).
- `suffix`: optional class suffix.
- `extractSubPath`: when `true`, appends sub-path segments (joined by `-`) after `prefix` (simple mode).
- `sourceReplace`: optional replacement string applied to the import source using `pattern`.
- `importNameReplace`: optional replacement string applied to import name using `importNamePattern` (or `/^(.*)$/` by default).
- `classNameTemplate`: optional template for final className. Supported placeholders:
  - `{source}`: source text after `sourceReplace`
  - `{name}`: import name after `importNameReplace`
  - `{nameKebab}`: kebab-case of `{name}`

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

Regex replace example (match source + import name):

```js
const config = {
  pattern: '/^@acme\\/icons\\/(solid|outline)$/',
  importNamePattern: '/^(.*)Icon$/',
  sourceReplace: 'i-acme-$1-',
  importNameReplace: '$1',
  classNameTemplate: '{source}{nameKebab}',
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

const App = () => <span className="i-acme-search-icon size-4 text-red-500" />
```
