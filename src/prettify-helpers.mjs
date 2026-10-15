// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/**
 * Pure helpers for prettifyValue / prettifySelector.
 * None of these functions close over parser state; they are safe to import
 * and test in isolation.
 */
// eslint-disable-next-line jsdoc/reject-any-type
/** @typedef {Record<string, any>} PrettifyConf */
// eslint-disable-next-line jsdoc/reject-any-type
/** @typedef {Array<any>} PrettifyToken */
/** @typedef {import('./parser-token-types.d.ts').ParserToken} ParserToken */
/** @typedef {Array<ParserToken>} ParserTokens */

/**
 * Canonical order in which selectors should appear inside a rule group.
 * Used by the sort comparator below.
 */
export const SELECTOR_ORDER = [
    'year', 'month', 'week', 'holiday', 'weekday', 'time', '24/7', 'state', 'comment',
];

/**
 * Sort comparator for prettified_group_value entries based on SELECTOR_ORDER.
 * @param {PrettifyToken} a - [selector_start_end_type, string] tuple
 * @param {PrettifyToken} b - [selector_start_end_type, string] tuple
 * @returns {number} Ordering difference between the two selector groups.
 */
export function compareSelectorOrder(a, b) {
    return SELECTOR_ORDER.indexOf(a[0][2]) - SELECTOR_ORDER.indexOf(b[0][2]);
}

/**
 * Returns true when a prettified rule group contains a comment selector.
 * Reordering the group in that case may change the semantics of the value.
 * @param {Array<PrettifyToken>} group - prettified_group_value array
 * @returns {boolean} Whether the group contains a comment selector.
 */
export function hasCommentSelector(group) {
    return group.some(entry => entry[0][2] === 'comment');
}

/** @type {Record<string, string[]>} */
const localized_name_cache = {};

/**
 * Build the separator string between two rules for prettifyValue.
 * @param {PrettifyToken} ruleTokens - token list of one rule, as stored in new_tokens[nrule]
 * @param {PrettifyConf} conf - prettify configuration object
 * @returns {string} Separator to append before the next rule.
 */
export function getRuleSeparator(ruleTokens, conf) {
    return ruleTokens[1]
        ? conf.rule_sep_string + '|| '
        : (
            ruleTokens[0][0][1] === 'rule separator'
                ? ','
                : (conf.print_semicolon ? ';' : '')
        ) + conf.rule_sep_string;
}

/**
 * Merge user prettify configuration with defaults without mutating the input.
 * @param {PrettifyConf} userConf - caller-provided prettify config
 * @param {PrettifyConf} defaultConf - built-in defaults
 * @returns {PrettifyConf} Normalized configuration containing every default key.
 */
export function normalizePrettifyConf(userConf, defaultConf) {
    /** @type {PrettifyConf} */
    const conf = {};

    Object.keys(defaultConf).forEach(function (key) {
        conf[key] = typeof userConf[key] === 'undefined' ? defaultConf[key] : userConf[key];
    });

    return conf;
}

/**
 * Decide whether a prettified group may be reordered safely.
 * @param {boolean} doneWithSelectorReordering - global one-way switch
 * @param {Set<number>} rulesWithoutSelectorReordering - rule indices that must keep input order
 * @param {number} ruleIndex - current rule index
 * @param {Array<PrettifyToken>} group - prettified_group_value array
 * @returns {boolean} Whether the group can be safely reordered.
 */
export function shouldSortPrettifiedGroup(doneWithSelectorReordering, rulesWithoutSelectorReordering, ruleIndex, group) {
    return !doneWithSelectorReordering
        && !rulesWithoutSelectorReordering.has(ruleIndex)
        && !hasCommentSelector(group);
}

/**
 * Resolve localized month/weekday names, memoized by locale/date format.
 * @param {PrettifyConf} conf - Prettify configuration
 * @param {'weekday'|'month'} kind - Name kind to resolve
 * @param {string[]} canonicalWeekdays - Canonical weekday names
 * @param {string[]} canonicalMonths - Canonical month names
 * @returns {string[]} Localized names with stable index mapping
 */
function getLocalizedNames(conf, kind, canonicalWeekdays, canonicalMonths) {
    const useEnglishShortNames =
        (conf['locale'] === 'en' || conf['locale'] === 'all') && conf['date_format'] === 'short';
    if (useEnglishShortNames) {
        return kind === 'weekday' ? canonicalWeekdays : canonicalMonths;
    }

    const cache_key = kind + '|' + conf['locale'] + '|' + conf['date_format'];
    if (!localized_name_cache[cache_key]) {
        localized_name_cache[cache_key] = kind === 'weekday'
            // 2026-02-01 is a Sunday, so day 1..7 maps to Su..Sa.
            ? [1, 2, 3, 4, 5, 6, 7].map(function (weekday) {
                return new Date(2026, 1, weekday).toLocaleString(conf['locale'], { weekday: conf['date_format'], calendar: 'gregory' });
            })
            // The year is arbitrary; only the month index affects the name.
            : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (month) {
                return new Date(2026, month - 1, 1).toLocaleString(conf['locale'], { month: conf['date_format'], calendar: 'gregory' });
            });
    }

    return localized_name_cache[cache_key];
}

/**
 * Translate a single prettify token by type.
 * @param {string|number} value - Token value (index for month/weekday)
 * @param {string} token_type - Token type
 * @param {PrettifyConf} conf - Prettify configuration
 * @param {string[]} canonicalWeekdays - Canonical weekday names
 * @param {string[]} canonicalMonths - Canonical month names
 * @param {function(string, string, string|number): (string|number)} translateFn - i18n translate function
 * @returns {string|number} Translated token output
 */
function translatePrettyToken(value, token_type, conf, canonicalWeekdays, canonicalMonths, translateFn) {
    if (token_type === 'weekday') {
        return getLocalizedNames(conf, 'weekday', canonicalWeekdays, canonicalMonths)[Number(value)];
    }

    if (token_type === 'month') {
        return getLocalizedNames(conf, 'month', canonicalWeekdays, canonicalMonths)[Number(value)];
    }

    if (typeof conf['locale'] !== 'string' || conf['locale'] === 'en') {
        return value;
    }

    return translateFn(conf['locale'], 'pretty', value);
}

/**
 * Check whether token types match at a given position.
 *
 * Matches are strict and ordered. Numeric token types must also carry a
 * numeric value, preserving the parser token invariant at the match boundary.
 * @param {ParserTokens} tokens - Parser token list
 * @param {number} at - Start index for matching
 * @param {...string} tokenNames - Expected token type names in order
 * @returns {boolean} Whether all requested token types match.
 */
export function matchTokens(tokens, at, ...tokenNames) {
    if (at + tokenNames.length > tokens.length) {
        return false;
    }

    for (let i = 0; i < tokenNames.length; i++) {
        const token = tokens[at + i];
        const tokenName = tokenNames[i];
        if (token[1] !== tokenName) {
            return false;
        }
        if ((tokenName === 'number' || tokenName === 'year'
            || tokenName === 'month' || tokenName === 'weekday')
            && typeof token[0] !== 'number') {
            return false;
        }
    }

    return true;
}

/**
 * Check whether a malformed leading time separator must be preserved.
 * @param {ParserTokens} tokens - Parser token list
 * @param {number} selector_start - First token index of the selector
 * @param {string} selector_type - Selector type
 * @returns {boolean} Whether the malformed prefix should be preserved.
 */
function shouldPreserveLeadingMalformedTimePrefix(tokens, selector_start, selector_type) {
    return selector_type === 'time'
        && selector_start > 1
        && matchTokens(tokens, selector_start - 1, 'timesep')
        && matchTokens(tokens, selector_start, 'number')
        && (matchTokens(tokens, selector_start - 2, 'rule separator')
            || matchTokens(tokens, selector_start - 2, ','));
}

/**
 * Format one token while prettifying a selector.
 * @param {string} prettifiedValue - Current output string
 * @param {ParserTokens} tokens - Parser token list
 * @param {number} at - Current token index
 * @param {number} selector_start - First token index of the selector
 * @param {number} selector_end - Last token index of the selector
 * @param {string} selector_type - Selector type
 * @param {PrettifyConf} conf - Prettify configuration
 * @param {string[]} canonicalMonths - Canonical month names
 * @param {string[]} canonicalWeekdays - Canonical weekday names
 * @param {function(string, string, string|number): (string|number)} translateFn - i18n translate function
 * @returns {{ value: string, advance: number }} Formatted output and token advance.
 */
export function formatPrettifySelectorToken(
    prettifiedValue,
    tokens,
    at,
    selector_start,
    selector_end,
    selector_type,
    conf,
    canonicalMonths,
    canonicalWeekdays,
    translateFn
) {
    let value = prettifiedValue;
    let advance = 0;
    const token_value = tokens[at][0];
    const token_type = tokens[at][1];
    const previous_token_value = at >= 2 ? tokens[at - 2][0] : undefined;
    const next_token_value = at + 1 < tokens.length ? tokens[at + 1][0] : undefined;
    const range_end_token_value = at + 2 < tokens.length ? tokens[at + 2][0] : undefined;

    if (at === selector_start && shouldPreserveLeadingMalformedTimePrefix(tokens, selector_start, selector_type)) {
        value += ':';
    }

    if (matchTokens(tokens, at, 'weekday') && typeof token_value === 'number') {
        if (!conf.leave_weekday_sep_one_day_betw
            && at - selector_start > 1 && (matchTokens(tokens, at - 1, ',') || matchTokens(tokens, at - 1, '-'))
            && matchTokens(tokens, at - 2, 'weekday')
            && typeof previous_token_value === 'number'
            && token_value === (previous_token_value + 1) % 7) {
            value = value.substring(0, value.length - 1) + conf.sep_one_day_between;
        }
        value += translatePrettyToken(token_value, 'weekday', conf, canonicalWeekdays, canonicalMonths, translateFn);
    } else if (at - selector_start > 0 // e.g. '09:0' -> '09:00'
            && selector_type === 'time'
            && matchTokens(tokens, at - 1, 'timesep')
            && matchTokens(tokens, at, 'number')
            && typeof token_value === 'number') {
        value += (token_value < 10 ? '0' : '') + token_value.toString();
    } else if (selector_type === 'time' // e.g. '9:00' -> ' 09:00'
            && conf.zero_pad_hour
            && at !== tokens.length
            && matchTokens(tokens, at, 'number')
            && matchTokens(tokens, at + 1, 'timesep')
            && typeof token_value === 'number') {
        value += (
                token_value < 10 ?
                    (token_value === 0 && conf.one_zero_if_hour_zero ?
                     '' : '0') :
                    '') + token_value.toString();
    } else if (selector_type === 'time' // e.g. '9-18' -> '09:00-18:00'
            && at + 2 <= selector_end
            && matchTokens(tokens, at, 'number')
            && matchTokens(tokens, at + 1, '-')
            && matchTokens(tokens, at + 2, 'number')
            && typeof token_value === 'number'
            && typeof range_end_token_value === 'number'
            && token_value !== range_end_token_value) {
        value += (token_value < 10 ?
                (token_value === 0 && conf.one_zero_if_hour_zero ? '' : '0')
                : '') + token_value.toString();
        value += ':00-'
            + (range_end_token_value < 10 ? '0' : '') + range_end_token_value.toString()
            + ':00';
        advance = 2;
    } else if (matchTokens(tokens, at, 'comment')) {
        value += '"' + tokens[at][0].toString() + '"';
    } else if (matchTokens(tokens, at, 'closed')) {
        value += translatePrettyToken(conf.leave_off_closed ? token_value : conf.keyword_for_off_closed,
            'state', conf, canonicalWeekdays, canonicalMonths, translateFn);
    } else if (at - selector_start > 0 && matchTokens(tokens, at, 'number')
            && (selector_type === 'month' || selector_type === 'week')
            && typeof token_value === 'number') {
        value +=
            (matchTokens(tokens, at - 1, 'month') || matchTokens(tokens, at - 1, 'week') ? ' ' : '')
            + (conf.zero_pad_month_and_week_numbers && tokens[at][4] !== 'positive_number' && token_value < 10 ? '0' : '')
            + token_value;
    } else if (at - selector_start > 0 && matchTokens(tokens, at, 'month')
            && matchTokens(tokens, at - 1, 'year')) {
        value += ' ' + translatePrettyToken(token_value, 'month', conf, canonicalWeekdays, canonicalMonths, translateFn);
    } else if (at - selector_start > 0 && matchTokens(tokens, at, 'event')
            && matchTokens(tokens, at - 1, 'year')) {
        value += ' ' + tokens[at][0];
    } else if (matchTokens(tokens, at, 'month')) {
        if (conf.day_before_month && at + 1 <= selector_end && matchTokens(tokens, at + 1, 'number')
            && typeof next_token_value === 'number') {
            value += next_token_value + conf.day_month_sep
                + translatePrettyToken(token_value, 'month', conf, canonicalWeekdays, canonicalMonths, translateFn);
            advance = 1;
        } else {
            value += translatePrettyToken(token_value, 'month', conf, canonicalWeekdays, canonicalMonths, translateFn);
            if (at + 1 <= selector_end && matchTokens(tokens, at + 1, 'weekday')) {
                value += ' ';
            }
        }
    } else if (at + 2 <= selector_end
            && (matchTokens(tokens, at, '-') || matchTokens(tokens, at, '+'))
            && matchTokens(tokens, at + 1, 'number', 'calcday')
            && typeof next_token_value === 'number') {
        value += ' ' + token_value + next_token_value + ' day' + (Math.abs(next_token_value) === 1 ? '' : 's');
        advance = 2;
    } else if (at === selector_end
            && selector_type === 'weekday'
            && tokens[at][0] === ':') {
        // Do nothing.
    } else if (at === selector_end
            && selector_type === 'time'
            && tokens[at][0] === ',') {
        /* Remove trailing , which is ignored in parseTimeRange. */
    } else {
        value += translatePrettyToken(token_value.toString(), token_type, conf, canonicalWeekdays, canonicalMonths, translateFn);
    }

    return { value, advance };
}
