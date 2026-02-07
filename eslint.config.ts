// @ts-check
import { defineConfig, GLOB_TESTS } from 'eslint-config-hyoban'

import hyoban from './src/index'

export default defineConfig(
  {
    hyoban: false,
  },
  {
    files: GLOB_TESTS,
    rules: {
      'antfu/indent-unindent': 'error',
    },
  },
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
