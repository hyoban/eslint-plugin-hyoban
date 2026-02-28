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
        const matchPattern = /[。.][\t ]*(?=[^\r\n])/g
        const matches: Array<{ index: number, length: number, char: string }> = []
        let match = matchPattern.exec(originalText)
        while (match) {
          const matchValue = match[0] ?? ''
          if (matchValue.length === 0)
            break
          matches.push({
            index: match.index,
            length: matchValue.length,
            char: matchValue[0] ?? '',
          })
          match = matchPattern.exec(originalText)
        }

        if (matches.length === 0)
          return

        for (const matchItem of matches) {
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(range[0] + matchItem.index),
              end: sourceCode.getLocFromIndex(range[0] + matchItem.index + 1),
            },
            messageId: 'wrapParagraph',
            fix(fixer) {
              return fixer.replaceTextRange(
                [range[0] + matchItem.index, range[0] + matchItem.index + matchItem.length],
                `${matchItem.char}\n`,
              )
            },
          })
        }
      },
    }
  },
}

export default rule
