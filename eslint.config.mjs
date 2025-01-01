import eslint from '@eslint/js'
import globals from "globals";
import tseslint from 'typescript-eslint'

export default tseslint.config(
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
    ],
    rules: {
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    "files": ["**/*.js", "**/*.mjs"],
    "languageOptions": {
      "ecmaVersion": "latest",
      "globals": {
        ...globals.browser,
        ...globals.node
      },
      "sourceType": "module"
    },
    rules: {
      'no-cond-assign': 'warn',
      'no-constant-binary-expression': 'warn',
      'no-empty': 'warn',
      'no-empty-function': 'warn',
      'no-func-assign': 'warn',
      'no-prototype-builtins': 'warn',
      'no-redeclare': 'warn',
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
      'no-useless-escape': 'warn',
    }
  },
  {
    ignores: ['build/*', 'submodules/*', '**/yohours_model.js']
  }
)
