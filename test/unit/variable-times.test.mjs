// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import test from 'node:test';
import assert from 'node:assert/strict';
import { getTimes } from 'suncalc';

import {
    getVariableTimeEvent,
    getVariableTimeMinutes,
} from '../../src/variable-times.mjs';

// Fixed process time zone so these tests are deterministic regardless of
// where they are run, matching the convention used by test/test.mjs.
process.env.TZ = 'Europe/Berlin';

const singapore = { lat: 1.340, lon: 103.821 };
const seattle = { lat: 47.606, lon: -122.322 };
const melbourne = { lat: -37.818, lon: 144.951 };

test('getVariableTimeEvent returns the absolute solar event', () => {
    const date = new Date('2021-04-18 00:00');
    const sunrise = getVariableTimeEvent(date, seattle.lat, seattle.lon, 'sunrise');
    const sunset = getVariableTimeEvent(date, seattle.lat, seattle.lon, 'sunset');

    assert.ok(sunrise instanceof Date);
    assert.ok(sunset instanceof Date);
    assert.equal(sunrise.getDate(), 18);
    assert.equal(sunrise.getHours() * 60 + sunrise.getMinutes(), 15 * 60 + 14);
    assert.equal(sunset.getDate(), 18);
    assert.equal(sunset.getHours() * 60 + sunset.getMinutes(), 5 * 60 + 2);
});

test('getVariableTimeMinutes matches the unshifted result when the venue longitude is close to the process time zone', () => {
    const date = new Date('2021-04-18 00:00');
    assert.equal(getVariableTimeMinutes(date, singapore.lat, singapore.lon, 'sunrise', 0), 0 * 60 + 59);
});

test('getVariableTimeMinutes corrects the day-shift for a location far west of the process time zone (#377)', () => {
    // Seattle. Without correction suncalc would return 2021-04-17's sunrise
    // for a 2021-04-18 (Berlin) evaluation.
    const date = new Date('2021-04-18 00:00');
    assert.equal(getVariableTimeMinutes(date, seattle.lat, seattle.lon, 'sunrise', 0), 15 * 60 + 14);
});

test('getVariableTimeMinutes corrects the day-shift for a location far east of the process time zone (#377)', () => {
    // Melbourne. Without correction suncalc would return 2021-04-19's sunset
    // for a 2021-04-18 (Berlin) evaluation.
    const date = new Date('2021-04-18 00:00');
    assert.equal(getVariableTimeMinutes(date, melbourne.lat, melbourne.lon, 'sunset', 0), 9 * 60 + 49);
});

test('getVariableTimeMinutes adds timevar_add_minutes to the resolved minutes', () => {
    const date = new Date('2021-04-18 00:00');
    assert.equal(getVariableTimeMinutes(date, singapore.lat, singapore.lon, 'sunrise', 30), 0 * 60 + 59 + 30);
});

test('getVariableTimeMinutes throws when no probe lands on the requested day', () => {
    // Far north, where sunrise is null for days at a time (polar day); there
    // is no "correct" day to shift to, so the event stays unavailable rather
    // than being masked by a mismatched-day value.
    const date = new Date('2021-06-21 00:00');
    const lat = 78.222, lon = 15.652; // Longyearbyen, well inside the polar day in June.

    assert.equal(getTimes(date, lat, lon).sunrise, null); // sanity check: no sunrise on this date
    assert.throws(
        () => getVariableTimeMinutes(date, lat, lon, 'sunrise', 0),
        /Variable time "sunrise" does not occur on this date/
    );
});

test('getVariableTimeEvent preserves the requested local day across DST', () => {
    const date = new Date('2021-03-28 00:00');
    const sunrise = getVariableTimeEvent(date, 52.5200, 13.4050, 'sunrise');

    assert.ok(sunrise instanceof Date);
    assert.equal(sunrise.getFullYear(), date.getFullYear());
    assert.equal(sunrise.getMonth(), date.getMonth());
    assert.equal(sunrise.getDate(), date.getDate());
});

