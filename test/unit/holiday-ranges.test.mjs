// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    collectSchoolHolidayRanges,
    getMonthDayNumber,
    getSchoolHolidayDatesForYear,
    sortRangesByStartDate,
} from '../../src/holidays/holiday-ranges.mjs';

test('school holiday year lookup prefers the year and falls back to default', () => {
    const holiday = {
        name: 'Break',
        default: [1, 2, 1, 5],
        2026: [2, 3, 2, 6],
    };
    assert.deepEqual(getSchoolHolidayDatesForYear(holiday, 2026), [2, 3, 2, 6]);
    assert.deepEqual(getSchoolHolidayDatesForYear(holiday, 2027), [1, 2, 1, 5]);
    assert.equal(getSchoolHolidayDatesForYear({ name: 'Missing' }, 2027), undefined);
});

test('school holiday year lookup rejects malformed values instead of using the default', () => {
    for (const invalid of ['nope', null, [1, 2], [1, 2, 1, '5']]) {
        assert.throws(
            () => getSchoolHolidayDatesForYear({ name: 'Invalid', default: [1, 2, 1, 5], 2026: invalid }, 2026),
            /Invalid school holiday definition/
        );
    }
});

test('school holiday ranges are collected and sorted by month and day', () => {
    const holidays = [
        { name: 'Summer', 2026: [7, 1, 8, 4] },
        { name: 'Winter', 2026: [1, 20, 1, 24, 2, 1, 2, 5] },
    ];
    const ranges = collectSchoolHolidayRanges(holidays, 2026);
    sortRangesByStartDate(ranges);
    assert.deepEqual(ranges.map(range => [range.fromMonth, range.fromDay, range.name]), [
        [1, 20, 'Winter'],
        [2, 1, 'Winter'],
        [7, 1, 'Summer'],
    ]);
    assert.equal(ranges.every(range => !('holiday' in range)), true);
    assert.equal(getMonthDayNumber(12, 31), 1131);
});
