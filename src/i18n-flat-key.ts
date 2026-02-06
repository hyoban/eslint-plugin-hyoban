import type { TSESTree } from '@typescript-eslint/utils'
import type { AST as JsonAST } from 'jsonc-eslint-parser'

import { createEslintRule } from './utils'

export type MessageIds
  = | 'nestedJsonNotAllowed'
    | 'keyConflictsWithPrefix'
    | 'keyIsPrefixOfAnother'
export type Options = []

type KeyEntry = {
  key: string
  keyNode: JsonAST.JSONProperty['key']
}

type ReportTargetNode = {
  range: [number, number]
}

type ReportSourceCode = {
  ast: TSESTree.Program
  getNodeByRangeIndex: (index: number) => unknown
}

function getPropertyKey(property: JsonAST.JSONProperty): string | null {
  if (property.key.type === 'JSONIdentifier')
    return property.key.name

  if (
    property.key.type === 'JSONLiteral'
    && typeof property.key.value === 'string'
  ) {
    return property.key.value
  }

  return null
}

function getReportNode(sourceCode: Readonly<ReportSourceCode>, targetNode: ReportTargetNode): TSESTree.Node {
  const reportNode = sourceCode.getNodeByRangeIndex(targetNode.range[0])
  if (reportNode)
    return reportNode as TSESTree.Node
  return sourceCode.ast
}

const rule = createEslintRule<Options, MessageIds>({
  name: 'i18n-flat-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure i18n JSON keys are flat and valid as object paths',
    },
    messages: {
      nestedJsonNotAllowed: 'Invalid JSON structure: nested object is not allowed, use flat keys instead',
      keyConflictsWithPrefix: 'Invalid key structure: \'{{key}}\' conflicts with \'{{prefix}}\'',
      keyIsPrefixOfAnother: 'Invalid key structure: \'{{key}}\' is a prefix of another key',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSONObjectExpression(node: JsonAST.JSONObjectExpression) {
        if (node.parent.type !== 'JSONExpressionStatement') {
          const targetNode = node.parent.type === 'JSONProperty'
            ? node.parent.key
            : node
          context.report({
            node: getReportNode(context.sourceCode, targetNode),
            messageId: 'nestedJsonNotAllowed',
          })
          return
        }

        const keyEntries = new Map<string, KeyEntry>()
        for (const property of node.properties) {
          const key = getPropertyKey(property)
          if (key === null)
            continue
          if (keyEntries.has(key))
            continue
          keyEntries.set(key, {
            key,
            keyNode: property.key,
          })
        }

        const keys = [...keyEntries.keys()]
        const keyPrefixes = new Set<string>()

        for (const key of keys) {
          if (!key.includes('.'))
            continue

          const parts = key.split('.')
          for (let i = 1; i < parts.length; i++) {
            const prefix = parts.slice(0, i).join('.')
            if (keyEntries.has(prefix)) {
              const keyNode = keyEntries.get(key)?.keyNode ?? node
              context.report({
                node: getReportNode(context.sourceCode, keyNode),
                messageId: 'keyConflictsWithPrefix',
                data: {
                  key,
                  prefix,
                },
              })
            }
            keyPrefixes.add(prefix)
          }
        }

        for (const key of keys) {
          if (!keyPrefixes.has(key))
            continue

          const keyNode = keyEntries.get(key)?.keyNode ?? node
          context.report({
            node: getReportNode(context.sourceCode, keyNode),
            messageId: 'keyIsPrefixOfAnother',
            data: {
              key,
            },
          })
        }
      },
    }
  },
})

export default rule
