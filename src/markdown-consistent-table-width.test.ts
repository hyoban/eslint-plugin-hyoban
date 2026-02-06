import markdown from '@eslint/markdown'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
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
    $`
      | A    |  B  |   C |
      | :--- | :-: | --: |
      | 1    | 22  | 333 |
      | 4444 |  5  |   6 |
    `,
  ],
  invalid: [
    {
      code: $`
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
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "formatTable",
          ]
        `)
      },
    },
    {
      code: $`
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
        expect(errors).toHaveLength(1)
        expect(errors.map(error => error.messageId)).toMatchInlineSnapshot(`
          [
            "formatTable",
          ]
        `)
      },
    },
    {
      code: $`
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
        expect(errors).toHaveLength(1)
        expect(errors.every(error => error.messageId === 'formatTable')).toBe(true)
      },
    },
    {
      code: $`
        Pilot|Airport|Hours
        --|:--:|--:
        John Doe|SKG|1338
        Jane Roe|JFK|314
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "| Pilot    | Airport | Hours |
          | -------- | :-----: | ----: |
          | John Doe |   SKG   |  1338 |
          | Jane Roe |   JFK   |   314 |"
        `)
      },
    },
  ],
})
