import markdown from '@eslint/markdown'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import markdownParagraphWrapping from './markdown-paragraph-wrapping'

run({
  name: 'markdown-paragraph-wrapping',
  rule: markdownParagraphWrapping,
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
      Hello world.
      This is test.
    `,
    $`
      你好世界。
      第二句。
    `,
    $`
      Hello world.This is test.
    `,
    $`
      > Hello world. Next one.
    `,
    $`
      - Hello world. Next one.
    `,
  ],
  invalid: [
    {
      code: $`
        Hello world. This is test.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "Hello world.\nThis is test."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        Hello world. Next one.
        
        > Quoted. Sentence.
        
        - Item. Sentence.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "Hello world.\nNext one.\n\n> Quoted. Sentence.\n\n- Item. Sentence."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        你好世界。第二句。
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "你好世界。\n第二句。"
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        你好世界。第二句。
        This is ok.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "你好世界。\n第二句。\nThis is ok."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
  ],
})
