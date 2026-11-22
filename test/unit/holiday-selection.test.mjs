// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    selectPublicHolidays,
    selectSchoolHolidays,
} from '../../src/holidays/holiday-selection.mjs';

const publicCountryHolidays = [
    { name: 'Country holiday', fixed_date: [1, 1] },
    { name: 'Regional holiday', fixed_date: [2, 1], only_states: ['Example state'] },
];
const publicStateHolidays = [
    { name: 'State holiday', fixed_date: [3, 1] },
];
const countrySchoolHolidays = [
    { name: 'Summer', 2026: [7, 1, 8, 1] },
];
const stateSchoolHolidays = [
    { name: 'Winter', 2026: [2, 1, 2, 7] },
];

test('public holiday state data keeps precedence over country data', () => {
    assert.deepEqual(
        selectPublicHolidays(publicCountryHolidays, publicStateHolidays, 'Example state'),
        publicStateHolidays
    );
});

test('public country holidays are filtered by only_states', () => {
    assert.deepEqual(
        selectPublicHolidays(publicCountryHolidays, undefined, 'Other state'),
        [publicCountryHolidays[0]]
    );
    assert.deepEqual(
        selectPublicHolidays(publicCountryHolidays, undefined, undefined),
        [publicCountryHolidays[0]]
    );
});

test('school holiday state data is merged and sorted with country data', () => {
    assert.deepEqual(
        selectSchoolHolidays(countrySchoolHolidays, stateSchoolHolidays).map(item => item.name),
        ['Winter', 'Summer']
    );
});
