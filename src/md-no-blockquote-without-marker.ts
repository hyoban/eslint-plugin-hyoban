import type { MarkdownRuleDefinition } from '@eslint/markdown'
import type { Blockquote } from 'mdast'

type MessageIds = 'noBlockquoteWithoutMarker'

const rule: MarkdownRuleDefinition<{ MessageIds: MessageIds }> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow lazy continuation lines in block quotes without a marker',
    },
    fixable: 'whitespace',
    schema: [],
    defaultOptions: [],
    messages: {
      noBlockquoteWithoutMarker: 'Missing marker in blockquote.',
    },
    language: 'markdown',
    dialects: ['commonmark', 'gfm'],
  },
  create(context) {
    const { sourceCode } = context

    return {
      blockquote(node: Blockquote) {
        const range = sourceCode.getRange(node)
        const rawText = sourceCode.getText(node)
        const lines = rawText.split('\n')

        let currentOffset = range[0]

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!

          if (i > 0 && line.trim() !== '' && !/^\s*>/.test(line)) {
            const leadingWhitespace = line.match(/^(\s*)/)?.[1]?.length ?? 0
            const insertPosition = currentOffset + leadingWhitespace

            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(insertPosition),
                end: sourceCode.getLocFromIndex(currentOffset + line.length),
              },
              messageId: 'noBlockquoteWithoutMarker',
              fix(fixer) {
                return fixer.replaceTextRange(
                  [insertPosition, insertPosition],
                  '> ',
                )
              },
            })
          }

          currentOffset += line.length + 1
        }
      },
    }
  },
}

export default rule
