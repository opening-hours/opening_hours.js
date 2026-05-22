// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: CC0-1.0
import common from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import yaml from '@rollup/plugin-yaml';

// YAML plugin only for non-holiday files (e.g., word_error_correction.yaml)
// Holiday data now comes from generated-openholidays.js
const yamlPlugin = yaml({
    include: ['**/*.yaml', '!**/holidays/*.yaml']
});

const terserConfig = {
    format: {
        comments: /@preserve|@license|@cc_on|SPDX-FileCopyrightText|©|\(c\)/i,
    },
};

const globals = {
    'suncalc': 'SunCalc'
};

// Build configuration without bundled dependencies
const configWithoutDeps = {
    input: './src/index.js',
    plugins: [yamlPlugin],
    external: ['suncalc'],
    output: [
        // ESM build
        {
            file: 'build/opening_hours.esm.mjs',
            format: 'esm',
            sourcemap: true,
        },
        // UMD build
        {
            name: 'opening_hours',
            file: 'build/opening_hours.js',
            format: 'umd',
            globals,
        },
        // UMD build (minified)
        {
            name: 'opening_hours',
            file: 'build/opening_hours.min.js',
            format: 'umd',
            globals,
            plugins: [terser(terserConfig)],
            sourcemap: true,
        }
    ]
};

// Build configuration with bundled dependencies (UMD only)
const configWithDeps = {
    input: './src/index.js',
    plugins: [
        nodeResolve(),
        common(),
        yamlPlugin,
    ],
    output: [
        // UMD build (with dependencies)
        {
            name: 'opening_hours',
            file: 'build/opening_hours+deps.js',
            format: 'umd',
        },
        // UMD build (with dependencies, minified)
        {
            name: 'opening_hours',
            file: 'build/opening_hours+deps.min.js',
            format: 'umd',
            plugins: [terser(terserConfig)],
            sourcemap: true,
        }
    ]
};

export default [configWithoutDeps, configWithDeps];
