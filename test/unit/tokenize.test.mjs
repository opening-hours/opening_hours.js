// SPDX-License-Identifier: LGPL-3.0-only
// SPDX-FileCopyrightText: © opening_hours.js contributors

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import yaml from 'yaml';

import opening_hours from '../../build/opening_hours.esm.mjs';
import { createCorrectionLookup } from '../../src/word-error-correction.mjs';

test('correction lookup prefers literals over overlapping regex rules', () => {
    const lookup = createCorrectionLookup({
        literal: { literal_warning: { weekend: 'Sa,Su', 'a.m.': 'am' } },
        regex: { regex_warning: { '(?:weekend|workday)': 'Mo-Fr', 'workdays?': 'off' } },
        ambiguous: {},
    });

    assert.equal(lookup.findWord('WEEKEND')?.comment, 'literal_warning');
    assert.equal(lookup.findWord('workday')?.replacement, 'Mo-Fr');
    assert.equal(lookup.findWord('A.M.')?.replacement, 'am');
    assert.equal(lookup.findWord('axmy'), undefined);
});

test('phrase corrections prefer the longest consumed expression and literal ties', () => {
    const lookup = createCorrectionLookup({
        literal: { literal_warning: { 'every day off': 'off', 'all day': '24/7', 'every day': 'Mo-Su' } },
        regex: { regex_warning: { '(?:(?:every day))': 'Mo-Fr', 'all day long': 'open', 'weekends?': 'Sa,Su' } },
        ambiguous: {},
    });

    assert.equal(lookup.findPhrase('every day off 09:00-17:00')?.match[1], 'every day off');
    assert.equal(lookup.findPhrase('all day long')?.correction.replacement, 'open');
    assert.equal(lookup.findPhrase('every day')?.correction.comment, 'literal_warning');
    assert.equal(lookup.findPhrase('every daytime'), undefined);
    assert.equal(lookup.findPhrase('weekend'), undefined);
    assert.equal(lookup.findWord('weekend')?.replacement, 'Sa,Su');
});

test('correction data preserves literal spellings and regex rules at runtime', () => {
    const manual = yaml.parse(readFileSync(new URL('../../src/locales/word_error_correction_manual.yaml', import.meta.url), 'utf8'));
    const runtime = yaml.parse(readFileSync(new URL('../../src/locales/word_error_correction.yaml', import.meta.url), 'utf8'));

    assert.deepEqual(Object.keys(manual).filter(section => section !== 'ambiguous'), ['literal', 'regex']);
    for (const section of ['literal', 'regex']) {
        assert.deepEqual(runtime[section], manual[section]);
    }
    const lookup = createCorrectionLookup(runtime);
    for (const [category, entries] of Object.entries(runtime.literal)) {
        for (const [literal, replacement] of Object.entries(entries)) {
            assert.equal(lookup.findWord(literal)?.replacement, replacement);
            assert.equal(lookup.findWord(literal)?.comment, category);
        }
    }
    for (const entries of Object.values(runtime.regex)) {
        for (const pattern of Object.keys(entries)) {
            assert.doesNotThrow(() => new RegExp('^' + pattern + '$', 'iu'));
        }
    }
    assert.equal(lookup.findWord('a.m')?.replacement, 'am');
    assert.equal(lookup.findWord('a.m.')?.replacement, 'am');
    assert.equal(lookup.findWord('p.m')?.replacement, 'pm');
    assert.equal(lookup.findWord('p.m.')?.replacement, 'pm');
    assert.equal(lookup.findWord('axmy'), undefined);
});

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

test('expanded weekday and month rules retain every spelling', () => {
    const runtime = yaml.parse(readFileSync(new URL('../../src/locales/word_error_correction.yaml', import.meta.url), 'utf8'));
    const lookup = createCorrectionLookup(runtime);

    for (const [variants, expected] of [
        [['sunday', 'sundays', 'sonntag', 'sonntags', 'domenic', 'domenica', 'domenich', 'domeniche', 'zo', 'zon'], 'Su'],
        [['monday', 'mondays', 'montag', 'montags', 'lu', 'lun', 'luned', 'lunedì'], 'Mo'],
        [[
            'tue', 'tues', 'tuesday', 'tuesdays', 'di', 'die', 'dienstag', 'dienstags',
            'ma', 'mar', 'marted', 'martedì',
        ], 'Tu'],
        [[
            'wed', 'weds', 'wednesday', 'wednesdays', 'mi', 'mit', 'mittwoch', 'mittwochs',
            'wo', 'woe', 'me', 'mer', 'mercoled', 'mercoledì',
        ], 'We'],
        [[
            'thur', 'thurs', 'thursday', 'thursdays', 'do', 'don', 'donnerstag', 'donnerstags',
            'je', 'jeu', 'gioved', 'giovedì',
        ], 'Th'],
        [['friday', 'fridays', 'freitag', 'freitags', 've', 'ven', 'vr', 'vri', 'venerd', 'venerdì'], 'Fr'],
        [['saturday', 'saturdays', 'samstag', 'samstags', 'za', 'zat', 'sabat', 'sabato'], 'Sa'],
        [['mär', 'märz'], 'Mar'],
        [['jun', 'june', 'giugn', 'giugno'], 'Jun'],
        [['jul', 'july', 'lugli', 'luglio'], 'Jul'],
    ]) {
        for (const variant of variants) {
            assert.deepEqual(lookup.findWord(variant), {
                pattern: variant,
                replacement: expected,
                comment: 'please use English abbreviation ok for ko',
            }, variant);
        }
    }
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

test('expanded word rules retain every spelling', () => {
    const runtime = yaml.parse(readFileSync(new URL('../../src/locales/word_error_correction.yaml', import.meta.url), 'utf8'));
    const lookup = createCorrectionLookup(runtime);

    for (const [variants, expected] of [
        [['ruhetag', 'ruhetage'], 'off'],
        [['weekday', 'weekdays'], 'Mo-Fr'],
        [['werktag', 'werktags'], 'Mo-Sa'],
        [['weekend', 'weekends'], 'Sa,Su'],
        [['holiday', 'holidays'], 'PH'],
        [['schoolholiday', 'schoolholidays', 'ferien', 'schulferien'], 'SH'],
        [['öffnungszeit', 'öffnungszeit:', 'öffnungszeiten', 'öffnungszeiten:', '?'], ''],
        [['til', 'till'], '-'],
        [['nach_vereinbarung'], '"Nach Vereinbarung"'],
        [['nach_absprache'], '"Nach Absprache"'],
        [['sur_rdv'], '"Sur rendez-vous"'],
    ]) {
        for (const variant of variants) {
            const correction = lookup.findWord(variant);
            assert.equal(correction?.pattern, variant, variant);
            assert.equal(correction?.replacement, expected, variant);
        }
    }
});

test('tokenizer handles expanded corrections with dates, punctuation and separators', () => {
    for (const [value, expected] of [
        ['marted 09:00-17:00', 'Tu 09:00-17:00'],
        ['giugn 01 09:00-17:00', 'Jun 01 09:00-17:00'],
        ['öffnungszeiten: 09:00-17:00', '09:00-17:00'],
        ['09:00 till 17:00', '09:00-17:00'],
        ['nach_absprache', '"Nach Absprache"'],
    ]) {
        const hours = new opening_hours(value, null);
        assert.equal(hours.prettifyValue(), expected, value);
    }
});

test('tokenizer preserves complete literal phrase corrections', () => {
    const value = '24 hours 7 days a week';
    const hours = new opening_hours(value, null);

    assert.equal(hours.prettifyValue(), '24/7');
    assert.deepEqual(hours.getStructuredWarnings()
        .filter(({ type }) => type === 'word_error_correction')
        .map(({ position }) => position), [value.length]);
});

test('tokenizer accepts am/pm abbreviations with or without a trailing dot', () => {
    for (const value of ['7 a.m. - 10 p.m.', '7 a.m - 10 p.m', '7 a.m - 10 p.m.', '7A.M-10P.M']) {
        const hours = new opening_hours(value, null);

        assert.equal(hours.prettifyValue(), '07:00-22:00');
    }
    for (const value of ['ATM 24/7', '09 apm a 20 pm']) {
        assert.throws(() => new opening_hours(value, null), value);
    }
});

test('tokenizer corrects complete open-end phrases', () => {
    for (const value of ['16:00-late', '16:00-open end', '16:00 till late']) {
        const hours = new opening_hours(value, null);

        assert.equal(hours.prettifyValue(), '16:00+');
        assert.ok(hours.getStructuredWarnings().some(({ type }) => type === 'word_error_correction'));
    }
});

test('tokenizer rejects open-end words with suffixes', () => {
    for (const value of ['16:00-later', '16:00-latest', '16:00-open ending']) {
        assert.throws(() => new opening_hours(value, null), value);
    }
});

test('tokenizer does not apply short corrections inside longer words', () => {
    for (const value of [
        'midnight-24:00',
        'May-Sep: 00:00-24:00',
        'lundi,vendredi 10:00-18:00',
        '2025 May 01-23 00:00-24:00',
    ]) {
        assert.doesNotThrow(() => new opening_hours(value, null), value);
    }
});

test('tokenizer protects canonical tokens from matching correction rules', () => {
    const runtime = yaml.parse(readFileSync(new URL('../../src/locales/word_error_correction.yaml', import.meta.url), 'utf8'));
    assert.equal(createCorrectionLookup(runtime).findWord('mar')?.replacement, 'Tu');

    const value = 'Mar 01 09:00-17:00';
    const hours = new opening_hours(value, null);
    assert.equal(hours.prettifyValue(), value);
    assert.deepEqual(hours.getStructuredWarnings().filter(({ type }) => type === 'word_error_correction'), []);
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

test('tokenizer tolerates unambiguous foreign tokens outside their region', () => {
    for (const location of [null, {}, { address: { country_code: 'de' } }]) {
        for (const [value, expected] of [
            ['lundi,vendredi 10:00-18:00', 'Mo,Fr 10:00-18:00'],
            ['sobota 09:00-13:00', 'Sa 09:00-13:00'],
            ['tr 09:00-13:00', 'We 09:00-13:00'],
        ]) {
            const hours = new opening_hours(value, location);
            assert.equal(hours.prettifyValue(), expected);
            assert.ok(hours.getStructuredWarnings().some(({ type }) => type === 'word_error_correction'));
        }
    }
});

test('tokenizer requires locale, region or coherent neighbours to disambiguate foreign weekdays', () => {
    for (const location of [null, {}, { address: { country_code: 'de' } }]) {
        assert.throws(() => new opening_hours('sb 09:00-13:00', location),
            error => typeof error === 'string' && error.includes('ambiguous across languages'));

        const hours = new opening_hours('pn-sb 09:00-13:00', location);
        assert.equal(hours.prettifyValue(), 'Mo-Sa 09:00-13:00');
        assert.ok(hours.getStructuredWarnings().some(({ type }) => type === 'word_error_correction'));
    }
    const location = { address: { country_code: 'pl' } };
    assert.equal(new opening_hours('sb 09:00-13:00', location).prettifyValue(), 'Sa 09:00-13:00');
    assert.equal(new opening_hours('sb 09:00-13:00', location, { locale: 'tk' }).prettifyValue(), 'Tu 09:00-13:00');
});

test('tokenizer does not use the null placeholder as a language hint', () => {
    assert.throws(() => new opening_hours('Mo-montag 09:00-13:00', null));
    const hours = new opening_hours('Mo-montag 09:00-13:00', { address: { country_code: 'de' } });
    assert.equal(hours.prettifyValue(), 'Mo-Mo 09:00-13:00');
});

test('tokenizer applies semantic disambiguation to foreign months', () => {
    const location = { address: { country_code: 'de' } };
    assert.equal(new opening_hours('janvier 09:00-13:00', location).prettifyValue(), 'Jan 09:00-13:00');
    assert.throws(() => new opening_hours('listopad 09:00-13:00', location),
        error => typeof error === 'string' && error.includes('ambiguous across languages'));
    assert.equal(new opening_hours('listopad 09:00-13:00', location, { locale: 'pl' }).prettifyValue(), 'Nov 09:00-13:00');
    assert.equal(new opening_hours('listopad 09:00-13:00', { address: { country_code: 'hr' } }).prettifyValue(), 'Oct 09:00-13:00');
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
