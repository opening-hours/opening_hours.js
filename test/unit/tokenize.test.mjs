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
