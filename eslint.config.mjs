import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import markdown from '@eslint/markdown'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['build/*', 'submodules/*', '**/yohours_model.js']),
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [js.configs.recommended],
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
      'no-var': 'error'
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
