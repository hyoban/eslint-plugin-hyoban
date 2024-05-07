import { version } from '../package.json'
import noExtraSpaceJsxExpression from './no-extra-space-jsx-expression'
import preferEarlyReturn from './prefer-early-return'

export default {
  meta: {
    name: 'hyoban',
    version,
  },
  rules: {
    'prefer-early-return': preferEarlyReturn,
    'no-extra-space-jsx-expression': noExtraSpaceJsxExpression,
  },
}
