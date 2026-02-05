import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

import { createEslintRule, warnOnce } from './utils'

type LibraryConfig = {
  source: string
  name?: string
}

type UserOptions = {
  libraries?: LibraryConfig[]
  prefix?: string
  propMappings?: Record<string, string>
}

type ResolvedLibraryConfig = {
  sourceRegex: RegExp
  nameRegex: RegExp
}

type IconImportInfo = {
  node: TSESTree.ImportSpecifier
  importedName: string
  localName: string
  config: ResolvedLibraryConfig
  source: string
  used: boolean
}

export type MessageIds = 'preferTailwindIcon' | 'preferTailwindIconImport'
export type Options = [UserOptions?]

function camelToKebab(value: string): string {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])(\d)/gi, '$1-$2')
    .replace(/(\d)([a-z])/gi, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function pixelToClass(pixels: number, classPrefix: string): string {
  if (pixels % 4 === 0)
    return `${classPrefix}-${pixels / 4}`
  return `${classPrefix}-[${pixels}px]`
}

function parseRegexPattern(pattern: string): RegExp | null {
  if (!pattern.startsWith('/'))
    return null

  let closingSlashIndex = -1
  for (let i = pattern.length - 1; i > 0; i--) {
    if (pattern[i] !== '/')
      continue

    let backslashCount = 0
    for (let j = i - 1; j >= 0 && pattern[j] === '\\'; j--)
      backslashCount++

    if (backslashCount % 2 === 0) {
      closingSlashIndex = i
      break
    }
  }

  if (closingSlashIndex <= 1)
    return null

  const source = pattern.slice(1, closingSlashIndex)
  const flags = pattern.slice(closingSlashIndex + 1)
  if (!/^[a-z]*$/i.test(flags))
    return null

  try {
    return new RegExp(source, flags)
  }
  catch {
    return null
  }
}

function createRegex(pattern: string, optionName: string): RegExp | null {
  if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
    const literalRegex = parseRegexPattern(pattern)
    if (literalRegex)
      return literalRegex

    warnOnce(`[prefer-tailwind-icons] Invalid regex literal in "${optionName}": ${pattern}`)
    return null
  }

  try {
    return new RegExp(pattern)
  }
  catch {
    warnOnce(`[prefer-tailwind-icons] Invalid regex in "${optionName}": ${pattern}`)
    return null
  }
}

function hasRegexMatch(value: string, regex: RegExp): boolean {
  regex.lastIndex = 0
  return regex.test(value)
}

function normalizeSegment(value: string): string {
  return value
    .replaceAll('/', '-')
    .replaceAll('_', '-')
    .replace(/\s+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function getIconClass(
  importName: string,
  source: string,
  config: ResolvedLibraryConfig,
  globalPrefix: string,
): string {
  config.sourceRegex.lastIndex = 0
  config.nameRegex.lastIndex = 0
  const sourceMatch = source.match(config.sourceRegex)
  const nameMatch = importName.match(config.nameRegex)

  const getGroup = (...keys: string[]) => {
    for (const key of keys) {
      const fromName = nameMatch?.groups?.[key]
      if (fromName)
        return fromName
      const fromSource = sourceMatch?.groups?.[key]
      if (fromSource)
        return fromSource
    }
    return ''
  }

  const iconSetPart = normalizeSegment(getGroup('set', 'iconSet'))
  const iconNamePart = camelToKebab(getGroup('name', 'icon') || importName) || camelToKebab(importName)
  const variantPart = normalizeSegment(getGroup('variant'))

  return [globalPrefix, iconSetPart, iconNamePart, variantPart]
    .filter(Boolean)
    .join('-')
    .replace(/-+/g, '-')
}

function matchLibrarySource(source: string, config: ResolvedLibraryConfig): boolean {
  return hasRegexMatch(source, config.sourceRegex)
}

function matchImportName(importName: string, config: ResolvedLibraryConfig): boolean {
  return hasRegexMatch(importName, config.nameRegex)
}

function normalizeLibraryConfig(config: LibraryConfig): ResolvedLibraryConfig | null {
  const sourceRegex = createRegex(config.source, 'libraries[].source')
  if (!sourceRegex)
    return null

  const nameRegex = createRegex(config.name ?? '.*', 'libraries[].name')
  if (!nameRegex)
    return null

  return {
    sourceRegex,
    nameRegex,
  }
}

function normalizeLibraryConfigs(configs: LibraryConfig[]): ResolvedLibraryConfig[] {
  const resolved: ResolvedLibraryConfig[] = []
  for (const config of configs) {
    const normalized = normalizeLibraryConfig(config)
    if (normalized)
      resolved.push(normalized)
  }
  return resolved
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

function getClassNameValueText(
  classNames: string,
  classNameAttribute: TSESTree.JSXAttribute | undefined,
  sourceCode: Readonly<TSESLint.SourceCode>,
): string {
  if (!classNameAttribute?.value)
    return `{${JSON.stringify(classNames)}}`

  if (
    classNameAttribute.value.type === 'Literal'
    && typeof classNameAttribute.value.value === 'string'
  ) {
    const merged = `${classNames} ${classNameAttribute.value.value}`.trim()
    return `{${JSON.stringify(merged)}}`
  }

  if (classNameAttribute.value.type === 'JSXExpressionContainer') {
    const expression = sourceCode.getText(classNameAttribute.value.expression)
    return `{[${JSON.stringify(classNames)}, ${expression}].filter(Boolean).join(' ')}`
  }

  return `{${JSON.stringify(classNames)}}`
}

function hasRuntimeReference(
  sourceCode: Readonly<TSESLint.SourceCode>,
  specifier: TSESTree.ImportSpecifier & { local: TSESTree.Identifier },
): boolean {
  try {
    const variable = sourceCode.getDeclaredVariables(specifier)[0]
    if (!variable)
      return false

    return variable.references.some((reference) => {
      if (reference.identifier === specifier.local)
        return false

      const ref = reference as { isTypeReference?: boolean, isValueReference?: boolean }
      if (typeof ref.isTypeReference === 'boolean')
        return !ref.isTypeReference
      if (typeof ref.isValueReference === 'boolean')
        return ref.isValueReference
      return true
    })
  }
  catch {
    return false
  }
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
                source: { type: 'string' },
                name: { type: 'string' },
              },
              required: ['source'],
              additionalProperties: false,
            },
          },
          prefix: {
            type: 'string',
            description: 'Global class prefix added before generated icon classes',
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
    const resolvedConfigs = normalizeLibraryConfigs(options.libraries ?? [])
    if (resolvedConfigs.length === 0)
      return {}

    const globalPrefix = options.prefix ?? ''
    const propMappings: Record<string, string> = options.propMappings ?? {}
    const iconImports = new Map<string, IconImportInfo>()
    const sourceCode = context.sourceCode

    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type')
          return
        if (typeof node.source.value !== 'string')
          return

        const source = node.source.value
        let matchedConfig: ResolvedLibraryConfig | null = null

        for (const config of resolvedConfigs) {
          if (!matchLibrarySource(source, config))
            continue

          matchedConfig = config
          break
        }

        if (!matchedConfig)
          return

        for (const specifier of node.specifiers) {
          if (!isNamedImportSpecifier(specifier))
            continue
          if (specifier.importKind === 'type')
            continue

          const importedName = specifier.imported.name
          if (!matchImportName(importedName, matchedConfig))
            continue

          const localName = specifier.local.name

          iconImports.set(localName, {
            node: specifier,
            importedName,
            localName,
            config: matchedConfig,
            source,
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

        const iconClass = getIconClass(iconInfo.importedName, iconInfo.source, iconInfo.config, globalPrefix)
        const classNameAttribute = node.attributes.find(attribute =>
          isJsxAttributeNamed(attribute, 'className'),
        )

        const mappedClasses: string[] = []
        const consumedMappedAttributes = new Set<TSESTree.JSXAttribute>()
        for (const [propName, classPrefix] of Object.entries(propMappings)) {
          const mappedAttribute = node.attributes.find(attribute =>
            isJsxAttributeNamed(attribute, propName),
          )
          if (!mappedAttribute)
            continue

          const pixelValue = getNumericJsxAttributeValue(mappedAttribute)
          if (pixelValue === null)
            continue

          mappedClasses.push(pixelToClass(pixelValue, classPrefix))
          consumedMappedAttributes.add(mappedAttribute)
        }

        const classesToAdd = [iconClass, ...mappedClasses].filter(Boolean).join(' ')

        if (node.parent.type !== 'JSXElement')
          return

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
                const classValue = getClassNameValueText(classesToAdd, classNameAttribute, sourceCode)

                const otherAttributes = node.attributes
                  .filter((attribute) => {
                    if (attribute === classNameAttribute)
                      return false
                    if (attribute.type !== 'JSXAttribute')
                      return true
                    return !consumedMappedAttributes.has(attribute)
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

          if (!hasRuntimeReference(sourceCode, iconInfo.node))
            continue

          const iconClass = getIconClass(iconInfo.importedName, iconInfo.source, iconInfo.config, globalPrefix)

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
