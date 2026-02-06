// @ts-check
import { defineConfig } from 'eslint-config-hyoban'

import hyoban from './src/index'

export default defineConfig(
  {},
  {
    plugins: {
      hyoban,
    },
  },
  {
    files: ['README.md'],
    rules: {
      'hyoban/markdown-consistent-table-width': 'error',
    },
  },
)
