import type { MarkdownRuleDefinition, MarkdownSourceCode } from '@eslint/markdown'
import type { AlignType, Table, TableCell } from 'mdast'

type MessageIds = 'formatTable'

type TableLayout = {
  rowValues: string[][]
  widths: number[]
  alignments: AlignType[]
}

/**
 * Check if a Unicode code point is fullwidth (occupies 2 columns in monospace fonts).
 * Covers CJK Unified Ideographs, Hangul, Katakana, Hiragana, fullwidth forms, emoji, etc.
 */
function isFullwidthCodePoint(code: number): boolean {
  return code >= 0x1100 && (
    code <= 0x115F // Hangul Jamo
    || code === 0x2329
    || code === 0x232A
    || (code >= 0x2E80 && code <= 0x303E) // CJK Radicals, Kangxi, CJK Symbols
    || (code >= 0x3040 && code <= 0x33FF) // Hiragana, Katakana, Bopomofo, Hangul Compat Jamo, CJK Compat
    || (code >= 0x3400 && code <= 0x4DBF) // CJK Unified Ideographs Extension A
    || (code >= 0x4E00 && code <= 0xA4CF) // CJK Unified Ideographs, Yi
    || (code >= 0xAC00 && code <= 0xD7AF) // Hangul Syllables
    || (code >= 0xF900 && code <= 0xFAFF) // CJK Compatibility Ideographs
    || (code >= 0xFE10 && code <= 0xFE19) // Vertical forms
    || (code >= 0xFE30 && code <= 0xFE6F) // CJK Compatibility Forms, Small Form Variants
    || (code >= 0xFF00 && code <= 0xFF60) // Fullwidth Forms
    || (code >= 0xFFE0 && code <= 0xFFE6) // Fullwidth Signs
    || (code >= 0x1F000 && code <= 0x1FAFF) // Mahjong, Domino, Playing Cards, Emoji
    || (code >= 0x20000 && code <= 0x2FA1F) // CJK Unified Ideographs Extension B-F
  )
}

/**
 * Get the display width of a string, accounting for fullwidth characters.
 */
function getDisplayWidth(str: string): number {
  let width = 0
  for (const char of str)
    width += isFullwidthCodePoint(char.codePointAt(0)!) ? 2 : 1
  return width
}

function getLinePrefix(sourceCode: MarkdownSourceCode, startOffset: number): string {
  const originLoc = sourceCode.getLocFromIndex(0)
  const lineBase = originLoc.line === 0 ? 0 : 1
  const columnBase = originLoc.column === 0 ? 0 : 1
  const startLoc = sourceCode.getLocFromIndex(startOffset)
  const lineText = sourceCode.lines[Math.max(0, startLoc.line - lineBase)] ?? ''
  return lineText.slice(0, Math.max(0, startLoc.column - columnBase))
}

function getCellText(cell: TableCell, sourceCode: MarkdownSourceCode): string {
  if (cell.children.length === 0)
    return ''

  const firstChild = cell.children[0]!
  const lastChild = cell.children.at(-1)!
  const [start] = sourceCode.getRange(firstChild)
  const [, end] = sourceCode.getRange(lastChild)
  return sourceCode.getText().slice(start, end).trim()
}

function getDelimiterCell(width: number, alignment: AlignType): string {
  if (alignment === 'left')
    return `:${'-'.repeat(width - 1)}`
  if (alignment === 'right')
    return `${'-'.repeat(width - 1)}:`
  if (alignment === 'center')
    return `:${'-'.repeat(width - 2)}:`
  return '-'.repeat(width)
}

function getAlignedCellContent(cellText: string, width: number, alignment: AlignType): string {
  const paddingLength = Math.max(0, width - getDisplayWidth(cellText))

  if (alignment === 'right')
    return `${' '.repeat(paddingLength)}${cellText}`

  if (alignment === 'center') {
    const leftPaddingLength = Math.floor(paddingLength / 2)
    const rightPaddingLength = paddingLength - leftPaddingLength
    return `${' '.repeat(leftPaddingLength)}${cellText}${' '.repeat(rightPaddingLength)}`
  }

  return `${cellText}${' '.repeat(paddingLength)}`
}

function formatRow(cells: string[], widths: number[], alignments: AlignType[]): string {
  return `| ${cells
    .map((cell, index) => getAlignedCellContent(cell, widths[index] ?? 3, alignments[index] ?? null))
    .join(' | ')} |`
}

function formatDelimiterRow(widths: number[], alignments: AlignType[]): string {
  return `| ${widths
    .map((width, index) => getDelimiterCell(width, alignments[index] ?? null))
    .join(' | ')} |`
}

function normalizeAlignments(alignments: Table['align'], columnCount: number): AlignType[] {
  return Array.from({ length: columnCount }, (_, index) => alignments?.[index] ?? null)
}

function buildTableLayout(tableNode: Table, sourceCode: MarkdownSourceCode): TableLayout | null {
  if (tableNode.children.length === 0)
    return null

  const columnCount = Math.max(
    tableNode.align?.length ?? 0,
    ...tableNode.children.map(row => row.children.length),
  )
  if (columnCount === 0)
    return null

  const rowValues = tableNode.children.map((row) => {
    const values = row.children.map(cell => getCellText(cell, sourceCode))
    while (values.length < columnCount)
      values.push('')
    return values
  })

  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxCellWidth = rowValues.reduce((max, row) =>
      Math.max(max, getDisplayWidth(row[columnIndex] ?? '')), 0)
    return Math.max(maxCellWidth, 3)
  })

  return {
    rowValues,
    widths,
    alignments: normalizeAlignments(tableNode.align, columnCount),
  }
}

function formatTable(layout: TableLayout, linePrefix: string, lineEnding: string): string | null {
  const headerValues = layout.rowValues[0]
  if (!headerValues)
    return null

  const lines: string[] = [
    formatRow(headerValues, layout.widths, layout.alignments),
    `${linePrefix}${formatDelimiterRow(layout.widths, layout.alignments)}`,
  ]

  for (const row of layout.rowValues.slice(1))
    lines.push(`${linePrefix}${formatRow(row, layout.widths, layout.alignments)}`)

  return lines.join(lineEnding)
}

const rule: MarkdownRuleDefinition<{ MessageIds: MessageIds }> = {
  meta: {
    type: 'layout',
    docs: {
      description: 'Format GFM markdown tables to aligned columns',
      url: 'https://github.com/hyoban/eslint-plugin-hyoban/blob/main/src/markdown-consistent-table-width.test.ts',
    },
    fixable: 'whitespace',
    schema: [],
    defaultOptions: [],
    messages: {
      formatTable: 'Format this markdown table',
    },
    language: 'markdown',
    dialects: ['gfm'],
  },
  create(context) {
    const { sourceCode } = context

    return {
      table(tableNode) {
        const [tableStartOffset, tableEndOffset] = sourceCode.getRange(tableNode)

        const originalText = sourceCode.getText(tableNode)
        const lineEnding = originalText.includes('\r\n') ? '\r\n' : '\n'
        const linePrefix = getLinePrefix(sourceCode, tableStartOffset)

        const layout = buildTableLayout(tableNode, sourceCode)
        if (!layout)
          return

        const formattedTable = formatTable(layout, linePrefix, lineEnding)
        if (!formattedTable || formattedTable === originalText)
          return

        context.report({
          loc: {
            start: sourceCode.getLocFromIndex(tableStartOffset),
            end: sourceCode.getLocFromIndex(tableEndOffset),
          },
          messageId: 'formatTable',
          fix(fixer) {
            return fixer.replaceTextRange(
              [tableStartOffset, tableEndOffset],
              formattedTable,
            )
          },
        })
      },
    }
  },
}

export default rule
