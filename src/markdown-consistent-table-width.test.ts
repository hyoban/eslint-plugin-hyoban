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
        expect(errors).toHaveLength(9)
        expect(errors.every(error => error.messageId === 'formatCell')).toBe(true)
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
        expect(errors).toHaveLength(6)
        expect(errors.every(error => error.messageId === 'formatCell')).toBe(true)
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
        expect(errors).toHaveLength(5)
        expect(errors.every(error => error.messageId === 'formatCell')).toBe(true)
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
    {
      code: $`
        | 名前 | ツール |
        | --- | --- |
        | antfu | eslint |
        | hyoban | markdown |
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "| 名前   | ツール   |
          | ------ | -------- |
          | antfu  | eslint   |
          | hyoban | markdown |"
        `)
      },
    },
    {
      code: $`
        | Name | Description |
        | :---: | --- |
        | 你好世界 | Hello World |
        | Hi | 这是一段描述 |
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "|   Name   | Description  |
          | :------: | ------------ |
          | 你好世界 | Hello World  |
          |    Hi    | 这是一段描述 |"
        `)
      },
    },
  ],
})
