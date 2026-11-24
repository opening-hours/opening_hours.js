// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/**
 * One parsed `if … then …` clause. Weekday numbers use JavaScript's 0–6
 * convention, with Sunday as 0.
 * @typedef {{fromWeekdays: number[], direction: 'next'|'previous', targetWeekday: number}} ShiftClause
 */
/** @typedef {(date: Date) => Date} DateShifter */

/** @type {Record<string, number>} */
const WEEKDAY_NUMBERS = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

/** @type {Record<string, DateShifter>} */
const shiftRuleCache = Object.create(null);

/**
 * Parse the supported shift-rule subset into ordered clauses.
 * The grammar is:
 *   `if <weekday>[,<weekday>...] then <next|previous> <weekday> [...]`
 * Clauses are chained without a separator and the first matching clause wins.
 * @param {string} rule Shift rule expression.
 * @returns {ShiftClause[]} Parsed clauses.
 */
function parseShiftRule(rule) {
    /**
     * @param {string} detail Parse failure detail.
     * @returns {never} Always throws.
     */
    function fail(detail) {
        throw new SyntaxError(`shift_rule: ${detail} in "${rule}"`);
    }

    /**
     * @param {string} name Weekday name.
     * @returns {number} Weekday number.
     */
    function toWeekdayNumber(name) {
        const weekday = name.trim();
        if (!(weekday in WEEKDAY_NUMBERS)) {
            fail(`unknown weekday "${weekday}"`);
        }
        return WEEKDAY_NUMBERS[weekday];
    }

    /**
     * @param {string} value Shift direction.
     * @returns {'next'|'previous'} Validated direction.
     */
    function toDirection(value) {
        if (value !== 'next' && value !== 'previous') {
            fail(`unknown direction "${value}"`);
        }
        return value;
    }

    const clausePattern = /if\s+([a-z,\s]+?)\s+then\s+(next|previous)\s+([a-z]+)/g;
    /** @type {ShiftClause[]} */
    const clauses = [];
    let lastEnd = 0;
    let match;
    while ((match = clausePattern.exec(rule)) !== null) {
        // Text between clauses is invalid, including trailing punctuation.
        if (rule.slice(lastEnd, match.index).trim() !== '') {
            fail('cannot parse');
        }
        clauses.push({
            fromWeekdays: match[1].split(',').map(toWeekdayNumber),
            direction: toDirection(match[2]),
            targetWeekday: toWeekdayNumber(match[3]),
        });
        lastEnd = clausePattern.lastIndex;
    }
    if (clauses.length === 0 || rule.slice(lastEnd).trim() !== '') {
        fail('cannot parse');
    }
    return clauses;
}

/**
 * Apply the first matching clause, or return the original date unchanged.
 * A direction means the strictly next or previous matching weekday, so a
 * zero-day modulo result becomes a full seven-day shift.
 * @param {ShiftClause[]} clauses Ordered clauses.
 * @param {Date} date Date to shift.
 * @returns {Date} Shifted date.
 */
function applyShiftClauses(clauses, date) {
    const weekday = date.getDay();
    for (const clause of clauses) {
        if (!clause.fromWeekdays.includes(weekday)) {
            continue;
        }

        const difference = clause.direction === 'next'
            ? ((clause.targetWeekday - weekday + 7) % 7) || 7
            : -(((weekday - clause.targetWeekday + 7) % 7) || 7);
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + difference);
    }
    return date;
}

/**
 * Compile and cache a shift rule as a date-to-date function.
 * Unmatched dates stay unchanged. Invalid rules throw a SyntaxError whose
 * message callers expose as a library-bug report.
 * @param {string} rule Shift rule expression.
 * @returns {DateShifter} Date shifter.
 */
export function compileShiftRule(rule) {
    if (shiftRuleCache[rule]) {
        return shiftRuleCache[rule];
    }
    const clauses = parseShiftRule(rule);
    /** @type {DateShifter} */
    const shifter = (date) => applyShiftClauses(clauses, date);
    shiftRuleCache[rule] = shifter;
    return shifter;
}
