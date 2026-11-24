// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import { getMovableEventsForYear } from '../../src/holidays/movable-events.mjs';

function getDateParts(date) {
    return date === undefined
        ? undefined
        : [date.getFullYear(), date.getMonth(), date.getDate()];
}

test('movable events calculate representative holiday dates', () => {
    const events = getMovableEventsForYear(2024);

    assert.deepEqual(getDateParts(events.easter), [2024, 2, 31]);
    assert.deepEqual(getDateParts(events['orthodox easter']), [2024, 4, 5]);
    assert.deepEqual(getDateParts(events.firstJanuaryMonday), [2024, 0, 1]);
    assert.deepEqual(getDateParts(events.lastFebruarySunday), [2024, 1, 25]);
    assert.deepEqual(getDateParts(events['nextMo-Fr17March']), [2024, 2, 18]);
    assert.deepEqual(getDateParts(events.mondayBefore20Jun), [2024, 5, 17]);
});

test('movable events handle Easter month boundaries', () => {
    assert.deepEqual(getDateParts(getMovableEventsForYear(2008).easter), [2008, 2, 23]);
    assert.deepEqual(getDateParts(getMovableEventsForYear(2038).easter), [2038, 3, 25]);
    assert.deepEqual(getDateParts(getMovableEventsForYear(2023)['orthodox easter']), [2023, 3, 16]);
});

test('movable events preserve equinox support boundaries', () => {
    const firstSupportedYear = getMovableEventsForYear(1900);
    const lastSupportedYear = getMovableEventsForYear(2099);
    const unsupportedYear = getMovableEventsForYear(2100);

    assert.deepEqual(getDateParts(firstSupportedYear.springEquinox), [1900, 2, 21]);
    assert.deepEqual(getDateParts(lastSupportedYear.autumnalEquinox), [2099, 8, 23]);
    assert.equal(unsupportedYear.springEquinox, undefined);
    assert.equal(unsupportedYear.autumnalEquinox, undefined);
});
