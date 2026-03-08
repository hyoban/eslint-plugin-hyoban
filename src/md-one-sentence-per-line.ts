import type { MarkdownRuleDefinition } from '@eslint/markdown'
import type { Text } from 'mdast'

type MessageIds = 'wrapParagraph'
type UserOptions = {
  ignorePatterns?: string[]
}
export type Options = [UserOptions?]
const DEFAULT_IGNORE_PATTERNS = ['^\\[![^\\]\\r\\n]+\\]$']
const WHITESPACE_REGEX = /\s/u

function lastNonWhitespaceChar(segment: string, segmentStart: number) {
  for (let i = segment.length - 1; i >= 0; i--) {
    const char = segment[i]
    if (char && !WHITESPACE_REGEX.test(char)) {
      return {
        char,
        index: segmentStart + i,
      }
    }
  }
  return null
}

function getIgnoredRanges(text: string, ignorePatterns: RegExp[]) {
  return ignorePatterns.flatMap((pattern) => {
    return Array.from(text.matchAll(pattern), match => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
    }))
  })
}

const rule: MarkdownRuleDefinition<{ MessageIds: MessageIds, RuleOptions: Options }> = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Wrap markdown paragraphs so each sentence is on its own line',
      url: 'https://github.com/hyoban/eslint-plugin-hyoban/blob/main/src/md-one-sentence-per-line.md',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ignorePatterns: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [
      {
        ignorePatterns: DEFAULT_IGNORE_PATTERNS,
      },
    ],
    messages: {
      wrapParagraph: 'Expected paragraph to be wrapped after sentence-ending punctuation.',
    },
    language: 'markdown',
    dialects: ['gfm'],
  },
  create(context) {
    const [options = {}] = context.options
    const { sourceCode } = context
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' })
    const ignorePatterns = (options.ignorePatterns ?? []).map(pattern => new RegExp(pattern, 'gmu'))

    return {
      'paragraph > text': function (node: Text) {
        const range = sourceCode.getRange(node)
        const originalText = sourceCode.getText(node)
        const ignoredRanges = getIgnoredRanges(originalText, ignorePatterns)
        const matches: Array<{ boundaryStart: number, boundaryEnd: number, locIndex: number }> = []
        const segments = [...segmenter.segment(originalText)]

        for (let i = 0; i < segments.length - 1; i++) {
          const current = segments[i]
          const next = segments[i + 1]
          if (!current || !next)
            continue

          const lastCharInfo = lastNonWhitespaceChar(current.segment, current.index)
          if (!lastCharInfo)
            continue
          const boundaryStart = lastCharInfo.index + 1
          const boundaryEnd = next.index
          if (boundaryStart > boundaryEnd)
            continue

          const between = originalText.slice(boundaryStart, boundaryEnd)
          if (between.includes('\n') || between.includes('\r'))
            continue
          if (ignoredRanges.some(range => lastCharInfo.index >= range.start && lastCharInfo.index < range.end))
            continue

          matches.push({
            boundaryStart,
            boundaryEnd,
            locIndex: lastCharInfo.index,
          })
        }

        if (matches.length === 0)
          return

        for (const matchItem of matches) {
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(range[0] + matchItem.locIndex),
              end: sourceCode.getLocFromIndex(range[0] + matchItem.locIndex + 1),
            },
            messageId: 'wrapParagraph',
            fix(fixer) {
              return fixer.replaceTextRange(
                [range[0] + matchItem.boundaryStart, range[0] + matchItem.boundaryEnd],
                '\n',
              )
            },
          })
        }
      },
    }
  },
}

export default rule
