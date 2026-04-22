// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: CC0-1.0
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 300],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'data',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test'
      ]
    ]
  }
};
