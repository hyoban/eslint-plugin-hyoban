// @ts-check

import { defineConfig, GLOB_TESTS } from 'eslint-config-hyoban'

import hyoban from './src/index'

export default defineConfig(
  {},
  {
    files: GLOB_TESTS,
    rules: {
      'antfu/indent-unindent': 'error',
    },
  },
  {
    files: [
      'src/md-one-sentence-per-line.md',
      'src/md-one-sentence-per-line.md/*.md',
    ],
    rules: {
      'hyoban/md-one-sentence-per-line': 'off',
      'markdown-preferences/no-laziness-blockquotes': 'off',
      'markdown-preferences/indent': 'off',
    },
  },
)
  .replace(
    'hyoban/hyoban/setup',
    {
      name: 'hyoban/hyoban/setup',
      plugins: {
        hyoban,
      },
    },
  )
