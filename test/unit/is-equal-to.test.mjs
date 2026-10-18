// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

const { default: opening_hours } = await import('../../build/opening_hours.esm.mjs');

for (const [name, first_value, second_value, expected] of [
    ['always closed versus always open', 'Mo-Su: closed', 'Mo-Su: open', false],
    ['always closed versus 24/7', 'Mo-Su: closed', '24/7', false],
    ['closed weekday rules are equivalent', 'Tu: closed', 'Fri: closed', true],
    ['closed Monday versus open Monday', 'Mo: closed', 'Mo: open', false],
]) {
    test('isEqualTo issue #268: ' + name, () => {
        const first = new opening_hours(first_value);
        const second = new opening_hours(second_value);
        const start = new Date(2026, 0, 3, 18);

        assert.equal(first.isEqualTo(second, start)[0], expected);
        assert.equal(second.isEqualTo(first, start)[0], expected);
    });
}

test('isEqualTo reports the exact first differing state and matching rules', () => {
    const first = new opening_hours('Mo 10:00-12:00');
    const second = new opening_hours('Mo 11:00-12:00');
    const start = new Date(2026, 0, 3, 18);
    const difference = new Date(2026, 0, 5, 10);

    assert.deepEqual(first.isEqualTo(second, start), [false, {
        matching_rule: 0,
        matching_rule_other: undefined,
        deviation_for_time: { [+difference]: ['getState'] },
    }]);
    assert.deepEqual(second.isEqualTo(first, start), [false, {
        matching_rule: undefined,
        matching_rule_other: 0,
        deviation_for_time: { [+difference]: ['getState'] },
    }]);
});

test('isEqualTo reports an early difference without evaluating later school holidays', () => {
    const location = { address: { country_code: 'de', state: 'Baden-Württemberg' } };
    const first = new opening_hours('SH off; closed', location);
    const second = new opening_hours('Mo 10:00-12:00', location);
    const start = new Date(2026, 0, 5, 9);
    const difference = new Date(2026, 0, 5, 10);

    for (const [left, right, left_rule, right_rule] of [
        [first, second, 1, 0],
        [second, first, 0, 1],
    ]) {
        for (const end of [undefined, new Date(2100, 0, 1)]) {
            assert.deepEqual(left.isEqualTo(right, start, end), [false, {
                matching_rule: left_rule,
                matching_rule_other: right_rule,
                deviation_for_time: { [+difference]: ['getState'] },
            }]);
        }
    }
});

test('isEqualTo rejects an invalid start date', () => {
    const first = new opening_hours('24/7');
    const second = new opening_hours('24/7');

    assert.throws(() => first.isEqualTo(second, new Date(NaN)), {
        name: 'TypeError',
        message: 'start_date must be a valid Date',
    });
});

test('isEqualTo rejects an invalid end date', () => {
    const first = new opening_hours('24/7');
    const second = new opening_hours('24/7');

    assert.throws(() => first.isEqualTo(second, new Date(0), new Date(NaN)), {
        name: 'TypeError',
        message: 'end_date must be a valid Date',
    });
});

test('isEqualTo requires the end date to follow the start date', () => {
    const first = new opening_hours('24/7');
    const second = new opening_hours('24/7');
    const start = new Date('2026-01-02T00:00:00Z');
    const end = new Date('2026-01-01T00:00:00Z');

    assert.throws(() => first.isEqualTo(second, start, end), {
        name: 'RangeError',
        message: 'end_date must be after start_date',
    });
});

test('isEqualTo rejects an empty comparison range', () => {
    const first = new opening_hours('24/7');
    const second = new opening_hours('24/7');
    const start = new Date(2026, 0, 5);

    assert.throws(() => first.isEqualTo(second, start, start), {
        name: 'RangeError',
        message: 'end_date must be after start_date',
    });
});

test('isEqualTo excludes the end date and includes the start date', () => {
    const closed = new opening_hours('closed');
    const monday = new opening_hours('Mo 10:00-12:00');
    const start = new Date(2026, 0, 5, 9);
    const boundary = new Date(2026, 0, 5, 10);

    for (const [left, right] of [[closed, monday], [monday, closed]]) {
        assert.deepEqual(left.isEqualTo(right, start, new Date(+boundary - 1)), [true]);
        assert.deepEqual(left.isEqualTo(right, start, boundary), [true]);
        for (const from of [start, boundary]) {
            const result = left.isEqualTo(right, from, new Date(+boundary + 1));
            assert.equal(result[0], false);
            assert.deepEqual(result[1].deviation_for_time, { [+boundary]: ['getState'] });
        }
    }
});

for (const { name, first_value, second_value, difference, deviations } of [
    {
        name: 'initial state and uncertainty',
        first_value: 'unknown', second_value: 'open',
        difference: new Date(2026, 0, 5, 9), deviations: ['getState', 'getUnknown'],
    },
    {
        name: 'a later uncertainty-only change',
        first_value: 'closed; Mo 10:00-12:00 unknown', second_value: 'closed',
        difference: new Date(2026, 0, 5, 10), deviations: ['getUnknown'],
    },
    {
        name: 'a later comment-only change',
        first_value: 'open, Mo 10:00-12:00 open "appointment"', second_value: 'open',
        difference: new Date(2026, 0, 5, 10), deviations: ['getComment'],
    },
    {
        name: 'different changes after a shared transition',
        first_value: 'Mo 10:00-12:00', second_value: 'Mo 10:00-11:00',
        difference: new Date(2026, 0, 5, 11), deviations: ['getState'],
    },
]) {
    test('isEqualTo detects ' + name + ' in both directions', () => {
        const first = new opening_hours(first_value);
        const second = new opening_hours(second_value);
        const start = new Date(2026, 0, 5, 9);
        const end = new Date(2026, 0, 6);

        for (const [left, right] of [[first, second], [second, first]]) {
            assert.deepEqual(left.isEqualTo(right, start, end), [false, {
                matching_rule: left.getMatchingRule(difference),
                matching_rule_other: right.getMatchingRule(difference),
                deviation_for_time: { [+difference]: deviations },
            }]);
        }
    });
}

test('isEqualTo ignores internal boundaries without observable differences', () => {
    const first = new opening_hours('Mo off; Tu off; We off');
    const second = new opening_hours('closed');
    const start = new Date(2026, 0, 5, 9);
    const end = new Date(2026, 0, 20);

    assert.deepEqual(first.isEqualTo(second, start, end), [true]);
    assert.deepEqual(second.isEqualTo(first, start, end), [true]);
    assert.deepEqual(first.isEqualTo(first, start, end), [true]);
});

test('isEqualTo limits default comparisons but honors a longer explicit range', () => {
    const first = new opening_hours('2032 Jan 01 open');
    const second = new opening_hours('closed');
    const start = new Date(2026, 0, 5);
    const end = new Date(2033, 0, 1);

    for (const [left, right] of [[first, second], [second, first]]) {
        assert.deepEqual(left.isEqualTo(right, start), [true]);
        assert.equal(left.isEqualTo(right, start, end)[0], false);
    }
});

test('isEqualTo rejects an overflowing default range but accepts an explicit valid end', () => {
    const first = new opening_hours('24/7');
    const second = new opening_hours('24/7');
    const end = new Date(8640000000000000);
    const start = new Date(+end - 86400000);

    assert.throws(() => first.isEqualTo(second, start), {
        name: 'RangeError',
        message: 'default comparison range exceeds the supported Date range',
    });
    assert.deepEqual(first.isEqualTo(second, start, end), [true]);
});
