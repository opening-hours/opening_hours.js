// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/** @typedef {import('./holiday-definitions.d.ts').SchoolHolidayItem} SchoolHolidayItem */
/** @typedef {{fromMonth: number, fromDay: number, toMonth: number, toDay: number, name: string}} SchoolHolidayRange */

/**
 * @param {SchoolHolidayItem} schoolHoliday School holiday definition.
 * @param {number} year Calendar year.
 * @returns {number[]|undefined} Flattened date ranges for the year or fallback.
 */
export function getSchoolHolidayDatesForYear(schoolHoliday, year) {
    let holiday = schoolHoliday[year];
    if (holiday === undefined) {
        holiday = schoolHoliday.default;
    }
    if (holiday === undefined) {
        return undefined;
    }
    if (!Array.isArray(holiday)
        || holiday.length % 4 !== 0
        || !holiday.every(monthOrDay => typeof monthOrDay === 'number')) {
        throw new TypeError('Invalid school holiday definition.');
    }
    return holiday;
}

/**
 * @param {number} month One-based month.
 * @param {number} day Day of month.
 * @returns {number} Comparable month/day value.
 */
export function getMonthDayNumber(month, day) {
    return (month - 1) * 100 + day;
}

/**
 * @param {SchoolHolidayItem[]} applyingHolidays School holiday definitions.
 * @param {number} year Calendar year.
 * @returns {SchoolHolidayRange[]} Named ranges for the year.
 */
export function collectSchoolHolidayRanges(applyingHolidays, year) {
    const ranges = [];
    for (const schoolHoliday of applyingHolidays) {
        const dates = getSchoolHolidayDatesForYear(schoolHoliday, year);
        if (dates === undefined) {
            continue;
        }
        for (let index = 0; index < dates.length; index += 4) {
            ranges.push({
                fromMonth: dates[index],
                fromDay: dates[index + 1],
                toMonth: dates[index + 2],
                toDay: dates[index + 3],
                name: schoolHoliday.name,
            });
        }
    }
    return ranges;
}

/**
 * @param {Array<{fromMonth: number, fromDay: number}>} ranges Ranges to sort.
 * @returns {void} The ranges are sorted in-place.
 */
export function sortRangesByStartDate(ranges) {
    ranges.sort(function(left, right) {
        const leftStart = getMonthDayNumber(left.fromMonth, left.fromDay);
        const rightStart = getMonthDayNumber(right.fromMonth, right.fromDay);
        return leftStart - rightStart;
    });
}
