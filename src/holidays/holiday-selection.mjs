// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/** @typedef {import('./holiday-definitions.d.ts').HolidayItem} HolidayItem */
/** @typedef {import('./holiday-definitions.d.ts').SchoolHolidayItem} SchoolHolidayItem */

/**
 * @param {unknown} value Value to check.
 * @returns {value is HolidayItem[]} Whether the value is a public holiday list.
 */
export function isHolidayItemArray(value) {
    return Array.isArray(value)
        && value.every(item => typeof item === 'object'
            && item !== null
            && typeof item.name === 'string');
}

/**
 * @param {unknown} value Value to check.
 * @returns {value is SchoolHolidayItem[]} Whether the value is a school holiday list.
 */
export function isSchoolHolidayItemArray(value) {
    return Array.isArray(value)
        && value.every(item => typeof item === 'object'
            && item !== null
            && typeof item.name === 'string'
            && Object.keys(item).some(key => key !== 'name'
                && Array.isArray(item[key])));
}

/**
 * @param {unknown} countryDefinition Country-wide definition.
 * @param {unknown} stateDefinition State-specific definition.
 * @param {string|undefined} state Name of the configured state.
 * @returns {HolidayItem[]|undefined} Matching holidays, or `undefined` when no country holidays exist.
 */
export function selectPublicHolidays(countryDefinition, stateDefinition, state) {
    if (isHolidayItemArray(stateDefinition)) {
        return stateDefinition;
    }
    if (!isHolidayItemArray(countryDefinition) || countryDefinition.length === 0) {
        return undefined;
    }
    return countryDefinition.filter(function(holiday) {
        return !Array.isArray(holiday.only_states)
            || (typeof state === 'string' && holiday.only_states.includes(state));
    });
}

/**
 * @param {SchoolHolidayItem} holiday School holiday definition.
 * @returns {[number, number]} First month and day found in the definition.
 */
function getSchoolHolidaySortKey(holiday) {
    const dates = Object.values(holiday).find(Array.isArray);
    if (!dates || dates.length < 2) {
        throw new TypeError('Missing school holiday dates.');
    }
    return [dates[0], dates[1]];
}

/**
 * @param {unknown} countryDefinition Country-wide definition.
 * @param {unknown} stateDefinition State-specific definition.
 * @returns {SchoolHolidayItem[]} Matching school holidays.
 */
export function selectSchoolHolidays(countryDefinition, stateDefinition) {
    const countryHolidays = isSchoolHolidayItemArray(countryDefinition)
        ? countryDefinition
        : [];
    if (!isSchoolHolidayItemArray(stateDefinition)) {
        return countryHolidays;
    }
    if (countryHolidays.length === 0) {
        return stateDefinition;
    }

    const countryNames = new Set(countryHolidays.map(function(holiday) {
        return holiday.name;
    }));
    return [...countryHolidays, ...stateDefinition.filter(function(holiday) {
        return !countryNames.has(holiday.name);
    })].sort(function(left, right) {
        const leftKey = getSchoolHolidaySortKey(left);
        const rightKey = getSchoolHolidaySortKey(right);
        return (leftKey[0] - rightKey[0]) || (leftKey[1] - rightKey[1]);
    });
}
