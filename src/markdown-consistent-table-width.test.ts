import markdown from '@eslint/markdown'
import { run, unindent as dedent } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import markdownConsistentTableWidth from './markdown-consistent-table-width'

run({
  name: 'markdown-consistent-table-width',
  rule: markdownConsistentTableWidth,
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
    dedent`
      | A    |  B  |   C |
      | :--- | :-: | --: |
      | 1    | 22  | 333 |
      | 4444 |  5  |   6 |
    `,
  ],
  invalid: [
    {
      code: dedent`
        | A | B | C |
        | :- | :-: | -: |
        | 1 | 22 | 333 |
        | 4444 | 5 | 6 |
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "| A    |  B  |   C |
          | :--- | :-: | --: |
          | 1    | 22  | 333 |
          | 4444 |  5  |   6 |"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(9)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
          ]
        `)
      },
    },
    {
      code: dedent`
        > | Name | Tool |
        > | --- | --- |
        > | antfu | eslint |
        > | hyoban | markdown |
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> | Name   | Tool     |
          > | ------ | -------- |
          > | antfu  | eslint   |
          > | hyoban | markdown |"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(6)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
            "formatTable",
          ]
        `)
      },
    },
    {
      code: dedent`
        | A | B | C |
        | --- | --- | --- |
        | 1 | 2 |
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "| A   | B   | C   |
          | --- | --- | --- |
          | 1   | 2   |     |"
        `)
      },
      errors(errors) {
        expect(errors.length).toBeGreaterThan(0)
        expect(errors.every(error => error.messageId === 'formatTable')).toBe(true)
      },
    },
  ],
})
