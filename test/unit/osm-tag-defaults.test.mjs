// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getKeysWithWarnForPHMissing,
    resolveOsmTagDefault,
} from '../../src/osm-tag-defaults.mjs';

test('resolveOsmTagDefault returns defaults for exact tag keys', () => {
    assert.deepEqual(resolveOsmTagDefault('opening_hours'), { mode: 0, warn_for_PH_missing: true });
    for (const key of ['collection_times', 'service_times']) {
        assert.deepEqual(resolveOsmTagDefault(key), { mode: 2 });
    }
    for (const key of ['smoking_hours', 'happy_hours']) {
        assert.deepEqual(resolveOsmTagDefault(key), { mode: 0 });
    }
});

test('resolveOsmTagDefault matches tag patterns without inheriting the PH warning', () => {
    for (const key of ['opening_hours:kitchen', 'restaurant:opening_hours', 'restaurant:opening_hours:kitchen', 'access:conditional']) {
        assert.deepEqual(resolveOsmTagDefault(key), { mode: 0 });
    }
});

test('resolveOsmTagDefault keeps unanchored pattern matching', () => {
    assert.deepEqual(resolveOsmTagDefault('prefix_collection_times_suffix'), { mode: 2 });
});

test('resolveOsmTagDefault uses the last matching pattern for overlapping keys', () => {
    const tag_default = resolveOsmTagDefault('lit:collection_times');
    assert.equal(tag_default?.mode, 0);
    assert.equal(tag_default?.map?.['no'], 'off "specified as no: There are no lights installed."');
});

test('resolveOsmTagDefault returns undefined for unknown keys, including inherited property names', () => {
    for (const key of ['some_unknown_key', '__proto__', 'constructor', 'toString']) {
        assert.equal(resolveOsmTagDefault(key), undefined);
    }
});

test('resolveOsmTagDefault exposes the raw-value map for "lit"', () => {
    assert.deepEqual(resolveOsmTagDefault('lit'), {
        mode: 0,
        map: {
            yes: 'sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"',
            automatic: 'unknown "specified as automatic: When someone enters the way the lights are turned on."',
            no: 'off "specified as no: There are no lights installed."',
            interval: 'unknown "specified as interval"',
            limited: 'unknown "specified as limited"',
        },
    });
});

test('getKeysWithWarnForPHMissing only lists keys that request the warning', () => {
    assert.deepEqual(getKeysWithWarnForPHMissing(), ['opening_hours']);
});
