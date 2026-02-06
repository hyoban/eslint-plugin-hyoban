import type { TSESTree } from '@typescript-eslint/utils'
import type { AST as JsonAST } from 'jsonc-eslint-parser'

import { createEslintRule } from './utils'

export type MessageIds = 'dependencyVersionPrefix'
type UserOptions = {
  dependencyKeys?: string[]
  versionPrefixes?: string[]
}
export type Options = [UserOptions?]

const DEFAULT_DEPENDENCY_KEYS = ['dependencies', 'devDependencies']
const DEFAULT_VERSION_PREFIXES = ['^', '~']

function getDependencySelector(dependencyKeys: string[]) {
  return `JSONProperty:matches(${dependencyKeys.map(key => `[key.value=${JSON.stringify(key)}]`).join(', ')}) > JSONObjectExpression > JSONProperty`
}

const rule = createEslintRule<Options, MessageIds>({
  name: 'no-dependency-version-prefix',
  meta: {
    type: 'problem',
    docs: {
      description: `Ensure dependency versions do not use configured prefixes (${DEFAULT_VERSION_PREFIXES.join(' or ')})`,
    },
    messages: {
      dependencyVersionPrefix: 'Dependency "{{packageName}}" has version prefix "{{prefix}}" that should be removed (found: "{{version}}", expected: "{{cleanVersion}}")',
    },
    schema: [
      {
        type: 'object',
        properties: {
          dependencyKeys: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          versionPrefixes: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    fixable: 'code',
  },
  defaultOptions: [
    {
      dependencyKeys: DEFAULT_DEPENDENCY_KEYS,
      versionPrefixes: DEFAULT_VERSION_PREFIXES,
    },
  ],
  create(context, [options = {}]) {
    const dependencyKeys = options.dependencyKeys ?? DEFAULT_DEPENDENCY_KEYS
    const versionPrefixes = options.versionPrefixes ?? DEFAULT_VERSION_PREFIXES
    if (dependencyKeys.length === 0 || versionPrefixes.length === 0)
      return {}

    const dependencySelector = getDependencySelector(dependencyKeys)

    return {
      [dependencySelector](node: JsonAST.JSONProperty) {
        const versionNode = node.value

        if (versionNode.type !== 'JSONLiteral' || typeof versionNode.value !== 'string')
          return

        const version = versionNode.value
        const foundPrefix = versionPrefixes.find(prefix => version.startsWith(prefix))
        if (!foundPrefix)
          return

        const packageName = node.key.type === 'JSONIdentifier'
          ? node.key.name
          : String(node.key.value)
        const cleanVersion = version.slice(foundPrefix.length)
        const canAutoFix = /^\d+\.\d+\.\d+$/.test(cleanVersion)

        context.report({
          node: versionNode as unknown as TSESTree.Node,
          messageId: 'dependencyVersionPrefix',
          data: {
            packageName,
            prefix: foundPrefix,
            version,
            cleanVersion,
          },
          fix: canAutoFix
            ? fixer => fixer.replaceTextRange(versionNode.range, `"${cleanVersion}"`)
            : undefined,
        })
      },
    }
  },
})

export default rule
