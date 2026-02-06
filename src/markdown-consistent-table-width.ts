import type { MarkdownSourceCode } from '@eslint/markdown'
import type { AlignType, Table, TableCell } from 'mdast'

import { createEslintRule } from './utils'

export type MessageIds = 'formatTable'
export type Options = []

type SourceCode = Readonly<MarkdownSourceCode>

type TableLayout = {
  rowValues: string[][]
  widths: number[]
  alignments: AlignType[]
}

function getLinePrefix(sourceCode: SourceCode, startOffset: number): string {
  const originLoc = sourceCode.getLocFromIndex(0)
  const startLoc = sourceCode.getLocFromIndex(startOffset)
  const lineBase = originLoc.line === 0 ? 0 : 1
  const columnBase = originLoc.column === 0 ? 0 : 1
  const lineText = sourceCode.lines[Math.max(0, startLoc.line - lineBase)] ?? ''
  return lineText.slice(0, Math.max(0, startLoc.column - columnBase))
}

function getCellText(cell: TableCell, sourceCode: SourceCode): string {
  if (cell.children.length === 0)
    return ''

  const firstChild = cell.children[0]
  const lastChild = cell.children[cell.children.length - 1]
  if (!firstChild || !lastChild)
    return ''

  const [firstChildStart] = sourceCode.getRange(firstChild)
  const [, lastChildEnd] = sourceCode.getRange(lastChild)
  return sourceCode.getText().slice(firstChildStart, lastChildEnd).trim()
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
  if (alignment === 'right')
    return cellText.padStart(width, ' ')

  if (alignment === 'center') {
    const paddingLength = Math.max(0, width - cellText.length)
    const leftPaddingLength = Math.floor(paddingLength / 2)
    const rightPaddingLength = paddingLength - leftPaddingLength
    return `${' '.repeat(leftPaddingLength)}${cellText}${' '.repeat(rightPaddingLength)}`
  }

  return cellText.padEnd(width, ' ')
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

function buildTableLayout(tableNode: Table, sourceCode: SourceCode): TableLayout | null {
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
    const maxCellLength = rowValues.reduce((max, row) =>
      Math.max(max, row[columnIndex]?.length ?? 0), 0)
    return Math.max(maxCellLength, 3)
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

const rule = createEslintRule<Options, MessageIds>({
  name: 'markdown-consistent-table-width',
  meta: {
    type: 'layout',
    docs: {
      description: 'Format GFM markdown tables to aligned columns',
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      formatTable: 'Format this markdown table',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode as unknown as SourceCode

    return {
      table(tableNode: Table) {
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
})

export default rule
