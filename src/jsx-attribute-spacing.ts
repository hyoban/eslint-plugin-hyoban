import type { TSESTree } from '@typescript-eslint/utils'

import { createEslintRule } from './utils'

export type MessageIds = 'jsxAttributeSpacing' | 'noExtraSpaceJsxExpression'
export type Options = []

const expressionTypesNoCheck = new Set([
  'ConditionalExpression',
  'JSXElement',
  'TSAsExpression',
])

const rule = createEslintRule<Options, MessageIds>({
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
        || (expression.type === 'ArrowFunctionExpression'
          && expression.body.type !== 'BlockStatement')
      ) {
        return
      }

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
      'JSXExpressionContainer:exit': function (node) {
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

          const { range } = attribute
          const nextRange = nextAttribute.range
          const spaceBetween = nextRange[0] - range[1]
          if (spaceBetween === 0) {
            context.report({
              node: nextAttribute,
              fix(fixer) {
                return fixer.insertTextBefore(nextAttribute, ' ')
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
