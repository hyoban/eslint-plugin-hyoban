import markdown from '@eslint/markdown'
import type { ESLint } from 'eslint'
import { run, unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'

import type { Options } from './md-one-sentence-per-line'
import mdOneSentencePerLine from './md-one-sentence-per-line'

const customIgnorePatternOptions: Options = [
  {
    ignorePatterns: ['^Generated file:'],
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
        markdown: markdown as ESLint.Plugin,
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
        > Highlights information that users should take into account, even when skimming.
        
        > [!TIP]
        > Optional information to help a user be more successful.
        
        > [!IMPORTANT]
        > Crucial information necessary for users to succeed.
        
        > [!WARNING]
        > Critical content demanding immediate user attention due to potential risks.
        
        > [!CAUTION]
        > Negative potential consequences of an action.
        
        > [!CUSTOM]
        > Custom alert content stays valid when already wrapped.
      `,
    },
    {
      code: $`
        Generated file: First sentence.
        Second sentence.
      `,
      options: customIgnorePatternOptions,
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
        > [!NOTE]
        > Highlights information that users should take into account, even when skimming. Optional information to help a user be more successful.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> [!NOTE]\n> Highlights information that users should take into account, even when skimming.\nOptional information to help a user be more successful."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        > [!CUSTOM]
        > Custom alert content stays valid when already wrapped. Another sentence belongs on the next line.
      `,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "> [!CUSTOM]\n> Custom alert content stays valid when already wrapped.\nAnother sentence belongs on the next line."
        `)
      },
      errors(errors) {
        expect(errors).toHaveLength(1)
        expect(errors[0]?.messageId).toBe('wrapParagraph')
      },
    },
    {
      code: $`
        Generated file: First sentence. Second sentence.
      `,
      options: customIgnorePatternOptions,
      output(output) {
        expect(output).toMatchInlineSnapshot(`
          "Generated file: First sentence.\nSecond sentence."
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
