import type { TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'

import { createRule } from './utils'

export type MessageIds = 'jsxAttributeSpacing' | 'noExtraSpaceJsxExpression'
export type Options = []

const expressionTypesNoCheck = new Set([
  AST_NODE_TYPES.ConditionalExpression,
  AST_NODE_TYPES.JSXElement,
  AST_NODE_TYPES.TSAsExpression,
])

const rule = createRule<Options, MessageIds>({
  name: 'jsx-attribute-spacing',
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    docs: {
      description: 'Enforce consistent spacing around JSX attributes',
    },
    messages: {
      jsxAttributeSpacing: 'Expected space before and after JSX attribute',
      noExtraSpaceJsxExpression: 'No extra space in jsx expression',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function check(node: TSESTree.JSXExpressionContainer, isExit?: boolean) {
      const { expression } = node
      if (
        expressionTypesNoCheck.has(expression.type)
        || (expression.type === AST_NODE_TYPES.ArrowFunctionExpression
        && expression.body.type !== AST_NODE_TYPES.BlockStatement)
      )
        return

      const containerRange = node.range
      const expressionRange = expression.range

      const noSpace = isExit
        ? containerRange[1] - expressionRange[1] === 1
        : expressionRange[0] - containerRange[0] === 1

      if (noSpace)
        return

      const rangeToRemove: [number, number] = isExit
        ? [expressionRange[1], containerRange[1] - 1]
        : [containerRange[0] + 1, expressionRange[0]]

      context.report({
        node,
        loc: {
          start: context.sourceCode.getLocFromIndex(rangeToRemove[0]),
          end: context.sourceCode.getLocFromIndex(rangeToRemove[1]),
        },
        messageId: 'noExtraSpaceJsxExpression',
        fix: fixer => fixer.removeRange(rangeToRemove),
      })
    }

    return {
      'JSXExpressionContainer:exit'(node) {
        check(node, true)
      },
      JSXExpressionContainer(node) {
        check(node)
      },
      JSXOpeningElement(node) {
        const { attributes } = node
        if (attributes.length <= 1)
          return
        for (const [index, attribute] of attributes.entries()) {
          const nextAttribute = attributes[index + 1]
          if (!nextAttribute)
            break
          const isSameLine = attribute.loc.end.line === nextAttribute.loc.start.line
          if (!isSameLine)
            continue

          const { range } = attribute
          const nextRange = nextAttribute.range
          const spaceBetween = nextRange[0] - range[1]
          if (spaceBetween !== 1) {
            context.report({
              node: nextAttribute,
              fix(fixer) {
                return fixer.replaceTextRange([range[1], nextRange[0]], ' ')
              },
              messageId: 'jsxAttributeSpacing',
            })
          }
        }
      },
    }
  },
})

export default rule
