// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const { default: opening_hours } = await import('../../build/opening_hours.esm.mjs');

test('constructor rejects empty values containing only whitespace and semicolons', () => {
    for (const value of ['', ' ', '\t\n', ';', ' ; ;\n;\t']) {
        assert.throws(() => new opening_hours(value));
    }
});

test('constructor handles long whitespace prefixes without backtracking (#301)', () => {
    const libraryUrl = new URL('../../build/opening_hours.esm.mjs', import.meta.url).href;
    const script = `
        import opening_hours from ${JSON.stringify(libraryUrl)};

        const value = ' '.repeat(100000) + '24/7';
        const oh = new opening_hours(value);
        if (!oh.getState()) process.exitCode = 1;
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], {
        encoding: 'utf8',
        timeout: 500,
    });

    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr);
});

test('tag_key patterns still select the default mode', async () => {
    const { resolveOsmTagDefault } = await import('../../src/osm-tag-defaults.mjs');

    for (const key of ['opening_hours:kitchen', 'kitchen:opening_hours', 'a:opening_hours:b', 'x:conditional']) {
        assert.equal(resolveOsmTagDefault(key)?.mode, 0, key);
    }
    assert.equal(resolveOsmTagDefault('collection_times')?.mode, 2);
    assert.equal(resolveOsmTagDefault('unrelated'), undefined);
});

test('constructor rejects a wrong-type locale', () => {
    assert.throws(
        () => new opening_hours('Mo-Fr 08:00-16:00', null, { 'locale': 5 }),
        (error) => error === 'The optional_conf_parm["locale"] parameter is of unknown type. Given number, expected string.',
    );
});

test('constructor rejects a wrong-type additional_rule_separator', () => {
    assert.throws(
        () => new opening_hours('Mo-Fr 08:00-16:00', null, { 'additional_rule_separator': 'yes' }),
        (error) => error === 'The optional_conf_parm["additional_rule_separator"] parameter is of unknown type. Given string, expected boolean.',
    );
});

test('additional_rule_separator: false suppresses the related warning', () => {
    const value = 'Fr 22:00-04:00; Sa 21:00-04:00';
    const warning_type = 'additional_rule_separator_not_used_after_time_wrapping_midnight';

    const default_warnings = new opening_hours(value, null).getStructuredWarnings();
    assert.ok(default_warnings.some((warning) => warning.type === warning_type));

    const suppressed_warnings = new opening_hours(value, null, { 'additional_rule_separator': false }).getStructuredWarnings();
    assert.ok(!suppressed_warnings.some((warning) => warning.type === warning_type));
});
