import type { AST as JsonAST } from 'jsonc-eslint-parser'

import { createEslintRule } from './utils'

export type MessageIds
  = | 'nestedJsonNotAllowed'
    | 'duplicateKeyNotAllowed'
    | 'keyConflictsWithPrefix'
    | 'keyIsPrefixOfAnother'
export type Options = []

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

const rule = createEslintRule<Options, MessageIds>({
  name: 'i18n-flat-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure i18n JSON keys are flat and valid as object paths',
    },
    messages: {
      nestedJsonNotAllowed: 'Invalid JSON structure: nested object is not allowed, use flat keys instead',
      duplicateKeyNotAllowed: 'Invalid key structure: duplicate key \'{{key}}\' is not allowed',
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
          context.report({
            loc: node.loc,
            messageId: 'nestedJsonNotAllowed',
          })
          return
        }

        const keyedProperties = node.properties
          .map(property => ({
            key: getPropertyKey(property),
            loc: property.loc,
          }))
          .filter((property): property is { key: string, loc: JsonAST.SourceLocation } => property.key !== null)
        const keySetForDuplicate = new Set<string>()
        for (const property of keyedProperties) {
          if (keySetForDuplicate.has(property.key)) {
            context.report({
              loc: property.loc,
              messageId: 'duplicateKeyNotAllowed',
              data: {
                key: property.key,
              },
            })
            continue
          }
          keySetForDuplicate.add(property.key)
        }

        const keys = [...keySetForDuplicate]
        const keySet = new Set(keys)
        const keyPrefixes = new Set<string>()

        for (const key of keys) {
          if (!key.includes('.'))
            continue

          const parts = key.split('.')
          for (let i = 1; i < parts.length; i++) {
            const prefix = parts.slice(0, i).join('.')
            if (keySet.has(prefix)) {
              context.report({
                loc: node.loc,
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

          context.report({
            loc: node.loc,
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
