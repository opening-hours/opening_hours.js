// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: CC0-1.0
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import jsdoc from 'eslint-plugin-jsdoc';
import markdown from '@eslint/markdown'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['build/*', 'submodules/*', '**/yohours_model.js', 'src/holidays/generated-openholidays.js']),
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [js.configs.recommended, jsdoc.configs['flat/recommended'],],
    plugins: { '@stylistic': stylistic },
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      sourceType: 'module',
    },
    rules: {
      '@stylistic/quotes': [ 'error', 'single' ],
      '@stylistic/no-trailing-spaces': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'jsdoc/require-jsdoc': ['warn', { publicOnly: true }],
      // TODO: Re-enable this rule after the affected comments have been migrated safely.
      // Disabled for now because its autofix does not preserve Vim fold markers or legacy JSDoc descriptions.
      'jsdoc/convert-to-jsdoc-comments': ['off', { lineOrBlockStyle: 'block' }],
    },
  },
  { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
])
