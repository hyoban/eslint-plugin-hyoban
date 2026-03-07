import markdown from '@eslint/markdown'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import mdNoBlockquoteWithoutMarker from './md-no-blockquote-without-marker'

run({
  name: 'md-no-blockquote-without-marker',
  rule: mdNoBlockquoteWithoutMarker,
  defaultFilenames: {
    js: 'README.md',
  },
  configs: [
    {
      files: ['**/*.md'],
      plugins: {
        markdown,
      },
      language: 'markdown/gfm',
    },
  ],
  valid: [
    $`
      > Mercury,
      > Venus,
      > and Earth.
    `,
    $`
      > Single line blockquote.
    `,
    $`
      > Mercury,
      > Venus,
      > and Earth.

      Mars.
    `,
  ],
  invalid: [
    {
      code: $`
        > Mercury,
        Venus,
        > and Earth.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> Mercury,
          > Venus,
          > and Earth."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('noBlockquoteWithoutMarker')
      },
    },
    {
      code: $`
        > foo
        bar
        baz
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> foo
          > bar
          > baz"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(2)
        expect(errors.every(e => e.messageId === 'noBlockquoteWithoutMarker')).toBe(true)
      },
    },
  ],
})
