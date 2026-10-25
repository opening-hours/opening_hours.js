// SPDX-License-Identifier: LGPL-3.0-only
// SPDX-FileCopyrightText: © opening_hours.js contributors

import test from 'node:test';
import assert from 'node:assert/strict';

import opening_hours from '../../build/opening_hours.esm.mjs';

test('tokenizer preserves corrected-word output and warning positions', () => {
    const value = 'Mon';
    const hours = new opening_hours(value, null);

    assert.equal(hours.prettifyValue(), 'Mo');
    assert.deepEqual(hours.getStructuredWarnings().map(({ type, value, position }) => ({
        type,
        value,
        position,
    })), [
        { type: 'word_error_correction', value, position: 3 },
        { type: 'vague', value, position: 3 },
    ]);
});

test('tokenizer preserves phrase-correction output and warning positions', () => {
    const value = 'every day';
    const hours = new opening_hours(value, null);

    assert.equal(hours.prettifyValue(), 'Mo-Su');
    assert.deepEqual(hours.getStructuredWarnings().map(({ type, value, position }) => ({
        type,
        value,
        position,
    })), [
        { type: 'word_error_correction', value, position: 9 },
        { type: 'vague', value, position: 9 },
    ]);
});

test('tokenizer resolves foreign weekday ranges and rejects locale mismatches', () => {
    const value = 'понедельник-пятница 09:00-17:00';
    const hours = new opening_hours(value, {});

    assert.equal(hours.prettifyValue(), 'Mo-Fr 09:00-17:00');
    assert.deepEqual(hours.getStructuredWarnings().map(({ type, value, position }) => ({
        type,
        value,
        position,
    })), [
        { type: 'word_error_correction', value, position: 11 },
        { type: 'word_error_correction', value, position: 19 },
    ]);

    assert.throws(
        () => new opening_hours('Mo-Tr 17:00-20:00', {}),
        error => typeof error === 'string'
            && error.includes('Token "tr" is not valid for locale "en"')
    );
});

test('tokenizer preserves separator corrections and their positions', () => {
    const value = '10.00-12.00';
    const hours = new opening_hours(value, null);

    assert.equal(hours.prettifyValue(), '10:00-12:00');
    assert.deepEqual(hours.getStructuredWarnings().map(({ type, value, position }) => ({
        type,
        value,
        position,
    })), [
        { type: 'hour_min_separator', value, position: 3 },
        { type: 'hour_min_separator', value, position: 9 },
    ]);
});

test('tokenizer converts superscript and subscript digits', () => {
    for (const value of ['Mo ⁰⁹:⁰⁰-¹⁷:⁰⁰', 'Mo ₉-₁₇']) {
        const hours = new opening_hours(value, null);

        assert.equal(hours.prettifyValue(), 'Mo 09:00-17:00');
    }
});

test('tokenizer keeps warnings stable across repeated queries and parser instances', () => {
    for (const value of ['Mon', 'every day', '10.00-12.00', 'Mo ₉-₁₇']) {
        const hours = new opening_hours(value, null);
        const pretty = hours.prettifyValue();
        const warnings = hours.getStructuredWarnings();
        const formatted = hours.getWarnings();

        assert.equal(hours.prettifyValue(), pretty);
        assert.deepEqual(hours.getStructuredWarnings(), warnings);
        assert.deepEqual(hours.getWarnings(), formatted);

        const other = new opening_hours('Tu 10:00-12:00', null);
        assert.equal(other.prettifyValue(), 'Tu 10:00-12:00');
        assert.deepEqual(other.getStructuredWarnings(), []);

        const repeated = new opening_hours(value, null);
        assert.equal(repeated.prettifyValue(), pretty);
        assert.deepEqual(repeated.getStructuredWarnings(), warnings);
        assert.deepEqual(hours.getStructuredWarnings(), warnings);
    }
});

test('tokenizer preserves formatted-string rejection of ambiguous seasons', () => {
    const message = 'Season words are ambiguous. Please use explicit date ranges instead, '
        + 'e.g. Jun-Aug, Dec-Feb, or Jun 21-Sep 22.';
    for (const season of ['spring', 'sommer', 'inverno']) {
        for (const prefix of ['', 'Mo 09:00-17:00; ']) {
            const value = prefix + season;
            assert.throws(
                () => new opening_hours(value, null),
                error => error === `${value} <--- (${message})`
            );
        }
    }
});
