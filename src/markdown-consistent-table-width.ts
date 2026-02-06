import type { AlignType, PhrasingContent, Table, TableCell } from 'mdast'

import { createEslintRule } from './utils'

export type MessageIds = 'formatTable'
export type Options = []

type NodeRange = {
  startOffset: number
  endOffset: number
}

type DelimiterLine = NodeRange & {
  text: string
}

type DelimiterCellRange = NodeRange & {
  text: string
}

type TableLayout = {
  rowValues: string[][]
  widths: number[]
  alignments: AlignType[]
  columnCount: number
  formattedTable: string
}

type Patch = NodeRange & {
  text: string
  reportStartOffset: number
  reportEndOffset: number
}

function getOffset(point: NonNullable<Table['position']>['start'] | undefined): number | null {
  return typeof point?.offset === 'number' ? point.offset : null
}

function getNodeRange(node: { position?: Table['position'] }): NodeRange | null {
  const startOffset = getOffset(node.position?.start)
  const endOffset = getOffset(node.position?.end)
  if (startOffset === null || endOffset === null)
    return null

  return {
    startOffset,
    endOffset,
  }
}

function getLinePrefix(sourceText: string, startOffset: number): string {
  const newlineIndex = sourceText.lastIndexOf('\n', Math.max(0, startOffset - 1))
  const lineStartOffset = newlineIndex === -1 ? 0 : newlineIndex + 1
  return sourceText.slice(lineStartOffset, startOffset)
}

function getNodeText(node: PhrasingContent, sourceText: string): string {
  const nodeRange = getNodeRange(node)
  if (!nodeRange)
    return ''

  return sourceText.slice(nodeRange.startOffset, nodeRange.endOffset)
}

function getCellText(cell: TableCell, sourceText: string): string {
  if (cell.children.length === 0)
    return ''

  const firstChild = cell.children[0]
  const lastChild = cell.children[cell.children.length - 1]
  if (!firstChild || !lastChild)
    return ''

  const firstChildRange = getNodeRange(firstChild)
  const lastChildRange = getNodeRange(lastChild)
  if (firstChildRange && lastChildRange)
    return sourceText.slice(firstChildRange.startOffset, lastChildRange.endOffset).trim()

  return cell.children
    .map(child => getNodeText(child, sourceText))
    .join('')
    .trim()
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

function formatRowCellFragment(cellText: string, width: number, alignment: AlignType, isLastColumn: boolean): string {
  const content = getAlignedCellContent(cellText, width, alignment)
  return isLastColumn ? `| ${content} |` : `| ${content} `
}

function formatDelimiterCellFragment(width: number, alignment: AlignType, isLastColumn: boolean): string {
  const content = getDelimiterCell(width, alignment)
  return isLastColumn ? `| ${content} |` : `| ${content} `
}

function formatRow(cells: string[], widths: number[], alignments: AlignType[]): string {
  return `| ${cells
    .map((cell, index) => getAlignedCellContent(cell, widths[index] ?? 3, alignments[index] ?? null))
    .join(' | ')} |`
}

function formatDelimiterLine(widths: number[], alignments: AlignType[], linePrefix: string): string {
  return `${linePrefix}| ${widths
    .map((width, index) => getDelimiterCell(width, alignments[index] ?? null))
    .join(' | ')} |`
}

function normalizeAlignments(alignments: Table['align'], columnCount: number): AlignType[] {
  return Array.from({ length: columnCount }, (_, index) => alignments?.[index] ?? null)
}

function buildTableLayout(
  tableNode: Table,
  sourceText: string,
  linePrefix: string,
  lineEnding: string,
): TableLayout | null {
  if (tableNode.children.length === 0)
    return null

  const columnCount = Math.max(
    tableNode.align?.length ?? 0,
    ...tableNode.children.map(row => row.children.length),
  )
  if (columnCount === 0)
    return null

  const rowValues = tableNode.children.map((row) => {
    const values = row.children.map(cell => getCellText(cell, sourceText))
    while (values.length < columnCount)
      values.push('')
    return values
  })

  const widths = Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxCellLength = rowValues.reduce((max, row) =>
      Math.max(max, row[columnIndex]?.length ?? 0), 0)
    return Math.max(maxCellLength, 3)
  })

  const alignments = normalizeAlignments(tableNode.align, columnCount)
  const headerValues = rowValues[0]
  if (!headerValues)
    return null

  const formattedLines: string[] = []
  formattedLines.push(formatRow(headerValues, widths, alignments))
  formattedLines.push(formatDelimiterLine(widths, alignments, linePrefix))
  for (const row of rowValues.slice(1))
    formattedLines.push(`${linePrefix}${formatRow(row, widths, alignments)}`)

  return {
    rowValues,
    widths,
    alignments,
    columnCount,
    formattedTable: formattedLines.join(lineEnding),
  }
}

function getDelimiterLine(
  tableNode: Table,
  sourceText: string,
  lineEnding: string,
  tableEndOffset: number,
): DelimiterLine | null {
  const headerRow = tableNode.children[0]
  const headerRowRange = headerRow ? getNodeRange(headerRow) : null
  if (!headerRowRange)
    return null

  let lineStartOffset = headerRowRange.endOffset
  if (sourceText.startsWith('\r\n', lineStartOffset))
    lineStartOffset += 2
  else if (sourceText[lineStartOffset] === '\n')
    lineStartOffset += 1
  else
    return null

  const lineBreakOffset = sourceText.indexOf(lineEnding, lineStartOffset)
  const lineEndOffset = lineBreakOffset === -1 || lineBreakOffset > tableEndOffset
    ? tableEndOffset
    : lineBreakOffset

  if (lineStartOffset > lineEndOffset)
    return null

  return {
    startOffset: lineStartOffset,
    endOffset: lineEndOffset,
    text: sourceText.slice(lineStartOffset, lineEndOffset),
  }
}

function getDelimiterCellRanges(
  delimiterLine: DelimiterLine,
  columnCount: number,
): DelimiterCellRange[] {
  const pipeOffsets: number[] = []
  for (let index = 0; index < delimiterLine.text.length; index++) {
    if (delimiterLine.text[index] === '|')
      pipeOffsets.push(index)
  }

  if (pipeOffsets.length === 0)
    return []

  const ranges: DelimiterCellRange[] = []
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    const startInLine = pipeOffsets[columnIndex]
    if (startInLine === undefined)
      break

    const nextPipeInLine = pipeOffsets[columnIndex + 1]
    const isLastColumn = columnIndex === columnCount - 1
    const endInLine = isLastColumn ? delimiterLine.text.length : (nextPipeInLine ?? delimiterLine.text.length)
    if (endInLine <= startInLine)
      continue

    ranges.push({
      startOffset: delimiterLine.startOffset + startInLine,
      endOffset: delimiterLine.startOffset + endInLine,
      text: delimiterLine.text.slice(startInLine, endInLine),
    })
  }

  return ranges
}

function collectBodyCellPatches(
  tableNode: Table,
  layout: TableLayout,
  sourceText: string,
): Patch[] {
  const patches: Patch[] = []

  for (const [rowIndex, rowNode] of tableNode.children.entries()) {
    const rowValues = layout.rowValues[rowIndex] ?? []
    const rowRange = getNodeRange(rowNode)
    const expectedRowText = formatRow(rowValues, layout.widths, layout.alignments)

    const firstCellRange = rowNode.children[0] ? getNodeRange(rowNode.children[0]) : null
    const reportRange = firstCellRange ?? rowRange
    if (!reportRange)
      continue

    let canPatchByCell = rowNode.children.length === layout.columnCount
    const cellRanges: NodeRange[] = []

    if (canPatchByCell) {
      for (const cellNode of rowNode.children) {
        const cellRange = getNodeRange(cellNode)
        if (!cellRange) {
          canPatchByCell = false
          break
        }
        cellRanges.push(cellRange)
      }
    }

    if (!canPatchByCell) {
      if (!rowRange)
        continue

      const actualRowText = sourceText.slice(rowRange.startOffset, rowRange.endOffset)
      if (actualRowText === expectedRowText)
        continue

      patches.push({
        startOffset: rowRange.startOffset,
        endOffset: rowRange.endOffset,
        text: expectedRowText,
        reportStartOffset: reportRange.startOffset,
        reportEndOffset: reportRange.endOffset,
      })
      continue
    }

    for (let columnIndex = 0; columnIndex < layout.columnCount; columnIndex++) {
      const cellRange = cellRanges[columnIndex]
      if (!cellRange)
        continue

      const expectedCellText = formatRowCellFragment(
        rowValues[columnIndex] ?? '',
        layout.widths[columnIndex] ?? 3,
        layout.alignments[columnIndex] ?? null,
        columnIndex === layout.columnCount - 1,
      )
      const actualCellText = sourceText.slice(cellRange.startOffset, cellRange.endOffset)
      if (actualCellText === expectedCellText)
        continue

      patches.push({
        startOffset: cellRange.startOffset,
        endOffset: cellRange.endOffset,
        text: expectedCellText,
        reportStartOffset: cellRange.startOffset,
        reportEndOffset: cellRange.endOffset,
      })
    }
  }

  return patches
}

function collectDelimiterPatches(
  tableNode: Table,
  layout: TableLayout,
  sourceText: string,
  tableEndOffset: number,
  lineEnding: string,
  linePrefix: string,
): Patch[] {
  const delimiterLine = getDelimiterLine(tableNode, sourceText, lineEnding, tableEndOffset)
  if (!delimiterLine)
    return []

  const expectedDelimiterLine = formatDelimiterLine(layout.widths, layout.alignments, linePrefix)
  const delimiterRanges = getDelimiterCellRanges(delimiterLine, layout.columnCount)

  if (delimiterRanges.length !== layout.columnCount) {
    if (delimiterLine.text === expectedDelimiterLine)
      return []

    const reportRange = delimiterRanges[0] ?? delimiterLine
    return [
      {
        startOffset: delimiterLine.startOffset,
        endOffset: delimiterLine.endOffset,
        text: expectedDelimiterLine,
        reportStartOffset: reportRange.startOffset,
        reportEndOffset: reportRange.endOffset,
      },
    ]
  }

  const patches: Patch[] = []
  for (const [columnIndex, range] of delimiterRanges.entries()) {
    const expectedCellText = formatDelimiterCellFragment(
      layout.widths[columnIndex] ?? 3,
      layout.alignments[columnIndex] ?? null,
      columnIndex === layout.columnCount - 1,
    )
    if (range.text === expectedCellText)
      continue

    patches.push({
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      text: expectedCellText,
      reportStartOffset: range.startOffset,
      reportEndOffset: range.endOffset,
    })
  }

  return patches
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
    const sourceText = context.sourceCode.text

    return {
      table(tableNode: Table) {
        const tableRange = getNodeRange(tableNode)
        if (!tableRange)
          return

        const originalText = sourceText.slice(tableRange.startOffset, tableRange.endOffset)
        const lineEnding = originalText.includes('\r\n') ? '\r\n' : '\n'
        const linePrefix = getLinePrefix(sourceText, tableRange.startOffset)

        const layout = buildTableLayout(tableNode, sourceText, linePrefix, lineEnding)
        if (!layout || layout.formattedTable === originalText)
          return

        let patches: Patch[] = [
          ...collectBodyCellPatches(tableNode, layout, sourceText),
          ...collectDelimiterPatches(
            tableNode,
            layout,
            sourceText,
            tableRange.endOffset,
            lineEnding,
            linePrefix,
          ),
        ]

        if (patches.length === 0) {
          patches = [
            {
              startOffset: tableRange.startOffset,
              endOffset: tableRange.endOffset,
              text: layout.formattedTable,
              reportStartOffset: tableRange.startOffset,
              reportEndOffset: tableRange.endOffset,
            },
          ]
        }

        for (const patch of patches) {
          context.report({
            loc: {
              start: context.sourceCode.getLocFromIndex(patch.reportStartOffset),
              end: context.sourceCode.getLocFromIndex(patch.reportEndOffset),
            },
            messageId: 'formatTable',
            fix(fixer) {
              return fixer.replaceTextRange(
                [patch.startOffset, patch.endOffset],
                patch.text,
              )
            },
          })
        }
      },
    }
  },
})

export default rule
