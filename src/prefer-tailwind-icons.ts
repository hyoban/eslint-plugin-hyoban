import type { TSESTree } from '@typescript-eslint/utils'

import { createEslintRule } from './utils'

type PatternMatch = RegExpMatchArray | null

type IconConfig = {
  pattern: string | RegExp
  prefix: string | ((match: PatternMatch) => string)
  suffix?: string | ((match: PatternMatch) => string)
  extractSubPath?: boolean
  iconFilter?: (name: string) => boolean
  stripPrefix?: string
  stripSuffix?: string
  transformName?: (name: string, source: string) => string
}

type UserLibraryConfig = {
  pattern: string
  prefix: string
  suffix?: string
  extractSubPath?: boolean
}

type UserOptions = {
  libraries?: UserLibraryConfig[]
  propMappings?: Record<string, string>
}

type IconImportInfo = {
  node: TSESTree.ImportSpecifier
  importedName: string
  localName: string
  config: IconConfig
  source: string
  match: PatternMatch
  used: boolean
}

type MatchResult = {
  matched: boolean
  match: PatternMatch
}

export type MessageIds = 'preferTailwindIcon' | 'preferTailwindIconImport'
export type Options = [UserOptions?]

/**
 * Convert PascalCase/camelCase to kebab-case
 */
function camelToKebab(name: string): string {
  return name
    .replace(/([a-z])(\d)/g, '$1-$2')
    .replace(/(\d)([a-z])/gi, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

/**
 * Convert pixel value to Tailwind class
 */
function pixelToClass(pixels: number, classPrefix: string): string {
  if (pixels % 4 === 0) {
    return `${classPrefix}-${pixels / 4}`
  }

  return `${classPrefix}-[${pixels}px]`
}

/**
 * Match source against config pattern
 */
function matchPattern(source: string, config: IconConfig): MatchResult {
  const { pattern } = config
  if (pattern instanceof RegExp) {
    const match = source.match(pattern)
    if (!match)
      return { matched: false, match: null }
    return { matched: true, match }
  }

  if (source === pattern || source.startsWith(`${pattern}/`))
    return { matched: true, match: null }

  return { matched: false, match: null }
}

/**
 * Get icon class from config
 */
function getIconClass(iconName: string, config: IconConfig, source: string, match: PatternMatch): string {
  let name = iconName
  if (config.stripPrefix && name.startsWith(config.stripPrefix))
    name = name.slice(config.stripPrefix.length)
  if (config.stripSuffix && name.endsWith(config.stripSuffix))
    name = name.slice(0, -config.stripSuffix.length)

  const transformed = config.transformName
    ? config.transformName(name, source)
    : camelToKebab(name)

  const prefix = typeof config.prefix === 'function' ? config.prefix(match) : config.prefix
  const suffix = typeof config.suffix === 'function'
    ? config.suffix(match)
    : (config.suffix ?? '')

  let subPrefix = ''
  if (config.extractSubPath) {
    const basePath = match?.[0] ?? (typeof config.pattern === 'string' ? config.pattern : '')
    if (basePath && source.startsWith(`${basePath}/`)) {
      const subPath = source.slice(basePath.length + 1)
      if (subPath)
        subPrefix = `${subPath.replaceAll('/', '-')}-`
    }
  }

  return `${prefix}${subPrefix}${transformed}${suffix}`
}

function isNamedImportSpecifier(
  specifier: TSESTree.ImportClause,
): specifier is TSESTree.ImportSpecifier & { imported: TSESTree.Identifier, local: TSESTree.Identifier } {
  return specifier.type === 'ImportSpecifier'
    && specifier.imported.type === 'Identifier'
    && specifier.local.type === 'Identifier'
}

function isJsxAttributeNamed(
  attribute: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
  name: string,
): attribute is TSESTree.JSXAttribute & { name: TSESTree.JSXIdentifier } {
  return attribute.type === 'JSXAttribute'
    && attribute.name.type === 'JSXIdentifier'
    && attribute.name.name === name
}

function getNumericJsxAttributeValue(attribute: TSESTree.JSXAttribute): number | null {
  if (!attribute.value)
    return null

  if (attribute.value.type === 'Literal' && typeof attribute.value.value === 'number')
    return attribute.value.value

  if (
    attribute.value.type === 'JSXExpressionContainer'
    && attribute.value.expression.type === 'Literal'
    && typeof attribute.value.expression.value === 'number'
  ) {
    return attribute.value.expression.value
  }

  return null
}

const rule = createEslintRule<Options, MessageIds>({
  name: 'prefer-tailwind-icons',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description: 'Prefer Tailwind CSS icon classes over icon library components',
    },
    schema: [
      {
        type: 'object',
        properties: {
          libraries: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pattern: { type: 'string' },
                prefix: { type: 'string' },
                suffix: { type: 'string' },
                extractSubPath: { type: 'boolean' },
              },
              required: ['pattern', 'prefix'],
              additionalProperties: false,
            },
          },
          propMappings: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Maps component props to Tailwind class prefixes',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferTailwindIcon:
        'Prefer using Tailwind CSS icon class "{{iconClass}}" over "{{componentName}}" from "{{source}}"',
      preferTailwindIconImport:
        'Icon "{{importedName}}" from "{{source}}" can be replaced with Tailwind CSS class "{{iconClass}}"',
    },
  },
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const iconConfigs: IconConfig[] = options.libraries ?? []
    if (iconConfigs.length === 0)
      return {}

    const propMappings: Record<string, string> = options.propMappings ?? {}

    const iconImports = new Map<string, IconImportInfo>()
    const sourceCode = context.sourceCode

    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string')
          return

        const source = node.source.value
        let matchedConfig: IconConfig | null = null
        let matchResult: PatternMatch = null

        for (const config of iconConfigs) {
          const result = matchPattern(source, config)
          if (!result.matched)
            continue

          matchedConfig = config
          matchResult = result.match
          break
        }

        if (!matchedConfig)
          return

        const iconFilter = matchedConfig.iconFilter ?? (() => true)

        for (const specifier of node.specifiers) {
          if (!isNamedImportSpecifier(specifier))
            continue

          const importedName = specifier.imported.name
          const localName = specifier.local.name
          if (!iconFilter(importedName))
            continue

          iconImports.set(localName, {
            node: specifier,
            importedName,
            localName,
            config: matchedConfig,
            source,
            match: matchResult,
            used: false,
          })
        }
      },

      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier')
          return

        const iconInfo = iconImports.get(node.name.name)
        if (!iconInfo)
          return

        iconInfo.used = true

        const iconClass = getIconClass(iconInfo.importedName, iconInfo.config, iconInfo.source, iconInfo.match)
        const classNameAttribute = node.attributes.find(attribute =>
          isJsxAttributeNamed(attribute, 'className'),
        )

        const mappedClasses: string[] = []
        const mappedPropNames = Object.keys(propMappings)

        for (const propName of mappedPropNames) {
          const mappedAttribute = node.attributes.find(attribute =>
            isJsxAttributeNamed(attribute, propName),
          )
          if (!mappedAttribute)
            continue

          const pixelValue = getNumericJsxAttributeValue(mappedAttribute)
          if (pixelValue === null)
            continue

          mappedClasses.push(pixelToClass(pixelValue, propMappings[propName]!))
        }

        const classesToAdd = [iconClass, ...mappedClasses].filter(Boolean).join(' ')
        let newClassName = classesToAdd
        if (classNameAttribute?.value) {
          if (
            classNameAttribute.value.type === 'Literal'
            && typeof classNameAttribute.value.value === 'string'
          ) {
            newClassName = `${classesToAdd} ${classNameAttribute.value.value}`
          }
          else if (classNameAttribute.value.type === 'JSXExpressionContainer') {
            const expression = sourceCode.getText(classNameAttribute.value.expression)
            newClassName = `\`${classesToAdd} \${${expression}}\``
          }
        }

        if (node.parent.type !== 'JSXElement')
          return

        const excludedAttributes = new Set(['className', ...mappedPropNames])

        context.report({
          node,
          messageId: 'preferTailwindIcon',
          data: {
            iconClass,
            componentName: iconInfo.localName,
            source: iconInfo.source,
          },
          suggest: [
            {
              messageId: 'preferTailwindIcon',
              data: {
                iconClass,
                componentName: iconInfo.localName,
                source: iconInfo.source,
              },
              fix(fixer) {
                const classValue = newClassName.startsWith('`')
                  ? `{${newClassName}}`
                  : `{${JSON.stringify(newClassName)}}`

                const otherAttributes = node.attributes
                  .filter((attribute) => {
                    if (attribute.type !== 'JSXAttribute')
                      return true
                    if (attribute.name.type !== 'JSXIdentifier')
                      return true
                    return !excludedAttributes.has(attribute.name.name)
                  })
                  .map(attribute => sourceCode.getText(attribute))
                  .join(' ')

                const attrsText = otherAttributes
                  ? `className=${classValue} ${otherAttributes}`
                  : `className=${classValue}`

                if (node.selfClosing)
                  return fixer.replaceText(node.parent, `<span ${attrsText} />`)

                const fixes = [fixer.replaceText(node, `<span ${attrsText}>`)]
                if (node.parent.closingElement)
                  fixes.push(fixer.replaceText(node.parent.closingElement, '</span>'))
                return fixes
              },
            },
          ],
        })
      },

      'Program:exit': function () {
        for (const iconInfo of iconImports.values()) {
          if (iconInfo.used)
            continue

          const iconClass = getIconClass(iconInfo.importedName, iconInfo.config, iconInfo.source, iconInfo.match)

          try {
            const variables = sourceCode.getDeclaredVariables(iconInfo.node)
            const variable = variables[0]
            const hasReferences = variable?.references.some(ref => ref.identifier !== iconInfo.node.local) ?? false
            if (!hasReferences)
              continue
          }
          catch {
            continue
          }

          context.report({
            node: iconInfo.node,
            messageId: 'preferTailwindIconImport',
            data: {
              importedName: iconInfo.importedName,
              source: iconInfo.source,
              iconClass,
            },
          })
        }
      },
    }
  },
})

export default rule
