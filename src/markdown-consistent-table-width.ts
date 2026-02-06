import type { MarkdownRuleDefinition, MarkdownSourceCode } from '@eslint/markdown'
import type { AlignType, Table, TableCell, TableRow } from 'mdast'

type MessageIds = 'formatCell'

type Range = [number, number]

type ParsedRowSegment = {
  range: Range
  text: string
}

type VisitedCell = {
  range: Range
  rowIndex: number
  columnIndex: number
  actual: string
}

type TableState = {
  tableNode: Table
  columnCount: number
  rowNodes: TableRow[]
  rowValues: string[][]
  widths: number[]
  alignments: AlignType[]
  rowIndexByNode: WeakMap<TableRow, number>
  visitedCells: VisitedCell[]
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

function normalizeAlignments(alignments: Table['align'], columnCount: number): AlignType[] {
  return Array.from({ length: columnCount }, (_, index) => alignments?.[index] ?? null)
}

function buildTableState(tableNode: Table): TableState | null {
  if (tableNode.children.length === 0)
    return null

  const columnCount = Math.max(
    tableNode.align?.length ?? 0,
    ...tableNode.children.map(row => row.children.length),
  )
  if (columnCount === 0)
    return null

  const rowValues = tableNode.children.map(() => Array.from({ length: columnCount }, () => ''))
  const widths = Array.from({ length: columnCount }, () => 3)
  const rowIndexByNode = new WeakMap<TableRow, number>()
  for (const [index, rowNode] of tableNode.children.entries())
    rowIndexByNode.set(rowNode, index)

  return {
    tableNode,
    columnCount,
    rowNodes: tableNode.children,
    rowValues,
    widths,
    alignments: normalizeAlignments(tableNode.align, columnCount),
    rowIndexByNode,
    visitedCells: [],
  }
}

function formatTableCellSegment(content: string, columnIndex: number, columnCount: number): string {
  const suffix = columnIndex === columnCount - 1 ? ' |' : ' '
  return `| ${content}${suffix}`
}

function getExpectedCellSegment(
  cellText: string,
  width: number,
  alignment: AlignType,
  columnIndex: number,
  columnCount: number,
): string {
  return formatTableCellSegment(
    getAlignedCellContent(cellText, width, alignment),
    columnIndex,
    columnCount,
  )
}

function getExpectedDelimiterSegment(
  width: number,
  alignment: AlignType,
  columnIndex: number,
  columnCount: number,
): string {
  return formatTableCellSegment(
    getDelimiterCell(width, alignment),
    columnIndex,
    columnCount,
  )
}

function getExpectedBodyTail(
  state: TableState,
  rowIndex: number,
  startColumnIndex: number,
): string {
  if (startColumnIndex >= state.columnCount)
    return ''

  return Array.from(
    { length: state.columnCount - startColumnIndex },
    (_, index) => {
      const columnIndex = startColumnIndex + index
      return getExpectedCellSegment(
        state.rowValues[rowIndex]?.[columnIndex] ?? '',
        state.widths[columnIndex] ?? 3,
        state.alignments[columnIndex] ?? null,
        columnIndex,
        state.columnCount,
      )
    },
  ).join('')
}

function getExpectedDelimiterTail(state: TableState, startColumnIndex: number): string {
  if (startColumnIndex >= state.columnCount)
    return ''

  return Array.from(
    { length: state.columnCount - startColumnIndex },
    (_, index) => {
      const columnIndex = startColumnIndex + index
      return getExpectedDelimiterSegment(
        state.widths[columnIndex] ?? 3,
        state.alignments[columnIndex] ?? null,
        columnIndex,
        state.columnCount,
      )
    },
  ).join('')
}

function getBodyCellLabel(
  rowIndex: number,
  columnIndex: number,
  existingCellCount: number,
  columnCount: number,
  hasTail: boolean,
): string {
  if (!hasTail || existingCellCount === columnCount)
    return `R${rowIndex + 1}C${columnIndex + 1}`
  return `R${rowIndex + 1}C${columnIndex + 1}-C${columnCount}`
}

function getMissingBodyCellLabel(rowIndex: number, startColumnIndex: number, columnCount: number): string {
  return `R${rowIndex + 1}C${startColumnIndex + 1}-C${columnCount}`
}

function getDelimiterCellLabel(columnIndex: number, columnCount: number, hasTail: boolean): string {
  if (!hasTail)
    return `D${columnIndex + 1}`
  return `D${columnIndex + 1}-D${columnCount}`
}

function toMessageValue(text: string): string {
  return JSON.stringify(text)
}

function toEditableChange(
  range: Range,
  actualSegment: string,
  expectedSegment: string,
): { range: Range, actual: string, expected: string } {
  const hasLeadingPipe = actualSegment.startsWith('|')
  return {
    range: [range[0] + (hasLeadingPipe ? 1 : 0), range[1]],
    actual: hasLeadingPipe ? actualSegment.slice(1) : actualSegment,
    expected: hasLeadingPipe ? expectedSegment.slice(1) : expectedSegment,
  }
}

function isTableRow(node: unknown): node is TableRow {
  return !!node && typeof node === 'object' && (node as { type?: string }).type === 'tableRow'
}

function parseRowSegments(rowText: string, rowStartOffset: number): ParsedRowSegment[] {
  if (rowText.length === 0)
    return []

  const separators: number[] = []
  for (let index = 1; index < rowText.length - 1; index++) {
    if (rowText[index] === '|')
      separators.push(index)
  }

  const segments: ParsedRowSegment[] = []
  let start = 0
  for (const separator of separators) {
    segments.push({
      range: [rowStartOffset + start, rowStartOffset + separator],
      text: rowText.slice(start, separator),
    })
    start = separator
  }

  segments.push({
    range: [rowStartOffset + start, rowStartOffset + rowText.length],
    text: rowText.slice(start),
  })

  return segments
}

function getDelimiterRowSegments(
  tableNode: Table,
  sourceCode: MarkdownSourceCode,
): { segments: ParsedRowSegment[], rowEndOffset: number } | null {
  const headerRow = tableNode.children[0]
  if (!headerRow)
    return null

  const delimiterLine = headerRow.position?.end.line ? headerRow.position.end.line + 1 : null
  if (delimiterLine == null)
    return null

  const [tableStartOffset] = sourceCode.getRange(tableNode)
  const tableStartLoc = sourceCode.getLocFromIndex(tableStartOffset)
  const originLoc = sourceCode.getLocFromIndex(0)
  const lineBase = originLoc.line === 0 ? 0 : 1
  const columnBase = originLoc.column === 0 ? 0 : 1
  const delimiterLineIndex = delimiterLine - lineBase
  const fullDelimiterLine = sourceCode.lines[delimiterLineIndex]
  if (fullDelimiterLine == null)
    return null

  const prefixLength = Math.max(0, tableStartLoc.column - columnBase)
  const delimiterRowText = fullDelimiterLine.slice(prefixLength)
  const rowStartOffset = sourceCode.getIndexFromLoc({
    line: delimiterLine,
    column: tableStartLoc.column,
  })

  return {
    segments: parseRowSegments(delimiterRowText, rowStartOffset),
    rowEndOffset: rowStartOffset + delimiterRowText.length,
  }
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
      formatCell: 'Expected {{cell}} to be {{expected}}, but found {{actual}}.',
    },
    language: 'markdown',
    dialects: ['gfm'],
  },
  create(context) {
    const { sourceCode } = context
    const tableStack: Array<{ tableNode: Table, state: TableState | null }> = []

    function reportFormatCell(range: Range, cell: string, actual: string, expected: string): void {
      if (actual === expected)
        return

      context.report({
        loc: {
          start: sourceCode.getLocFromIndex(range[0]),
          end: sourceCode.getLocFromIndex(range[1]),
        },
        messageId: 'formatCell',
        data: {
          cell,
          expected: toMessageValue(expected),
          actual: toMessageValue(actual),
        },
        fix(fixer) {
          return fixer.replaceTextRange(range, expected)
        },
      })
    }

    return {
      table(tableNode) {
        tableStack.push({
          tableNode,
          state: buildTableState(tableNode),
        })
      },
      tableCell(cellNode) {
        const current = tableStack.at(-1)
        const state = current?.state
        if (!state)
          return

        const rowNode = sourceCode.getParent(cellNode)
        if (!isTableRow(rowNode))
          return

        const rowIndex = state.rowIndexByNode.get(rowNode)
        if (rowIndex == null)
          return

        const columnIndex = rowNode.children.indexOf(cellNode)
        if (columnIndex < 0 || columnIndex >= state.columnCount)
          return

        const cellText = getCellText(cellNode, sourceCode)
        state.rowValues[rowIndex]![columnIndex] = cellText
        state.widths[columnIndex] = Math.max(
          state.widths[columnIndex] ?? 3,
          getDisplayWidth(cellText),
          3,
        )

        state.visitedCells.push({
          range: sourceCode.getRange(cellNode) as Range,
          rowIndex,
          columnIndex,
          actual: sourceCode.getText(cellNode),
        })
      },
      'table:exit': function (tableNode) {
        const current = tableStack.pop()
        if (!current || current.tableNode !== tableNode || !current.state)
          return

        const state = current.state
        state.visitedCells.sort((left, right) => left.range[0] - right.range[0])

        const rowTailByRowIndex = new Map<number, string>()

        for (const [rowIndex, rowNode] of state.rowNodes.entries()) {
          const existingCellCount = rowNode.children.length
          if (existingCellCount >= state.columnCount)
            continue

          const expectedTail = getExpectedBodyTail(state, rowIndex, existingCellCount)
          if (expectedTail.length === 0)
            continue

          if (existingCellCount > 0) {
            rowTailByRowIndex.set(rowIndex, expectedTail)
            continue
          }

          const [, rowEndOffset] = sourceCode.getRange(rowNode)
          const missingCellLabel = getMissingBodyCellLabel(rowIndex, existingCellCount, state.columnCount)
          reportFormatCell([rowEndOffset, rowEndOffset], missingCellLabel, '', expectedTail)
        }

        for (const cell of state.visitedCells) {
          const rowNode = state.rowNodes[cell.rowIndex]
          const existingCellCount = rowNode?.children.length ?? 0
          const isLastExistingCell = existingCellCount > 0 && cell.columnIndex === existingCellCount - 1
          const rowTail = isLastExistingCell ? rowTailByRowIndex.get(cell.rowIndex) ?? '' : ''

          let expected = getExpectedCellSegment(
            state.rowValues[cell.rowIndex]?.[cell.columnIndex] ?? '',
            state.widths[cell.columnIndex] ?? 3,
            state.alignments[cell.columnIndex] ?? null,
            cell.columnIndex,
            state.columnCount,
          )
          if (rowTail)
            expected += rowTail

          const change = toEditableChange(cell.range, cell.actual, expected)
          if (change.actual === change.expected)
            continue

          const cellLabel = getBodyCellLabel(
            cell.rowIndex,
            cell.columnIndex,
            existingCellCount,
            state.columnCount,
            !!rowTail,
          )
          reportFormatCell(change.range, cellLabel, change.actual, change.expected)
        }

        const delimiterRow = getDelimiterRowSegments(state.tableNode, sourceCode)
        if (!delimiterRow)
          return

        const delimiterTail = getExpectedDelimiterTail(state, delimiterRow.segments.length)

        if (delimiterRow.segments.length === 0) {
          if (!delimiterTail)
            return

          reportFormatCell(
            [delimiterRow.rowEndOffset, delimiterRow.rowEndOffset],
            `D1-D${state.columnCount}`,
            '',
            delimiterTail,
          )
          return
        }

        const delimiterColumnCount = Math.min(state.columnCount, delimiterRow.segments.length)
        for (let columnIndex = 0; columnIndex < delimiterColumnCount; columnIndex++) {
          const segment = delimiterRow.segments[columnIndex]
          if (!segment)
            continue

          const isLastExistingDelimiterCell = columnIndex === delimiterRow.segments.length - 1
          let expected = getExpectedDelimiterSegment(
            state.widths[columnIndex] ?? 3,
            state.alignments[columnIndex] ?? null,
            columnIndex,
            state.columnCount,
          )
          if (isLastExistingDelimiterCell && delimiterTail)
            expected += delimiterTail

          const change = toEditableChange(segment.range, segment.text, expected)
          if (change.actual === change.expected)
            continue

          const cellLabel = getDelimiterCellLabel(
            columnIndex,
            state.columnCount,
            isLastExistingDelimiterCell && !!delimiterTail,
          )
          reportFormatCell(change.range, cellLabel, change.actual, change.expected)
        }
      },
    }
  },
}

export default rule
