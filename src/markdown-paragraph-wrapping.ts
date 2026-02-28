import type { MarkdownRuleDefinition } from '@eslint/markdown'
import type { Text } from 'mdast'

type MessageIds = 'wrapParagraph'

const rule: MarkdownRuleDefinition<{ MessageIds: MessageIds }> = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Wrap markdown paragraphs by sentence-ending punctuation',
      url: 'https://github.com/hyoban/eslint-plugin-hyoban/blob/main/src/markdown-paragraph-wrapping.test.ts',
    },
    fixable: 'whitespace',
    schema: [],
    defaultOptions: [],
    messages: {
      wrapParagraph: 'Expected paragraph to be wrapped after sentence-ending punctuation.',
    },
    language: 'markdown',
    dialects: ['gfm'],
  },
  create(context) {
    const { sourceCode } = context

    return {
      'root > paragraph > text': function (node: Text) {
        const range = sourceCode.getRange(node)
        const originalText = sourceCode.getText(node)
        const matchPattern = /[。.][\t ]+(?=[^\r\n])/
        const firstMatch = matchPattern.exec(originalText)
        if (!firstMatch)
          return
        const fixedText = originalText.replace(/([。.])[\t ]+(?=[^\r\n])/g, '$1\n')

        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(range[0] + firstMatch.index),
            end: sourceCode.getLocFromIndex(range[0] + firstMatch.index + 1),
          },
          messageId: 'wrapParagraph',
          fix(fixer) {
            return fixer.replaceTextRange(range, fixedText)
          },
        })
      },
    }
  },
}

export default rule
