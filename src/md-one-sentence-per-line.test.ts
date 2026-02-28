import markdown from '@eslint/markdown'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import mdOneSentencePerLine from './md-one-sentence-per-line'

run({
  name: 'md-one-sentence-per-line',
  rule: mdOneSentencePerLine,
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
        > Hello world. Next one.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> Hello world.\n> Next one."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        - Hello world. Next one.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "- Hello world.\n  Next one."
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
          "Hello world.\nNext one.\n\n> Quoted.\n> Sentence.\n\n- Item.\n  Sentence."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(3)
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
