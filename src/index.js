/*
 * SPDX-FileCopyrightText: © 2013 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * This file is based on work under the following copyright and
 * BSD-2-Clause permission notice:
 *
 *     SPDX-FileCopyrightText: © 2012 Dmitry Marakasov <amdmi3@amdmi3.ru>
 *     All rights reserved.
 *
 *     Redistribution and use in source and binary forms, with or without
 *     modification, are permitted provided that the following conditions are met:
 *
 *     1. Redistributions of source code must retain the above copyright notice, this
 *     list of conditions and the following disclaimer.
 *
 *     2. Redistributions in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *
 *     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *     ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *     WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *     DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 *     FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 *     DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 *     SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 *     CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 *     OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 *     OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as holiday_definitions from './holidays/generated-openholidays.js';
import word_error_correction from './locales/word_error_correction.yaml';

import { translate } from './locales/i18n';
import { compareSelectorOrder, formatPrettifySelectorToken, getRuleSeparator, matchTokens, normalizePrettifyConf, shouldSortPrettifiedGroup } from './prettify-helpers.mjs';
import { VARIABLE_TIME_DEFAULTS, getVariableTimeMinutes } from './variable-times.mjs';

import { resolveRange } from './locale-resolver/resolver.mjs';
import { regionLanguages } from './locale-resolver/region-languages.mjs';
import { normalizeToken } from './locale-resolver/normalize.mjs';
import resolver_layers from './locale-resolver/layers.json';

/** @type {import('./holidays/holiday-definitions.d.ts').HolidayDefinitions} */
const holidayDefinitions = holiday_definitions;
/** @typedef {import('./holidays/holiday-definitions.d.ts').HolidayItem} HolidayItem */

/**
 * Resolve a state name from ISO3166-2 fields in a Nominatim address.
 * @param {Record<string, unknown>} address Nominatim address object.
 * @param {Record<string, string>} stateByCode Lowercase state code to name map.
 * @returns {string|undefined} Resolved state name, if any.
 */
function getStateFromIso3166Address(address, stateByCode) {
    const iso3166Fields = Object.keys(address)
        .filter((key) => /^ISO3166-2-lvl\d+$/i.test(key))
        // Prefer the most specific subdivision (e.g. lvl6 over lvl4).
        .sort((left, right) => {
            const leftLevel = Number(left.slice(left.lastIndexOf('lvl') + 3));
            const rightLevel = Number(right.slice(right.lastIndexOf('lvl') + 3));
            return rightLevel - leftLevel;
        });

    for (const field of iso3166Fields) {
        const value = address[field];
        if (typeof value !== 'string') {
            continue;
        }
        const localCode = value.toLowerCase().replace(/^[^-]+-/, '');
        if (stateByCode[localCode]) {
            return stateByCode[localCode];
        }
    }

    return undefined;
}

/**
 * Resolve a state name from a Nominatim address.
 * Prefer matching ISO3166-2 fields (e.g. "DE-BE" -> "Berlin"), then fall back
 * to the address.state and address.county fields.
 * @param {Record<string, unknown>} address Nominatim address object.
 * @param {string|undefined} countryCode Lowercase country code.
 * @returns {string|undefined} Resolved state name, if any.
 */
function getStateFromAddress(address, countryCode) {
    if (typeof address !== 'object' || address === null) {
        return undefined;
    }

    if (typeof countryCode === 'string') {
        const countryDefinitions = holidayDefinitions[countryCode];
        if (countryDefinitions) {
            /** @type {Record<string, string>} */
            const stateByCode = {};
            for (const name of Object.keys(countryDefinitions)) {
                const definition = countryDefinitions[name];
                if (typeof definition === 'object' && definition !== null
                    && !Array.isArray(definition)
                    && typeof definition._state_code === 'string') {
                    stateByCode[definition._state_code.toLowerCase()] = name;
                }
            }

            const stateFromIso3166 = getStateFromIso3166Address(address, stateByCode);
            if (stateFromIso3166) {
                return stateFromIso3166;
            }
        }
    }

    if (typeof address.state === 'string') {
        return address.state;
    }
    if (typeof address.county === 'string') {
        return address.county;
    }

    return undefined;
}

/**
 * Creates an opening hours parser for an OSM opening-hours value.
 * @param {string} value The opening-hours value to parse.
 * @param {object|null} [nominatim_object] Location and address data used for holidays and solar times.
 * @param {number|object} [optional_conf_parm] Parser mode or parser configuration.
 */
export default function(value, nominatim_object, optional_conf_parm) {
    // Short constants {{{
    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];
    const INTL_DAY_MONTH_REF_DATE = new Date(2024, 2, 6); // fixed reference date for Intl.DateTimeFormat#formatToParts
    const string_to_token_map = {
        'su': [ 0, 'weekday' ],
        'mo': [ 1, 'weekday' ],
        'tu': [ 2, 'weekday' ],
        'we': [ 3, 'weekday' ],
        'th': [ 4, 'weekday' ],
        'fr': [ 5, 'weekday' ],
        'sa': [ 6, 'weekday' ],
        'jan': [  0, 'month' ],
        'feb': [  1, 'month' ],
        'mar': [  2, 'month' ],
        'apr': [  3, 'month' ],
        'may': [  4, 'month' ],
        'jun': [  5, 'month' ],
        'jul': [  6, 'month' ],
        'aug': [  7, 'month' ],
        'sep': [  8, 'month' ],
        'oct': [  9, 'month' ],
        'nov': [ 10, 'month' ],
        'dec': [ 11, 'month' ],
        'day': [ 'day', 'calcday' ],
        'days': [ 'days', 'calcday' ],
        'sunrise': [ 'sunrise', 'timevar' ],
        'sunset': [ 'sunset', 'timevar' ],
        'dawn': [ 'dawn', 'timevar' ],
        'dusk': [ 'dusk', 'timevar' ],
        'easter': [ 'easter', 'event' ],
        'week': [ 'week', 'week' ],
        'open': [ 'open', 'state' ],
        'closed': [ 'closed', 'state' ],
        'off': [ 'off', 'state' ],
        'unknown': [ 'unknown', 'state' ],
    }
    // Flatten all replacement rules into one longest-pattern-first lookup list,
    // so a specific phrase wins over a shorter pattern matching its prefix.
    const correction_entries = Object.entries(word_error_correction)
        .filter(([comment]) => comment !== 'Ambiguous words')
        .flatMap(([comment, corrections]) => Object.entries(corrections)
            .map(([pattern, replacement]) => ({ comment, pattern, replacement })))
        .sort((left, right) => right.pattern.length - left.pattern.length);
    // Multi-word rules only; single-word rules must not override valid tokens
    // such as the month abbreviation "Mar" and are left to returnCorrectWordOrToken.
    const phrase_correction_entries = correction_entries.filter(({ pattern }) =>
        pattern.includes(' ') || pattern.includes('\\s')
    );
    const findPhraseCorrection = (input) => {
        for (const correction of phrase_correction_entries) {
            const match = input.match(new RegExp(
                '^(' + correction.pattern + ')(\\.?)' +
                '(?=$|[^\\p{L}\\p{N}_])',
                'iu'
            ));
            if (match) {
                    return match;
            }
        }
        return undefined;
    };
    const ambiguous_season_words = new Set([
        'spring', 'summer', 'autumn', 'winter', // en
        'frühling', 'fruehling', 'frühjahr', 'sommer', 'herbst', // de
        'primavera', 'estate', 'autunno', 'inverno', // it
    ]);

    const default_prettify_conf = {
        // Update README.md if changed.
        'zero_pad_hour': true,           // enforce ("%02d", hour)
        'one_zero_if_hour_zero': false,  // only one zero "0" if hour is zero "0"
        'leave_off_closed': true,        // leave keywords "off" and "closed" as is
        'keyword_for_off_closed': 'off', // use given keyword instead of "off" or "closed"
        'rule_sep_string': ' ',          // separate rules by string
        'print_semicolon': true,         // print token which separates normal rules
        'leave_weekday_sep_one_day_betw': true, // use the separator (either "," or "-" which is used to separate days which follow to each other like Sa,Su or Su-Mo
        'sep_one_day_between': ',',      // separator which should be used
        'zero_pad_month_and_week_numbers': true, // Format week (e.g. `week 01`) and month day numbers (e.g. `Jan 01`) with "%02d".
        'locale': 'en',                  // locale for translations (currently 'en', 'de' and 'fr' are supported)
        'date_format': 'short'           // Use short or long date format (for day and month names)
    };

    const osm_tag_defaults = {
        'opening_hours'       :  { 'mode' :  0, 'warn_for_PH_missing' :  true, },
        'collection_times'    :  { 'mode' :  2, },
        /* oh_mode 2: "including the hyphen because there are post boxes which are
         * emptied several (undefined) times or one (undefined) time in a certain time
         * frame. This shall be covered also.".
         * Ref: https://wiki.openstreetmap.org/wiki/Key:collection_times */
        'opening_hours:.+'    :  { 'mode' :  0, },
        '.+:opening_hours'    :  { 'mode' :  0, },
        '.+:opening_hours:.+' :  { 'mode' :  0, },
        '.+:conditional'      :  { 'mode' :  0, },
        'smoking_hours'       :  { 'mode' :  0, },
        'service_times'       :  { 'mode' :  2, },
        'happy_hours'         :  { 'mode' :  0, },
        'lit'                 :  { 'mode' :  0,
            map: {
                'yes'      : 'sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"',
                'automatic': 'unknown "specified as automatic: When someone enters the way the lights are turned on."',
                'no'       : 'off "specified as no: There are no lights installed."',
                'interval' : 'unknown "specified as interval"',
                'limited'  : 'unknown "specified as limited"',
            }
        },
    };

    const minutes_in_day = 60 * 24;
    const msec_in_day    = 1000 * 60 * minutes_in_day;
    // let msec_in_week   = msec_in_day * 7;

    const library_name   = 'opening_hours.js';
    const repository_url = 'https://github.com/opening-hours/' + library_name;
    // let issues_url     = repository_url + '/issues?state=open';
    /* }}} */

    /* Translation function {{{ */
    // Parser messages use the `texts` translations. Pretty output translates separately.
    const parser_locale = optional_conf_parm && typeof optional_conf_parm['locale'] === 'string'
        ? optional_conf_parm['locale']
        : 'en';

    // Parser errors and warnings only need message translations.
    const t = (key, variables) => translate(parser_locale, 'texts', key, variables);
    /* }}} */

    /* Optional constructor parameters {{{ */

    /* nominatim_object {{{
     *
     * Required to reasonably calculate 'sunrise' and holidays.
     */
    /** @type {string|undefined} */
    let location_state;
    /** @type {string|undefined} */
    let location_cc;
    /** @type {string|undefined} */
    let lat;
    /** @type {string|undefined} */
    let lon;
    if (typeof nominatim_object === 'object' && nominatim_object !== null) {
        if (typeof nominatim_object.address === 'object') {
            if (typeof nominatim_object.address.country_code === 'string') {
                location_cc = nominatim_object.address.country_code;
            }
            location_state = getStateFromAddress(nominatim_object.address, location_cc);
        }

        if (typeof nominatim_object.lon === 'string' && typeof nominatim_object.lat === 'string') {
            lat = nominatim_object.lat;
            lon = nominatim_object.lon;
        }
    } else if (nominatim_object === null) {
        /* Set the location to some random value. This can be used if you don’t
         * care about correct opening hours for more complex opening_hours
         * values.
         */
        location_cc = 'de';
        location_state = 'Baden-W\u00fcrttemberg';
        lat = '49.5400039';
        lon = '9.7937133';
    } else if (typeof nominatim_object !== 'undefined') {
        throw 'The nominatim_object parameter is of unknown type.'
            + ' Given ' + typeof(nominatim_object)
            + ', expected object.';
    }

    /* }}} */

    /* mode, locale, warnings_severity, tag_key, map_value {{{
     *
     * 0: time ranges (default), tags: opening_hours, lit, …
     * 1: points in time
     * 2: both (time ranges and points in time), tags: collection_times, service_times
     */

    let warnings_severity = 4;
    /* Default, currently the highest severity supported.
     * This number is expected to be >= 4. This is not explicitly checked.
     */

    let oh_mode;
    let oh_map_value = false;
    let oh_key, oh_regex_key;

    if (typeof optional_conf_parm === 'number') {
        oh_mode = optional_conf_parm;
    } else if (typeof optional_conf_parm === 'object') {
        if (checkOptionalConfParm('mode', 'number')) {
            oh_mode = optional_conf_parm['mode'];
        }
        if (checkOptionalConfParm('warnings_severity', 'number')) {
            warnings_severity = optional_conf_parm['warnings_severity'];
            if ([ 0, 1, 2, 3, 4, 5, 6, 7 ].indexOf(warnings_severity) === -1) {
                throw t('warnings severity', { 'severity': warnings_severity, 'allowed': '[ 0, 1, 2, 3, 4, 5, 6, 7 ]' });
            }
        }
        if (checkOptionalConfParm('tag_key', 'string')) {
            oh_key = optional_conf_parm['tag_key'];
        }
        if (checkOptionalConfParm('map_value', 'boolean')) {
            oh_map_value = optional_conf_parm.map_value;
        }
    } else if (typeof optional_conf_parm !== 'undefined') {
        throw t('optional conf parm type', { 'given': typeof(optional_conf_parm) });
    }

    if (typeof oh_key === 'string') {
        oh_regex_key = getRegexKeyForKeyFromOsmDefaults(oh_key)

        if (oh_map_value
            && typeof osm_tag_defaults[oh_regex_key] === 'object'
            && typeof osm_tag_defaults[oh_regex_key]['map'] === 'object'
            && typeof osm_tag_defaults[oh_regex_key]['map'][value] === 'string'
            ) {

            value = osm_tag_defaults[oh_regex_key]['map'][value];
        }
    } else if (oh_map_value) {
        throw t('conf param tag key missing');
    }

    if (typeof oh_mode === 'undefined') {
        if (typeof oh_key === 'string' && osm_tag_defaults[oh_regex_key] !== undefined) {
            if (typeof osm_tag_defaults[oh_regex_key]['mode'] === 'number') {
                oh_mode = osm_tag_defaults[oh_regex_key]['mode'];
            } else {
                oh_mode = 0;
            }
        } else {
            oh_mode = 0;
        }
    } else if ([ 0, 1, 2 ].indexOf(oh_mode) === -1) {
        throw t('conf param mode invalid', { 'given': oh_mode, 'allowed': '[ 0, 1, 2 ]' });
    }

    /* }}} */
    /* }}} */

    // Tokenize value and generate selector functions. {{{
    if (typeof value !== 'string') {
        throw t('no string');
    }
    if (/^(?:\s*;?)+$/.test(value)) {
        throw t('nothing');
    }

    /** @typedef {[number|string, string, number] & { single_digit_lexeme?: boolean, meridian?: string }} ParserToken */
    /** @typedef {[Array<ParserToken>, boolean, number?]} ParserTokenRule */
    const parsing_warnings = []; // Elements are arrays [nrule, at, type, message, tokens_to_use?] fed into formatWarnErrorMessage().
    let done_with_warnings = false; // The functions which returns warnings can be called multiple times.
    let done_with_selector_reordering = false;
    let done_with_selector_reordering_warnings = false;
    // Rule indices for which prettify must keep the original selector order,
    // because reordering time/state would change the meaning (#596).
    const rules_without_selector_reordering = new Set();
    /** @type {Array<ParserTokenRule>} */
    const tokens = tokenize(value);
    // console.log(JSON.stringify(tokens, null, '    '));
    let prettified_value = '';
    let week_stable = true;

    let rule, nrule;
    /** @type {Array<{[key: string]: object}>} */
    const rules = [];
    const rule_infos = {};
    /* Not reliable because tokens !== new_tokens */
    // for (var nrule = 0; nrule < tokens.length; nrule++) {
    //     rule_infos[nrule] = {};
    // }
    /** @type {Array<ParserTokenRule>} */
    const new_tokens = [];

    for (nrule = 0; nrule < tokens.length; nrule++) {
        if (tokens[nrule][0].length === 0) {
            // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.
            parsing_warnings.push([nrule, -1,
                'nothing_useful',
                t('nothing useful')
                + (nrule === tokens.length - 1 && nrule > 0 && !tokens[nrule][1] ?
                    ' ' + t('programmers joke') : '')
                ]);
            continue;
        }

        let continue_at = 0;
        let next_rule_is_additional = false;

        do {
            if (continue_at === tokens[nrule][0].length) {
                /* Additional rule does contain nothing useful e.g. second rule
                 * of '10:00-12:00,' (empty) which needs to be handled.
                  */
                break;
            }

            rule = {
                // Time selectors
                time: [],

                // Temporary array of selectors from time wrapped to the next day
                wraptime: [],

                // Date selectors
                weekday: [],
                holiday: [],
                week: [],
                month: [],
                monthday: [],
                year: [],

                // Array with non-empty date selector types, with most optimal ordering
                date: [],

                fallback: tokens[nrule][1],
                additional: continue_at ? true : false,
                meaning: true,
                unknown: false,
                comment: undefined,
                build_from_token_rule: undefined,
            };

            rule.build_from_token_rule = [ nrule, continue_at, new_tokens.length ];
            continue_at = parseGroup(tokens[nrule][0], continue_at, rule, nrule);
            if (typeof continue_at === 'object') {
                continue_at = continue_at[0];
            } else {
                continue_at = 0;
            }

            // console.log('Current tokens: ' + JSON.stringify(tokens[nrule], null, '    '));

            new_tokens.push(
                [
                    tokens[nrule][0].slice(
                        rule.build_from_token_rule[1],
                        continue_at === 0
                            ? tokens[nrule][0].length
                            : continue_at
                    ),
                    tokens[nrule][1],
                    tokens[nrule][2],
                ]
            );

            if (next_rule_is_additional && new_tokens.length > 1) {
                // Move 'rule separator' from last token of last rule to first token of this rule.
                const previous_tokens = new_tokens[new_tokens.length - 2][0];
                const current_tokens = new_tokens[new_tokens.length - 1][0];
                const rule_separator = previous_tokens.pop();
                if (rule_separator === undefined) {
                    throw formatLibraryBugMessage('Missing rule separator.');
                }
                current_tokens.unshift(rule_separator);
            }

            next_rule_is_additional = continue_at === 0 ? false : true;

            const optimal_selector_order = ['year', 'holiday', 'month', 'monthday', 'week', 'weekday'];
            optimal_selector_order.forEach(function (element) {
                if (rule[element].length > 0) {
                    rule.date.push(rule[element]);
                    rule[element] = [];
                }
            });

            // console.log('Rule: ' + JSON.stringify(rule, null, '    '));
            rules.push(rule);

            /* This handles selectors with time ranges wrapping over midnight (e.g. 10:00-02:00).
             * It generates wrappers for all selectors and creates a new rule.
             */
            if (rule.wraptime.length > 0) {
                const wrapselectors = {
                    time: rule.wraptime,
                    date: [],

                    meaning: rule.meaning,
                    unknown: rule.unknown,
                    comment: rule.comment,

                    wrapped: true,
                    build_from_token_rule: rule.build_from_token_rule,
                };

                for (let dselg = 0; dselg < rule.date.length; dselg++) {
                    wrapselectors.date.push([]);
                    for (let dsel = 0; dsel < rule.date[dselg].length; dsel++) {
                        wrapselectors.date[wrapselectors.date.length-1].push(
                                generateDateShifter(rule.date[dselg][dsel], -msec_in_day)
                            );
                    }
                }

                rules.push(wrapselectors);
            }
        } while (continue_at);
    }
    // console.log(JSON.stringify(tokens, null, '    '));
    // console.log(JSON.stringify(new_tokens, null, '    '));
    /* }}} */

    /* Helper functions {{{ */
    /**
     * Get the regex key for an OpenStreetMap tag key. {{{
     * @param {string} key Tag key, e.g. `opening_hours:kitchen`.
     * @returns {string|undefined} Matching key from `osm_tag_defaults`.
     */
    function getRegexKeyForKeyFromOsmDefaults(key) {
        let regex_key;
        let exact_match = false;

        Object.keys(osm_tag_defaults).forEach(function (osm_key) {
            if (exact_match === true) {
                return;
            }
            if (key === osm_key) { // Exact match.
                regex_key = osm_key;
                // We can't just return here as some old browsers
                // don't interpret it as a final return (like a loop break)
                exact_match = true;
            } else if (new RegExp(osm_key).test(key)) {
                regex_key = osm_key;
            }
        });
        return regex_key;
    }
    /* }}} */

    /**
     * Check the type of an optional constructor parameter. {{{
     * @param {string} key Key of `optional_conf_parm`.
     * @param {string} expected_type Expected result of `typeof`.
     * @returns {boolean} Whether the value has the expected type.
     */
    function checkOptionalConfParm(key, expected_type) {
        if (typeof optional_conf_parm[key] === expected_type) {
            return true;
        } else if (typeof optional_conf_parm[key] !== 'undefined') {
            throw t('conf param unknown type', { 'key': key, 'given': typeof(optional_conf_parm[key]), 'expected': expected_type });
        }
        return false;
    }
    /* }}} */
    /* }}} */

    /**
     * Resolve the position a warning or error points to. {{{
     * Computes the base string and the character offset into it where the
     * `<--- ` marker belongs. This is the single source of truth for both the
     * formatted string (formatWarnErrorMessage) and the structured warning
     * objects (getStructuredWarnings), so both stay consistent.
     * @param {number|string} nrule Rule number starting with 0. `-1` means an
     *     error during tokenization; a string means the prettified value.
     * @param {number} at Token position. `-1` means the end of a rule.
     * @param {Array<ParserTokenRule>} [tokens_to_use] Token array, defaulting to `tokens`. Pass
     *     `new_tokens` from `getWarnings()` because additional rules can make
     *     it longer than `tokens`.
     * @returns {{value: string, position: number|null}} The value the position
     *     refers to and its character offset, or `null` if it is unknown.
     */
    function resolveWarnErrorPosition(nrule, at, tokens_to_use) {
        if (typeof nrule === 'string') {
            return { value: nrule, position: at };
        }
        if (typeof nrule !== 'number') {
            return { value: value, position: null };
        }
        if (nrule === -1) {
            // at is remaining value.length at the point of the error.
            return { value: value, position: value.length - at };
        }

        if (typeof tokens_to_use === 'undefined') {
            tokens_to_use = tokens;
        }

        let pos;
        const current_rule = tokens_to_use[nrule];
        if (typeof current_rule === 'undefined') {
            // Caller passed the wrong token array (tokens instead of new_tokens?).
            formatLibraryBugMessage('Bug in warning generation code: tokens_to_use[nrule] is undefined for nrule=' + nrule + '.');
            pos = value.length;
        } else if (typeof current_rule[0][at] === 'undefined') {
            if (at === -1) {
                // at === -1: point to end of rule, use offset of next rule entry if available.
                pos = value.length;
                const next_rule = tokens_to_use[nrule + 1];
                if (typeof next_rule !== 'undefined' && typeof next_rule[2] === 'number') {
                    pos -= next_rule[2];
                } else if (typeof current_rule[2] === 'number') {
                    pos -= current_rule[2];
                }
            } else {
                // Token position is out of range. Run real_test regularly to catch this.
                formatLibraryBugMessage('Bug in warning generation code which could not determine the exact position of the warning or error in value.');
                pos = value.length;
                if (typeof current_rule[2] === 'number') {
                    // Fallback: point to last token in the rule which caused the problem.
                    pos -= current_rule[2];
                    console.warn('Last token for rule: ' + JSON.stringify(current_rule));
                } else {
                    console.warn('tokens_to_use[nrule][2] is undefined. This is ok if nrule is the last rule.');
                }
            }
        } else {
            pos = value.length;
            if (typeof current_rule[0][at + 1] === 'object') {
                pos -= current_rule[0][at + 1][2];
            } else if (typeof current_rule[2] === 'number') {
                pos -= current_rule[2];
            }
        }
        return { value: value, position: pos };
    }
    /* }}} */

    /**
     * Format a warning or error message and mark its position in the input. {{{
     * @param {number|string} nrule Rule number, or the prettified value when the
     *     position refers to that value.
     * @param {number} at Token or character position to mark.
     * @param {string} message Human-readable warning or error message.
     * @param {Array<ParserTokenRule>} [tokens_to_use] Token array used to resolve the position.
     * @returns {string} Message with the position marker, or the original message
     *     when no position can be determined.
     */
    function formatWarnErrorMessage(nrule, at, message, tokens_to_use) {
        // console.log(`Called formatWarnErrorMessage: ${nrule}, ${at}, ${message}`);
        const resolved = resolveWarnErrorPosition(nrule, at, tokens_to_use);
        if (resolved.position === null) {
            return message;
        }
        return resolved.value.substring(0, resolved.position) + ' <--- (' + message + ')';
    }
    /* }}} */

    /**
     * Format an internal library error message. {{{
     * @param {string} [message] Human-readable error message.
     * @param {string} [text_template] Translation template, defaulting to `library bug`.
     * @returns {string} Formatted error message.
     */
    function formatLibraryBugMessage(message, text_template) {
        if (typeof message === 'undefined') {
            message = '';
        } else {
            message = ' ' + message;
        }
        if (typeof text_template !== 'string') {
            text_template = 'library bug';
        }

        message = t(text_template, { 'value': value, 'url': repository_url, 'message': message });
        console.error(message);
        return message;
    } /* }}} */

    /**
     * Tokenize an opening-hours input stream. {{{
     * @param {string} value Raw opening-hours value.
     * @returns {Array<ParserTokenRule>} Tokenized list. See the internal documentation in `docs/`.
     */
    function tokenize(value) {
        // Negative list approach: Match anything that's NOT punctuation, digits, or special chars
        // This automatically supports all Unicode letter categories without explicit enumeration
        const WORD_REGEX = /^([^\s\d\p{P}\p{S}\p{C}]{2,})(?=\s|$|[\s\d\p{P}\p{S}\p{C}])((?:[.]| before| after)?)/iu;

        const all_tokens     = [];
        /** @type {Array<ParserToken>} */
        let curr_rule_tokens = [];

        // Two-phase locale resolver: collect the raw lexemes of the weekday/month
        // operands per rule, then resolve each group together (Pass B). Grouping
        // per rule gives cross-token coherence (e.g. понедельник-пятница) that a
        // greedy single-token pass cannot, and the POI country adds the geo tier.
        const resolver_region_langs = regionLanguages(location_cc, resolver_layers);
        const range_meaning_index = { weekday: weekdays, month: months };
        let curr_rule_range_raw = { weekday: [], month: [] };
        const recordRangeTerm = (raw, range_type, token_index, warning_index) => {
            if (range_type === 'weekday' || range_type === 'month') {
                curr_rule_range_raw[range_type].push({
                    raw,
                    token_index,
                    warning_index: typeof warning_index === 'number' ? warning_index : null,
                });
            }
        };
        const finalizeRuleRanges = () => {
            for (const range_type of ['weekday', 'month']) {
                const entries = curr_rule_range_raw[range_type];
                if (entries.length === 0) {
                    continue;
                }
                const res = resolveRange(entries.map(entry => entry.raw), {
                    locale: parser_locale,
                    type: range_type,
                    layers: resolver_layers,
                    regionLangs: resolver_region_langs,
                });
                res.tokens.forEach((resolved, index) => {
                    // Reject foreign/ambiguous tokens the resolver actively rejects,
                    // but defer 'unknown' ones to the manual correction table.
                    if (resolved.confidence === 'error' && resolved.kind !== 'unknown') {
                        const token = curr_rule_tokens[entries[index].token_index];
                        const at = token ? token[2] : -1;
                        throw formatWarnErrorMessage(-1, at, resolved.message);
                    }
                    // Correct the token to the context-resolved meaning, overriding a
                    // locale-blind flat-map guess (e.g. `ne`→Su becomes Th at a Sesotho
                    // location). The resolver — not the greedy map — is authoritative.
                    if (resolved.meaning && resolved.kind !== 'unknown') {
                        const meaning_index = range_meaning_index[range_type].indexOf(resolved.meaning);
                        const token = curr_rule_tokens[entries[index].token_index];
                        if (meaning_index >= 0 && token && token[1] === range_type) {
                            const overridden = token[0] !== meaning_index;
                            if (overridden) {
                                token[0] = meaning_index;
                            }
                            // Rewrite the correction warning when the resolver overrode the
                            // meaning, or append an auto-generated note when the lexeme is
                            // cross-locale ambiguous (e.g. `so` = Su here, Sa elsewhere).
                            const has_note = Array.isArray(resolved.alternatives) && resolved.alternatives.length > 0;
                            if (overridden || has_note) {
                                const raw_lexeme = entries[index].raw;
                                let message = t('please use English abbreviation ok for ko',
                                    { ko: raw_lexeme, ok: resolved.meaning });
                                if (has_note) {
                                    const alternatives = resolved.alternatives
                                        .map(alt => alt.meaning + ' (' + alt.langs.join(', ') + ')')
                                        .join('; ');
                                    message += ' ' + t('ambiguous elsewhere', { ko: raw_lexeme, alternatives });
                                }
                                // Rewrite exactly the warning this token produced (tracked
                                // by index), so a repeated lexeme in the same rule cannot
                                // patch the wrong occurrence.
                                const warn_idx = entries[index].warning_index;
                                if (warn_idx !== null && warn_idx >= 0 && warn_idx < parsing_warnings.length) {
                                    const warning = parsing_warnings[warn_idx];
                                    if (warning[2] === 'word_error_correction'
                                        && typeof warning[3] === 'string') {
                                        warning[3] = message;
                                    }
                                }
                            }
                        }
                    }
                });
            }
            curr_rule_range_raw = { weekday: [], month: [] };
        };

        /**
         * Recognise a word the flat map does not know but the cross-locale index
         * does (e.g. an ambiguous foreign weekday like `ne`). Returns a provisional
         * `{ index, type }`; finalizeRuleRanges resolves the real meaning by context.
         * @param {string} word Word to resolve.
         * @returns {{index: number, type: 'weekday'|'month'}|null} Provisional range token.
         */
        const recognizeRangeToken = (word) => {
            const candidates = resolver_layers.crossLocale[normalizeToken(word)];
            if (!candidates) {
                return null;
            }
            const weekday = candidates.find(candidate => candidate.type === 'weekday');
            const month = candidates.find(candidate => candidate.type === 'month');
            // The same lexeme can be a weekday in one language and a month in
            // another. Without grammatical context we cannot commit to a type
            // here, so defer to the normal error handling instead of guessing.
            if (weekday && month) {
                return null;
            }
            if (weekday) {
                return { index: weekdays.indexOf(weekday.meaning), type: 'weekday' };
            }
            if (month) {
                return { index: months.indexOf(month.meaning), type: 'month' };
            }
            return null;
        };

        /**
         * Check whether a token is an unknown single-letter word fragment.
         * @param {ParserToken|unknown} token Token to inspect.
         * @returns {boolean} Whether the token represents one unknown letter.
         */
        const isUnknownSingleLetterToken = (token) => {
            if (!Array.isArray(token)) {
                return false;
            }

            const [token_value, token_type] = token;
            return typeof token_value === 'string'
                && token_value === token_type
                && /^\p{L}$/u.test(token_value);
        };

        let last_rule_fallback_terminated = false;
        const NUMERIC_DAY_OFFSET_PATTERN = String.raw`\d+\s*days?(?!\s*(?:a|\/)\s*week)\b`;
        const ERROR_TOLERANCE_ALTERNATIVES = [
            String.raw`&|_|→|‐|‑|‒|–|−|—|ー|=|·`,
            String.raw`öffnungszeit(?:en)?:?|opening_hours\s*=|\?|~|～|：`,
            String.raw`always (?:open|closed)|24x7|24 hours 7 days a week|24 hours`,
            String.raw`7 ?days(?:(?: a |\/)week)?|7j?\/7|all days?|every day`,
            String.raw`(?:bis|till?|-|–)? ?(?:open ?end|late)`,
            String.raw`(?:(?:one )?day (?:before|after) )?(?:school|public) holidays?`,
            String.raw`days(?=\s|$|[^\p{L}_])|до|рм|ам|jours fériés|on work days?|sonntags?`,
            String.raw`(?:nur |an )?sonn-?(?:(?: und |\/)feiertag(?:s|en?)?)?`,
            String.raw`(?:an )?feiertag(?:s|en?)?|(?:nach|on|by) (?:appointments?|vereinbarung|absprache)`,
            String.raw`p\.m\.|a\.m\.`,
            String.raw`(?:[^\s\d\p{P}\p{S}\p{C}]|_)+(?=\s|$|[\s\d\p{Po}\p{Ps}\p{Pe}\p{Pd}\p{Pf}\p{Pi}\p{S}\p{C}])`,
            String.raw`à|á|mo|tu|we|th|fr|sa|su|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec`,
        ].join('|');
        const ERROR_TOLERANCE_REGEX = new RegExp(
            String.raw`^(?!${NUMERIC_DAY_OFFSET_PATTERN})(${ERROR_TOLERANCE_ALTERNATIVES})(\.?)`,
            'iu'
        );
        while (value !== '') {
            /* Ordered after likelihood of input for performance reasons.
             * Also, error tolerance is supposed to happen at the end.
             */
            // console.log("Parsing value: " + value);

            // Check correction phrases before the regular word and error-tolerance patterns.
            const phrase_match = findPhraseCorrection(value);
            let tmp = phrase_match || value.match(WORD_REGEX);
            let token_from_map = undefined;
            if (!phrase_match && tmp && tmp[2] === '') {
                token_from_map = string_to_token_map[tmp[1].toLowerCase()];
            }
            if (typeof token_from_map === 'object') {
                curr_rule_tokens.push(token_from_map.concat([value.length]));
                recordRangeTerm(tmp[1], token_from_map[1], curr_rule_tokens.length - 1);
                value = value.substr(tmp[1].length);
            } else if ((tmp = value.match(/^\s+/))) {
                // whitespace is ignored
                value = value.substr(tmp[0].length);
            } else if ((tmp = value.match(/^24\/7/))) {
                // Reserved keyword.
                curr_rule_tokens.push([tmp[0], tmp[0], value.length ]);
                value = value.substr(tmp[0].length);
            } else if (/^;/.test(value)) {
                // semicolon terminates rule.
                // Next token belong to a new rule.
                finalizeRuleRanges();
                all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated, value.length ]);
                value = value.substr(1);

                curr_rule_tokens = [];
                last_rule_fallback_terminated = false;
            } else if (/^[:.]/.test(value)) {
                // Time separator (timesep).
                if (value[0] === '.' && !done_with_warnings) {
                    parsing_warnings.push([ -1, value.length - 1, 'hour_min_separator', t('hour min separator')]);
                }
                curr_rule_tokens.push([ ':', 'timesep', value.length ]);
                value = value.substr(1);
            } else if ((tmp = value.match(/^(?:PH|SH)/i))) {
                // special day name (holidays)
                curr_rule_tokens.push([tmp[0].toUpperCase(), 'holiday', value.length ]);
                value = value.substr(2);
            } else if ((tmp = value.match(/^[°\u2070-\u209F\u00B2\u00B3\u00B9]{1,2}/))) {
                const unicode_code_point_to_digit = {
                    176: 0,
                    0x2070: 0,
                    185: 1,
                    178: 2,
                    179: 3,
                }
                const regular_number = tmp[0].split('').map(function (ch) {
                    const code_point = ch.charCodeAt(0);
                    if (typeof unicode_code_point_to_digit[code_point] === 'number') {
                        return unicode_code_point_to_digit[code_point];
                    } else if (0x2074 <= code_point && code_point <= 0x2079) {
                        return code_point - 0x2070;
                    } else if (0x2080 <= code_point && code_point <= 0x2089) {
                        return code_point - 0x2080;
                    }
                }).join('');
                let ok = '';
                if (curr_rule_tokens.length > 0 && matchTokens(curr_rule_tokens, curr_rule_tokens.length-1, 'number')) {
                    ok += ':';
                }
                ok += regular_number;
                if (!done_with_warnings) {
                    for (let i = 0; i <= tmp[0].length; i++) {
                        if (value.charCodeAt(i) === 176) {
                            parsing_warnings.push([ -1, value.length - (1 + i),
                                    'rant_degree_sign_used_for_zero', t('rant degree sign used for zero')]);
                        }
                    }
                    parsing_warnings.push([ -1, value.length - tmp[0].length,
                            'please_use_ok_for_ko', t('please use ok for ko', {'ko': tmp[0], 'ok': ok})]);
                }
                value = ok + value.substr(tmp[0].length);
            } else if ((tmp = phrase_match || value.match(ERROR_TOLERANCE_REGEX))) {
                /* Handle all remaining words and specific other characters with error tolerance.
                 *
                 * à|á: Word boundary does not work with Unicode chars: 'test à test'.match(/\bà\b/i)
                 * https://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
                 * Order in the regular expression capturing group is important in some cases.
                 *
                 * mo|tu|we|th|fr|sa|su|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec: Prefer defended keywords
                 * if used in cases like 'mo12:00-14:00' (when keyword is followed by number).
                 */
                const lower_word = tmp[1].toLowerCase();
                const warn_count_before = parsing_warnings.length;
                // returnCorrectWordOrToken looks up the same correction_entries,
                // so a pre-matched phrase resolves here just like a single word.
                let correct_val = returnCorrectWordOrToken(lower_word, value.length);
                // A word_error_correction warning, if any, is the last one pushed by
                // returnCorrectWordOrToken; remember its index so the resolver can
                // rewrite exactly this warning later (not a same-word duplicate).
                const correction_warning_index = parsing_warnings.length > warn_count_before
                    ? parsing_warnings.length - 1
                    : null;
                // console.log('Error tolerance for string "' + tmp[1] + '" returned "' + correct_val + '".');
                if (typeof correct_val === 'object') {
                    curr_rule_tokens.push([ correct_val[0], correct_val[1], value.length ]);
                    recordRangeTerm(lower_word, correct_val[1], curr_rule_tokens.length - 1);
                    value = value.substr(tmp[0].length);
                } else if (typeof correct_val === 'string') {
                    if (correct_val === 'am' || correct_val === 'pm') {
                        let hours_token_at = curr_rule_tokens.length - 1;
                        let hours_token;
                        if (hours_token_at >= 0) {
                            if (hours_token_at -2 >= 0 &&
                                    matchTokens(
                                        curr_rule_tokens, hours_token_at - 2,
                                        'number', 'timesep', 'number'
                                    )
                            ) {
                                hours_token_at -= 2;
                                hours_token = curr_rule_tokens[hours_token_at];
                            } else if (matchTokens(curr_rule_tokens, hours_token_at, 'number')) {
                                hours_token = curr_rule_tokens[hours_token_at];
                            }

                            if (typeof hours_token === 'object') {
                                hours_token.meridian = correct_val;
                                if (correct_val === 'pm' && hours_token[0] < 12) {
                                    hours_token[0] += 12;
                                }
                                if (correct_val === 'am' && hours_token[0] === 12) {
                                    hours_token[0] = 0;
                                }
                                curr_rule_tokens[hours_token_at] = hours_token;
                            }
                        }
                        correct_val = '';
                    }
                    const correct_tokens = tokenize(correct_val)[0];
                    if (correct_tokens[1] === true) { // last_rule_fallback_terminated
                        throw formatLibraryBugMessage();
                    }
                    for (let i = 0; i < correct_tokens[0].length; i++) {
                        curr_rule_tokens.push([correct_tokens[0][i][0], correct_tokens[0][i][1], value.length]);
                        // value.length - tmp[0].length does not have the desired effect for all test cases.
                    }
                    if (correct_tokens[0].length === 1) {
                        recordRangeTerm(lower_word, correct_tokens[0][0][1], curr_rule_tokens.length - 1, correction_warning_index);
                    }

                    value = value.substr(tmp[0].length);
                    // value = correct_val + value.substr(tmp[0].length);
                    // Does not work because it would generate the wrong length for formatWarnErrorMessage.
                } else {
                    /** @type {ParserToken|undefined} */
                    const previous_token = curr_rule_tokens[curr_rule_tokens.length - 1];
                    /** @type {{index: number, type: 'weekday'|'month'}|null} */
                    const recognized = isUnknownSingleLetterToken(previous_token)
                        ? null
                        : recognizeRangeToken(lower_word);
                    if (recognized && recognized.index >= 0) {
                        // Not in the flat map, but the cross-locale index recognises it
                        // as a weekday/month name. Push provisionally; finalizeRuleRanges
                        // resolves the actual meaning by locale/geo/coherence or rejects it.
                        curr_rule_tokens.push([recognized.index, recognized.type, value.length]);
                        // Emit the same "use the English abbreviation" hint the flat map
                        // used to; finalizeRuleRanges rewrites it if the resolved meaning
                        // differs from this provisional one.
                        let recognition_warning_index = null;
                        if (!done_with_warnings) {
                            const provisional = (recognized.type === 'weekday' ? weekdays : months)[recognized.index];
                            recognition_warning_index = parsing_warnings.length;
                            parsing_warnings.push([
                                -1,
                                value.length - lower_word.length,
                                'word_error_correction',
                                t('please use English abbreviation ok for ko', { ko: lower_word, ok: provisional }),
                            ]);
                        }
                        recordRangeTerm(lower_word, recognized.type, curr_rule_tokens.length - 1, recognition_warning_index);
                        value = value.substr(tmp[0].length);
                    } else if (ambiguous_season_words.has(lower_word)) {
                        throw formatWarnErrorMessage(
                            -1,
                            value.length - tmp[0].length,
                            t('season words ambiguous')
                        );
                    } else {
                        // No correction available. Insert as single character token and let the parser handle the error.
                        curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length - 1 ]);
                        value = value.substr(1);
                    }
                }
                if (typeof tmp[2] === 'string' && tmp[2] !== '' && !done_with_warnings) {
                    parsing_warnings.push([ -1, value.length, 'omit_ko', t('omit ko', {'ko': tmp[2]})]);
                }
            } else if ((tmp = value.match(/^(\d+)(?:([.])([^\d]))?/))) {
                // number
                if (Number(tmp[1]) > 1900) { // Assumed to be a year number.
                    curr_rule_tokens.push([Number(tmp[1]), 'year', value.length ]);
                    if (Number(tmp[1]) >= 2100) // Probably an error
                        parsing_warnings.push([ -1, value.length - 1,
                                'interpreted_as_year', t('interpreted as year', {number:  Number(tmp[1])})
                        ]);
                } else {
                    /** @type {ParserToken} */
                    const number_token = [ Number(tmp[1]), 'number', value.length ];
                    // Store whether the original numeric lexeme had a single digit (e.g. "9").
                    // Only consulted at hour positions, where a single digit (0-9) is ambiguous.
                    number_token.single_digit_lexeme = tmp[1].length === 1;
                    curr_rule_tokens.push(number_token);
                }

                value = value.substr(tmp[1].length + (typeof tmp[2] === 'string' ? tmp[2].length : 0));
                if (typeof tmp[2] === 'string' && tmp[2] !== '' && !done_with_warnings) {
                    parsing_warnings.push([ -1, value.length, 'omit_ko', t('omit ko', {'ko': tmp[2]})]);
                }
            } else if (/^\|\|/.test(value)) {
                // || terminates rule.
                // Next token belong to a fallback rule.
                if (curr_rule_tokens.length === 0) {
                    throw formatWarnErrorMessage(-1, value.length - 2, t('rule before fallback empty'));
                }

                finalizeRuleRanges();
                all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated, value.length ]);
                curr_rule_tokens = [];
                // curr_rule_tokens = [ [ '||', 'rule separator', value.length  ] ];
                // FIXME: Use this. Unknown bug needs to be solved in the process.
                value = value.substr(2);

                last_rule_fallback_terminated = true;
            } else if ((tmp = value.match(/^"([^"]+)"/))) {
                // Comment following the specification.
                // Any character is allowed inside the comment except " itself.
                curr_rule_tokens.push([tmp[1], 'comment', value.length ]);
                value = value.substr(tmp[0].length);
            } else if ((tmp = value.match(/^(["'„“‚‘’«「『])([^"'“”‘’»」』;|]*)(["'”“‘’»」』])/))) {
                // Comments with error tolerance.
                // The comments still have to be somewhat correct meaning
                // the start and end quote signs used have to be
                // appropriate. So “testing„ will not match as it is not a
                // quote but rather something unknown which the user should
                // fix first.
                // console.log('Matched: ' + JSON.stringify(tmp));
                for (let pos = 1; pos <= 3; pos += 2) {
                    // console.log('Pos: ' + pos + ', substring: ' + tmp[pos]);
                    const correct_val = returnCorrectWordOrToken(tmp[pos],
                        value.length - (pos === 3 ? tmp[1].length + tmp[2].length : 0)
                    );
                    if (typeof correct_val !== 'string' && tmp[pos] !== '"') {
                        throw formatLibraryBugMessage(
                            'A character for error tolerance was allowed in the regular expression'
                            + ' but is not covered by word_error_correction'
                            + ' which is needed to format a proper message for the user.'
                        );
                    }
                }
                curr_rule_tokens.push([tmp[2], 'comment', value.length ]);
                value = value.substr(tmp[0].length);
            } else if (/^(?:␣|\s)/.test(value)) {
                // Using "␣" as space is not expected to be a normal
                // mistake. Just ignore it to make using taginfo easier.
                value = value.substr(1);
            } else {
                // other single-character tokens
                curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length ]);
                value = value.substr(1);
            }
        }

        finalizeRuleRanges();
        all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated ]);

        return all_tokens;
    }
    /* }}} */

    /**
     * Error correction/tolerance function {{{
     * Go through word_error_correction hash and get correct value back.
     * @param {string} word Wrong word or character.
     * @param {number} value_length Current value_length (used for warnings).
     * @returns {string|[number|string, string]|undefined} (valid) opening_hours sub string; object
     *     with [ internal_value, token_name ] if value is correct; or undefined
     *     if word could not be found (and thus is not corrected).
     */
    function returnCorrectWordOrToken(word, value_length) {
        let correctWordOrToken;
        const token_from_map = string_to_token_map[word];
        if (typeof token_from_map === 'object') {
            return token_from_map;
        }

        // Check for ambiguous words first - show warning and provide default correction
        if (word_error_correction['Ambiguous words'] && word_error_correction['Ambiguous words'][word]) {
            if (!done_with_warnings) {
                const warningMessage = word_error_correction['Ambiguous words'][word];
                parsing_warnings.push([
                    -1,
                    value_length - word.length,
                    'ambiguous_word',
                    warningMessage
                ]);
            }
            // For ambiguous words, extract the first possible correction from the warning message
            // and use it as a default to keep parsing working
            const warningText = word_error_correction['Ambiguous words'][word];
            const match = warningText.match(/: (\w+) \(/);
            if (match && match[1]) {
                return match[1]; // Return the first suggested correction (e.g. "Nov" from "Nov (Czech)")
            }
            // Fallback: continue with normal processing
            return undefined;
        }

        const correction = correction_entries.find(entry =>
            new RegExp('^' + entry.pattern + '$', 'iu').test(word)
        );
        if (correction) {
            if (!done_with_warnings) {
                const warningMessage = t(correction.comment, {'ko': word, 'ok': correction.replacement});

                parsing_warnings.push([
                    -1,
                    value_length - word.length,
                    'word_error_correction',
                    warningMessage
                ]);
            }
            correctWordOrToken = correction.replacement;
        }

        return correctWordOrToken;
    }
    /* }}} */

    /**
     * Return warnings as list {{{
     * @param {object} [it] Optional iterator object, if available.
     * @param {boolean} [structured] If true, return structured warning objects; defaults to false.
     *     ({ type, message, value, position }) instead of formatted message strings.
     * @returns {Array<string|{type: string, message: string, value: string, position: number|null}>} Warnings as list. By default one formatted message string per element.
     *     With structured === true: array of objects with `type`, `message`, `value`
     *     (the string the offset refers to) and `position` (character offset of the
     *     `<--- ` marker, or null) fields.
     */
    function getWarnings(it, structured = false) {
        if (warnings_severity < 4) {
            return [];
        }

        // FIXME: Guard is too broad; `typeof null === 'object'`
        if (!done_with_warnings && typeof it === 'object') {
            /* getWarnings was called in a state without critical errors.
             * We can do extended tests.
             */

            /* Place all tests in this function if an additional (high
             * level) test is added and this does not require to rewrite
             * big parts of (sub) selector parsers only to get the
             * position. If that is the case, then rather place the test
             * code in the (sub) selector parser function directly.
             */

            const wide_range_selector_order = [ 'year', 'month', 'week', 'holiday' ];
            const small_range_selector_order = [ 'weekday', 'time', '24/7', 'state', 'comment'];

            // How many times was a selector_type used per rule? {{{
            /** @type {Array<Record<string, number[]>>} */
            const used_selectors = [];
            /** @type {string[][]} */
            const used_selectors_types_array = [];
            /** @type {Record<string, boolean>} */
            const has_token = {};

            for (let nrule = 0; nrule < new_tokens.length; nrule++) {
                const rule_tokens = new_tokens[nrule][0];
                if (rule_tokens.length === 0) continue;
                // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.

                let selector_start_end_type = [ 0, 0, undefined ];
                // console.log(rule_tokens);

                used_selectors[nrule] = {};
                used_selectors_types_array[nrule] = [];

                do {
                    selector_start_end_type = getSelectorRange(rule_tokens, selector_start_end_type[1]);
                    // console.log(selector_start_end_type, rule_tokens.length);

                    for (let token_pos = 0; token_pos <= selector_start_end_type[1]; token_pos++) {
                        if (typeof rule_tokens[token_pos] === 'object' && rule_tokens[token_pos][0] === 'PH') {
                            has_token['PH'] = true;
                        }
                    }

                    if (selector_start_end_type[0] === selector_start_end_type[1] &&
                        rule_tokens[selector_start_end_type[0]][0] === '24/7'
                        ) {
                            has_token['24/7'] = true;
                    }

                    if (typeof used_selectors[nrule][selector_start_end_type[2]] !== 'object') {
                        used_selectors[nrule][selector_start_end_type[2]] = [ selector_start_end_type[1] ];
                    } else {
                        used_selectors[nrule][selector_start_end_type[2]].push(selector_start_end_type[1]);
                    }
                    used_selectors_types_array[nrule].push(selector_start_end_type[2]);

                    selector_start_end_type[1]++;
                } while (selector_start_end_type[1] < rule_tokens.length);
            }
            // console.log('used_selectors: ' + JSON.stringify(used_selectors, null, '    '));
            // console.log('used_selectors_types_array: ' + JSON.stringify(used_selectors_types_array, null, '    '));
            /* }}} */

            for (let nrule = 0; nrule < used_selectors.length; nrule++) {
                const rule_tokens = new_tokens[nrule][0];

                /* Check if more than one not connected selector of the same type is used in one rule {{{ */
                Object.keys(used_selectors[nrule]).forEach(function (selector_type) {
                    const selector_positions = used_selectors[nrule][selector_type];
                    // console.log(selector_type + ' use at: ' + selector_positions.length);

                    if (selector_positions.length > 1) {
                        parsing_warnings.push([nrule, selector_positions[selector_positions.length - 1],
                            'use_multi',
                            t('use multi', {
                                'count': selector_positions.length,
                                'part2': (
                                    /^(?:comment|state)/.test(selector_type) ?
                                        t('selector multi 2a', {'what': (selector_type === 'state' ? t('selector state'): t('comments'))})
                                        :
                                        t('selector multi 2b', {'what': t(selector_type + (/^(?:month|weekday)$/.test(selector_type) ? 's' : ' ranges'))})
                                )
                            }),
                            new_tokens]
                        );
                        done_with_selector_reordering = true; // Correcting the selector order makes no sense if this kind of issue exists.
                    }
                });
                /* }}} */
                /* Check if change default state rule is not the first rule {{{ */
                if (   typeof used_selectors[nrule].state === 'object'
                    && Object.keys(used_selectors[nrule]).length === 1
                ) {
                    if (nrule !== 0) {
                        parsing_warnings.push([nrule, rule_tokens.length - 1, 'default_state', t('default state'), new_tokens]);
                    }
                /* }}} */
                /* Check if a rule (with state open) has no time selector {{{ */
                } else if (typeof used_selectors[nrule].time === 'undefined') {
                    if (    (       typeof used_selectors[nrule].state === 'object'
                                && rule_tokens[used_selectors[nrule].state[0]][0] === 'open'
                                && typeof used_selectors[nrule].comment === 'undefined'
                            ) || ( typeof used_selectors[nrule].comment === 'undefined'
                                && typeof used_selectors[nrule].state === 'undefined'
                            ) &&
                            typeof used_selectors[nrule]['24/7'] === 'undefined'
                    ) {

                        parsing_warnings.push([nrule, rule_tokens.length - 1, 'vague', t('vague'), new_tokens]);
                    }
                }
                /* }}} */
                /* Check if empty comment was given {{{ */
                if (typeof used_selectors[nrule].comment === 'object'
                    && rule_tokens[used_selectors[nrule].comment[0]][0].length === 0
                ) {

                    parsing_warnings.push([nrule, used_selectors[nrule].comment[0], 'empty_comment', t('empty comment'), new_tokens]);
                }
                /* }}} */
                /* Check for valid use of <separator_for_readability> {{{ */
                for (let i = 0; i < used_selectors_types_array[nrule].length - 1; i++) {
                    const selector_type = used_selectors_types_array[nrule][i];
                    const next_selector_type = used_selectors_types_array[nrule][i+1];
                    if (   (   wide_range_selector_order.indexOf(selector_type)       !== -1
                            && wide_range_selector_order.indexOf(next_selector_type)  !== -1
                        ) || ( small_range_selector_order.indexOf(selector_type)      !== -1
                            && small_range_selector_order.indexOf(next_selector_type) !== -1)
                        ) {

                        if (rule_tokens[used_selectors[nrule][selector_type][0]][0] === ':') {
                            parsing_warnings.push([nrule, used_selectors[nrule][selector_type][0],
                                'separator_for_readability',
                                t('separator_for_readability'),
                                new_tokens
                            ]);
                        }
                    }
                }
                /* }}} */
                /* Check for missing use of <additional_rule_separator> for time wrapping midnight {{{ */
                if (typeof rule_infos[nrule] === 'object'
                        && typeof rule_infos[nrule]['time_wraps_over_midnight'] === 'boolean'
                        && rule_infos[nrule]['time_wraps_over_midnight'] === true
                        && typeof used_selectors[nrule+1] === 'object'
                        && typeof used_selectors[nrule+1]['rule separator'] === 'undefined' // Not an additional rule
                        && new_tokens[nrule+1][1] === false // Not a fallback rule
                        ) {

                    const rules_too_complex = [ nrule, nrule+1 ].map(function (nrule){
                        for (let i = 0; i < wide_range_selector_order.length - 1; i++) {
                            if (typeof used_selectors[nrule][wide_range_selector_order[i]] === 'object') {
                                return true;
                            }
                        }
                        return false;
                    });
                    const rules_too_complex_count = rules_too_complex.filter(function (el){ return el; }).length;
                    let next_rule_selects_next_day = false;
                    if (
                            typeof rule_infos[nrule] === 'object'
                            && typeof rule_infos[nrule] === 'object'
                            && typeof rule_infos[nrule]['week_days'] === 'object'
                            && typeof rule_infos[nrule+1] === 'object'
                            && typeof rule_infos[nrule+1]['week_days'] === 'object'
                            ) {
                        for (let i = 0; i < rule_infos[nrule]['week_days'].length; i++) {
                            const week_day = rule_infos[nrule]['week_days'][i];
                                // console.log(rule_infos[nrule+1]['week_days']);
                                // console.log(week_day);
                            if (rule_infos[nrule+1]['week_days'].indexOf(week_day === 6 ? 0 : week_day+1) !== -1) {
                                next_rule_selects_next_day = true;
                                break;
                            }
                        }
                    } else {
                        next_rule_selects_next_day = true;
                    }
                    // console.log(rule_infos);
                    // console.log(next_rule_selects_next_day);
                    const additional_rule_separator_enabled = (optional_conf_parm||{}).additional_rule_separator !== false;
                    if (rules_too_complex_count < 2 && next_rule_selects_next_day && additional_rule_separator_enabled) {
                        parsing_warnings.push([nrule+1, new_tokens[nrule+1][0].length - 1,
                            'additional_rule_separator_not_used_after_time_wrapping_midnight',
                            t('additional_rule_separator not used after time wrapping midnight'),
                            new_tokens
                        ]);
                    }
                }
                /* }}} */
                /* Check if rule with closed|off modifier is additional {{{ */
                if (typeof rule_tokens[0] === 'object'
                    && rule_tokens[0][0] === ','
                    && rule_tokens[0][1] === 'rule separator'
                        && typeof used_selectors[nrule].state === 'object'
                        && (
                               rule_tokens[used_selectors[nrule].state[0]][0] === 'closed'
                            || rule_tokens[used_selectors[nrule].state[0]][0] === 'off'
                           )
                ) {

                    parsing_warnings.push([nrule, rule_tokens.length - 1,
                        'additional_rule_which_evaluates_to_closed',
                        t('additional rule which evaluates to closed'),
                        new_tokens
                    ]);
                    // Reordering would move time before state (e.g. "off") and
                    // can change semantics for additional rules (#596).
                    rules_without_selector_reordering.add(nrule);
                }
                /* }}} */

            }

            /* Check if 24/7 is used and it does not mean 24/7 because there are other rules {{{ */
            const has_advanced = it.advance();

            if (has_advanced === true && has_token['24/7'] && !done_with_warnings) {
                parsing_warnings.push([ -1, 0,
                    // Probably because of: "24/7; 12:00-14:00 open", ". Needs extra testing.
                    'strange_24_7',
                    t('strange 24/7')
                ]);
            }
            /* }}} */

            /* Check for missing PH. {{{ */
            if (    warnings_severity >= 5
                && !has_token['PH']
                && !has_token['24/7']
                && !done_with_warnings
                && (
                        (
                            typeof oh_key === 'string'
                            && oh_regex_key
                            && osm_tag_defaults[oh_regex_key]['warn_for_PH_missing']
                        )
                        || (typeof oh_key !== 'string')
                   )
                ) {

                const keys_with_warn_for_PH_missing = [];
                Object.keys(osm_tag_defaults).forEach(function (key) {
                    if (osm_tag_defaults[key]['warn_for_PH_missing']) {
                        keys_with_warn_for_PH_missing.push(key);
                    }
                });
                parsing_warnings.push([ -1, 0,
                    'public_holiday',
                    t('public holiday', { 'part2': (typeof oh_key !== 'string'
                        ? t('public holiday part2', {'keys': keys_with_warn_for_PH_missing.join(', ')}) : '')})
                        // + '(see README how to provide it)' // UI of the evaluation tool does not allow to provide it (currently).
                ]);
            }
            /* }}} */

            /* Check if value consists of multiple rules each only using a time selector {{{ */
            if (used_selectors_types_array.length > 1
                    &&  used_selectors_types_array.filter(function (el){
                            return el.length === 1 && el[0] === 'time';
                        }).length === used_selectors_types_array.length
                    ) {
                parsing_warnings.push([ -1, 0,
                    'combine_rules',
                    t('combine rules', { 'ok': ',' }),
                ]);
            }
            /* }}} */

            prettifyValue();
        }
        done_with_warnings = true;

        const warnings = [];
        /* FIXME: Warnings come out in parse order, not sorted by position.
         * The character offset from resolveWarnErrorPosition() would be a good
         * sort key (better than the rule-relative parsing_warnings[1]).
         */
        for (let i = 0; i < parsing_warnings.length; i++) {
            const pw = parsing_warnings[i];
            if (structured) {
                const resolved = resolveWarnErrorPosition(pw[0], pw[1], pw[4]);
                warnings.push({
                    type: pw[2],
                    message: pw[3],
                    value: resolved.value,
                    position: resolved.position,
                });
            } else {
                warnings.push( formatWarnErrorMessage(pw[0], pw[1], pw[3], pw[4]) );
            }
        }
        return warnings;
    }

    /* Helpers for getWarnings {{{ */

    /**
     * Check if token is the begin of a selector and why. {{{
     * @param {Array<ParserToken>} tokens List of token objects.
     * @param {number} at Position where to start.
     * @returns {number|boolean} `false` if the current token is not the begin of
     *     a selector; otherwise, the position in the token array from where the
     *     decision was made that the token is the start of a selector.
     */
    function tokenIsTheBeginOfSelector(tokens, at) {
        if (typeof tokens[at][3] === 'string') {
            return 3;
        } else if (tokens[at][1] === 'comment'
                || tokens[at][1] === 'state'
                || tokens[at][1] === '24/7'
                || tokens[at][1] === 'rule separator'
            ){

            return 1;
        } else {
            return false;
        }
    }
    /* }}} */

    /**
     * Get start and end position of a selector. {{{
     * For example this value 'Mo-We,Fr' will return the position of the
     * token lexeme 'Mo' and 'Fr' e.g. there indexes [ 0, 4 ] in the
     * selector array of tokens.
     * @param {Array<ParserToken>} tokens List of token objects.
     * @param {number} at Position where to start.
     * @returns {[number, number, string]} Start index, end index and selector type.
     */
    function getSelectorRange(tokens, at) {
        let selector_start = at,
            selector_end,
            pos_in_token_array;

        for (; selector_start >= 0; selector_start--) {
            pos_in_token_array = tokenIsTheBeginOfSelector(tokens, selector_start);
            if (pos_in_token_array) {
                break;
            }
        }
        selector_end = selector_start;

        if (pos_in_token_array === 1) {
            // Selector consists of a single token.

            // Include tailing colon.
            if (selector_end + 1 < tokens.length && tokens[selector_end + 1][0] === ':')
                selector_end++;

            return [ selector_start, selector_end, tokens[selector_start][pos_in_token_array] ];
        }

        for (selector_end++; selector_end < tokens.length ; selector_end++) {
            if (tokenIsTheBeginOfSelector(tokens, selector_end))
                return [ selector_start, selector_end - 1, tokens[selector_start][pos_in_token_array] ];
        }

        return [ selector_start, selector_end - 1, tokens[selector_start][pos_in_token_array] ];
    }
    /* }}} */
    /* }}} */
    /* }}} */

    /**
     * Prettify raw value from user. {{{
     * The value is generated by putting the tokens back together to a string.
     * @param {{conf?: object, get_internals?: boolean, rule_index?: number}} [argument_hash]
     *     Optional configuration for prettifying the value.
     * @returns {string|[Array<[[number, number, string], string]>, Array<ParserTokenRule>]} Prettified value string,
     *     or an array containing the prettified value and internal data structures
     *     if `get_internals` is true.
     */
    function prettifyValue(argument_hash) {
        /** @type {{ [key: string]: string | boolean }} */
        let user_conf = {};
        let get_internals = false;
        let rule_index;

        prettified_value = '';
        const prettified_value_array = [];

        if (typeof argument_hash === 'object') {
            if (typeof argument_hash.conf === 'object') {
                user_conf = argument_hash.conf;
            }

            if (typeof argument_hash.rule_index === 'number') {
                rule_index = argument_hash.rule_index;
            }

            if (argument_hash.get_internals === true) {
                get_internals = true;
            }

        }

        user_conf = normalizePrettifyConf(user_conf, default_prettify_conf);
        const locale = /** @type {string} */ (user_conf['locale']);
        const date_format = /** @type {'short' | 'long'} */ (user_conf['date_format']);
        const uses_locale_aware_order = locale !== 'en' && locale !== 'all';
        let day_before_month    = false;
        let day_month_sep       = ' ';
        let weekday_before_date = false;
        let weekday_date_sep    = ' ';
        if (uses_locale_aware_order) {
            try {
                const localeParts = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: date_format, calendar: 'gregory' })
                    .formatToParts(INTL_DAY_MONTH_REF_DATE);
                const wdIdx    = localeParts.findIndex(p => p.type === 'weekday');
                const dayIdx   = localeParts.findIndex(p => p.type === 'day');
                const monthIdx = localeParts.findIndex(p => p.type === 'month');
                if (dayIdx !== -1 && monthIdx !== -1) {
                    day_before_month = dayIdx < monthIdx;
                    day_month_sep    = localeParts
                        .slice(Math.min(dayIdx, monthIdx) + 1, Math.max(dayIdx, monthIdx))
                        .map(p => p.value).join('');
                }
                if (wdIdx !== -1 && dayIdx !== -1) {
                    weekday_before_date = wdIdx < dayIdx;
                    weekday_date_sep    = localeParts
                        .slice(Math.min(wdIdx, dayIdx) + 1, Math.max(wdIdx, dayIdx))
                        .map(p => p.value).join('').replace(/,/g, '').trim() || ' ';
                }
            } catch { /* Keep fallback order if locale is unsupported in runtime. */ }
        }
        user_conf['day_before_month']    = day_before_month;
        user_conf['day_month_sep']       = day_month_sep;
        user_conf['weekday_before_date'] = weekday_before_date;
        user_conf['weekday_date_sep']    = weekday_date_sep;

        for (let nrule = 0; nrule < new_tokens.length; nrule++) {
            const rule_entry = new_tokens[nrule];
            const rule_tokens = rule_entry[0];
            if (rule_tokens.length === 0) continue;
            // Rule does contain nothing useful e.g. second rule of '10:00-12:00;' (empty) which needs to be handled.

            if (typeof rule_index === 'number') {
                if (rule_index !== nrule) continue;
            } else {
                if (nrule !== 0)
                    prettified_value += getRuleSeparator(new_tokens[nrule], user_conf);
            }

            let selector_start_end_type = [ 0, 0, undefined ];
            const prettified_group_value = [];
            let count = 0;
            // console.log(rule_tokens);

            do {
                selector_start_end_type = getSelectorRange(rule_tokens, selector_start_end_type[1]);
                // console.log(selector_start_end_type, rule_tokens.length, count);

                if (count > 50) {
                    throw formatLibraryBugMessage('Infinite loop.');
                }

                if (selector_start_end_type[2] !== 'rule separator') {
                    prettified_group_value.push(
                        [
                            selector_start_end_type,
                            prettifySelector(
                                rule_tokens,
                                selector_start_end_type[0],
                                selector_start_end_type[1],
                                selector_start_end_type[2],
                                user_conf
                            ),
                        ]
                    );
                }

                selector_start_end_type[1]++;
                count++;
                // console.log(selector_start_end_type, rule_tokens.length, count);
            } while (selector_start_end_type[1] < rule_tokens.length);
            // console.log('Prettified value: ' + JSON.stringify(prettified_group_value, null, '    '));
            const not_sorted_prettified_group_value = prettified_group_value.slice();
            if (shouldSortPrettifiedGroup(done_with_selector_reordering, rules_without_selector_reordering, nrule, prettified_group_value)) {
                prettified_group_value.sort(compareSelectorOrder);
            }
            const old_prettified_value_length = prettified_value.length;

            // Snapshot before the locale swap so the ordering-warning check below compares
            // against the canonical sorted order, not the locale-swapped one.
            const sorted_prettified_group_value = prettified_group_value.slice();

            // Reorder at join time (not in prettifySelector) because the swap is only meaningful
            // when both a month and a weekday selector are present in the same group.
            if (user_conf['weekday_before_date']) {
                for (let i = 0; i < prettified_group_value.length - 1; i++) {
                    if (prettified_group_value[i][0][2] === 'month' && prettified_group_value[i+1][0][2] === 'weekday') {
                        const tmp = prettified_group_value[i];
                        prettified_group_value[i] = prettified_group_value[i+1];
                        prettified_group_value[i+1] = tmp;
                    }
                }
            }

            prettified_value += prettified_group_value.reduce(function (acc, entry, i) {
                if (i === 0) return entry[1];
                const sep = (user_conf['weekday_before_date']
                    && prettified_group_value[i-1][0][2] === 'weekday'
                    && entry[0][2] === 'month')
                    ? user_conf['weekday_date_sep']
                    : ' ';
                return acc + sep + entry[1];
            }, '');

            prettified_value_array.push( prettified_group_value );

            if (!done_with_selector_reordering_warnings) {
                for (let i = 0, l = not_sorted_prettified_group_value.length; i < l; i++) {
                    if (not_sorted_prettified_group_value[i] !== sorted_prettified_group_value[i]) {
                        // console.log(i + ': ' + sorted_prettified_group_value[i][0][2]);
                        let length = i + old_prettified_value_length; // i: Number of spaces in string.
                        for (let x = 0; x <= i; x++) {
                            length += sorted_prettified_group_value[x][1].length;
                            // console.log('Length: ' + length + ' ' + sorted_prettified_group_value[x][1]);
                        }
                        // console.log(length);
                        parsing_warnings.push([ prettified_value, length, 'switched', t('switched', {
                            'first': sorted_prettified_group_value[i][0][2],
                            'second': not_sorted_prettified_group_value[i][0][2]
                        })
                        ]);
                    }
                }
            }
        }

        done_with_selector_reordering_warnings = true;
        // console.log(JSON.stringify(prettified_value_array, null, '    '));

        if (get_internals) {
            return [ prettified_value_array, new_tokens ];
        } else {
            return prettified_value;
        }
    }
    /* }}} */

    /**
     * Generate a selector wrapper with a time offset. {{{
     * @param {(date: Date) => Array<unknown>} func Generated selector code function.
     * @param {number} shift Time to shift in milliseconds.
     * @returns {(date: Date) => Array<unknown>} Selector function with the shifted date.
     */
    function generateDateShifter(func, shift) {
        return function(date) {
            const res = func(new Date(date.getTime() + shift));

            if (typeof res[1] === 'undefined')
                return res;
            return [ res[0], new Date(res[1].getTime() - shift) ];
        };
    }
    /* }}} */

    /**
     * Check whether the tokens describe the plain full-year month/day range
     * `Jan 01-Dec 31`, without a period or following selector.
     * @param {Array<ParserToken>} tokens Parser tokens.
     * @param {number} at Position of the possible range.
     * @returns {boolean} Whether the range is week-stable.
     */
    function isPlainFullYearMonthdayRange(tokens, at) {
        if (matchTokens(tokens, at, 'year'))
            return false;
        if (!matchTokens(tokens, at, 'month', 'number', '-', 'month', 'number'))
            return false;

        const from_month = tokens[at][0];
        const from_day = tokens[at + 1][0];
        const to_month = tokens[at + 3][0];
        const to_day = tokens[at + 4][0];

        if (!(from_month === 0 && from_day === 1 && to_month === 11 && to_day === 31))
            return false;

        // A period or another selector means this is not the plain full-year range.
        if (matchTokens(tokens, at + 5, '/', 'number'))
            return false;
        if (matchTokens(tokens, at + 5, ','))
            return false;

        return true;
    }

    /**
     * Top-level parser {{{
     * @param {Array<ParserToken>} tokens List of tokens.
     * @param {number} at Position where to start.
     * @param {object} rule Reference to rule object.
     * @param {number} nrule Rule number starting with 0.
     * @returns {number|Array<number>} Position, or an additional-rule position.
     */
    function parseGroup(tokens, at, rule, nrule) {
        let rule_modifier_specified = false;

        // console.log(tokens); // useful for debugging of tokenize
        let last_selector = [];
        while (at < tokens.length) {
            // console.log('Parsing at position', at +':', tokens[at]);
            if (matchTokens(tokens, at, 'weekday')) {
                at = parseWeekdayRange(tokens, at, rule, undefined, nrule);
            } else if (matchTokens(tokens, at, '24/7')) {
                rule.time.push(function() { return [true]; });
                // Not needed. If there is no selector it automatically matches everything.
                // WRONG: This only works if there is no other selector in this selector group ...
                at++;
            } else if (matchTokens(tokens, at, 'holiday')) {
                if (matchTokens(tokens, at+1, ',')) {
                    at = parseHoliday(tokens, at, rule, true);
                } else {
                    at = parseHoliday(tokens, at, rule, false);
                }
                week_stable = false;
            } else if (matchTokens(tokens, at, 'month', 'number')
                    || matchTokens(tokens, at, 'month', 'weekday')
                    || matchTokens(tokens, at, 'year', 'month', 'number')
                    || matchTokens(tokens, at, 'year', 'event')
                    || matchTokens(tokens, at, 'event')) {
                const is_full_year_monthday_range = isPlainFullYearMonthdayRange(tokens, at);

                at = parseMonthdayRange(tokens, at, nrule);
                if (!is_full_year_monthday_range)
                    week_stable = false;
            } else if (matchTokens(tokens, at, 'year')) {
                at = parseYearRange(tokens, at);
                week_stable = false;
            } else if (matchTokens(tokens, at, 'month')) {
                at = parseMonthRange(tokens, at);
                // week_stable = false; // Decided based on the actual value/tokens.
            } else if (matchTokens(tokens, at, 'week')) {
                tokens[at][3] = 'week';
                at = parseWeekRange(tokens, at);

            } else if (at !== 0 && at !== tokens.length - 1 && tokens[at][0] === ':'
                && !(typeof last_selector[1] === 'string' && last_selector[1] === 'time')) {
                /* Ignore colon if they appear somewhere else than as time separator.
                 * Except the start or end of the value.
                 * This provides compatibility with the syntax proposed by Netzwolf:
                 * https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#separator_for_readability
                 * Check for valid use of <separator_for_readability> is implemented in function getWarnings().
                 */

                if (!done_with_warnings && matchTokens(tokens, at-1, 'holiday')) {
                    parsing_warnings.push([nrule, at, 'no_colon_after', t('no colon after', { 'token': tokens[at-1][1] })]);
                }

                at++;
            } else if (matchTokens(tokens, at, 'number', 'timesep')
                    || matchTokens(tokens, at, 'timevar')
                    || matchTokens(tokens, at, '(', 'timevar')
                    || matchTokens(tokens, at, 'number', '-')) {

                at = parseTimeRange(tokens, at, rule, false, nrule);
                last_selector = [ at, 'time' ];

            } else if (matchTokens(tokens, at, 'state')) {

                if (tokens[at][0] === 'open') {
                    rule.meaning = true;
                } else if (tokens[at][0] === 'closed' || tokens[at][0] === 'off') {
                    rule.meaning = false;
                } else {
                    rule.meaning = false;
                    rule.unknown = true;
                }

                rule_modifier_specified = true;
                at++;
                if (typeof tokens[at] === 'object' && tokens[at][0] === ',') // additional rule
                    at = [ at + 1 ];

            } else if (matchTokens(tokens, at, 'comment')) {
                rule.comment = tokens[at][0];
                if (!rule_modifier_specified) {
                    // Then it is unknown. Either with unknown explicitly
                    // specified or just a comment.
                    rule.meaning = false;
                    rule.unknown = true;
                }

                rule_modifier_specified = true;
                at++;
                if (typeof tokens[at] === 'object' && tokens[at][0] === ',') { // additional rule
                    at = [ at + 1 ];
                }
            } else if ((at === 0 || at === tokens.length - 1) && matchTokens(tokens, at, 'rule separator')) {
                at++;
                // console.log("value: " + nrule);
                // throw formatLibraryBugMessage('Not implemented yet.');
            } else {
                const warnings = getWarnings();
                throw formatWarnErrorMessage(nrule, at, t('unexpected token', {token: tokens[at][1] })) + (warnings ? (' ' + warnings.join('; ')) : '');
            }

            if (typeof at === 'object') { // additional rule
                tokens[at[0] - 1][1] = 'rule separator';
                break;
            }
            if (typeof last_selector[0] === 'number' && last_selector[0] !== at) {
                last_selector = [];
            }
        }

        return at;
    }

    /* Not used
    function get_last_token_pos_in_token_group(tokens, at, last_at) {
        for (at++; at < last_at; at++) {
            if (typeof tokens[at] === 'object') {
                if (typeof tokens[at][3] === 'string'
                        || tokens[at][1] === 'comment'
                        || tokens[at][1] === 'state'){

                        return at - 1;
                }
            }
        }
        return last_at;
    }
    */

    /* }}} */

    // helper functions for sub parser {{{

    /**
     * Move a date to the start of its day with an offset in minutes. {{{
     * For example, if date is 2014-05-19_18:17:12, dateAtDayMinutes would
     * return 2014-05-19_02:00:00 for minutes=120.
     * @param {Date} date Date to move.
     * @param {number} minutes Offset in minutes from midnight.
     * @returns {Date} Date moved to the specified time.
     */
    function dateAtDayMinutes(date, minutes) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, minutes);
    }
    /* }}} */

    /**
     * Move a date to the next occurrence of a specific weekday. {{{
     * @param {Date} date Date to move.
     * @param {number} weekday Weekday number, starting with zero (Sunday).
     * @returns {Date} Date moved to the specified weekday.
     */
    function dateAtNextWeekday(date, weekday) {
        const delta = weekday - date.getDay();
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta + (delta < 0 ? 7 : 0));
    }
    /* }}} */

    /**
     * Parse a numeric list (1,2,3-4,-1). {{{
     * Used in the weekday parser above.
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where to start.
     * @param {(from: number, to: number, at: number) => void} func Callback for each parsed number or range.
     * @returns {number} Position at which the token no longer belongs to the list.
     */
    function parseNumRange(tokens, at, func) {
        for (; at < tokens.length; at++) {
            if (matchTokens(tokens, at, 'number', '-', 'number')) {
                // Number range
                func(tokens[at][0], tokens[at+2][0], at);
                at += 3;
            } else if (matchTokens(tokens, at, '-', 'number')) {
                // Negative number
                func(-tokens[at+1][0], -tokens[at+1][0], at);
                at += 2;
            } else if (matchTokens(tokens, at, 'number')) {
                // Single number
                func(tokens[at][0], tokens[at][0], at);
                at++;
            } else {
                throw formatWarnErrorMessage(nrule, at + matchTokens(tokens, at, '-'),
                    'Unexpected token in number range: ' + tokens[at][1]);
            }

            if (!matchTokens(tokens, at, ','))
                break;
        }

        return at;
    }
    /* }}} */

    /**
     * Parse a constrained weekday in a month range. {{{
     * For example, `Su[-1]` selects the last Sunday of the month.
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where to start.
     * @returns {[number, number]} Constrained weekday number and the position
     *     after the closing `]` token.
     */
    function getConstrainedWeekday(tokens, at) {
        let number = 0;
        const endat = parseNumRange(tokens, at, function(from, to, at) {

            // bad number
            if (from === 0 || from < -5 || from > 5)
                throw formatWarnErrorMessage(nrule, at,
                    t('number -5 to 5'));

            if (from === to) {
                if (number !== 0)
                    throw formatWarnErrorMessage(nrule, at,
                        t('one weekday constraint'));
                number = from;
            } else {
                throw formatWarnErrorMessage(nrule, at+2,
                    t('range constrained weekdays'));
            }
        });
        for (let i = at; i < endat; i++) {
            tokens[i][4] = 'positive_number';
        }

        if (!matchTokens(tokens, endat, ']'))
            throw formatWarnErrorMessage(nrule, endat, t('expected', {symbol: ']'}));

        return [ number, endat + 1 ];
    }
    /* }}} */

    // Check if period is ok. Period 0 or 1 don’t make much sense.
    function checkPeriod(at, period, period_type, parm_string) {
        if (done_with_warnings)
            return;

        if (period === 0) {
            throw formatWarnErrorMessage(nrule, at,
                t('range zero', { 'type': period_type }));
        } else if (period === 1) {
            if (typeof parm_string === 'string' && parm_string === 'no_end_year')
                parsing_warnings.push([nrule, at, 'period_one_year_plus', t('period one year+', {'type': period_type})]);
            else
                parsing_warnings.push([nrule, at, 'period_one', t('period one', {'type': period_type})]);
        }
    }

    /**
     * Get the date for a constrained weekday, optionally moved by days. {{{
     * For example, this is used for `Aug Su[-1] -1 day`.
     * @param {number} year Year.
     * @param {number} month Month number, starting with zero.
     * @param {number} weekday Weekday number, starting with zero (Sunday).
     * @param {[number, number]} constrained_weekday Constraint number and token position.
     * @param {[number, number]} [add_days] Optional number of days to add and token count.
     * @returns {Date} Date for the constrained weekday.
     */
    function getDateForConstrainedWeekday(year, month, weekday, constrained_weekday, add_days) {
        const tmp_date = dateAtNextWeekday(
            new Date(year, month + (constrained_weekday[0] > 0 ? 0 : 1), 1), weekday);

        tmp_date.setDate(tmp_date.getDate() + (constrained_weekday[0] + (constrained_weekday[0] > 0 ? -1 : 0)) * 7);

        if (typeof add_days === 'object' && add_days[1])
            tmp_date.setDate(tmp_date.getDate() + add_days[0]);

        return tmp_date;
    }
    /* }}} */

    /**
     * Check whether a month and day form a valid date. {{{
     * @param {number} month Month number, starting with zero.
     * @param {number} day Day of the month.
     * @param {number} nrule Rule number, starting with zero.
     * @param {number} at Position at which the matching should begin.
     * @returns {void} Throws an exception when the date is invalid.
     */
    function checkIfDateIsValid(month, day, nrule, at) {
        // May use this instead. The problem is that this does not give feedback as precise as the code which is used in this function.
        // let testDate = new Date(year, month, day);
        // if (testDate.getDate() !== day || testDate.getMonth() !== month || testDate.getFullYear() !== year) {
        //     console.error('date not valid');
        // }

        // https://en.wikipedia.org/wiki/Month#Julian_and_Gregorian_calendars
        if (day < 1 || day > 31) {
            throw formatWarnErrorMessage(nrule, at, t('month 31', {'month': months[month]}));
        } else if ((month === 3 || month === 5 || month === 8 || month === 10) && day === 31) {
            throw formatWarnErrorMessage(nrule, at, t('month 30', {'month': months[month]}));
        } else if (month === 1 && day === 30) {
            throw formatWarnErrorMessage(nrule, at, t('month feb', {'month': months[month]}));
        }
    }
    /* }}} */
    /* }}} */

    /**
     * Warn about ambiguous single-digit hours in a time range.
     * The start hour is also ambiguous when the end hour has an implicit PM
     * meridian, as in `4-10 pm`.
     * @param {Array<ParserToken>} tokens List of parser tokens.
     * @param {number} start_at Token index of the start hour.
     * @param {number} end_at Token index of the end hour.
     * @param {number} nrule Rule number starting with 0.
     * @returns {void}
     */
    function warnAmbiguousSingleDigitHours(tokens, start_at, end_at, nrule) {
        /** @type {(token: ParserToken, hour: number) => boolean} */
        const is_ambiguous_hour = (token, hour) =>
            token.single_digit_lexeme === true && token.meridian === undefined && hour < 12;
        const start_hour = tokens[start_at][0];
        const end_hour = tokens[end_at][0];
        const end_hour_is_ambiguous = is_ambiguous_hour(tokens[end_at], end_hour);
        const start_hour_is_ambiguous = is_ambiguous_hour(tokens[start_at], start_hour);
        const end_has_implicit_pm = tokens[end_at].meridian === 'pm';
        const should_warn_start = start_hour_is_ambiguous &&
            (end_hour_is_ambiguous || end_has_implicit_pm);

        if (done_with_warnings || (!end_hour_is_ambiguous && !should_warn_start)) {
            return;
        }

        const ambiguous_hours = [];
        if (should_warn_start) {
            ambiguous_hours.push([start_at, start_hour]);
        }
        if (end_hour_is_ambiguous) {
            ambiguous_hours.push([end_at, end_hour]);
        }

        for (const [token_index, hour] of ambiguous_hours) {
            parsing_warnings.push([nrule, token_index, 'ambiguous_single_digit_hour', t('ambiguous single digit hour', {
                'hour':    hour,
                'hour_pm': hour + 12,
            })]);
        }
    }

    /**
     * Parse time ranges such as `10:00-12:00,14:00-16:00`. {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where to start.
     * @param {object} rule Rule object to which the parsed selector is added.
     * @param {boolean|number} [extended_open_end] Optional marker for a
     *     combined time range with an open end. The value `1` indicates that
     *     the range continues into the next day.
     * @param {number} nrule Rule number, starting with zero.
     * @returns {number|number[]} Position at which the token no longer belongs
     *     to the selector, or an additional-rule position.
     */
    function parseTimeRange(tokens, at, rule, extended_open_end, nrule) {
        if (!extended_open_end)
            tokens[at][3] = 'time';

        for (; at < tokens.length; at++) {
            const has_time_var_calc = [], has_normal_time = []; // element 0: start time, 1: end time
                has_normal_time[0]   = matchTokens(tokens, at, 'number', 'timesep', 'number');
                has_time_var_calc[0] = matchTokens(tokens, at, '(', 'timevar');
            let minutes_from,
                minutes_to,
                has_open_end = false; // default no open end
            if (has_normal_time[0] || matchTokens(tokens, at, 'timevar') || has_time_var_calc[0]) {
                // relying on the fact that always *one* of them is true

                let is_point_in_time = false; // default no time range
                const timevar_add    = [ 0, 0 ];
                let timevar_string   = [];    // capture timevar string like 'sunrise' to calculate it for the current date.
                let point_in_time_period;

                // minutes_from
                if (has_normal_time[0]) {
                    minutes_from = getMinutesByHoursMinutes(tokens, nrule, at+has_time_var_calc[0]);
                } else {
                    timevar_string[0] = tokens[at+has_time_var_calc[0]][0];
                    minutes_from = VARIABLE_TIME_DEFAULTS[timevar_string[0]];

                    if (has_time_var_calc[0]) {
                        timevar_add[0] = parseTimevarCalc(tokens, at);
                        minutes_from += timevar_add[0];
                    }
                }

                const at_end_time = at+(has_normal_time[0] ? 3 : (has_time_var_calc[0] ? 7 : 1))+1; // after '-'
                if (!matchTokens(tokens, at_end_time - 1, '-')) { // not time range
                    if (matchTokens(tokens, at_end_time - 1, '+')) {
                        has_open_end = true;
                    } else {
                        if (oh_mode === 0) {
                            throw formatWarnErrorMessage(nrule,
                                at+(
                                    has_normal_time[0] ? (
                                        typeof tokens[at+3] === 'object' ? 3 : 2
                                    ) : (
                                        has_time_var_calc[0] ? 2 : (
                                                typeof tokens[at+1] === 'object' ? 1 : 0
                                            )
                                    )
                                ),
                                t('point in time', {
                                    'calc': (has_time_var_calc[0] ? t('calculation') + ' ' : ''),
                                    'libraryname': library_name
                                }));
                        } else {
                            minutes_to = minutes_from + 1;
                            is_point_in_time = true;
                        }
                    }
                }

                // minutes_to
                if (has_open_end) {
                    if (extended_open_end === 1) {
                        minutes_from += minutes_in_day;
                    }
                    if (minutes_from >= 22 * 60) {

                        minutes_to = minutes_from +  8 * 60;
                    } else if (minutes_from >= 17 * 60) {
                        minutes_to = minutes_from + 10 * 60;
                    } else {
                        minutes_to = minutes_in_day;
                    }
                } else if (!is_point_in_time) {
                    has_normal_time[1] = matchTokens(tokens, at_end_time, 'number', 'timesep', 'number');
                    has_time_var_calc[1]      = matchTokens(tokens, at_end_time, '(', 'timevar');
                    if (!has_normal_time[1] && !matchTokens(tokens, at_end_time, 'timevar') && !has_time_var_calc[1]) {
                        throw formatWarnErrorMessage(nrule, at_end_time - (typeof tokens[at_end_time] === 'object' ? 0 : 1),
                                t('time range continue'));
                    } else {
                        if (has_normal_time[1]) {
                            minutes_to = getMinutesByHoursMinutes(tokens, nrule, at_end_time);
                            warnAmbiguousSingleDigitHours(tokens, at, at_end_time, nrule);
                        } else {
                            timevar_string[1] = tokens[at_end_time+has_time_var_calc[1]][0];
                            minutes_to = VARIABLE_TIME_DEFAULTS[timevar_string[1]];
                        }

                        if (has_time_var_calc[1]) {
                            timevar_add[1] = parseTimevarCalc(tokens, at_end_time);
                            minutes_to += timevar_add[1];
                        }
                    }
                }

                at = at_end_time + (is_point_in_time ? -1 :
                        (has_normal_time[1] ? 3 : (has_time_var_calc[1] ? 7 : !has_open_end))
                    );

                if (matchTokens(tokens, at, '/', 'number')) {
                    if (matchTokens(tokens, at + 2, 'timesep', 'number')) { // /hours:minutes
                        point_in_time_period = getMinutesByHoursMinutes(tokens, nrule, at + 1);
                        at += 4;
                    } else { // /minutes
                        point_in_time_period = tokens[at + 1][0];
                        at += 2;
                        if (matchTokens(tokens, at, 'timesep'))
                            throw formatWarnErrorMessage(nrule, at,
                                t('period continue'));
                    }

                    // Check at this later state in the if condition to get the correct position.
                    if (oh_mode === 0) {
                        throw formatWarnErrorMessage(nrule, at - 1,
                            t('time range mode', {'libraryname': library_name}));
                    }

                    is_point_in_time = true;
                } else if (matchTokens(tokens, at, '+')) {
                    parseTimeRange(tokens, at_end_time, rule, minutes_to < minutes_from ? 1 : true, nrule);
                    at++;
                } else if (oh_mode === 1 && !is_point_in_time) {
                    throw formatWarnErrorMessage(nrule, at_end_time,
                        t('point in time mode', {'libraryname': library_name}));
                }

                if (typeof lat === 'string') { // lon will also be defined (see above)
                    if (!has_normal_time[0] || !(has_normal_time[1] || has_open_end || is_point_in_time) ) {
                        week_stable = false;
                    }
                } else { // Without coordinates, keep the parser defaults above.
                    timevar_string = [];
                }

                // Normalize minutes into range.
                if (!extended_open_end && minutes_from >= minutes_in_day) {
                    throw formatWarnErrorMessage(nrule, at_end_time - 2,
                        t('outside current day'));
                }
                if (minutes_to < minutes_from || ((has_normal_time[0] && has_normal_time[1]) && minutes_from === minutes_to)) {
                    minutes_to += minutes_in_day;
                }
                if (minutes_to > minutes_in_day * 2) {
                    throw formatWarnErrorMessage(nrule, at_end_time + (has_normal_time[1] ? 4 : (has_time_var_calc[1] ? 7 : 1)) - 2,
                        t('two midnights'));
                }

                // This shortcut makes always-open range check faster.
                if (minutes_from === 0 && minutes_to === minutes_in_day) {
                    rule.time.push(function() { return [true]; });
                } else {
                    // A variable start time can order itself after a fixed or
                    // variable end time on the real location even when the
                    // constant fallback above did not wrap (#377), so also
                    // take this branch to re-check the order on every date.
                    if (minutes_to > minutes_in_day ||
                            (typeof lat === 'string' && !has_open_end && !is_point_in_time &&
                        timevar_string[0])) {
                        rule.time.push(function(initial_from, initial_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period, extended_open_end) { return function(date) {
                            const ourminutes = date.getHours() * 60 + date.getMinutes();

                            // Variable times can change their order from day to day.
                            const resolved_from = timevar_string[0]
                                ? getVariableTimeMinutes(date, lat, lon, timevar_string[0], timevar_add[0])
                                : initial_from;
                            let resolved_to = timevar_string[1]
                                ? getVariableTimeMinutes(date, lat, lon, timevar_string[1], timevar_add[1])
                                : initial_to;
                            if (timevar_string[1] && resolved_to <= resolved_from) {
                                resolved_to += minutes_in_day;
                            } else if (is_point_in_time && typeof point_in_time_period !== 'number') {
                                resolved_to = resolved_from + 1;
                            }

                            if (typeof point_in_time_period === 'number') {
                                if (ourminutes < resolved_from) {
                                    return [false, dateAtDayMinutes(date, resolved_from)];
                                } else if (ourminutes <= resolved_to) {
                                    for (let cur_min = resolved_from; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                        if (cur_min === ourminutes) {
                                            return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                        } else if (ourminutes < cur_min) {
                                            return [false, dateAtDayMinutes(date, cur_min)];
                                        }
                                    }
                                }
                                return [false, dateAtDayMinutes(date, minutes_in_day)];
                            } else {
                                if (resolved_to > minutes_in_day) {
                                    if (ourminutes < resolved_from)
                                        return [false, dateAtDayMinutes(date, resolved_from)];
                                    return [true, dateAtDayMinutes(date, resolved_to), has_open_end, extended_open_end];
                                }
                                if (ourminutes < resolved_from)
                                    return [false, dateAtDayMinutes(date, resolved_from)];
                                if (ourminutes < resolved_to)
                                    return [true, dateAtDayMinutes(date, resolved_to), has_open_end, extended_open_end];
                                if (timevar_string[0]) {
                                    const next_day = dateAtDayMinutes(date, minutes_in_day);
                                    return [false, dateAtDayMinutes(next_day, getVariableTimeMinutes(next_day, lat, lon, timevar_string[0], timevar_add[0]))];
                                }
                                return [false, dateAtDayMinutes(date, resolved_from + minutes_in_day)];
                            }
                        }}(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period, extended_open_end));

                        if (minutes_to - minutes_in_day > 0) {
                            if (typeof rule_infos[nrule] === 'undefined') {
                                rule_infos[nrule] = {};
                            }
                            rule_infos[nrule]['time_wraps_over_midnight'] = true;
                            rule.wraptime.push(function(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, point_in_time_period, extended_open_end) { return function(date) {
                                const ourminutes = date.getHours() * 60 + date.getMinutes();

                                if (timevar_string[0]) {
                                    minutes_from = getVariableTimeMinutes(date, lat, lon, timevar_string[0], timevar_add[0]);
                                }
                                if (timevar_string[1]) {
                                    minutes_to = getVariableTimeMinutes(date, lat, lon, timevar_string[1], timevar_add[1]);
                                }

                                if (timevar_string[0] || timevar_string[1]) {
                                    if (minutes_to > minutes_from) {
                                        return [false, undefined];
                                    }
                                }

                                if (typeof point_in_time_period === 'number') {
                                    if (ourminutes <= minutes_to) {
                                        for (let cur_min = 0; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                            if (cur_min === ourminutes) {
                                                return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                            } else if (ourminutes < cur_min) {
                                                return [false, dateAtDayMinutes(date, cur_min)];
                                            }
                                        }
                                    }
                                } else {
                                    if (ourminutes < minutes_to)
                                        return [true, dateAtDayMinutes(date, minutes_to), has_open_end, extended_open_end];
                                }
                                return [false, undefined];
                            }}(minutes_from, minutes_to > minutes_in_day ? minutes_to - minutes_in_day : minutes_to, timevar_string, timevar_add, has_open_end, point_in_time_period, extended_open_end));
                        }
                    } else {
                        rule.time.push(function(initial_from, initial_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period) { return function(date) {
                            const ourminutes = date.getHours() * 60 + date.getMinutes();

                            const resolved_from = timevar_string[0]
                                ? getVariableTimeMinutes(date, lat, lon, timevar_string[0], timevar_add[0])
                                : initial_from;
                            let resolved_to = timevar_string[1]
                                ? getVariableTimeMinutes(date, lat, lon, timevar_string[1], timevar_add[1])
                                : initial_to;
                            if (!timevar_string[1] && is_point_in_time && typeof point_in_time_period !== 'number') {
                                resolved_to = resolved_from + 1;
                            }

                            if (typeof point_in_time_period === 'number') {
                                if (ourminutes < resolved_from) {
                                    return [false, dateAtDayMinutes(date, resolved_from)];
                                } else if (ourminutes <= resolved_to) {
                                    for (let cur_min = resolved_from; ourminutes + point_in_time_period >= cur_min; cur_min += point_in_time_period) {
                                        if (cur_min === ourminutes) {
                                            return [true, dateAtDayMinutes(date, ourminutes + 1)];
                                        } else if (ourminutes < cur_min) {
                                            return [false, dateAtDayMinutes(date, cur_min)];
                                        }
                                    }
                                }
                                return [false, dateAtDayMinutes(date, minutes_in_day)];
                            } else {
                                if (ourminutes < resolved_from)
                                    return [false, dateAtDayMinutes(date, resolved_from)];
                                else if (ourminutes < resolved_to)
                                    return [true, dateAtDayMinutes(date, resolved_to), has_open_end];
                                else if (timevar_string[0]) {
                                    // The next opening is the variable time on
                                    // the following day, which drifts from day
                                    // to day, so recompute it instead of reusing
                                    // today's value shifted by 24h (#377).
                                    const next_day = dateAtDayMinutes(date, minutes_in_day);
                                    return [false, dateAtDayMinutes(next_day, getVariableTimeMinutes(next_day, lat, lon, timevar_string[0], timevar_add[0]))];
                                } else
                                    return [false, dateAtDayMinutes(date, resolved_from + minutes_in_day)];
                            }
                        }}(minutes_from, minutes_to, timevar_string, timevar_add, has_open_end, is_point_in_time, point_in_time_period));
                    }
                }

            } else if (matchTokens(tokens, at, 'number', '-', 'number')) { // "Mo 09-18" (Please don’t use this) -> "Mo 09:00-18:00".
                minutes_from = tokens[at][0]   * 60;
                minutes_to   = tokens[at+2][0] * 60;
                warnAmbiguousSingleDigitHours(tokens, at, at + 2, nrule);
                if (!done_with_warnings) {
                    parsing_warnings.push([nrule, at + 2, 'without_minutes', t('without minutes', {
                        'syntax': (tokens[at][0]   < 10 ? '0' : '') + tokens[at][0]   + ':00-'
                                + (tokens[at+2][0] < 10 ? '0' : '') + tokens[at+2][0] + ':00'
                    })]);
                }

                if (minutes_from >= minutes_in_day)
                    throw formatWarnErrorMessage(nrule, at, t('outside day'));
                if (minutes_to < minutes_from)
                    minutes_to += minutes_in_day;
                if (minutes_to > minutes_in_day * 2)
                    throw formatWarnErrorMessage(nrule, at + 2, t('two midnights'));

                if (minutes_to > minutes_in_day) {
                    rule.time.push(function(minutes_from, minutes_to) { return function(date) {
                        const ourminutes = date.getHours() * 60 + date.getMinutes();

                        if (ourminutes < minutes_from)
                            return [false, dateAtDayMinutes(date, minutes_from)];
                        else
                            return [true, dateAtDayMinutes(date, minutes_to)];
                    }}(minutes_from, minutes_to));

                    if (minutes_to - minutes_in_day > 0) {
                        if (typeof rule_infos[nrule] === 'undefined') {
                            rule_infos[nrule] = {};
                        }
                        rule_infos[nrule]['time_wraps_over_midnight'] = true;
                        rule.wraptime.push(function(minutes_to) { return function(date) {
                            const ourminutes = date.getHours() * 60 + date.getMinutes();

                            if (ourminutes < minutes_to) {
                                return [true, dateAtDayMinutes(date, minutes_to)];
                            } else {
                                return [false, undefined];
                            }
                        }}(minutes_to - minutes_in_day));
                    }
                } else {
                    rule.time.push(function(minutes_from, minutes_to) { return function(date) {
                        const ourminutes = date.getHours() * 60 + date.getMinutes();

                        if (ourminutes < minutes_from)
                            return [false, dateAtDayMinutes(date, minutes_from)];
                        else if (ourminutes < minutes_to)
                            return [true, dateAtDayMinutes(date, minutes_to), has_open_end];
                        else
                            return [false, dateAtDayMinutes(date, minutes_from + minutes_in_day)];
                    }}(minutes_from, minutes_to));
                }

                at += 3;
            } else { // additional rule
                if (matchTokens(tokens, at, '('))
                    throw formatWarnErrorMessage(nrule, at, 'Missing variable time (e.g. sunrise) after: "' + tokens[at][1] + '"');
                if (matchTokens(tokens, at, 'number', 'timesep'))
                    throw formatWarnErrorMessage(nrule, at+1, 'Missing minutes in time range after: "' + tokens[at+1][1] + '"');
                if (matchTokens(tokens, at, 'number'))
                    throw formatWarnErrorMessage(nrule, at + (typeof tokens[at+1] === 'object' ? 1 : 0),
                            'Missing time separator in time range after: "' + tokens[at][1] + '"');
                return [ at ];
            }

            if (!matchTokens(tokens, at, ',')) {
                break;
            }

            if (typeof tokens[at+1] === 'undefined' && !done_with_warnings) {
                parsing_warnings.push([nrule, at, 'value_ends_with_token', t('value ends with token', { 'token': tokens[at][1] }) ]);
            }
        }

        return at;
    }
    /* }}} */

    /* Helpers for time range parser {{{ */

    /**
     * Convert an hour and minute token pair to minutes. {{{
     * This function also validates the minute value before converting it.
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} nrule Rule number, starting with zero.
     * @param {number} at Position at which the time begins.
     * @returns {number} Time in minutes.
     */
    function getMinutesByHoursMinutes(tokens, nrule, at) {
        if (tokens[at+2][0] > 59)
            throw formatWarnErrorMessage(nrule, at+2,
                    'Minutes are greater than 59.');
        return tokens[at][0] * 60 + tokens[at+2][0];
    }
    /* }}} */

    /**
     * Parse a time offset such as `(sunrise-01:30)`. {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where the time specification could begin.
     * @returns {number|undefined} Added or subtracted time in minutes; throws
     *     an exception when the syntax is invalid.
     */
    function parseTimevarCalc(tokens, at) {
        let error;
        if (matchTokens(tokens, at+2, '+') || matchTokens(tokens, at+2, '-')) {
            if (matchTokens(tokens, at+3, 'number', 'timesep', 'number')) {
                if (matchTokens(tokens, at+6, ')')) {
                    const add_or_subtract = tokens[at+2][0] === '+' ? '1' : '-1';
                    const minutes = getMinutesByHoursMinutes(tokens, nrule, at+3) * add_or_subtract;
                    if (minutes === 0)
                        parsing_warnings.push([ nrule, at+5, 'zero_calculation', t('zero calculation') ]
                            );
                    return minutes;
                } else {
                    error = [ at+6, '. ' + t('missing', {'symbol': ')'}) + '.'];
                }
            } else if (matchTokens(tokens, at+3, 'number') && matchTokens(tokens, at+4, ')')) {
                // User likely meant hours without minutes, e.g. (sunset-1) instead of (sunset-01:00)
                const hours = ('0' + tokens[at+3][0]).slice(-2);
                const suggestion = '(' + tokens[at+1][0] + tokens[at+2][0] + hours + ':00)';
                throw formatWarnErrorMessage(nrule, at+3,
                    t('time offset hours only', { suggestion: suggestion }));
            } else {
                error = [ at+5, ' ' + t('(time)') + '.'];
            }
        } else {
            error = [ at+2, '. ' + t('expected', {'symbol': '+" or "-'})];
        }

        if (error)
            throw formatWarnErrorMessage(nrule, error[0],
                 t('calculation syntax')+ error[1]);
    }
    /* }}} */
    /* }}} */

    /**
     * Weekday range parser (Mo,We-Fr,Sa[1-2,-1],PH). {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where the weekday selector could begin.
     * @param {object} rule Rule object to which the parsed selector is added.
     * @param {boolean} [in_holiday_selector] Whether this call is already part
     *     of a holiday selector. Optional.
     * @param {number} nrule Rule number, starting with zero.
     * @returns {number} Position at which the token no longer belongs to the
     *     selector.
     */
    function parseWeekdayRange(tokens, at, rule, in_holiday_selector, nrule) {
        if (!in_holiday_selector) {
            in_holiday_selector = true;
            tokens[at][3] = 'weekday';
        }

        for (; at < tokens.length; at++) {
            if (matchTokens(tokens, at, 'weekday', '[')) {
                // Conditional weekday (Mo[3])
                const numbers = [];

                // Get list of constraints
                const endat = parseNumRange(tokens, at+2, function(from, to, at) {

                    // bad number
                    if (from === 0 || from < -5 || from > 5)
                        throw formatWarnErrorMessage(nrule, at,
                            t('number -5 to 5'));

                    if (from === to) {
                        numbers.push(from);
                    } else if (from < to) {
                        for (let i = from; i <= to; i++) {
                            // bad number
                            if (i === 0 || i < -5 || i > 5)
                                throw formatWarnErrorMessage(nrule, at+2,
                                    t('number -5 to 5'));

                            numbers.push(i);
                        }
                    } else {
                        throw formatWarnErrorMessage(nrule, at+2,
                            t('bad range',{'from': from, 'to': to}));
                    }
                });

                if (!matchTokens(tokens, endat, ']')) {
                    throw formatWarnErrorMessage(
                        nrule,
                        endat + (typeof tokens[endat] === 'object' ? 0 : -1),
                        t('] or more numbers')
                    );
                }

                const add_days = getMoveDays(tokens, endat+1, 6, 'max differ name constrained weekdays');
                week_stable = false;

                // Create selector for each list element.
                for (let nnumber = 0; nnumber < numbers.length; nnumber++) {

                    rule.weekday.push(function(weekday, number, add_days) { return function(date) {
                        const date_num = getValueForDate(date, false); // Year not needed to distinguish.
                        const start_of_this_month = new Date(date.getFullYear(), date.getMonth(), 1);
                        const start_of_next_month = new Date(date.getFullYear(), date.getMonth() + 1, 1);

                        const target_day_this_month = getDateForConstrainedWeekday(date.getFullYear(), date.getMonth(), weekday, [ number ]);

                        let target_day_with_added_days_this_month = new Date(target_day_this_month.getFullYear(),
                            target_day_this_month.getMonth(), target_day_this_month.getDate() + add_days);

                        // The target day with added days can be before this month
                        if (target_day_with_added_days_this_month.getTime() < start_of_this_month.getTime()) {
                            // but in this case, the target day without the days added needs to be in this month
                            if (target_day_this_month.getTime() >= start_of_this_month.getTime()) {
                                // so we calculate it for the month
                                // following this month and hope that the
                                // target day will actually be this month.

                                target_day_with_added_days_this_month = dateAtNextWeekday(
                                    new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) + 1, 1), weekday);
                                target_day_this_month.setDate(target_day_with_added_days_this_month.getDate()
                                    + (number + (number > 0 ? -1 : 0)) * 7 + add_days);
                            } else {
                                // Calculated target day is not inside this month
                                // therefore the specified weekday (e.g. fifth Sunday)
                                // does not exist this month. Try it next month.
                                return [false, start_of_next_month];
                            }
                        } else if (target_day_with_added_days_this_month.getTime() >= start_of_next_month.getTime()) {
                            // The target day is in the next month. If the target day without the added days is not in this month
                            if (target_day_this_month.getTime() >= start_of_next_month.getTime())
                                return [false, start_of_next_month];
                        } else if (target_day_this_month.getTime() >= start_of_next_month.getTime()) {
                            // The nth weekday overflows to next month (e.g. no 5th Sunday in February),
                            // but negative add_days pulled the result back into this month.
                            // The nth weekday still does not exist this month, so do not match.
                            return [false, start_of_next_month];
                        }

                        let target_day_with_added_moved_days_this_month;
                        if (add_days > 0) {
                            target_day_with_added_moved_days_this_month = dateAtNextWeekday(
                                new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) -1, 1), weekday);
                            target_day_with_added_moved_days_this_month.setDate(target_day_with_added_moved_days_this_month.getDate()
                                + (number + (number > 0 ? -1 : 0)) * 7 + add_days);

                            if (date_num === getValueForDate(target_day_with_added_moved_days_this_month, false))
                                return [true, dateAtDayMinutes(date, minutes_in_day)];
                        } else if (add_days < 0) {
                            target_day_with_added_moved_days_this_month = dateAtNextWeekday(
                                new Date(date.getFullYear(), date.getMonth() + (number > 0 ? 0 : 1) + 1, 1), weekday);
                            target_day_with_added_moved_days_this_month.setDate(target_day_with_added_moved_days_this_month.getDate()
                                + (number + (number > 0 ? -1 : 0)) * 7 + add_days);

                            if (target_day_with_added_moved_days_this_month.getTime() >= start_of_next_month.getTime()) {
                                if (target_day_with_added_days_this_month.getTime() >= start_of_next_month.getTime())
                                    return [false, target_day_with_added_moved_days_this_month];
                            } else {
                                if (target_day_with_added_days_this_month.getTime() < start_of_next_month.getTime()
                                    && getValueForDate(target_day_with_added_days_this_month, false) === date_num)
                                    return [true, dateAtDayMinutes(date, minutes_in_day)];

                                target_day_with_added_days_this_month = target_day_with_added_moved_days_this_month;
                            }
                        }

                        // we hit the target day
                        const currentDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                        const targetDateOnly = new Date(target_day_with_added_days_this_month.getFullYear(), target_day_with_added_days_this_month.getMonth(), target_day_with_added_days_this_month.getDate());

                        if (currentDateOnly.getTime() === targetDateOnly.getTime()) {
                            return [true, dateAtDayMinutes(date, minutes_in_day)];
                        }

                        // we're before target day
                        if (currentDateOnly.getTime() < targetDateOnly.getTime()) {
                            return [false, target_day_with_added_days_this_month];
                        }

                        // we're after target day, set check date to next month
                        return [false, start_of_next_month];
                    }}(tokens[at][0], numbers[nnumber], add_days[0]));
                }

                at = endat + 1 + add_days[1];
            } else if (matchTokens(tokens, at, 'weekday')) {
                // Single weekday (Mo) or weekday range (Mo-Fr)
                const is_range = matchTokens(tokens, at+1, '-', 'weekday');

                let weekday_from = tokens[at][0];
                let weekday_to = is_range ? tokens[at+2][0] : weekday_from;

                let inside = true;

                // handle reversed range
                if (weekday_to < weekday_from) {
                    const tmp = weekday_to;
                    weekday_to = weekday_from - 1;
                    weekday_from = tmp + 1;
                    inside = false;
                }
                const weekday_list = Array.apply(0, Array(weekday_to - weekday_from + 1)).map(function (_, index) {
                    return index + weekday_to;
                });
                if (typeof rule_infos[nrule] === 'undefined') {
                    rule_infos[nrule] = {};
                }
                if (typeof rule_infos[nrule]['week_days'] === 'object') {
                    Array.prototype.push.apply(rule_infos[nrule]['week_days'], weekday_list);
                } else {
                    rule_infos[nrule]['week_days'] = weekday_list;
                }

                if (weekday_to < weekday_from) { // handle full range
                    rule.weekday.push(function() { return [true]; });
                    // Not needed. If there is no selector it automatically matches everything.
                    // WRONG: This only works if there is no other selector in this selector group ...
                } else {
                    rule.weekday.push(function(weekday_from, weekday_to, inside) { return function(date) {
                        const ourweekday = date.getDay();

                        if (ourweekday < weekday_from || ourweekday > weekday_to) {
                            return [!inside, dateAtNextWeekday(date, weekday_from)];
                        } else {
                            return [inside, dateAtNextWeekday(date, weekday_to + 1)];
                        }
                    }}(weekday_from, weekday_to, inside));
                }

                at += is_range ? 3 : 1;
            } else if (matchTokens(tokens, at, 'holiday')) {
                week_stable = false;
                return parseHoliday(tokens, at, rule, true, in_holiday_selector);
            } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                throw formatWarnErrorMessage(
                    nrule,
                    at - 1,
                    t('additional rule no sense'));
            } else {
                throw formatWarnErrorMessage(nrule, at, t('unexpected token weekday range', {'token': tokens[at][1]}));
            }

            if (!matchTokens(tokens, at, ',')) {
                break;
            }
        }

        return at;
    }
    /* }}} */

    /**
     * Get the number of days by which a date should be moved, if any. {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where the date-moving tokens could begin.
     * @param {number} max_differ Maximum number of days to move.
     * @param {string} name_key Translation key for the maximum-difference warning.
     * @returns {[number, number]} Days to add and number of tokens consumed.
     */
    function getMoveDays(tokens, at, max_differ, name_key) {
        const add_days = [ 0, 0 ]; // [ 'days to add', 'how many tokens' ]
        add_days[0] = matchTokens(tokens, at, '+') || (matchTokens(tokens, at, '-') ? -1 : 0);
        if (add_days[0] !== 0 && matchTokens(tokens, at+1, 'number', 'calcday')) {
            // continues with '+ 5 days' or something like that
            if (tokens[at+1][0] > max_differ)
                throw formatWarnErrorMessage(nrule, at+2,
                    t('max differ', {'maxdiffer': max_differ, 'name': t(name_key)}));
            add_days[0] *= tokens[at+1][0];
            if (add_days[0] === 0 && !done_with_warnings)
                parsing_warnings.push([ nrule, at+2, 'adding_0', t('adding 0') ]);
            add_days[1] = 3;
        } else {
            add_days[0] = 0;
        }
        return add_days;
    }
    /* }}} */


    /**
     * Parse a single holiday token (PH or SH) and add its selector to the rule. {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position of the holiday token.
     * @param {Array<(date: Date) => Array<unknown>>} target_array Array to
     *     which the selector is added (`rule.weekday` or `rule.holiday`).
     * @returns {number} New token position after this holiday token.
     */
    function parseSingleHolidayToken(tokens, at, target_array) {
        const holiday_type = tokens[at][0];
        const applying_holidays = getMatchingHoliday(holiday_type);

        if (holiday_type === 'PH') {
            const add_days = getMoveDays(tokens, at + 1, 1, 'max differ name public holiday');
            const selector = createPublicHolidaySelector(applying_holidays, add_days);
            target_array.push(selector);
            return at + 1 + add_days[1];
        } else { // SH
            const selector = createSchoolHolidaySelector(applying_holidays);
            target_array.push(selector);
            return at + 1;
        }
    }
    /* }}} */


    /**
     * Holiday parser for public and school holidays (PH,SH). {{{
     *
     * Handles holiday tokens followed by optional weekday selectors:
     * - "PH" → public holiday
     * - "PH,SH" → public holiday or school holiday
     * - "PH Mo-Fr" → public holiday that falls on Monday-Friday
     * - "SH" → school holiday periods
     * @param {Array<ParserToken>} tokens List of token objects.
     * @param {number} at Position where to start.
     * @param {object} rule Reference to the rule object.
     * @param {boolean} push_to_weekday Whether to add the selector to the
     *     weekday array, so it can work together with weekday selectors.
     * @param {boolean} [in_holiday_selector] Whether this call is already part
     *     of a holiday selector. Optional.
     * @returns {number} Position at which the token no longer belongs to the
     *     selector.
     */
    function parseHoliday(tokens, at, rule, push_to_weekday, in_holiday_selector) {
        if (!in_holiday_selector) {
            tokens[at][3] = push_to_weekday ? 'weekday' : 'holiday';
        }

        const target_array = push_to_weekday ? rule.weekday : rule.holiday;

        while (at < tokens.length) {
            if (matchTokens(tokens, at, 'holiday')) {
                at = parseSingleHolidayToken(tokens, at, target_array);
            } else if (matchTokens(tokens, at, 'weekday')) {
                return parseWeekdayRange(tokens, at, rule, true, nrule);
            } else if (matchTokens(tokens, at - 1, ',')) {
                throw formatWarnErrorMessage(
                    nrule,
                    at - 1,
                    t('additional rule no sense'));
            } else {
                throw formatWarnErrorMessage(nrule, at, t('unexpected token holiday', {'token': tokens[at][1]}));
            }

            // Continue only if followed by comma separator
            if (!matchTokens(tokens, at, ','))
                break;

            at++; // Skip comma
        }

        return at;
    }
    /* }}} */

    // Helpers for holiday parsers {{{

    /**
     * Return a numeric date value for comparing dates without their time. {{{
     * This allows selectors called during the middle of a day to compare only
     * the date. For example, January 15, 2015 becomes `20150015` when the year
     * is included.
     * @param {Date} date Date to convert.
     * @param {boolean} [include_year] Optional flag to include the year.
     * @returns {number} Numeric value for the date.
     */
    function getValueForDate(date, include_year) {
        // Implicit because undefined evaluates to false.
        // include_year = typeof include_year !== 'undefined' ? include_year : false;

        return (include_year ? (date.getFullYear() * 10000) : 0) + (date.getMonth() * 100) + date.getDate();
    }
    /* }}} */

    /**
     * Return the school holiday definition for a specified year. {{{
     * @param {Record<string, number[]|string|undefined>} SH_hash Holiday
     *     definitions keyed by year, with `default` and `name` metadata.
     * @param {number} year Year to look up.
     * @param {boolean} [fatal] Optional flag to throw when no definition exists.
     * @returns {number[]|undefined} School holiday dates for the year, or
     *     `undefined` when no definition exists and `fatal` is false.
     */
    function getSHForYear(SH_hash, year, fatal) {
        if (typeof fatal !== 'boolean') {
            fatal = true;
        }

        let holiday = SH_hash[year];
        if (typeof holiday === 'undefined') {
            holiday = SH_hash['default']; // applies for any year without explicit definition
            if (typeof holiday === 'undefined') {
                if (fatal) {
                    throw formatLibraryBugMessage(t('no SH definition', {
                        'name': SH_hash.name + ' ',
                        'year': year,
                    }), 'library bug PR only');
                } else {
                    return undefined;
                }
            }
        }
        return holiday;
    }
    /* }}} */

    /**
     * Convert a month and day to a comparable number (`month * 100 + day`). {{{
     * For example, Jan 15 becomes 115 and Dec 25 becomes 1225.
     * @param {number} month Month number, starting with 1.
     * @param {number} day Day of the month, starting with 1.
     * @returns {number} Numeric value for comparing month/day pairs.
     */
    function getDateNumber(month, day) {
        return (month - 1) * 100 + day;
    }
    /* }}} */

    /**
     * Collect all school holiday ranges for a year from multiple definitions. {{{
     * @param {object[]} applying_holidays School holiday definitions to inspect.
     * @param {number} year Year for which to collect ranges.
     * @returns {Array<{from_month: number, from_day: number, to_month: number,
     *     to_day: number, name: string, holiday_obj: object}>} Holiday ranges
     *     with their start and end dates, name, and source definition.
     */
    function collectSHRangesForYear(applying_holidays, year) {
        const all_ranges = [];
        for (let i = 0; i < applying_holidays.length; i++) {
            const holiday = getSHForYear(applying_holidays[i], year, false);
            if (typeof holiday === 'undefined') {
                continue;
            }
            for (let h = 0; h < holiday.length; h += 4) {
                all_ranges.push({
                    from_month: holiday[0 + h],
                    from_day: holiday[1 + h],
                    to_month: holiday[2 + h],
                    to_day: holiday[3 + h],
                    name: applying_holidays[i].name,
                    holiday_obj: applying_holidays[i]
                });
            }
        }
        return all_ranges;
    }
    /* }}} */

    /**
     * Sort holiday ranges chronologically by their start date. {{{
     * @param {Array<{from_month: number, from_day: number, to_month: number,
     *     to_day: number, name: string, holiday_obj: object}>} ranges Holiday
     *     ranges to sort. The array is sorted in-place.
     * @returns {Array<{from_month: number, from_day: number, to_month: number,
     *     to_day: number, name: string, holiday_obj: object}>} The sorted
     *     ranges array.
     */
    function sortRangesByStartDate(ranges) {
        return ranges.sort((a, b) => {
            const a_from = getDateNumber(a.from_month, a.from_day);
            const b_from = getDateNumber(b.from_month, b.from_day);
            return a_from - b_from;
        });
    }
    /* }}} */

    /**
     * Create a selector function for checking school holiday dates. {{{
     * @param {object[]} applying_holidays School holiday definitions to inspect.
     * @returns {(date: Date) => Array<unknown>} Selector function returning
     *     whether the date is within a school holiday and the next relevant
     *     date, with the holiday name when applicable.
     */
    function createSchoolHolidaySelector(applying_holidays) {
        return function(date) {
            const date_num = getValueForDate(date);
            const year = date.getFullYear();

            // Collect all holiday ranges from all holiday types for this year,
            // sorted chronologically by start date.
            const all_ranges = collectSHRangesForYear(applying_holidays, year);
            sortRangesByStartDate(all_ranges);

            // Check for holidays from last year spanning into this year
            for (let i = 0; i < applying_holidays.length; i++) {
                const last_year_holiday = getSHForYear(applying_holidays[i], year - 1, false);
                if (typeof last_year_holiday === 'object') {
                    // Check the last range of this holiday type from last year
                    const last_idx = last_year_holiday.length - 4;
                    const last_year_holiday_from = getDateNumber(last_year_holiday[last_idx], last_year_holiday[last_idx + 1]);
                    const last_year_holiday_to = getDateNumber(last_year_holiday[last_idx + 2], last_year_holiday[last_idx + 3]);

                    // If holiday spans into next year and we're still in that period
                    if (last_year_holiday_from > last_year_holiday_to && date_num <= last_year_holiday_to) {
                        return [true, new Date(year,
                            last_year_holiday[last_idx + 2] - 1,
                            last_year_holiday[last_idx + 3] + 1),
                            applying_holidays[i].name];
                    }
                }
            }

            // Check each holiday range
            for (let r = 0; r < all_ranges.length; r++) {
                const range = all_ranges[r];
                const holiday_from = getDateNumber(range.from_month, range.from_day);
                const holiday_to = getDateNumber(range.to_month, range.to_day);
                const holiday_ends_next_year = holiday_to < holiday_from;

                if (date_num < holiday_from) {
                    // Date is before this holiday range - return false with next holiday start
                    return [false, new Date(year, range.from_month - 1, range.from_day)];
                } else if (holiday_from <= date_num && (date_num <= holiday_to || holiday_ends_next_year)) {
                    // Date is within this holiday range
                    return [true, new Date(year + holiday_ends_next_year, range.to_month - 1, range.to_day + 1),
                        range.name];
                }
                // Date is after this holiday range - check next range
            }

            // Date is after all holidays this year - check next year's first holiday
            const next_year_ranges = [];
            for (let i = 0; i < applying_holidays.length; i++) {
                const holiday = getSHForYear(applying_holidays[i], year + 1, false);
                if (typeof holiday === 'undefined') {
                    continue;
                }
                next_year_ranges.push({
                    from_month: holiday[0],
                    from_day: holiday[1],
                    name: applying_holidays[i].name
                });
            }
            if (next_year_ranges.length > 0) {
                sortRangesByStartDate(next_year_ranges);
                return [false, new Date(year + 1, next_year_ranges[0].from_month - 1, next_year_ranges[0].from_day)];
            }

            throw formatLibraryBugMessage(t('no SH definition', {
                'name': '',
                'year': year,
            }), 'library bug PR only');
        };
    }
    /* }}} */

    /**
     * Create a selector function for checking public holiday dates (PH). {{{
     * @param {object[]} applying_holidays Public holiday definitions to inspect.
     * @param {[number, number]} add_days Tuple containing the day offset and
     *     number of tokens consumed by `getMoveDays()`.
     * @returns {(date: Date) => Array<unknown>} Selector function returning
     *     whether the date matches a public holiday and the next relevant date,
     *     with the holiday name when applicable.
     */
    function createPublicHolidaySelector(applying_holidays, add_days) {
        return function(date) {
            const holidays = getApplyingHolidaysForYear(applying_holidays, date.getFullYear(), add_days);
            // Needs to be calculated each time because of movable days.

            const date_num = getValueForDate(date, true);

            for (let i = 0; i < holidays.length; i++) {
                const next_holiday_date_num = getValueForDate(holidays[i][0], true);

                if (date_num < next_holiday_date_num) {

                    if (add_days[0] > 0) {
                        // Calculate the last holiday from previous year to tested against it.
                        const holidays_last_year = getApplyingHolidaysForYear(applying_holidays, date.getFullYear() - 1, add_days);
                        const last_holiday_last_year = holidays_last_year[holidays_last_year.length - 1];
                        const last_holiday_last_year_num = getValueForDate(last_holiday_last_year[0], true);

                        if (date_num < last_holiday_last_year_num ) {
                            return [ false, last_holiday_last_year[0] ];
                        } else if (date_num === last_holiday_last_year_num) {
                            return [true, dateAtDayMinutes(last_holiday_last_year[0], minutes_in_day),
                                'Day after ' +last_holiday_last_year[1] ];
                        }
                    }

                    return [ false, holidays[i][0] ];
                } else if (date_num === next_holiday_date_num) {
                    return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
                        (add_days[0] > 0 ? 'Day after ' : (add_days[0] < 0 ? 'Day before ' : '')) + holidays[i][1] ];
                }
            }

            if (add_days[0] < 0) {
                // Calculate the first holiday from next year to tested against it.
                const holidays_next_year = getApplyingHolidaysForYear(applying_holidays, date.getFullYear() + 1, add_days);
                const first_holidays_next_year = holidays_next_year[0];
                const first_holidays_next_year_num = getValueForDate(first_holidays_next_year[0], true);
                if (date_num === first_holidays_next_year_num) {
                    return [true, dateAtDayMinutes(first_holidays_next_year[0], minutes_in_day),
                        'Day before ' + first_holidays_next_year[1] ];
                }
            }

            // continue next year
            return [ false, new Date(holidays[0][0].getFullYear() + 1,
                    holidays[0][0].getMonth(),
                    holidays[0][0].getDate()) ];
        };
    }
    /* }}} */

    function isPublicHoliday(date) {
        try {
            const applying_holidays = getMatchingHoliday('PH');
            return createPublicHolidaySelector(applying_holidays, [0, 0])(date)[0];
        } catch {
            return false;
        }
    }

    /**
     * Check whether a holiday definition contains named holiday items.
     * @param {unknown} value Value to check.
     * @returns {value is HolidayItem[]} Whether the value is a holiday list.
     */
    function isHolidayItemArray(value) {
        return Array.isArray(value)
            && value.every(item => typeof item === 'object'
                && item !== null
                && typeof item.name === 'string');
    }

    /**
     * Return the closest available holiday definition. {{{
     * First try to get the state; if missing, use the country-wide holidays,
     * which can themselves be limited to some states.
     * @param {'PH'|'SH'} type_of_holidays Holiday type to retrieve.
     * @returns {object[]} Public or school holiday definitions.
     */
    function getMatchingHoliday(type_of_holidays) {
        if (typeof location_cc !== 'string') {
            /* We have no idea which holidays do apply because the country code was not provided. */
            throw t('no country code');
        }

        if (!holidayDefinitions[location_cc]) {
            throw formatLibraryBugMessage(t('no holiday definition', {
                'name': type_of_holidays,
                'cc': location_cc,
            }), 'library bug PR only');
        }

        const countryDefinitions = holidayDefinitions[location_cc];
        const stateDefinition = typeof location_state === 'string'
            ? countryDefinitions[location_state]
            : undefined;
        const stateHolidays = typeof stateDefinition === 'object'
            && stateDefinition !== null
            && !Array.isArray(stateDefinition)
            ? stateDefinition[type_of_holidays]
            : undefined;
        const countryDefinition = countryDefinitions[type_of_holidays];
        const country_holidays = isHolidayItemArray(countryDefinition)
            ? countryDefinition
            : [];

        /** @type {HolidayItem[]} */
        let matching_holiday = [];
        if (isHolidayItemArray(stateHolidays)) {

            /* If holiday_definitions for the state are specified,
             * use it and ignore lesser specific ones (for the
             * country).
             */

            const state_holidays = stateHolidays;
            if (type_of_holidays === 'PH') {
                matching_holiday = state_holidays;
            } else if (!country_holidays.length) {
                matching_holiday = state_holidays;
            } else {
                // Merge country and state holidays chronologically
                const country_holiday_names = country_holidays.map(function(country_holiday) {
                    return country_holiday.name;
                });
                matching_holiday.push.apply(matching_holiday, country_holidays);
                matching_holiday.push.apply(matching_holiday, state_holidays.filter(function is_not_a_country_holiday(state_holiday) {
                    return country_holiday_names.indexOf(state_holiday.name) === -1;
                }));
                matching_holiday.sort(function(h1, h2) {
                    const h1_year = Object.keys(h1).find(function(k) {return k !== 'name';}) ?? '';
                    const h2_year = Object.keys(h2).find(function(k) {return k !== 'name';}) ?? '';
                    const h1_date = /** @type {[number, number]} */ (h1[h1_year]);
                    const h2_date = /** @type {[number, number]} */ (h2[h2_year]);
                    // compare both months, or to break a tie both days
                    return (h1_date[0] - h2_date[0]) || (h1_date[1] - h2_date[1]);
                });
            }
        } else if (country_holidays.length > 0) {
            /* Holidays are defined country wide. Some
             * countries only have country-wide holiday definitions
             * so that is ok too.
             */
            const applying_holidays_for_country = country_holidays;

            switch (type_of_holidays) {
                case 'PH':
                    applying_holidays_for_country.forEach(function (holiday_item) {
                        /* Holidays in the country-wide scope can be limited to certain states. */
                        if (Array.isArray(holiday_item.only_states)
                                && (typeof location_state !== 'string'
                                    || !holiday_item.only_states.includes(location_state))) {
                            return;
                        }

                        matching_holiday.push(holiday_item);
                    });
                    break;
                case 'SH':
                    matching_holiday = applying_holidays_for_country;
                    break;
            }
        } else {
            throw formatLibraryBugMessage(t('no holiday definition state', {
                'name': type_of_holidays,
                'cc': location_cc,
                'state': location_state,
            }), 'library bug PR only');
        }

        if (matching_holiday.length === 0) {
            throw formatLibraryBugMessage(t('no holiday definition', {
                'name': type_of_holidays,
                'cc': location_cc,
            }), 'library bug PR only');
        }

        return matching_holiday;
    }
    /* }}} */

    /**
     * Return variable dates used for holiday calculation. {{{
     * @param {number} year Year for which to calculate the variable dates.
     * @returns {Record<string, Date>} Variable dates keyed by event name.
     */
    function getMovableEventsForYear(year) {
        /* Calculate easter {{{ */
        const C = Math.floor(year/100);
        const N = year - 19*Math.floor(year/19);
        const K = Math.floor((C - 17)/25);
        let I = C - Math.floor(C/4) - Math.floor((C - K)/3) + 19*N + 15;
        I = I - 30*Math.floor((I/30));
        I = I - Math.floor(I/28)*(1 - Math.floor(I/28)*Math.floor(29/(I + 1))*Math.floor((21 - N)/11));
        let J = year + Math.floor(year/4) + I + 2 - C + Math.floor(C/4);
        J = J - 7*Math.floor(J/7);
        const L = I - J;
        const M = 3 + Math.floor((L + 40)/44);
        const D = L + 28 - 31*Math.floor(M/4);
        /* }}} */

        /* Calculate orthodox easter {{{ */
        const oA = year % 4;
        const oB = year % 7;
        const oC = year % 19;
        const oD = (19*oC + 15) % 30;
        const oE = (2*oA+4*oB - oD + 34) % 7;
        const oF = oD+oE;

        let oDate;
        if (oF < 9) {
            oDate = new Date(year, 4-1, oF+4);
        } else {
            if ((oF+4)<31) {
                oDate = new Date(year, 4-1, oF+4);
            } else {
                oDate = new Date(year, 5-1, oF-26);
            }
        }
        /* }}} */

        /* Calculate last Sunday in February {{{ */
        const lastFebruaryDay = new Date(year, 2, 0);
        const lastFebruarySunday = lastFebruaryDay.getDate() - lastFebruaryDay.getDay();
        /* }}} */

        /* Calculate Victoria Day. last Monday before or on May 24 {{{ */
        const may_24 = new Date(year, 4, 24);
        const victoriaDay = 24  - ((6 + may_24.getDay()) % 7);
        /* }}} */

        /** Calculate Canada Day. July 1st unless 1st is on Sunday, then July 2. {{{ */
        const july_1 = new Date(year, 6, 1);
        const canadaDay = july_1.getDay() === 0 ? 2 : 1;
        /* }}} */

        /**
         * Calculation of the spring and autumnal equinoxes (for Public holidays in Japan). {{{
         * @param {number} year - Calendar year.
         * @returns {Date|undefined} Equinox date.
         */
        function springEquinoxCalc(year){
            if(year >= 1900 && year <= 1923){
                if(year % 4 === 3) return new Date(year, 2, 22)
                else return new Date(year, 2, 21)
            } else if(year >= 1924 && year <= 1959){
                return new Date(year, 2, 21)
            } else if(year >= 1960 && year <= 1991){
                if(year % 4 === 0) return new Date(year, 2, 20)
                else return new Date(year, 2, 21)
            } else if(year >= 1992 && year <= 2023){
                if(year % 4 === 0 || year % 4 === 1) return new Date(year, 2, 20)
                else return new Date(year, 2, 21)
            } else if(year >= 2024 && year <= 2055){
                if(year % 4 === 3) return new Date(year, 2, 21)
                else return new Date(year, 2, 20)
            } else if(year >= 2056 && year <= 2091){
                return new Date(year, 2, 20)
            } else if(year >= 2092 && year <= 2099){
                if(year % 4 === 0) return new Date(year, 2, 19)
                else return new Date(year, 2, 20)
            }
        }

        function autumnalEquinoxCalc(year){
            if(year >= 1900 && year <= 1919){
                if(year % 4 === 0) return new Date(year, 8, 23)
                else return new Date(year, 8, 24)
            } else if(year >= 1920 && year <= 1947){
                if(year % 4 === 0 || year % 4 === 1) return new Date(year, 8, 23)
                else return new Date(year, 8, 24)
            } else if(year >= 1948 && year <= 1979){
                if(year % 4 === 3) return new Date(year, 8, 24)
                else return new Date(year, 8, 23)
            } else if(year >= 1980 && year <= 2011){
                return new Date(year, 8, 23)
            } else if(year >= 2012 && year <= 2043){
                if(year % 4 === 0) return new Date(year, 8, 22)
                else return new Date(year, 8, 23)
            }  else if(year >= 2044 && year <= 2075){
                if(year % 4 === 0 || year % 4 === 1) return new Date(year, 8, 22)
                else return new Date(year, 8, 23)
            } else if(year >= 2076 && year <= 2099){
                if(year % 4 === 3) return new Date(year, 8, 23)
                else return new Date(year, 8, 22)
            }
        }

        // Helper functions {{{

        /**
         * Get the first occurrence of a weekday in a month.
         * @param {number} month - Month number.
         * @param {number} weekday - Weekday number.
         * @returns {number} Day of the month.
         */
        function firstWeekdayOfMonth(month, weekday){
            const first = new Date(year, month, 1);
            return 1 + ((7 + weekday - first.getDay()) % 7);
        }

        /**
         * Get the last occurrence of a weekday in a month.
         * @param {number} month - Month number.
         * @param {number} weekday - Weekday number.
         * @returns {number} Day of the month.
         */
        function lastWeekdayOfMonth(month, weekday){
            const last = new Date(year, month+1, 0);
            const offset = ((7 + last.getDay() - weekday) % 7);
            return last.getDate() - offset;
        }

        /**
         * Get the last occurrence of a weekday before a date.
         * @param {number} month - Month number.
         * @param {number} day - Day of the month.
         * @param {number} weekday - Weekday number.
         * @returns {Date} Date of the preceding weekday.
         */
        function weekdayBefore(month, day, weekday){
            const date = new Date(year, month, day);
            let days = (date.getDay() - weekday + 7) % 7;
            if (days === 0) days = 7;
            date.setDate(date.getDate() - days);
            return date;
        }

        /**
         * Get the first occurrence of a weekday on or after a date.
         * @param {number} weekday - Weekday number.
         * @param {Date} start_date - Date from which to search.
         * @returns {Date} Date of the next matching weekday.
         */
        function getDateOfWeekdayInDateRange(weekday, start_date){
            let days_to_dest_date = weekday - start_date.getDay();
            if (days_to_dest_date < 0) {
                days_to_dest_date += 7;
            }
            start_date.setDate(start_date.getDate() + days_to_dest_date);
            return start_date;
        }

        /**
         * Return the next date within a weekday range. {{{
         * @param {number} first_weekday First weekday in the range (1 is Monday).
         * @param {number} last_weekday Last weekday in the range (1 is Monday).
         * @param {Date} start_date Earliest date to consider.
         * @returns {Date} `start_date` if it is in the range; otherwise, the
         *     next date that is in the range.
         */
        function getDateOfNextWeekdayRange(first_weekday, last_weekday, start_date){
            if (first_weekday >= last_weekday) {
                throw formatLibraryBugMessage('Not implemented yet.');
            }

            if (first_weekday <= start_date.getDay() && start_date.getDay() <= last_weekday) {
                return start_date;
            } else {
                let days_to_dest_date = first_weekday - start_date.getDay();
                if (days_to_dest_date < 0) {
                    days_to_dest_date += 7;
                }
                start_date.setDate(start_date.getDate() + days_to_dest_date);
                return start_date;
            }

        }
        /* }}} */

        return {
            'easter'                : new Date(year, M - 1, D),
            'orthodox easter'       : oDate,
            'victoriaDay'           : new Date(year,  4, victoriaDay),
            'canadaDay'             : new Date(year,  6, canadaDay),
            'firstJanuaryMonday'    : new Date(year,  0, firstWeekdayOfMonth(0, 1)),
            'firstFebruaryMonday'   : new Date(year,  1, firstWeekdayOfMonth(1, 1)),
            'lastFebruarySunday'    : new Date(year,  1, lastFebruarySunday),
            'firstMarchMonday'      : new Date(year,  2, firstWeekdayOfMonth(2, 1)),
            'firstAprilMonday'      : new Date(year,  3, firstWeekdayOfMonth(3, 1)),
            'firstMayMonday'        : new Date(year,  4, firstWeekdayOfMonth(4, 1)),
            'firstJuneMonday'       : new Date(year,  5, firstWeekdayOfMonth(5, 1)),
            'firstJuneFriday'       : new Date(year,  5, firstWeekdayOfMonth(5, 5)),
            'firstJulyMonday'       : new Date(year,  6, firstWeekdayOfMonth(6, 1)),
            'firstAugustMonday'     : new Date(year,  7, firstWeekdayOfMonth(7, 1)),
            'firstSeptemberMonday'  : new Date(year,  8, firstWeekdayOfMonth(8, 1)),
            'firstSeptemberTuesday' : new Date(year,  8, firstWeekdayOfMonth(8, 2)),
            'firstSeptemberSunday'  : new Date(year,  8, firstWeekdayOfMonth(8, 0)),
            'firstOctoberMonday'    : new Date(year,  9, firstWeekdayOfMonth(9, 1)),
            'firstNovemberMonday'   : new Date(year, 10, firstWeekdayOfMonth(10, 1)),
            'firstNovemberTuesday'  : new Date(year, 10, firstWeekdayOfMonth(10, 2)),
            'firstMarchTuesday'     : new Date(year,  2, firstWeekdayOfMonth(2, 2)),
            'firstAugustTuesday'    : new Date(year,  7, firstWeekdayOfMonth(7, 2)),
            'firstAugustFriday'     : new Date(year,  7, firstWeekdayOfMonth(7, 5)),
            'firstNovemberThursday' : new Date(year, 10, firstWeekdayOfMonth(10, 4)),
            'firstOctoberSunday'    : new Date(year,  9, firstWeekdayOfMonth(9, 0)),
            'lastNovemberWednesday' : new Date(year, 10, lastWeekdayOfMonth(10, 3)),
            'lastMayMonday'         : new Date(year,  4, lastWeekdayOfMonth(4, 1)),
            'lastMarchMonday'       : new Date(year,  2, lastWeekdayOfMonth(2, 1)),
            'lastAprilMonday'       : new Date(year,  3, lastWeekdayOfMonth(3, 1)),
            'lastAprilFriday'       : new Date(year,  3, lastWeekdayOfMonth(3, 5)),
            'lastAugustMonday'      : new Date(year,  7, lastWeekdayOfMonth(7, 1)),
            'lastSeptemberMonday'   : new Date(year,  8, lastWeekdayOfMonth(8, 1)),
            'lastSeptemberFriday'   : new Date(year,  8, lastWeekdayOfMonth(8, 5)),
            'lastOctoberMonday'     : new Date(year,  9, lastWeekdayOfMonth(9, 1)),
            'lastOctoberFriday'     : new Date(year,  9, lastWeekdayOfMonth(9, 5)),
            'lastOctoberSunday'     : new Date(year,  9, lastWeekdayOfMonth(9, 0)),
            'nextSaturday20Jun'     : getDateOfWeekdayInDateRange(6, new Date(year, 5, 20)),
            'nextSaturday31Oct'     : getDateOfWeekdayInDateRange(6, new Date(year, 9, 31)),
            'nextWednesday16Nov'    : getDateOfWeekdayInDateRange(3, new Date(year, 10, 16)),
            'nextMo-Fr17March'      : getDateOfNextWeekdayRange(1, 5, new Date(year, 2, 17)),
            'nextMo-Sa01May'        : getDateOfNextWeekdayRange(1, 6, new Date(year, 4, 1)),
            'nextMo-Fr12July'       : getDateOfNextWeekdayRange(1, 5, new Date(year, 6, 12)),
            'nextMo-Sa07August'     : getDateOfNextWeekdayRange(1, 6, new Date(year, 7, 7)),
            'nextMo-Fr30November'   : getDateOfNextWeekdayRange(1, 5, new Date(year, 10, 30)),
            'nextMo-Sa25December'   : getDateOfNextWeekdayRange(1, 6, new Date(year, 11, 25)),
            'springEquinox'         : springEquinoxCalc(year),
            'autumnalEquinox'       : autumnalEquinoxCalc(year),
            'mondayBefore20Jun'     : weekdayBefore(5, 20, 1),
        };
    }
    /* }}} */

    // Shift rule support for transferable holidays. {{{

    /** @type {Record<string, number>} */
    const weekday_name_to_num = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
    };

    const shift_rule_cache = Object.create(null);

    /**
     * Compile a shift_rule string into a (Date) => Date shifter.
     *
     * A `shift_rule` field on a holiday definition moves the holiday’s date
     * depending on the weekday it falls on. The syntax is a subset of the
     * date-holidays DSL: chained `if … then …` clauses, first match wins,
     * unmatched dates stay unchanged.
     *
     * Format:
     *   “if <wd>[,<wd>...] then <next|previous> <wd> [if … then … <wd>]*”
     *
     * Collision behaviour: if the shifted date would land on another
     * non-shifted holiday in the same year, the holiday keeps its original
     * date instead.
     * @param {string} rule - Shift rule expression.
     * @returns {(date: Date) => Date} Date shifter.
     */
    function compileShiftRule(rule) {
        if (shift_rule_cache[rule]) {
            return shift_rule_cache[rule];
        }
        const clauses = parseShiftRule(rule);
        const shifter = function (date) {
            return applyShiftClauses(clauses, date);
        };
        shift_rule_cache[rule] = shifter;
        return shifter;
    }

    /** @typedef {{from_wds: number[], direction: 'next'|'previous', target_wd: number}} ShiftClause */

    /**
     * Parse a shift_rule string into a list of clause objects.
     *
     * Each clause has the shape:
     *   { from_wds: [<int>, ...], direction: "next"|"previous", target_wd: <int> }
     * where weekdays are 0–6 (Sunday–Saturday).
     * @param {string} rule - Shift rule expression.
     * @returns {Array<ShiftClause>} Parsed clauses.
     */
    function parseShiftRule(rule) {
        /**
         * @param {string} detail Reason the shift_rule could not be parsed.
         * @returns {never} Always throws.
         */
        function fail(detail) {
            throw formatLibraryBugMessage(
                'shift_rule: ' + detail + ' in "' + rule + '"'
            );
        }
        /**
         * @param {string} name Raw weekday lexeme from the shift_rule regex.
         * @returns {number} Weekday number (0 is Sunday).
         */
        function toWeekdayNum(name) {
            const n = name.trim();
            if (!(n in weekday_name_to_num)) {
                fail('unknown weekday "' + n + '"');
            }
            return weekday_name_to_num[n];
        }
        /**
         * @param {string} value Raw direction lexeme from the shift_rule regex.
         * @returns {'next'|'previous'} Validated direction literal.
         */
        function toDirection(value) {
            if (value !== 'next' && value !== 'previous') {
                fail('unknown direction "' + value + '"');
            }
            return value;
        }

        const clause_regex = /if\s+([a-z,\s]+?)\s+then\s+(next|previous)\s+([a-z]+)/g;
        const clauses = [];
        let last_end = 0;
        let match;
        while ((match = clause_regex.exec(rule)) !== null) {
            // Any text before the first match or between matches must be blank.
            if (rule.slice(last_end, match.index).trim() !== '') {
                fail('cannot parse');
            }
            clauses.push({
                from_wds:  match[1].split(',').map(toWeekdayNum),
                direction: toDirection(match[2]),
                target_wd: toWeekdayNum(match[3]),
            });
            last_end = clause_regex.lastIndex;
        }
        if (clauses.length === 0 || rule.slice(last_end).trim() !== '') {
            fail('cannot parse');
        }
        return clauses;
    }

    /**
     * Apply the first matching clause to `date` and return the shifted date.
     * Returns the original date if no clause matches.
     * @param {Array<ShiftClause>} clauses - Parsed shift clauses.
     * @param {Date} date - Date to shift.
     * @returns {Date} Shifted date.
     */
    function applyShiftClauses(clauses, date) {
        const wd = date.getDay();
        for (let i = 0; i < clauses.length; i++) {
            const c = clauses[i];
            if (c.from_wds.indexOf(wd) === -1) continue;

            // Distance to the target weekday, always in the range [1, 7].
            // The modulo alone could yield 0 when wd === target_wd, but the
            // from_wds guard above prevents that for well-formed rules.
            // The "|| 7" is a safety net: if it ever did produce 0 we would
            // shift by a full week rather than silently not moving the date.
            let diff;
            if (c.direction === 'next') {
                diff = ((c.target_wd - wd + 7) % 7) || 7;   // move forward
            } else {
                diff = -(((wd - c.target_wd + 7) % 7) || 7); // move backward
            }
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
        }
        return date;
    }

    /**
     * Resolve holiday definitions to dated holiday entries for one year.
     * Applies year restrictions, movable dates, shifts, substitutes, and the
     * requested day offset before sorting the resulting entries.
     * @param {HolidayItem[]} applying_holidays Holiday definitions to resolve.
     * @param {number} year Calendar year for which to resolve holidays.
     * @param {[number, number]} add_days Day offset and parser-token count.
     * @returns {Array<[Date, string]>} Sorted holiday dates and names.
     */
    function getApplyingHolidaysForYear(applying_holidays, year, add_days) {
        const movableDays = getMovableEventsForYear(year);

        /* Pass 1: resolve the base date of every holiday (no shift, no add_days). */
        const resolved = applying_holidays
            .filter(function (holiday_item) {
                // A holiday may apply to one specific year.
                if ('year' in holiday_item && holiday_item.year !== year) {
                    return false;
                }
                // Some holidays only apply in even or odd years.
                if (holiday_item.years === 'even' && year % 2 !== 0) {
                    return false;
                }
                if (holiday_item.years === 'odd' && year % 2 !== 1) {
                    return false;
                }
                // No year restriction, or all restrictions matched.
                return true;
            })
            .map(function (holiday_item) {
                let base_date;
                if (Array.isArray(holiday_item.fixed_date)) {
                    base_date = new Date(year,
                            holiday_item.fixed_date[0] - 1,
                            holiday_item.fixed_date[1]
                        );
                } else if (typeof holiday_item.variable_date === 'string') {
                    const selected_movableDay = movableDays[holiday_item.variable_date];
                    if (!selected_movableDay) {
                        throw t('movable no formula', {'name': holiday_item.name});
                    }
                    const date_offset = typeof holiday_item.offset === 'number'
                        ? holiday_item.offset
                        : 0;
                    base_date = new Date(selected_movableDay.getFullYear(),
                        selected_movableDay.getMonth(),
                        selected_movableDay.getDate() + date_offset
                    );
                    if (year !== base_date.getFullYear()) {
                        throw t('movable not in year', {
                            'name': holiday_item.variable_date, 'days': date_offset});
                    }
                } else {
                    throw formatLibraryBugMessage('Unexpected object: ' + JSON.stringify(holiday_item, null, '    '));
                }
                return { date: base_date, holiday: holiday_item };
            });

        /* Pass 2: apply shift_rule with collision detection.
         * Collisions are checked against the nominal (non-shifted, no-add_days)
         * dates of all non-shifted holidays — never against other shifted ones,
         * to keep the result deterministic regardless of declaration order.
         */
        const fixed_times = new Set();
        resolved.forEach(function (r) {
            if (!r.holiday.shift_rule) {
                fixed_times.add(r.date.getTime());
            }
        });
        resolved.forEach(function (r) {
            if (!r.holiday.shift_rule) return;
            const shifter = compileShiftRule(r.holiday.shift_rule);
            const shifted = shifter(r.date);
            if (shifted.getTime() === r.date.getTime()) return;
            // Keep original date on collision with a non-shifted holiday.
            if (fixed_times.has(shifted.getTime())) return;
            r.date = shifted;
        });

        /* Pass 2b: apply substitute_rule — additive substitutes.
         * The original date stays a holiday; an extra entry is appended when
         * the original falls on one of the trigger weekdays.
         * Unlike shift_rule there is no collision detection, so this relies on
         * the holiday data being arranged such that a substitute never lands on
         * another holiday (e.g. ZA omits the rule on Christmas Day because
         * Day of Goodwill already covers the following Monday).
         * Example: New Year's Day on Sunday → Jan 1 stays + extra day on Monday.
         */
        const substitutes = [];
        resolved.forEach(function (holiday_entry) {
            const original = holiday_entry.holiday;
            if (!original.substitute_rule) return;

            const shifter = compileShiftRule(original.substitute_rule);
            const substitute_date = shifter(holiday_entry.date);

            // The rule didn't match this weekday, so no substitute is needed.
            if (substitute_date.getTime() === holiday_entry.date.getTime()) return;

            // Clone the definition so renaming the substitute doesn't mutate the
            // shared holiday object. A substitute is itself a plain holiday, so
            // drop the rule fields that only make sense on the original.
            const substitute = { ...original };
            if (original.substitute_name) {
                substitute.name = original.substitute_name;
            }
            delete substitute.substitute_rule;
            delete substitute.substitute_name;

            substitutes.push({ date: substitute_date, holiday: substitute });
        });

        // Merge the substitute days into the resolved holidays list.
        resolved.push(...substitutes);

        /* Pass 3: apply add_days uniformly and sort. */
        let sorted_holidays = resolved.map(function (r) {
            let d = r.date;
            if (add_days[0]) {
                d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + add_days[0]);
            }
            return [ d, r.holiday.name ];
        });

        sorted_holidays = sorted_holidays.sort(function(a,b){
            if (a[0].getTime() < b[0].getTime()) return -1;
            if (a[0].getTime() > b[0].getTime()) return 1;
            return 0;
        });

        return sorted_holidays;
    }
    /* }}} */
    /* }}} */

    /**
     * Parse a year range (2013,2016-2018,2020/2). {{{
     * @param {Array<ParserToken>} tokens List of token objects.
     * @param {number} at Position where to start.
     * @returns {number} Position at which the token no longer belongs to the
     *     selector.
     */
    function parseYearRange(tokens, at) {
        tokens[at][3] = 'year';
        for (; at < tokens.length; at++) {
            if (matchTokens(tokens, at, 'year')) {
                let is_range,
                    has_period,
                    period;
                if (matchTokens(tokens, at+1, '-', 'year', '/', 'number')) {
                    is_range   = true;
                    has_period = true;
                    period = parseInt(tokens[at+4][0]);
                    checkPeriod(at+4, period, 'year');
                } else {
                    is_range   = matchTokens(tokens, at+1, '-', 'year');
                    has_period = matchTokens(tokens, at+1, '/', 'number');
                    if (has_period) {
                        period = parseInt(tokens[at+2][0]);
                        checkPeriod(at+2, period, 'year', 'no_end_year');
                    } else if (matchTokens(tokens, at+1, '+')) {
                        period = 1;
                        has_period = 2;
                    }
                }

                const year_from = parseInt(tokens[at][0]);
                // error checking {{{
                    if (is_range && tokens[at+2][0] <= year_from) {
                        // handle reversed range
                        if (tokens[at+2][0] === year_from) {
                            throw formatWarnErrorMessage(nrule, at, t('year range one year', {'year': year_from }));
                        } else {
                            throw formatWarnErrorMessage(nrule, at, t('year range reverse'));
                        }
                    }
                    if (!is_range && year_from < new Date().getFullYear()) {
                        parsing_warnings.push([ nrule, at, 'year_past', t('year past') ]);
                    }
                    if (is_range && tokens[at+2][0] < new Date().getFullYear()) {
                        parsing_warnings.push([ nrule, at+2, 'year_past', t('year past') ]);
                    }
                /* }}} */

                rule.year.push(function(tokens, at, year_from, is_range, has_period, period) { return function(date) {
                    const ouryear = date.getFullYear();
                    const year_to = is_range ? parseInt(tokens[at+2][0]) : year_from;

                    if (ouryear < year_from ){
                        return [false, new Date(year_from, 0, 1)];
                    } else if (has_period) {
                        if (year_from <= ouryear) {
                            if (is_range && ouryear > year_to)
                                return [false];
                            if (period > 0) {
                                if ((ouryear - year_from) % period === 0) {
                                    return [true, new Date(ouryear + 1, 0, 1)];
                                } else {
                                    return [false, new Date(ouryear + period - 1, 0, 1)];
                                }
                            }
                        }
                    } else if (is_range) {
                        if (ouryear <= year_to)
                            return [true, new Date(year_to + 1, 0, 1)];
                    } else if (ouryear === year_from) {
                        return [true];
                    }

                    return [false];

                }}(tokens, at, year_from, is_range, has_period, period));

                at += 1 + (is_range ? 2 : 0) + (has_period ? (has_period === 2 ? 1 : 2) : 0);
            } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                throw formatWarnErrorMessage(nrule, at - 1, t('additional rule no sense'));
            } else {
                throw formatWarnErrorMessage(nrule, at, t('unexpected token year range', {'token': tokens[at][1]}));
            }

            if (!matchTokens(tokens, at, ','))
                break;
        }

        return at;
    }
    /* }}} */

    /**
     * Parse a week range (week 11-20, week 1-53/2). {{{
     * @param {Array<ParserToken>} tokens List of token objects.
     * @param {number} at Position where to start.
     * @returns {number} Position at which the token no longer belongs to the
     *     selector.
     */
    function parseWeekRange(tokens, at) {
        for (; at < tokens.length; at++) {
            if (matchTokens(tokens, at, 'week')) {
                at++;
            }
            if (matchTokens(tokens, at, 'number')) {
                const is_range = matchTokens(tokens, at+1, '-', 'number');
                let period = 0;
                const week_from = tokens[at][0];
                const week_to   = is_range ? tokens[at+2][0] : week_from;
                if (week_from > week_to) {
                    throw formatWarnErrorMessage(nrule, at+2, t('week range reverse'));
                }
                if (week_from < 1) {
                    throw formatWarnErrorMessage(nrule, at, t('week negative'));
                }
                if (week_to > 53) {
                    throw formatWarnErrorMessage(nrule, is_range ? at+2 : at, t('week exceed'));
                }
                if (is_range) {
                    period = matchTokens(tokens, at+3, '/', 'number');
                    if (period) {
                        period = tokens[at+4][0];
                        tokens[at+4][4] = 'positive_number';
                        if (period < 2) {
                            throw formatWarnErrorMessage(nrule, at+4, t('week period less than 2', {
                                'weekfrom': week_from, 'weekto': week_to, 'period': period}));
                        } else if (period > 26) {
                            throw formatWarnErrorMessage(nrule, at+4, t('week period greater than 26', {
                                'weekfrom': week_from
                            }));
                        }
                    }
                }

                if (week_stable && (!(week_from <= 1 && week_to >= 53) || period)) {
                    week_stable = false;
                }

                if (!period && week_from === 1 && week_to === 53) {
                    /* Shortcut and work around bug. */
                    rule.week.push(function() { return [true]; });
                } else {

                    rule.week.push(function(week_from, week_to, period) { return function(date) {
                        const ourweek = getWeekNumber(date);

                        // console.log("week_from: %s, week_to: %s", week_from, week_to);
                        // console.log("ourweek: %s, date: %s", ourweek, date);

                        // before range
                        if (ourweek < week_from) {
                            // console.log("Before: " + getNextDateOfISOWeek(week_from, date));
                            return [false, getNextDateOfISOWeek(week_from, date)];
                        }

                        // we're after range, set check date to next year
                        if (ourweek > week_to) {
                            // console.log("After");
                            return [false, getNextDateOfISOWeek(week_from, date)];
                        }

                        // we're in range
                        if (period) {
                            const in_period = (ourweek - week_from) % period === 0;
                            if (in_period) {
                                return [true, getNextDateOfISOWeek(ourweek + 1, date)];
                            } else {
                                // Calculate how many weeks we need to skip to land on the next period-aligned week
                                const weeks_until_next_match = period - ((ourweek - week_from) % period);
                                const next_matching_week = ourweek + weeks_until_next_match;
                                if (next_matching_week <= week_to) {
                                    return [false, getNextDateOfISOWeek(next_matching_week, date)];
                                } else {
                                    // No further match within the range; wrap to the first matching week in the next year
                                    return [false, getNextDateOfISOWeek(week_from, date)];
                                }
                            }
                        }

                        // console.log("Match");
                        return [true, getNextDateOfISOWeek(week_to === 53 ? 1 : week_to + 1, date)];
                    }}(week_from, week_to, period));
                }

                at += 1 + (is_range ? 2 : 0) + (period ? 2 : 0);
            } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                throw formatWarnErrorMessage(nrule, at - 1, t('additional rule no sense'));
            } else {
                throw formatWarnErrorMessage(nrule, at, t('unexpected token week range', {'token': tokens[at][1]}));
            }

            if (!matchTokens(tokens, at, ','))
                break;
        }

        return at;
    }

    /**
     * For a given date, get the ISO week number.
     *
     * Based on information at:
     *
     *    http://www.merlyn.demon.co.uk/weekcalc.htm#WNR
     *
     * Algorithm is to find nearest Thursday, it's year
     * is the year of the week number. Then get weeks
     * between that date and the first day of that year.
     *
     * Note that dates in one year can be weeks of previous
     * or next year, overlap is up to 3 days.
     *
     * e.g. 2014/12/29 is Monday in week  1 of 2015
     *      2012/1/1   is Sunday in week 52 of 2011
     * @param {Date} d - Date to inspect.
     * @returns {number} ISO week number.
     * @see https://stackoverflow.com/a/6117889
     */
    function getWeekNumber(d) {
        // Copy date so don't modify original
        d = new Date(+d);
        d.setHours(0,0,0,0);
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setDate(d.getDate() + 4 - (d.getDay()||7));
        // Get first day of year
        const yearStart = new Date(d.getFullYear(),0,1);
        // Calculate full weeks to nearest Thursday
        return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7)
    }

    /**
     * Get the date of the Monday in a given ISO week.
     * @param {number} w - ISO week number.
     * @param {number} year - Calendar year.
     * @returns {Date} Start date of the ISO week.
     * @see https://stackoverflow.com/a/16591175
     */
    function getDateOfISOWeek(w, year) {
        const simple = new Date(year, 0, 1 + (w - 1) * 7);
        const dow = simple.getDay();
        const ISOweekStart = simple;
        if (dow <= 4)
            ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
        else
            ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
        return ISOweekStart;
    }

    /**
     * Get the next occurrence of an ISO week after a date.
     * @param {number} week ISO week number.
     * @param {Date} date Date after which to search.
     * @returns {Date} Start date of the next occurrence of the ISO week.
     */
    function getNextDateOfISOWeek(week, date) {
        let next_date;
        for (let i = -1; i <= 1; i++) {
            next_date = getDateOfISOWeek(week, date.getFullYear() + i);
            if (next_date.getTime() > date.getTime()) {
                return next_date;
            }
        }
        throw formatLibraryBugMessage();
    }
    /* }}} */

    /**
     * Month range parser (Jan,Feb-Mar). {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where to start.
     * @param {boolean} [push_to_monthday] Whether to push the selector into
     *     the monthday selector array, making it work in conjunction with the
     *     monthday selectors (either the month match or the monthday).
     * @param {boolean} [in_selector] Whether this call is already part of a
     *     selector. Optional.
     * @returns {number} Position at which the token does not belong to the
     *     selector anymore.
     */
    function parseMonthRange(tokens, at, push_to_monthday, in_selector) {
        if (!in_selector)
            tokens[at][3] = 'month';

        for (; at < tokens.length; at++) {
            // Use parseMonthdayRange if '<month> <daynum>' and not '<month> <hour>:<minute>'
            if (matchTokens(tokens, at, 'month', 'number') && !matchTokens(tokens, at+2, 'timesep', 'number')) {
                return parseMonthdayRange(tokens, at, nrule, true);
            } else if (matchTokens(tokens, at, 'month')) {
                // Single month (Jan) or month range (Feb-Mar)
                const is_range = matchTokens(tokens, at+1, '-', 'month');

                let month_from = tokens[at][0];
                let month_to = is_range ? tokens[at+2][0] : month_from;

                if (is_range && week_stable) {
                    if (month_from !== (month_to + 1) % 12)
                        week_stable = false;
                } else {
                    week_stable = false;
                }

                let inside = true;

                // handle reversed range
                if (month_to < month_from) {
                    const tmp = month_to;
                    month_to = month_from - 1;
                    month_from = tmp + 1;
                    inside = false;
                }

                const selector = function(month_from, month_to, inside) { return function(date) {
                    const ourmonth = date.getMonth();

                    if (month_to < month_from) {
                        /* Handle full range. */
                        return [!inside];
                    }

                    if (ourmonth < month_from || ourmonth > month_to) {
                        return [!inside, dateAtNextMonth(date, month_from)];
                    } else {
                        return [inside, dateAtNextMonth(date, month_to + 1)];
                    }
                }}(month_from, month_to, inside);

                if (push_to_monthday === true)
                    rule.monthday.push(selector);
                else
                    rule.month.push(selector);

                at += is_range ? 3 : 1;
            } else {
                throw formatWarnErrorMessage(nrule, at, t('unexpected token month range', {'token': tokens[at][1]}));
            }

            if (!matchTokens(tokens, at, ','))
                break;
        }

        return at;
    }

    function dateAtNextMonth(date, month) {
        return new Date(date.getFullYear(), month < date.getMonth() ? month + 12 : month);
    }
    /* }}} */

    /**
     * Month day range parser (Jan 26-31; Jan 26-Feb 26). {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} at Position where to start.
     * @param {number} nrule Rule number starting with 0.
     * @param {boolean} [push_to_month] Whether to push the selector into the
     *     month selector array, making it work in conjunction with the month
     *     selectors (either the month match or the monthday).
     * @returns {number} Position at which the token does not belong to the
     *     selector anymore.
     */
    function parseMonthdayRange(tokens, at, nrule, push_to_month) {
        if (!push_to_month)
            tokens[at][3] = 'month';

        for (; at < tokens.length; at++) {
            let has_year = [];
            const has_month = [], has_event = [], has_calc = [], has_constrained_weekday = [];
            has_year[0]  = matchTokens(tokens, at, 'year');
            has_month[0] = matchTokens(tokens, at+has_year[0], 'month', 'number');
            has_event[0] = matchTokens(tokens, at+has_year[0], 'event');

            if (has_event[0])
                has_calc[0] = getMoveDays(tokens, at+has_year[0]+1, 200, 'max differ name event like easter');

            let at_range_sep;
            if (matchTokens(tokens, at+has_year[0], 'month', 'weekday', '[')) {
                has_constrained_weekday[0] = getConstrainedWeekday(tokens, at+has_year[0]+3);
                has_calc[0] = getMoveDays(tokens, has_constrained_weekday[0][1], 6, 'max differ name constrained weekdays');
                at_range_sep = has_constrained_weekday[0][1] + (typeof has_calc[0] === 'object' && has_calc[0][1] ? 3 : 0);
            } else {
                at_range_sep = at+has_year[0]
                    + (has_event[0]
                        ? (typeof has_calc[0] === 'object' && has_calc[0][1] ? 4 : 1)
                        : 2);
            }

            let at_sec_event_or_month;
            if ((has_month[0] || has_event[0] || has_constrained_weekday[0]) && matchTokens(tokens, at_range_sep, '-')) {
                has_year[1] = matchTokens(tokens, at_range_sep+1, 'year');
                at_sec_event_or_month = at_range_sep+1+has_year[1];
                has_month[1] = matchTokens(tokens, at_sec_event_or_month, 'month', 'number');
                if (!has_month[1]) {
                    has_event[1] = matchTokens(tokens, at_sec_event_or_month, 'event');
                    if (has_event[1]) {
                        has_calc[1] = getMoveDays(tokens, at_sec_event_or_month+1, 366, 'max differ name event like easter');
                    } else if (matchTokens(tokens, at_sec_event_or_month, 'month', 'weekday', '[')) {
                        has_constrained_weekday[1] = getConstrainedWeekday(tokens, at_sec_event_or_month+3);
                        has_calc[1] = getMoveDays(tokens, has_constrained_weekday[1][1], 6, 'max differ name constrained weekdays');
                    }
                }
            }

            // monthday range like Jan 26-Feb 26 {{{
            if (has_year[0] === has_year[1] && (has_month[1] || has_event[1] || has_constrained_weekday[1])) {

                if (has_month[0])
                    checkIfDateIsValid(tokens[at+has_year[0]][0], tokens[at+has_year[0]+1][0], nrule, at+has_year[0]+1);
                if (has_month[1])
                    checkIfDateIsValid(tokens[at_sec_event_or_month][0], tokens[at_sec_event_or_month+1][0], nrule, at_sec_event_or_month+1);

                const selector = function(tokens, at, nrule, has_year, has_event, has_calc, at_sec_event_or_month, has_constrained_weekday) { return function(date) {
                    const start_of_next_year = new Date(date.getFullYear() + 1, 0, 1);

                    let movableDays, from_date;
                    if (has_event[0]) {
                        movableDays = getMovableEventsForYear(has_year[0] ? parseInt(tokens[at][0]) : date.getFullYear());
                        from_date = movableDays[tokens[at+has_year[0]][0]];

                        if (typeof has_calc[0] === 'object' && has_calc[0][1]) {
                            const from_year_before_calc = from_date.getFullYear();
                            from_date.setDate(from_date.getDate() + has_calc[0][0]);
                            if (from_year_before_calc !== from_date.getFullYear())
                                throw formatWarnErrorMessage(nrule, at+has_year[0]+has_calc[0][1]*3,
                                    t('movable not in year', {'name': tokens[at+has_year[0]][0], 'days': has_calc[0][0]}));
                        }
                    } else if (has_constrained_weekday[0]) {
                        from_date = getDateForConstrainedWeekday((has_year[0] ? tokens[at][0] : date.getFullYear()), // year
                            tokens[at+has_year[0]][0], // month
                            tokens[at+has_year[0]+1][0], // weekday
                            has_constrained_weekday[0],
                            has_calc[0]);
                    } else {
                        from_date = new Date((has_year[0] ? tokens[at][0] : date.getFullYear()),
                            tokens[at+has_year[0]][0], tokens[at+has_year[0]+1][0]);
                    }

                    let to_date;
                    if (has_event[1]) {
                        movableDays = getMovableEventsForYear(has_year[1]
                                    ? parseInt(tokens[at_sec_event_or_month-1][0])
                                    : date.getFullYear());
                        to_date = movableDays[tokens[at_sec_event_or_month][0]];

                        if (typeof has_calc[1] === 'object' && has_calc[1][1]) {
                            const to_year_before_calc = to_date.getFullYear();
                            to_date.setDate(to_date.getDate() + has_calc[1][0]);
                            if (to_year_before_calc !== to_date.getFullYear()) {
                                throw formatWarnErrorMessage(nrule, at_sec_event_or_month+has_calc[1][1],
                                    t('movable not in year', {'name': tokens[at_sec_event_or_month][0], 'days':  has_calc[1][0] }));
                            }
                        }
                    } else if (has_constrained_weekday[1]) {
                        const to_year = has_year[1]
                            ? tokens[at_sec_event_or_month-1][0]
                            : date.getFullYear();
                        const to_month = tokens[at_sec_event_or_month][0];
                        const to_weekday = tokens[at_sec_event_or_month+1][0];

                        to_date = getDateForConstrainedWeekday(
                            to_year,
                            to_month,
                            to_weekday,
                            has_constrained_weekday[1],
                            has_calc[1]
                        );
                        to_date.setDate(to_date.getDate() + 1);
                    } else {
                        to_date = new Date((has_year[1] ? tokens[at_sec_event_or_month-1][0] : date.getFullYear()),
                            tokens[at_sec_event_or_month][0], tokens[at_sec_event_or_month+1][0] + 1);
                    }

                    let inside = true;

                    if (to_date < from_date) {
                        const tmp = to_date;
                        to_date = from_date;
                        from_date = tmp;
                        inside = false;
                    }

                    if (date.getTime() < from_date.getTime()) {
                        return [!inside, from_date];
                    } else if (date.getTime() < to_date.getTime()) {
                        return [inside, to_date];
                    } else {
                        if (has_year[0]) {
                            return [!inside];
                        } else {
                            return [!inside, start_of_next_year];
                        }
                    }
                }}(tokens, at, nrule, has_year, has_event, has_calc, at_sec_event_or_month, has_constrained_weekday);

                // An explicit-year range that has already ended is permanently inactive.
                const [, next_change] = selector(new Date());
                const is_past_explicit_range = has_year[0] && typeof next_change === 'undefined';
                if (is_past_explicit_range) {
                    parsing_warnings.push([
                        nrule,
                        has_year[1] ? at_sec_event_or_month - 1 : at,
                        'date_range_past',
                        t('date range past')
                    ]);
                }

                if (push_to_month === true)
                    rule.month.push(selector);
                else
                    rule.monthday.push(selector);

                at = (has_constrained_weekday[1]
                        ? has_constrained_weekday[1][1]
                        : at_sec_event_or_month + (has_event[1] ? 1 : 2))
                    + (typeof has_calc[1] === 'object' ? has_calc[1][1] : 0);

                /* }}} */
                // Monthday range like Jan 26-31 {{{
            } else if (has_month[0]) {

                has_year = has_year[0];
                const year = tokens[at][0]; // Could be month if has no year. Tested later.
                const month = tokens[at+has_year][0];

                let first_round = true;
                let is_range;

                do {
                    const range_from = tokens[at+1 + has_year][0];
                    is_range = matchTokens(tokens, at+2+has_year, '-', 'number');
                    let period = undefined;
                    const at_range_to = at+has_year+(is_range ? 3 : 1); // position of the range_to token
                    const range_to = tokens[at_range_to][0] + 1;
                    if (is_range && matchTokens(tokens, at+has_year+4, '/', 'number')) {
                        period = tokens[at+has_year+5][0];
                        tokens[at+has_year+5][4] = 'positive_number';
                        checkPeriod(at+has_year+5, period, 'day');
                    }

                    if (first_round) {
                        const at_timesep_if_monthRange = at + has_year + 1 // at month number
                            + (is_range ? 2 : 0) + (period ? 2 : 0)
                            + !(is_range || period); // if not range nor has period, add one

                        // Check for '<month> <timespan>'
                        if (matchTokens(tokens, at_timesep_if_monthRange, 'timesep', 'number')
                                && (matchTokens(tokens, at_timesep_if_monthRange+2, '+')
                                    || matchTokens(tokens, at_timesep_if_monthRange+2, '-')
                                    || oh_mode !== 0)
                            ) {
                                return parseMonthRange(tokens, at, true, true);
                        }
                    }

                    // error checking {{{
                    if (range_to < range_from)
                        throw formatWarnErrorMessage(nrule, at+has_year+3, t('day range reverse'));

                    checkIfDateIsValid(month, range_from, nrule, at+1 + has_year);
                    checkIfDateIsValid(month, range_to - 1 /* added previously */,
                        nrule, at_range_to);

                    // An explicit date or range that already fully elapsed.
                    if (has_year && new Date(year, month, range_to) < new Date()) {
                        const warning_type = is_range ? 'date_range_past' : 'date_past';
                        const warning_message = is_range ? t('date range past') : t('date past');
                        parsing_warnings.push([
                            nrule,
                            at_range_to,
                            warning_type,
                            warning_message
                        ]);
                    }
                    /* }}} */

                    const selector = function(year, has_year, month, range_from, range_to, period) { return function(date) {
                        const start_of_next_year = new Date(date.getFullYear() + 1, 0, 1);

                        const from_date = new Date(has_year ? year : date.getFullYear(),
                            month, range_from);
                        if (month === 1 && range_from !== from_date.getDate()) // Only on leap years does this day exist.
                            return [false]; // If day 29 does not exist,
                                            // then the date object adds one day to date
                                            // and this selector should not match.
                        const to_date   = new Date(from_date.getFullYear(),
                            month, range_to);
                        if (month === 1 && is_range && range_to !== to_date.getDate()) // Only on leap years does this day exist.
                            return [false];

                        if (date.getTime() < from_date.getTime())
                            return [false, from_date];
                        else if (date.getTime() >= to_date.getTime())
                            return [false, start_of_next_year];
                        else if (!period)
                            return [true, to_date];

                        const nday = Math.floor((date.getTime() - from_date.getTime()) / msec_in_day);
                        const in_period = nday % period;

                        if (in_period === 0)
                            return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)];
                        else
                            return [false, new Date(date.getFullYear(), date.getMonth(), date.getDate() + period - in_period)];

                    }}(year, has_year, month, range_from, range_to, period);

                    if (push_to_month === true)
                        rule.month.push(selector);
                    else
                        rule.monthday.push(selector);

                    at += 2 + has_year + (is_range ? 2 : 0) + (period ? 2 : 0);

                    first_round = false;
                }
                while (matchTokens(tokens, at, ',', 'number'))


                /* }}} */
                // Only event like easter {{{
            } else if (has_event[0]) {

                const selector = function(tokens, at, nrule, has_year, add_days) { return function(date) {

                    // console.log('enter selector with date: ' + date);
                    const movableDays = getMovableEventsForYear((has_year ? tokens[at][0] : date.getFullYear()));
                    const event_date = movableDays[tokens[at+has_year][0]];
                    if (!event_date)
                        throw t('movable no formula', {'name': tokens[at+has_year][0]});

                    if (add_days[0]) {
                        event_date.setDate(event_date.getDate() + add_days[0]);
                        if (date.getFullYear() !== event_date.getFullYear())
                            throw formatWarnErrorMessage(nrule, at+has_year+add_days[1], t('movable not in year', {
                                'name': tokens[at+has_year][0], 'days': add_days[0]}));
                    }

                    if (date.getTime() < event_date.getTime())
                        return [false, event_date];
                    // else if (date.getTime() < event_date.getTime() + msec_in_day) // does not work because of daylight saving times
                    else if (event_date.getMonth() * 100 + event_date.getDate() === date.getMonth() * 100 + date.getDate())
                        return [true, new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)];
                    else
                        return [false, new Date(date.getFullYear() + 1, 0, 1)];

                }}(tokens, at, nrule, has_year[0], has_calc[0]);

                if (push_to_month === true)
                    rule.month.push(selector);
                else
                    rule.monthday.push(selector);

                at += has_year[0] + has_event[0] + (typeof has_calc[0][1] === 'number' && has_calc[0][1] ? 3 : 0);
                /* }}} */
            } else if (has_constrained_weekday[0]) {
                at = parseMonthRange(tokens, at);
            } else if (matchTokens(tokens, at, 'month')) {
                return parseMonthRange(tokens, at, true, true);
            } else if (matchTokens(tokens, at - 1, ',')) { // additional rule
                throw formatWarnErrorMessage(nrule, at - 1, t('additional rule no sense'));
            } else {
                // throw 'Unexpected token in monthday range: "' + tokens[at] + '"';
                return at;
            }

            if (!matchTokens(tokens, at, ','))
                break;
        }

        return at;
    }
    /* }}} */

    /**
     * @typedef {[boolean, Date|undefined, boolean, string|undefined, number|undefined]} OpeningHoursStatePair
     */

    /**
     * Main selector traversal function (return state array for date). {{{
     * Checks which rule applies for the given date, including its state and
     * comment.
     * @param {object[]} rules Parsed rules to inspect.
     * @param {Date} date Date to inspect.
     * @returns {OpeningHoursStatePair}
     *     Array:
     *     0. resultstate: State: true for 'open', false for 'closed'.
     *     1. changedate: Next change as date object.
     *     2. unknown: true if state open is not sure.
     *     3. comment: Comment which applies for this time range (from date to changedate).
     *     4. match_rule: Rule number starting with 0 (nrule).
     */
    function getStatePair(rules, date) {
        let resultstate = false;
        let changedate;
        let unknown = false;
        let comment;
        let match_rule;

        let date_matching_rules = [];

        /* Go though all date selectors and check if they return something
         * else than closed for the given date.
         */
        for (let nrule = 0; nrule < rules.length; nrule++) {
            let matching_date_rule = true;
            // console.log(nrule, 'length',  rules[nrule].date.length);

            /* Try each date selector type. */
            for (let ndateselector = 0; ndateselector < rules[nrule].date.length; ndateselector++) {
                const dateselectors = rules[nrule].date[ndateselector];
                // console.log(nrule, ndateselector);

                let has_matching_selector = false;
                for (let datesel = 0; datesel < dateselectors.length; datesel++) {
                    const res = dateselectors[datesel](date);
                    if (res[0]) {
                        has_matching_selector = true;

                        if (typeof res[2] === 'string') { // holiday name
                            comment = [ res[2], nrule ];
                        }

                    }
                    if (typeof changedate === 'undefined' || (typeof res[1] === 'object' && res[1].getTime() < changedate.getTime()))
                        changedate = res[1];
                }

                if (!has_matching_selector) {
                    matching_date_rule = false;
                    // We can ignore other date selectors, as the state won't change
                    // anyway until THIS selector matches (due to conjunction of date
                    // selectors of different types).
                    // This is also an optimization, if widest date selector types
                    // are checked first.
                    break;
                }
            }

            if (matching_date_rule) {
                /* The following lines implement date overwriting logic (e.g. for
                 * "Mo-Fr 10:00-20:00; We 10:00-16:00", We rule overrides Mo-Fr rule partly (We).
                 *
                 * This is the only way to be consistent. I thought about ("22:00-02:00; Tu 12:00-14:00") letting Th override 22:00-02:00 partly:
                 * Like: Th 00:00-02:00,12:00-14:00 but this would result in including 22:00-00:00 for Th which is probably not what you want.
                 */
                if ((rules[nrule].date.length > 0 || nrule > 0 && rules[nrule].meaning && rules[nrule-1].date.length === 0)
                        && (rules[nrule].meaning || rules[nrule].unknown)
                        && !rules[nrule].wrapped && !rules[nrule].additional && !rules[nrule].fallback
                    ) {

                    // let old_date_matching_rules = date_matching_rules;
                    date_matching_rules = [];
                    // for (var nrule = 0; nrule < old_date_matching_rules.length; nrule++) {
                    //     if (!rules[old_date_matching_rules[nrule]].wrapped)
                    //         date_matching_rules.push(nrule);
                    // }
                }
                date_matching_rules.push(nrule);
            }
        }

        // console.log(date_matching_rules);
        for (let nrule = 0; nrule < date_matching_rules.length; nrule++) {
            const rule = date_matching_rules[nrule];

            // console.log('Processing rule ' + rule + ': with date ' + date
                // + ' and ' + rules[rule].time.length + ' time selectors (comment: "' + rules[rule].comment + '").');

            /* There is no time specified, state applies to the whole day. */
            if (rules[rule].time.length === 0) {
                // console.log('there is no time', date);
                if (!rules[rule].fallback || (rules[rule].fallback && !(resultstate || unknown))) {
                    resultstate = rules[rule].meaning;
                    unknown     = rules[rule].unknown;
                    match_rule  = rule;

                    // if (rules[rule].fallback)
                        // break rule; // fallback rule matched, no need for checking the rest
                    // WRONG: What if closing rules follow?
                }
            }

            for (let timesel = 0; timesel < rules[rule].time.length; timesel++) {
                const res = rules[rule].time[timesel](date);

                // console.log('res:', res);
                if (res[0]) {
                    if (!rules[rule].fallback || (rules[rule].fallback && !(resultstate || unknown))) {
                        resultstate = rules[rule].meaning;
                        unknown     = rules[rule].unknown;
                        match_rule  = rule;

                        /* Reset open end comment */
                        if (typeof comment === 'object' && comment[0] === t('open end'))
                            comment = undefined;

                        // open end
                        if (res[2] === true && (resultstate || unknown)) {
                            comment = [ t('open end'), match_rule ];

                            resultstate = false;
                            unknown     = true;

                            /* Hack to make second rule in '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"' obsolete {{{ */
                            if (typeof rules[rule].time[timesel+1] === 'function') {

                                const next_res = rules[rule].time[timesel+1](date);
                                if (  !next_res[0]
                                    // && next_res[2]
                                    && typeof next_res[1] === 'object'
                                    // && getValueForDate(next_res[1], true) !== getValueForDate(date, true) // Just to be sure.
                                    && rules[rule].time[timesel](new Date(date.getTime() - 1))[0]
                                    /* To distinguish the following two values:
                                     *     'sunrise-14:00,14:00+',
                                     *   '07:00+,12:00-16:00',
                                     */
                                    ) {

                                    // console.log("07:00+,12:00-16:00 matched.");

                                    resultstate = false;
                                    unknown     = false;
                                }
                            }

                            /* Hack to handle '17:00+,13:00-02:00' {{{ */
                            /* Not enabled. To complicated, just don‘t use them …
                             * It gets even crazier …
                             * Time wrapping over midnight is
                             * stored in the next internal rule:
                             * '17:00-00:00 unknown "Specified as open end. Closing time was guessed.", 13:00-00:00 open' // First internal rule.
                             * + ', ' overwritten part: 00:00-03:00 open + '00:00-02:00 open', // Second internal rule.
                             */

                            /*
                            if (
                                    typeof rules[rule-1] === 'object'
                                    && rules[rule].build_from_token_rule.toString() === rules[rule-1].build_from_token_rule.toString()
                                    && typeof rules[rule] === 'object'
                                    && rules[rule].build_from_token_rule.toString() === rules[rule].build_from_token_rule.toString()
                                    ) {

                                let last_wrapping_time_selector = rules[rule].time[rules[rule].time.length - 1];
                                let last_w_res = last_wrapping_time_selector(new Date(date.getTime() - 1));
                                // console.log(last_w_res);

                                if (    last_w_res[0]
                                        &&  typeof last_w_res[2] === 'undefined'
                                        && (typeof last_w_res[2] === 'undefined' || last_w_res[2] === false) // Do not match for 'Tu 23:59-40:00+'
                                        &&  typeof last_w_res[1] === 'object'
                                        && date.getTime() === last_w_res[1].getTime()
                                    ) {

                                    // '05:00-06:00,17:00+,13:00-02:00',

                                    // console.log("17:00+,13:00-02:00 matched.");
                                    // console.log(JSON.stringify(rules, null, '    '));

                                    resultstate = false;
                                    unknown     = false;
                                }
                            }
                            /* }}} */
                        }

                        if (rules[rule].fallback) {
                            if (typeof changedate === 'undefined' || (typeof res[1] !== 'undefined' && res[1] < changedate)) {
                                // FIXME: Changing undefined does not break the test framework.
                                changedate = res[1];
                            }

                            // break rule; // Fallback rule matched, no need for checking the rest.
                            // WRONG: What if 'off' is used after fallback rule.
                        }
                    }
                }
                if (typeof changedate === 'undefined' || (typeof res[1] === 'object' && res[1] < changedate))
                    changedate = res[1];
            }
        }

        if (typeof rules[match_rule] === 'object' && typeof rules[match_rule].comment === 'string') {
            /* Only use comment if one is explicitly specified. */
            comment = rules[match_rule].comment;
        } else if (typeof comment === 'object') {
            if (comment[1] === match_rule) {
                comment = comment[0];
            } else {
                comment = undefined;
            }
        }

        // console.log('changedate', changedate, resultstate, comment, match_rule);
        return [ resultstate, changedate, unknown, comment, match_rule ];
    }

    /**
     * Get the state pair for a date.
     * @param {Date} date Date to inspect.
     * @returns {OpeningHoursStatePair} State and next-change information.
     */
    this.getStatePair = function(date) {
        return getStatePair(rules, date);
    };
    /* }}} */

    /**
     * Generate a prettified value for a selector based on its tokens. {{{
     * @param {ParserToken[]} tokens List of token objects.
     * @param {number} selector_start Position where to start.
     * @param {number} selector_end Position where to stop.
     * @param {string} selector_type Selector type.
     * @param {Record<string, unknown>} conf Configuration options.
     * @returns {string} Prettified selector value.
     */
    function prettifySelector(tokens, selector_start, selector_end, selector_type, conf) {
        let prettified_value = '';
        let at = selector_start;
        while (at <= selector_end) {
            const formatted = formatPrettifySelectorToken(
                prettified_value,
                tokens,
                at,
                selector_start,
                selector_end,
                selector_type,
                conf,
                months,
                weekdays,
                translate
            );
            prettified_value = formatted.value;
            at += formatted.advance;
            at++;
        }
        return prettified_value;
    }
    /* }}} */

    //======================================================================
    // Public interface {{{
    // All functions below are considered public.
    //======================================================================

    // Simple API {{{

    this.getState = function(date) {
        const it = this.getIterator(date);
        return it.getState();
    };

    this.getUnknown = function(date) {
        const it = this.getIterator(date);
        return it.getUnknown();
    };

    this.getStateString = function(date, past) {
        const it = this.getIterator(date);
        return it.getStateString(past);
    };

    this.getComment = function(date) {
        const it = this.getIterator(date);
        return it.getComment();
    };

    this.getMatchingRule = function(date) {
        const it = this.getIterator(date);
        return it.getMatchingRule();
    };

    this.getPublicHolidayContext = function(date) {
        return {
            isHoliday: isPublicHoliday(date),
        };
    };

    /* Not available for iterator API {{{ */
    /**
     * Get warnings, empty list if none.
     * @returns {Array<string|{type: string, message: string, value: string, position: number|null}>} Warning messages.
     */
    this.getWarnings = function() {
        const it = this.getIterator();
        return getWarnings(it);
    };
    /* }}} */

    /**
     * Get warnings as structured objects. {{{
     * Returns an array of objects for each warning, empty list if none. Each object
     * has a stable, machine-readable `type`, a human-readable `message`, the `value`
     * the warning refers to and the character `position` of the marker within it.
     * The formatted string from getWarnings() equals
     * `value.substring(0, position) + ' <--- (' + message + ')'`.
     * @returns {Array<string|{type: string, message: string, value: string, position: number|null}>} Structured warnings.
     */
    this.getStructuredWarnings = function() {
        const it = this.getIterator();
        return getWarnings(it, true);
    };
    /* }}} */

    /**
     * Get a nicely formated value {{{
     * @param {object} argument_hash - Formatting options.
     * @returns {string} Formatted value.
     */
    this.prettifyValue = function(argument_hash) {
        this.getWarnings();
        /* getWarnings has to be run before prettifyValue because some
         * decisions if certain aspects makes sense to prettify or not
         * are influenced by warnings.
         * Basically, both functions depend on each other in some way :(
         * See done_with_selector_reordering.
         */
        return prettifyValue(argument_hash);
    };
    /* }}} */

    /**
     * Get time of next status change. {{{
     * Return next visible state change (open/closed/unknown).
     * Skip comment-only boundaries; use getIterator(...).advance() for those.
     * @param {Date} date - Starting date.
     * @param {Date} maxdate - End date limit.
     * @returns {Date|undefined} Next visible state change.
     */
    this.getNextChange = function(date, maxdate) {
        const it = this.getIterator(date);
        const initial_state = it.getState();
        const initial_unknown = it.getUnknown();
        while (it.advance(maxdate)) {
            if (it.getState() !== initial_state || it.getUnknown() !== initial_unknown) {
                return it.getDate();
            }
        }
        return undefined;
    };
    /* }}} */

    /**
     * Checks whether open intervals are same for every week. {{{
     * @returns {boolean} Whether the schedule is week-stable.
     */
    this.isWeekStable = function() {
        return week_stable;
    };
    /* }}} */

    /**
     * Check if this opening_hours object has the same meaning as the given opening_hours object. {{{
     * @param {{isWeekStable: () => boolean, getIterator: (date?: Date) => OpeningHoursIterator}} second_oh_object - Other opening_hours object to compare with.
     * @param {Date} start_date - Date from which to compare.
     * @returns {Array<boolean|object>} Equality result and optional differences.
     */
    this.isEqualTo = function(second_oh_object, start_date) {
        if (typeof start_date === 'undefined') {
            start_date = new Date();
        }
        let datelimit;

        if (this.isWeekStable() && second_oh_object.isWeekStable()) {
            datelimit = new Date(start_date.getTime() + msec_in_day * 10);
        // } else if (this.isWeekStable() !== second_oh_object.isWeekStable()) {
        //     return [ false,
        //         {
        //             'reason': 'isWeekStable do not match',
        //         }
        //     ];
        } else {
            datelimit = new Date(start_date.getTime() + msec_in_day * 366 * 5);
        }

        const first_it = this.getIterator(start_date);
        const second_it = second_oh_object.getIterator(start_date);

        while (first_it.advance(datelimit)) {
            second_it.advance(datelimit);

            const not_equal = [];

            if (first_it.getDate().getTime() !== second_it.getDate().getTime()) {
                not_equal.push('getDate');
            }

            if (first_it.getState() !== second_it.getState()) {
                not_equal.push('getState');
            }

            if (first_it.getUnknown() !== second_it.getUnknown()) {
                not_equal.push('getUnknown');
            }

            if (first_it.getComment() !== second_it.getComment()) {
                not_equal.push('getComment');
            }

            if (not_equal.length) {
                const deviation_for_time = {};
                deviation_for_time[first_it.getDate().getTime()] = not_equal;
                return [ false,
                    {
                        'matching_rule': first_it.getMatchingRule(),
                        'matching_rule_other': second_it.getMatchingRule(),
                        'deviation_for_time': deviation_for_time,
                    }
                ];
            }
        }

        return [ true ];
    };
    /* }}} */
    /* }}} */
    /* }}} */

    // High-level API {{{
    /**
     * Get array of open intervals between two dates {{{
     * @param {Date} from - Start date.
     * @param {Date} to - End date.
     * @returns {Array<Array<Date|boolean|string|undefined>>} Open intervals.
     */
    this.getOpenIntervals = function(from, to) {
        const res = [];

        const it = this.getIterator(from);

        if (it.getState() || it.getUnknown()) {
            res.push([from, undefined, it.getUnknown(), it.getComment()]);
        }

        while (it.advance(to)) {
            if (it.getState() || it.getUnknown()) {
                if (res.length !== 0 && typeof res[res.length - 1][1] === 'undefined') {
                    // last state was also open or unknown
                    res[res.length - 1][1] = it.getDate();
                }
                res.push([it.getDate(), undefined, it.getUnknown(), it.getComment()]);
            } else {
                if (res.length !== 0 && typeof res[res.length - 1][1] === 'undefined') {
                    // only use the first time as closing/change time and ignore closing times which might follow
                    res[res.length - 1][1] = it.getDate();
                }
            }
        }

        if (res.length > 0 && typeof res[res.length - 1][1] === 'undefined') {
            res[res.length - 1][1] = to;
        }

        return res;
    };
    /* }}} */

    /**
     * Get total number of milliseconds a facility is open,unknown within a given date range {{{
     * @param {Date} from - Start date.
     * @param {Date} to - End date.
     * @returns {Array<number>} Open and unknown durations in milliseconds.
     */
    this.getOpenDuration = function(from, to) {

        let open    = 0;
        let unknown = 0;

        const it = this.getIterator(from);
        let prevdate    = (it.getState() || it.getUnknown()) ? from : undefined;
        let prevstate   = it.getState();
        let prevunknown = it.getUnknown();

        while (it.advance(to)) {
            if (it.getState() || it.getUnknown()) {

                if (typeof prevdate === 'object') {
                    // last state was also open or unknown
                    if (prevunknown) //
                        unknown += it.getDate().getTime() - prevdate.getTime();
                    else if (prevstate)
                        open    += it.getDate().getTime() - prevdate.getTime();
                }

                prevdate    = it.getDate();
                prevstate   = it.getState();
                prevunknown = it.getUnknown();
                // console.log('if', prevdate, open / (1000 * 60 * 60), unknown / (1000 * 60 * 60));
            } else {
                // console.log('else', prevdate);
                if (typeof prevdate === 'object') {
                    if (prevunknown)
                        unknown += it.getDate().getTime() - prevdate.getTime();
                    else
                        open    += it.getDate().getTime() - prevdate.getTime();
                    prevdate = undefined;
                }
            }
        }

        if (typeof prevdate === 'object') {
            if (prevunknown)
                unknown += to.getTime() - prevdate.getTime();
            else
                open    += to.getTime() - prevdate.getTime();
        }

        return [ open, unknown ];
    };
    /* }}} */
    /* }}} */

    // Iterator API {{{
    /**
     * @typedef {object} OpeningHoursIterator
     * @property {() => Date} getDate - Current iterator date.
     * @property {(date: Date) => void} setDate - Set the iterator date.
     * @property {() => boolean} getState - Whether the facility is open.
     * @property {() => boolean} getUnknown - Whether the state is unknown.
     * @property {(past: boolean) => string} getStateString - State as 'open'/'unknown'/'closed'.
     * @property {() => string|undefined} getComment - Current comment.
     * @property {() => object|undefined} getMatchingRule - Matching rule.
     * @property {(datelimit: Date) => boolean} advance - Advance to the next change.
     */
    /**
     * @param {Date} date - Starting date for the iterator.
     * @returns {OpeningHoursIterator} Iterator over state changes.
     */
    this.getIterator = function(date = new Date()) {
        const iterator = {};
        let state = getStatePair(rules, date);
        let prevstate = state;

        /**
         * getDate {{{
         * @returns {Date} Current iterator date.
         */
        iterator.getDate = function() {
            return date;
        };
        /* }}} */

        /**
         * setDate {{{
         * @param {Date} new_date - Date to set.
         */
        iterator.setDate = function(new_date) {
            if (typeof new_date !== 'object')
                throw t('date parameter needed');

            date = new_date;
            state = getStatePair(rules, date);
            prevstate = state;
        };
        /* }}} */

        /**
         * Check whether facility is `open' {{{
         * @returns {boolean} Whether the facility is open.
         */
        iterator.getState = function() {
            return state[0];
        };
        /* }}} */

        /**
         * Checks whether the opening state is conditional or unknown {{{
         * @returns {boolean} Whether the state is unknown.
         */
        iterator.getUnknown = function() {
            return state[2];
        };
        /* }}} */

        /**
         * Get state string. Either 'open', 'unknown' or 'closed' {{{
         * @param {boolean} past - Whether to report a past closed state.
         * @returns {string} State string.
         */
        iterator.getStateString = function(past) {
            return (state[0] ? 'open' : (state[2] ? 'unknown' : (past ? 'closed' : 'close')));
        };
        /* }}} */

        /**
         * Get the comment, undefined in none {{{
         * @returns {string|undefined} Current comment.
         */
        iterator.getComment = function() {
            return state[3];
        };
        /* }}} */

        /**
         * Get the rule which matched thus deterrents the current state {{{
         * @returns {object|undefined} Matching rule.
         */
        iterator.getMatchingRule = function() {
            if (typeof state[4] === 'undefined')
                return undefined;

            return rules[state[4]].build_from_token_rule[2];
        };
        /* }}} */

        /**
         * Advances to the next position {{{
         * @param {Date} datelimit - Date limit.
         * @returns {boolean} Whether the iterator advanced.
         */
        iterator.advance = function(datelimit) {
            if (typeof datelimit === 'undefined') {
                datelimit = new Date(date.getTime() + msec_in_day * 366 * 5);
            } else if (datelimit.getTime() <= date.getTime()) {
                return false; /* The limit for advance needs to be after the current time. */
            }

            do {
                if (typeof state[1] === 'undefined') {
                    return false; /* open range, we won't be able to advance */
                }

                if (state[1].getTime() <= date.getTime()) {
                    /* We're going backwards or staying at the same time.
                     * This most likely indicates an error in a selector code.
                     */
                    throw 'Fatal: infinite loop in nextChange';
                }

                if (state[1].getTime() >= datelimit.getTime()) {
                    /* Don't advance beyond limits. */
                    return false;
                }

                // do advance
                date = state[1];
                prevstate = state;
                state = getStatePair(rules, date);
                // console.log(state);
            } while (state[0] === prevstate[0] && state[2] === prevstate[2] && state[3] === prevstate[3]);
            return true;
        };
        /* }}} */

        return iterator;
    };
    /* }}} */

    /* }}} */
}

/* vim: set ts=4 sw=4 tw=0 et foldmarker={{{,}}} foldlevel=0 foldmethod=marker : */
