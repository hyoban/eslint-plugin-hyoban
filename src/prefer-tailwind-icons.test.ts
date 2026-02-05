import tsParser from '@typescript-eslint/parser'
import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import preferTailwindIcons from './prefer-tailwind-icons'

const acmeOptions = [
  {
    libraries: [
      {
        source: '^@acme/icons$',
        sourceReplace: 'i-acme',
        name: '^(.*?)(?:Icon)?$',
        nameReplace: '$1',
      },
    ],
    propMappings: {
      size: 'size',
      width: 'w',
      height: 'h',
    },
  },
]

const acmeRegexOptions = [
  {
    libraries: [
      {
        source: '^@acme/icons(?:/.*)?$',
        sourceReplace: 'i-acme',
        name: '^(.*?)(?:Icon)?$',
        nameReplace: '$1',
      },
    ],
  },
]

const acmeIncludeSubPathOptions = [
  {
    libraries: [
      {
        source: '^@acme/icons/(?<subpath>solid|outline)$',
        sourceReplace: 'i-acme-$<subpath>',
        name: '^(.*)Icon$',
        nameReplace: '$1',
      },
    ],
  },
]

run({
  name: 'prefer-tailwind-icons',
  rule: preferTailwindIcons,
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  configs: [
    {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      languageOptions: {
        parser: tsParser,
      },
    },
  ],
  valid: [
    dedent`
      import { SearchIcon } from '@acme/icons'

      const App = () => <SearchIcon />
    `,
    {
      code: dedent`
        import { SearchIcon } from '@other/icons'

        const App = () => <SearchIcon />
      `,
      options: acmeOptions,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'
      `,
      options: acmeOptions,
    },
    {
      code: dedent`
        import { SearchIcon } from '@other/icons'

        const App = () => <SearchIcon />
      `,
      options: acmeRegexOptions,
    },
    {
      code: dedent`
        import { Search } from '@acme/icons/outline'

        const App = () => <Search />
      `,
      options: acmeIncludeSubPathOptions,
    },
  ],
  invalid: [
    {
      code: dedent`
        import { SearchIcon as Search } from '@acme/icons'

        const App = () => <Search size={16} className="text-red-500" aria-hidden />
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-search size-4 text-red-500"} aria-hidden />')
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'

        const App = () => <SearchIcon width={18} height={20} />
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-search w-[18px] h-5"} />')
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'

        const App = () => <SearchIcon>Search</SearchIcon>
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'

        const icon = SearchIcon
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIconImport')
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons/outline'

        const App = () => <SearchIcon />
      `,
      options: acmeRegexOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-search"} />')
      },
      output: null,
    },
    {
      code: dedent`
        import { ArrowLeftIcon as ArrowLeft } from '@acme/icons/solid'

        const App = () => <ArrowLeft className="text-slate-500" />
      `,
      options: acmeIncludeSubPathOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-solid-arrow-left text-slate-500"} />')
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'

        const App = ({ dynamic, size }: { dynamic?: string, size: number }) => (
          <SearchIcon className={dynamic} size={size} />
        )
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text)
          .toBe('<span className={["i-acme-search", dynamic].filter(Boolean).join(\' \')} size={size} />')
      },
      output: null,
    },
  ],
})
