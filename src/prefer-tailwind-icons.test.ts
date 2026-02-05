import tsParser from '@typescript-eslint/parser'
import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import preferTailwindIcons from './prefer-tailwind-icons'

const acmeOptions = [
  {
    libraries: [
      {
        pattern: '@acme/icons',
        prefix: 'i-acme-',
      },
    ],
    propMappings: {
      size: 'size',
      width: 'w',
      height: 'h',
    },
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
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-search-icon size-4 text-red-500"} aria-hidden />')
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
        expect(errors[0]?.suggestions?.[0]?.fix?.text).toBe('<span className={"i-acme-search-icon w-[18px] h-5"} />')
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
  ],
})
