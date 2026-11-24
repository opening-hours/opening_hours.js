// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import { compileShiftRule } from '../../src/holidays/shift-rules.mjs';

function dateParts(date) {
    return [date.getFullYear(), date.getMonth(), date.getDate()];
}

test('shift rules move weekend dates to the next weekday', () => {
    const shifter = compileShiftRule('if saturday,sunday then next monday');

    assert.deepEqual(dateParts(shifter(new Date(2025, 0, 4))), [2025, 0, 6]);
    assert.deepEqual(dateParts(shifter(new Date(2025, 0, 5))), [2025, 0, 6]);
});

test('shift rules support previous weekdays and leave unmatched dates unchanged', () => {
    const shifter = compileShiftRule('if monday then previous friday');
    const monday = new Date(2025, 0, 6);
    const tuesday = new Date(2025, 0, 7);

    assert.deepEqual(dateParts(shifter(monday)), [2025, 0, 3]);
    assert.equal(shifter(tuesday), tuesday);
});

test('shift rules use the first matching clause', () => {
    const shifter = compileShiftRule('if saturday then next monday if saturday then next tuesday');

    assert.deepEqual(dateParts(shifter(new Date(2025, 0, 4))), [2025, 0, 6]);
});

test('compiled shift rules are cached', () => {
    const rule = 'if sunday then next monday';

    assert.equal(compileShiftRule(rule), compileShiftRule(rule));
});

test('invalid shift rules report their parse failure', () => {
    assert.throws(
        () => compileShiftRule('if someday then next monday'),
        { name: 'SyntaxError', message: /shift_rule: unknown weekday "someday"/ }
    );
    assert.throws(
        () => compileShiftRule('not a shift rule'),
        { name: 'SyntaxError', message: /shift_rule: cannot parse/ }
    );
});
