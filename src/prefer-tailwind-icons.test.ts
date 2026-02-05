import tsParser from '@typescript-eslint/parser'
import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import preferTailwindIcons from './prefer-tailwind-icons'

const acmeOptions = [
  {
    prefix: 'i-',
    libraries: [
      {
        source: '^@(?<set>acme)/icons$',
        name: '^(?<name>.*?)(?:Icon)?$',
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
    prefix: 'i-',
    libraries: [
      {
        source: '^@(?<set>acme)/icons(?:/.*)?$',
        name: '^(?<name>.*?)(?:Icon)?$',
      },
    ],
  },
]

const acmeWithGlobalPrefixOptions = [
  {
    prefix: 'i-',
    libraries: [
      {
        source: '^@(?<set>acme)/icons$',
        name: '^(?<name>.*?)(?:Icon)?$',
      },
    ],
  },
]

const acmeIncludeSubPathOptions = [
  {
    prefix: 'i-',
    libraries: [
      {
        source: '^@(?<set>acme)/icons/(?<variant>solid|outline)$',
        name: '^(?<name>.*)Icon$',
      },
    ],
  },
]

const heroiconsTailSourceOptions = [
  {
    prefix: 'i-',
    libraries: [
      {
        source: '^@(?<set>heroicons)/react/(?<variant>\\d+/(?:solid|outline))$',
        name: '^(?<name>.*)Icon$',
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
        import { SearchIcon } from '@acme/icons'

        const App = () => <SearchIcon />
      `,
      options: acmeWithGlobalPrefixOptions,
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
        import { ChevronDownIcon } from '@heroicons/react/20/solid'

        const App = () => <ChevronDownIcon />
      `,
      options: heroiconsTailSourceOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-heroicons-chevron-down-20-solid"} />')
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
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-arrow-left-solid text-slate-500"} />')
      },
      output: null,
    },
    {
      code: dedent`
        import { SearchIcon } from '@acme/icons'

        const App = ({ dynamic }: { dynamic?: string }) => (
          <SearchIcon className={cn(dynamic, 'text-red-500')} />
        )
      `,
      options: acmeOptions,
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('preferTailwindIcon')
        expect(errors[0]?.suggestions).toHaveLength(1)
        expect(errors[0]?.suggestions?.[0]?.fix?.text)
          .toBe('<span className={cn("i-acme-search", dynamic, \'text-red-500\')} />')
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
        expect(errors[0]?.suggestions ?? []).toHaveLength(0)
      },
      output: null,
    },
  ],
})
