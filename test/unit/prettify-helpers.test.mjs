// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';

import {
    compareSelectorOrder,
    formatPrettifySelectorToken,
    getRuleSeparator,
    matchTokens,
    normalizePrettifyConf,
    shouldSortPrettifiedGroup,
} from '../../src/prettify-helpers.mjs';

const canonicalMonths = ['Jan', 'Feb', 'Mar'];
const canonicalWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const translate = (locale, category, value) => `${locale}:${category}:${value}`;

const format = (tokens, selectorType, conf = {}) => formatPrettifySelectorToken(
    '',
    tokens,
    0,
    0,
    tokens.length - 1,
    selectorType,
    {
        leave_weekday_sep_one_day_between: false,
        zero_pad_hour: true,
        one_zero_if_hour_zero: false,
        zero_pad_month_and_week_numbers: true,
        leave_off_closed: false,
        keyword_for_off_closed: 'off',
        ...conf,
    },
    canonicalMonths,
    canonicalWeekdays,
    translate,
);

test('normalizePrettifyConf applies defaults without mutating input', () => {
    const userConf = { locale: 'de' };
    const defaults = { locale: 'en', date_format: 'short' };

    assert.deepEqual(normalizePrettifyConf(userConf, defaults), {
        locale: 'de',
        date_format: 'short',
    });
    assert.deepEqual(userConf, { locale: 'de' });
});

test('matchTokens requires an exact ordered token sequence', () => {
    const tokens = [[1, 'number'], [':', 'timesep']];
    const malformedNumericToken = [['one', 'number']];

    assert.equal(matchTokens(tokens, 0, 'number', 'timesep'), true);
    assert.equal(matchTokens(tokens, 0, 'timesep'), false);
    assert.equal(matchTokens(tokens, 1, 'timesep', 'number'), false);
    assert.equal(matchTokens(malformedNumericToken, 0, 'number'), false);
});

test('getRuleSeparator preserves additional-rule and semicolon separators', () => {
    const conf = { rule_sep_string: ' ' , print_semicolon: true };

    assert.equal(getRuleSeparator([[], true], conf), ' || ');
    assert.equal(getRuleSeparator([[['x', 'rule separator']]], conf), ', ');
    assert.equal(getRuleSeparator([[['x', 'weekday']]], conf), '; ');
});

test('formatPrettifySelectorToken formats shorthand time ranges', () => {
    assert.deepEqual(format([[9, 'number'], ['-', '-'], [18, 'number']], 'time'), {
        value: '09:00-18:00',
        advance: 2,
    });
});

test('formatPrettifySelectorToken preserves malformed leading time separators', () => {
    const tokens = [[';', 'rule separator'], [':', 'timesep'], [9, 'number']];

    assert.equal(formatPrettifySelectorToken(
        '',
        tokens,
        2,
        2,
        2,
        'time',
        { zero_pad_hour: true, one_zero_if_hour_zero: false },
        canonicalMonths,
        canonicalWeekdays,
        translate,
    ).value, ':9');
});

test('formatPrettifySelectorToken formats locale day before month', () => {
    assert.equal(format([[2, 'month'], [6, 'number']], 'month', {
        locale: 'de',
        date_format: 'short',
        day_before_month: true,
        day_month_sep: '. ',
    }).value, '6. Mär');
});

test('selector sorting honors comments and rule exclusions', () => {
    const time = [[[0, 0, 'time'], '09:00']];
    const weekday = [[[0, 0, 'weekday'], 'Mo']];
    const comment = [[[0, 0, 'comment'], '"note"']];

    assert.equal(compareSelectorOrder(time[0], weekday[0]) > 0, true);
    assert.equal(shouldSortPrettifiedGroup(false, new Set(), 0, [time[0], weekday[0]]), true);
    assert.equal(shouldSortPrettifiedGroup(false, new Set(), 0, [comment[0]]), false);
    assert.equal(shouldSortPrettifiedGroup(false, new Set([0]), 0, [time[0]]), false);
});
