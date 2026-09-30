// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.TZ = 'Europe/Berlin';
const { default: opening_hours } = await import('../../build/opening_hours.esm.mjs');

const localDate = (hour, minute = 0) => new Date(2026, 0, 5, hour, minute);

test('getIterator exposes the initial state and advances to state changes', () => {
    const start = localDate(8);
    const iterator = new opening_hours('Mo 09:00-17:00').getIterator(start);

    assert.equal(iterator.getDate().getTime(), start.getTime());
    assert.equal(iterator.getState(), false);
    assert.equal(iterator.getUnknown(), false);
    assert.equal(iterator.getStateString(false), 'close');

    assert.equal(iterator.advance(localDate(18)), true);
    assert.equal(iterator.getDate().getTime(), localDate(9).getTime());
    assert.equal(iterator.getState(), true);

    assert.equal(iterator.advance(localDate(18)), true);
    assert.equal(iterator.getDate().getTime(), localDate(17).getTime());
    assert.equal(iterator.getStateString(true), 'closed');
});

test('getIterator exposes comments and matching rules for the current state', () => {
    const iterator = new opening_hours('Mo 09:00-17:00 "foo"').getIterator(localDate(8));

    assert.equal(iterator.getComment(), undefined);
    assert.equal(iterator.getMatchingRule(), undefined);

    assert.equal(iterator.advance(localDate(18)), true);
    assert.equal(iterator.getComment(), 'foo');
    assert.equal(iterator.getMatchingRule(), 0);

    assert.equal(iterator.advance(localDate(18)), true);
    assert.equal(iterator.getComment(), undefined);
    assert.equal(iterator.getMatchingRule(), undefined);
});

test('getIterator does not advance at or beyond the date limit', () => {
    const iterator = new opening_hours('Mo 09:00-17:00').getIterator(localDate(8));

    assert.equal(iterator.advance(localDate(9)), false);
    assert.equal(iterator.getDate().getHours(), 8);

    assert.equal(iterator.advance(localDate(10)), true);
    assert.equal(iterator.getDate().getTime(), localDate(9).getTime());
});

test('getIterator setDate resets the current state and next change', () => {
    const iterator = new opening_hours('Mo-Fr 09:00-17:00').getIterator(localDate(8));

    iterator.setDate(localDate(10));

    assert.equal(iterator.getDate().getTime(), localDate(10).getTime());
    assert.equal(iterator.getState(), true);
    assert.equal(iterator.getUnknown(), false);

    assert.equal(iterator.advance(localDate(18)), true);
    assert.equal(iterator.getDate().getTime(), localDate(17).getTime());
    assert.equal(iterator.getState(), false);
});

test('getIterator stops when the current state has no next boundary', () => {
    const iterator = new opening_hours('24/7').getIterator(localDate(8));

    assert.equal(iterator.getState(), true);
    assert.equal(iterator.advance(), false);
});

test('supports monthday ranges with an open end', () => {
    const oh = new opening_hours('Mo-Fr 08:00-12:00; 2027 Feb 15+ unknown');

    assert.equal(oh.getStateString(new Date(2027, 1, 14, 10)), 'close');
    assert.equal(oh.getStateString(new Date(2027, 1, 15, 10)), 'unknown');
    assert.deepEqual(oh.getWarnings(), []);
});
