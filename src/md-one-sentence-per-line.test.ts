import markdown from '@eslint/markdown'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import type { Options } from './md-one-sentence-per-line'
import mdOneSentencePerLine from './md-one-sentence-per-line'

const admonitionOptions: Options = [
  {
    ignorePatterns: ['^\\[!CUSTOM\\][\\s\\S]*$'],
  },
]

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
    {
      code: $`
        > [!NOTE]
        > Highlights information that users should take into account, even when skimming. Optional information to help a user be more successful.
        
        > [!TIP]
        > Optional information to help a user be more successful.
        
        > [!IMPORTANT]
        > Crucial information necessary for users to succeed.
        
        > [!WARNING]
        > Critical content demanding immediate user attention due to potential risks.
        
        > [!CAUTION]
        > Negative potential consequences of an action.
      `,
    },
    {
      code: $`
        > [!CUSTOM]
        > First sentence. Second sentence.
      `,
      options: admonitionOptions,
    },
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
          "> Hello world.\nNext one."
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
          "- Hello world.\nNext one."
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
          "Hello world.\nNext one.\n\n> Quoted.\nSentence.\n\n- Item.\nSentence."
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
