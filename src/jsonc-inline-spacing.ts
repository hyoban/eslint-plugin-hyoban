/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AST as JsonAST } from 'jsonc-eslint-parser'

import { createEslintRule } from './utils'

export type MessageIds = 'jsoncInlineSpacing'
export type Options = []

function getCorrectedSource(value: JsonAST.JSONExpression | null): string | undefined {
  if (!value)
    return 'null'
  if (value.type === 'JSONLiteral')
    return value.raw
  if (value.type === 'JSONArrayExpression')
    return `[${value.elements.map(element => getCorrectedSource(element)).join(', ')}]`
  if (value.type === 'JSONObjectExpression') {
    return `{ ${value.properties
      .filter(property => property.key.type !== 'JSONIdentifier')
      .map(property => `${(property.key as JsonAST.JSONStringLiteral | JsonAST.JSONNumberLiteral).raw}: ${getCorrectedSource(property.value)}`)
      .join(', ')} }`
  }
}

const rule = createEslintRule<Options, MessageIds>({
  name: 'jsonc-inline-spacing',
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Enforce consistent spacing around JSONC attributes',
    },
    messages: {
      jsoncInlineSpacing: 'Expected correct spacing around JSONC attribute',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSONObjectExpression(node: JsonAST.JSONObjectExpression) {
        const { properties } = node

        const shouldIgnore = properties.length === 0
          || node.loc.start.line !== node.loc.end.line
          || !properties.every(property =>
            property.key.type !== 'JSONIdentifier' && property.key.raw
            && getCorrectedSource(property.value)
            && property?.loc.start.line === node?.loc.start.line,
          )
        if (shouldIgnore)
          return

        const source = context.sourceCode.getText(node as any)
        // @ts-expect-error it's fine
        const keys = properties.map(property => property.key.raw.trim())
        const values = properties.map(property => getCorrectedSource(property.value)?.trim())
        if (keys.length !== values.length)
          return
        const correctedSource = `{ ${keys.map((key, i) => `${key}: ${values[i]}`).join(', ')} }`
        const needFix = source !== correctedSource

        if (!needFix)
          return

        context.report({
          node: node as any,
          messageId: 'jsoncInlineSpacing',
          fix(fixer) {
            return fixer.replaceTextRange(node.range, correctedSource)
          },
        })
      },

      JSONArrayExpression(node: JsonAST.JSONArrayExpression) {
        const { elements } = node

        const shouldIgnore = elements.length === 0
          || node.loc.start.line !== node.loc.end.line
          || !elements.every(element =>
            element?.type === 'JSONLiteral'
            && element?.loc.start.line === node?.loc.start.line,
          )
        if (shouldIgnore)
          return

        const values = (elements as JsonAST.JSONLiteral[]).map(element => element.raw)
        const source = context.sourceCode.getText(node as any)
        const correctedSource = `[${values.join(', ')}]`
        const needFix = source !== correctedSource

        if (!needFix)
          return

        context.report({
          node: node as any,
          messageId: 'jsoncInlineSpacing',
          fix(fixer) {
            return fixer.replaceTextRange(node.range, correctedSource)
          },
        })
      },
    }
  },
})

export default rule
