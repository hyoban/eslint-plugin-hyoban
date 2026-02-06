import { version } from '../package.json'
import i18nFlatKey from './i18n-flat-key'
import jsoncInlineSpacing from './jsonc-inline-spacing'
import jsxAttributeSpacing from './jsx-attribute-spacing'
import markdownConsistentTableWidth from './markdown-consistent-table-width'
import noDependencyVersionPrefix from './no-dependency-version-prefix'
import preferEarlyReturn from './prefer-early-return'
import preferTailwindIcons from './prefer-tailwind-icons'

export default {
  meta: {
    name: 'hyoban',
    version,
  },
  /// keep-sorted
  rules: {
    'i18n-flat-key': i18nFlatKey,
    'jsonc-inline-spacing': jsoncInlineSpacing,
    'jsx-attribute-spacing': jsxAttributeSpacing,
    'markdown-consistent-table-width': markdownConsistentTableWidth,
    'no-dependency-version-prefix': noDependencyVersionPrefix,
    'prefer-early-return': preferEarlyReturn,
    'prefer-tailwind-icons': preferTailwindIcons,
  },
}
