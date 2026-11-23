// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/**
 * Calculate the spring equinox used for Japanese public holidays.
 * @param {number} year Calendar year.
 * @returns {Date|undefined} Equinox date for supported years.
 */
function getSpringEquinox(year) {
    if (year >= 1900 && year <= 1923) {
        return new Date(year, 2, year % 4 === 3 ? 22 : 21);
    }
    if (year >= 1924 && year <= 1959) {
        return new Date(year, 2, 21);
    }
    if (year >= 1960 && year <= 1991) {
        return new Date(year, 2, year % 4 === 0 ? 20 : 21);
    }
    if (year >= 1992 && year <= 2023) {
        return new Date(year, 2, year % 4 === 0 || year % 4 === 1 ? 20 : 21);
    }
    if (year >= 2024 && year <= 2055) {
        return new Date(year, 2, year % 4 === 3 ? 21 : 20);
    }
    if (year >= 2056 && year <= 2091) {
        return new Date(year, 2, 20);
    }
    if (year >= 2092 && year <= 2099) {
        return new Date(year, 2, year % 4 === 0 ? 19 : 20);
    }
    return undefined;
}

/**
 * Calculate the autumnal equinox used for Japanese public holidays.
 * @param {number} year Calendar year.
 * @returns {Date|undefined} Equinox date for supported years.
 */
function getAutumnalEquinox(year) {
    if (year >= 1900 && year <= 1919) {
        return new Date(year, 8, year % 4 === 0 ? 23 : 24);
    }
    if (year >= 1920 && year <= 1947) {
        return new Date(year, 8, year % 4 === 0 || year % 4 === 1 ? 23 : 24);
    }
    if (year >= 1948 && year <= 1979) {
        return new Date(year, 8, year % 4 === 3 ? 24 : 23);
    }
    if (year >= 1980 && year <= 2011) {
        return new Date(year, 8, 23);
    }
    if (year >= 2012 && year <= 2043) {
        return new Date(year, 8, year % 4 === 0 ? 22 : 23);
    }
    if (year >= 2044 && year <= 2075) {
        return new Date(year, 8, year % 4 === 0 || year % 4 === 1 ? 22 : 23);
    }
    if (year >= 2076 && year <= 2099) {
        return new Date(year, 8, year % 4 === 3 ? 23 : 22);
    }
    return undefined;
}

/**
 * Get the first occurrence of a weekday in a month.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @param {number} weekday Weekday, with Sunday as 0.
 * @returns {number} Day of the month.
 */
function getFirstWeekdayOfMonth(year, month, weekday) {
    const first = new Date(year, month, 1);
    return 1 + ((7 + weekday - first.getDay()) % 7);
}

/**
 * Get the last occurrence of a weekday in a month.
 * @param {number} year Calendar year.
 * @param {number} month Zero-based month.
 * @param {number} weekday Weekday, with Sunday as 0.
 * @returns {number} Day of the month.
 */
function getLastWeekdayOfMonth(year, month, weekday) {
    const last = new Date(year, month + 1, 0);
    const offset = (7 + last.getDay() - weekday) % 7;
    return last.getDate() - offset;
}

/**
 * Get the last occurrence of a weekday strictly before a date.
 * @param {number} weekday Weekday, with Sunday as 0.
 * @param {Date} date Date to count back from.
 * @returns {Date} Preceding matching weekday.
 */
function getWeekdayBefore(weekday, date) {
    const daysBack = ((date.getDay() - weekday + 7) % 7) || 7;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysBack);
}

/**
 * Get the first occurrence of a weekday on or after a date.
 * @param {number} weekday Weekday, with Sunday as 0.
 * @param {Date} startDate Earliest date to consider.
 * @returns {Date} Next matching weekday.
 */
function getWeekdayOnOrAfter(weekday, startDate) {
    let daysToTarget = weekday - startDate.getDay();
    if (daysToTarget < 0) {
        daysToTarget += 7;
    }
    return new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate() + daysToTarget
    );
}

/**
 * Get the first date on or after a start date whose weekday is in a range.
 * @param {number} firstWeekday First weekday in the range, before `lastWeekday`.
 * @param {number} lastWeekday Last weekday in the range.
 * @param {Date} startDate Earliest date to consider.
 * @returns {Date} First matching date.
 */
function getWeekdayRangeOnOrAfter(firstWeekday, lastWeekday, startDate) {
    const weekday = startDate.getDay();
    if (firstWeekday <= weekday && weekday <= lastWeekday) {
        return startDate;
    }
    return getWeekdayOnOrAfter(firstWeekday, startDate);
}

/**
 * Calculate all movable holiday events supported for one year.
 * @param {number} year Calendar year.
 * @returns {Record<string, Date|undefined>} Dates keyed by event name.
 */
export function getMovableEventsForYear(year) {
    // Oudin's algorithm as described at https://www.tondering.dk/claus/cal/easter.php
    const goldenNumberIndex = year % 19;
    const century = Math.floor(year / 100);
    const lunarCorrection = Math.floor((century - 17) / 25);
    const epactComplement = (century - Math.floor(century / 4)
        - Math.floor((century - lunarCorrection) / 3)
        + 19 * goldenNumberIndex + 15) % 30;
    const daysToPaschalFullMoon = epactComplement - Math.floor(epactComplement / 28)
        * (1 - Math.floor(29 / (epactComplement + 1)) * Math.floor((21 - goldenNumberIndex) / 11));
    const paschalFullMoonWeekday = (year + Math.floor(year / 4) + daysToPaschalFullMoon + 2
        - century + Math.floor(century / 4)) % 7;
    const daysToSundayBeforeFullMoon = daysToPaschalFullMoon - paschalFullMoonWeekday;

    // Julian Easter shifted by the 13-day calendar offset, valid for 1900–2099.
    const julianFullMoonOffset = (19 * goldenNumberIndex + 15) % 30;
    const julianSundayOffset = (2 * (year % 4) + 4 * (year % 7) - julianFullMoonOffset + 34) % 7;

    const lastFebruaryDay = new Date(year, 2, 0);
    const lastFebruarySunday = lastFebruaryDay.getDate() - lastFebruaryDay.getDay();
    const may24 = new Date(year, 4, 24);
    const victoriaDay = 24 - ((6 + may24.getDay()) % 7);
    const july1 = new Date(year, 6, 1);
    const canadaDay = july1.getDay() === 0 ? 2 : 1;

    return {
        easter: new Date(year, 2, 28 + daysToSundayBeforeFullMoon),
        'orthodox easter': new Date(year, 3, 4 + julianFullMoonOffset + julianSundayOffset),
        victoriaDay: new Date(year, 4, victoriaDay),
        canadaDay: new Date(year, 6, canadaDay),
        firstJanuaryMonday: new Date(year, 0, getFirstWeekdayOfMonth(year, 0, 1)),
        firstFebruaryMonday: new Date(year, 1, getFirstWeekdayOfMonth(year, 1, 1)),
        lastFebruarySunday: new Date(year, 1, lastFebruarySunday),
        firstMarchMonday: new Date(year, 2, getFirstWeekdayOfMonth(year, 2, 1)),
        firstAprilMonday: new Date(year, 3, getFirstWeekdayOfMonth(year, 3, 1)),
        firstMayMonday: new Date(year, 4, getFirstWeekdayOfMonth(year, 4, 1)),
        firstJuneMonday: new Date(year, 5, getFirstWeekdayOfMonth(year, 5, 1)),
        firstJuneFriday: new Date(year, 5, getFirstWeekdayOfMonth(year, 5, 5)),
        firstJulyMonday: new Date(year, 6, getFirstWeekdayOfMonth(year, 6, 1)),
        firstAugustMonday: new Date(year, 7, getFirstWeekdayOfMonth(year, 7, 1)),
        firstSeptemberMonday: new Date(year, 8, getFirstWeekdayOfMonth(year, 8, 1)),
        firstSeptemberTuesday: new Date(year, 8, getFirstWeekdayOfMonth(year, 8, 2)),
        firstSeptemberSunday: new Date(year, 8, getFirstWeekdayOfMonth(year, 8, 0)),
        firstOctoberMonday: new Date(year, 9, getFirstWeekdayOfMonth(year, 9, 1)),
        firstNovemberMonday: new Date(year, 10, getFirstWeekdayOfMonth(year, 10, 1)),
        firstNovemberTuesday: new Date(year, 10, getFirstWeekdayOfMonth(year, 10, 2)),
        firstMarchTuesday: new Date(year, 2, getFirstWeekdayOfMonth(year, 2, 2)),
        firstAugustTuesday: new Date(year, 7, getFirstWeekdayOfMonth(year, 7, 2)),
        firstAugustFriday: new Date(year, 7, getFirstWeekdayOfMonth(year, 7, 5)),
        firstNovemberThursday: new Date(year, 10, getFirstWeekdayOfMonth(year, 10, 4)),
        firstOctoberSunday: new Date(year, 9, getFirstWeekdayOfMonth(year, 9, 0)),
        lastNovemberWednesday: new Date(year, 10, getLastWeekdayOfMonth(year, 10, 3)),
        lastMayMonday: new Date(year, 4, getLastWeekdayOfMonth(year, 4, 1)),
        lastMarchMonday: new Date(year, 2, getLastWeekdayOfMonth(year, 2, 1)),
        lastAprilMonday: new Date(year, 3, getLastWeekdayOfMonth(year, 3, 1)),
        lastAprilFriday: new Date(year, 3, getLastWeekdayOfMonth(year, 3, 5)),
        lastAugustMonday: new Date(year, 7, getLastWeekdayOfMonth(year, 7, 1)),
        lastSeptemberMonday: new Date(year, 8, getLastWeekdayOfMonth(year, 8, 1)),
        lastSeptemberFriday: new Date(year, 8, getLastWeekdayOfMonth(year, 8, 5)),
        lastOctoberMonday: new Date(year, 9, getLastWeekdayOfMonth(year, 9, 1)),
        lastOctoberFriday: new Date(year, 9, getLastWeekdayOfMonth(year, 9, 5)),
        lastOctoberSunday: new Date(year, 9, getLastWeekdayOfMonth(year, 9, 0)),
        nextSaturday20Jun: getWeekdayOnOrAfter(6, new Date(year, 5, 20)),
        nextSaturday31Oct: getWeekdayOnOrAfter(6, new Date(year, 9, 31)),
        nextWednesday16Nov: getWeekdayOnOrAfter(3, new Date(year, 10, 16)),
        'nextMo-Fr17March': getWeekdayRangeOnOrAfter(1, 5, new Date(year, 2, 17)),
        'nextMo-Sa01May': getWeekdayRangeOnOrAfter(1, 6, new Date(year, 4, 1)),
        'nextMo-Fr12July': getWeekdayRangeOnOrAfter(1, 5, new Date(year, 6, 12)),
        'nextMo-Sa07August': getWeekdayRangeOnOrAfter(1, 6, new Date(year, 7, 7)),
        'nextMo-Fr30November': getWeekdayRangeOnOrAfter(1, 5, new Date(year, 10, 30)),
        'nextMo-Sa25December': getWeekdayRangeOnOrAfter(1, 6, new Date(year, 11, 25)),
        springEquinox: getSpringEquinox(year),
        autumnalEquinox: getAutumnalEquinox(year),
        mondayBefore20Jun: getWeekdayBefore(1, new Date(year, 5, 20)),
    };
}
