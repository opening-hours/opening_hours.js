// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

import word_error_correction_data from './locales/word_error_correction.yaml';
import { createCorrectionLookup } from './word-error-correction.mjs';
import { matchTokens } from './prettify-helpers.mjs';
import { resolveRange } from './locale-resolver/resolver.mjs';
import { regionLanguages } from './locale-resolver/region-languages.mjs';
import { normalizeToken } from './locale-resolver/normalize.mjs';
import resolver_layers_data from './locale-resolver/layers.json' with { type: 'json' };

const word_error_correction = /** @type {import('./word-error-correction.mjs').WordErrorCorrectionData} */ (
    /** @type {unknown} */ (word_error_correction_data)
);

export const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/** @type {Record<string, [number|string, string]>} */
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
};
const ambiguous_season_words = new Set([
    'spring', 'summer', 'autumn', 'winter', // en
    'frühling', 'fruehling', 'frühjahr', 'sommer', 'herbst', // de
    'primavera', 'estate', 'autunno', 'inverno', // it
]);

/** @typedef {import('./parser-token-types.d.ts').ParserToken} ParserToken */
/** @typedef {import('./parser-token-types.d.ts').ParserTokenRule} ParserTokenRule */
/** @typedef {import('./locale-resolver/types.d.ts').TokenType} RangeTokenType */
/** @typedef {import('./locale-resolver/types.d.ts').Layers} ResolverLayers */
const resolver_layers = /** @type {ResolverLayers} */ (/** @type {unknown} */ (resolver_layers_data));
/** @typedef {[number|string, number, string, string, ParserTokenRule[]?]} ParsingWarning */
/**
 * @typedef {{
 *     location_cc: string|undefined,
 *     parser_locale: string,
 *     t: (key: string, variables?: Record<string, unknown>) => string,
 *     parsing_warnings: ParsingWarning[],
 *     formatWarnErrorMessage: (nrule: number|string, at: number, message: string, tokens?: ParserTokenRule[]) => string,
 *     formatLibraryBugMessage: (message?: string, textTemplate?: string) => string,
 * }} TokenizerContext
 */

const TOKENIZER_WORD_REGEX = /^([^\s\d\p{P}\p{S}\p{C}]{2,})(?=\s|$|[\s\d\p{P}\p{S}\p{C}])((?:[.]| before| after)?)/iu;
const NUMERIC_DAY_OFFSET_PATTERN = String.raw`\d+\s*days?(?!\s*(?:a|\/)\s*week)\b`;
const ERROR_TOLERANCE_ALTERNATIVES = [
    String.raw`&|_|→|‐|‑|‒|–|−|—|ー|=|·`,
    String.raw`öffnungszeit(?:en)?:?|opening_hours\s*=|\?|~|～|：`,
    String.raw`always (?:open|closed)|24x7|24 hours 7 days a week|24 hours`,
    String.raw`7 ?days(?:(?: a |\/)week)?|7j?\/7|all days?|every day`,
    String.raw`(?:bis|till?|-|–)? ?(?:open ?end|late)(?![\p{L}\p{N}_])`,
    String.raw`(?:(?:one )?day (?:before|after) )?(?:school|public) holidays?`,
    String.raw`days(?=\s|$|[^\p{L}_])|до|рм|ам|jours fériés|on work days?|sonntags?`,
    String.raw`(?:nur |an )?sonn-?(?:(?: und |\/)feiertag(?:s|en?)?)?`,
    String.raw`(?:an )?feiertag(?:s|en?)?|(?:nach|on|by) (?:appointments?|vereinbarung|absprache)`,
    String.raw`p\.m\.?|a\.m\.?`,
    String.raw`(?:[^\s\d\p{P}\p{S}\p{C}]|_)+(?=\s|$|[\s\d\p{Po}\p{Ps}\p{Pe}\p{Pd}\p{Pf}\p{Pi}\p{S}\p{C}])`,
    String.raw`à|á|mo|tu|we|th|fr|sa|su|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec`,
].join('|');
const ERROR_TOLERANCE_REGEX = new RegExp(
    String.raw`^(?!${NUMERIC_DAY_OFFSET_PATTERN})(${ERROR_TOLERANCE_ALTERNATIVES})(\.?)`,
    'iu'
);
/** @type {Record<number, number>} */
const UNICODE_CODE_POINT_TO_DIGIT = {
    176: 0,
    0x2070: 0,
    185: 1,
    178: 2,
    179: 3,
};

/**
 * Convert superscript, subscript, and degree-sign digits to regular digits.
 * @param {string} value Unicode digit sequence.
 * @returns {string} Converted digits.
 */
function normalizeUnicodeNumber(value) {
    return value.split('').map((character) => {
        const code_point = character.charCodeAt(0);
        if (typeof UNICODE_CODE_POINT_TO_DIGIT[code_point] === 'number') {
            return UNICODE_CODE_POINT_TO_DIGIT[code_point];
        } else if (0x2074 <= code_point && code_point <= 0x2079) {
            return code_point - 0x2070;
        } else if (0x2080 <= code_point && code_point <= 0x2089) {
            return code_point - 0x2080;
        }
    }).join('');
}

const correction_lookup = createCorrectionLookup(word_error_correction);

/**
 * Find a provisional weekday or month meaning for a cross-locale word.
 * @param {string} word Word to resolve.
 * @param {ResolverLayers} resolverLayers Locale resolver layers.
 * @param {string[]} weekdays Canonical weekday abbreviations.
 * @param {string[]} months Canonical month abbreviations.
 * @returns {{index: number, type: 'weekday'|'month'}|null} Provisional range token.
 */
function recognizeRangeToken(word, resolverLayers, weekdays, months) {
    const candidates = resolverLayers.crossLocale[normalizeToken(word)];
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
}

/**
 * Check whether a token is an unknown single-letter word fragment.
 * @param {ParserToken|undefined} token Token to inspect.
 * @returns {boolean} Whether the token represents one unknown letter.
 */
function isUnknownSingleLetterToken(token) {
    if (typeof token === 'undefined') {
        return false;
    }

    const [token_value, token_type] = token;
    return typeof token_value === 'string'
        && token_value === token_type
        && /^\p{L}$/u.test(token_value);
}


/**
 * Tokenize an opening-hours value with parser-specific diagnostics.
 * @param {string} value Raw opening-hours value.
 * @param {TokenizerContext} context Parser-specific tokenizer dependencies.
 * @returns {Array<ParserTokenRule>} Tokenized rules.
 */
export function tokenize(value, context) {
    const {
        location_cc,
        parser_locale,
        t,
        parsing_warnings,
        formatWarnErrorMessage,
        formatLibraryBugMessage,
    } = context;

    /**
     * @param {string|number} token_value Token value.
     * @param {string} token_type Token kind.
     * @param {number} position Remaining input length.
     * @returns {ParserToken} Token with correlated value and kind.
     */
    function createParserToken(token_value, token_type, position) {
        if (typeof token_value === 'string') {
            return [token_value, token_type, position];
        }
        if (token_type === 'number') {
            return [token_value, token_type, position];
        }
        if (token_type === 'year' || token_type === 'month' || token_type === 'weekday') {
            return [token_value, token_type, position];
        }
        throw formatLibraryBugMessage();
    }

    /**
     * Tokenize an opening-hours input stream. {{{
     * @param {string} value Raw opening-hours value.
     * @returns {Array<ParserTokenRule>} Tokenized list. See the internal documentation in `docs/`.
     */
    function tokenizeValue(value) {
        /** @type {ParserTokenRule[]} */
        const all_tokens     = [];
        /** @type {Array<ParserToken>} */
        let curr_rule_tokens = [];

        // Two-phase locale resolver: collect the raw lexemes of the weekday/month
        // operands per rule, then resolve each group together (Pass B). Grouping
        // per rule gives cross-token coherence (e.g. понедельник-пятница) that a
        // greedy single-token pass cannot, and the POI country adds the geo tier.
        const resolver_region_langs = regionLanguages(location_cc, resolver_layers);
        /** @type {Record<RangeTokenType, string[]>} */
        const range_meaning_index = { weekday: weekdays, month: months };
        /** @type {Record<RangeTokenType, { raw: string, token_index: number, warning_index: number|null }[]>} */
        let curr_rule_range_raw = { weekday: [], month: [] };
        /**
         * @param {string} raw - Raw range lexeme.
         * @param {string} range_type - Parser token type.
         * @param {number} token_index - Position in the current rule.
         * @param {number|null} [warning_index] - Associated correction warning.
         */
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
            /** @type {RangeTokenType[]} */
            const range_types = ['weekday', 'month'];
            for (const range_type of range_types) {
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
                    if (resolved.kind === 'foreign' && resolved.confidence === 'error') {
                        const token = curr_rule_tokens[entries[index].token_index];
                        const at = token ? token[2] : -1;
                        throw formatWarnErrorMessage(-1, at, resolved.message ?? formatLibraryBugMessage());
                    }
                    if (resolved.kind === 'unknown' || resolved.meaning === null) {
                        return;
                    }
                    // Correct the token to the context-resolved meaning, overriding a
                    // locale-blind flat-map guess (e.g. `ne`→Su becomes Th at a Sesotho
                    // location). The resolver — not the greedy map — is authoritative.
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
                        const alternatives = resolved.kind === 'foreign' ? resolved.alternatives ?? [] : [];
                        const has_note = alternatives.length > 0;
                        if (overridden || has_note) {
                            const raw_lexeme = entries[index].raw;
                            let message = t('please use English abbreviation ok for ko',
                                { ko: raw_lexeme, ok: resolved.meaning });
                            if (has_note) {
                                const alternative_note = alternatives
                                    .map(alt => alt.meaning + ' (' + alt.langs.join(', ') + ')')
                                    .join('; ');
                                message += ' ' + t('ambiguous elsewhere', { ko: raw_lexeme, alternatives: alternative_note });
                            }
                            // Rewrite exactly the warning this token produced (tracked
                            // by index), so a repeated lexeme in the same rule cannot
                            // patch the wrong occurrence.
                            const warn_idx = entries[index].warning_index;
                            if (warn_idx !== null && warn_idx >= 0 && warn_idx < parsing_warnings.length) {
                                const warning = parsing_warnings[warn_idx];
                                if (warning[2] === 'word_error_correction') {
                                    warning[3] = message;
                                }
                            }
                        }
                    }
                });
            }
            curr_rule_range_raw = { weekday: [], month: [] };
        };

        let last_rule_fallback_terminated = false;
        while (value !== '') {
            /* Ordered after likelihood of input for performance reasons.
             * Also, error tolerance is supposed to happen at the end.
             */
            // console.log("Parsing value: " + value);

            // Check correction phrases before the regular word and error-tolerance patterns.
            const phrase_correction = correction_lookup.findPhrase(value);
            const phrase_match = phrase_correction?.match;
            let tmp = phrase_match || value.match(TOKENIZER_WORD_REGEX);
            let token_from_map = undefined;
            if (!phrase_match && tmp && tmp[2] === '') {
                token_from_map = string_to_token_map[tmp[1].toLowerCase()];
            }
            if (tmp && typeof token_from_map === 'object') {
                curr_rule_tokens.push(createParserToken(token_from_map[0], token_from_map[1], value.length));
                recordRangeTerm(tmp[1], token_from_map[1], curr_rule_tokens.length - 1);
                value = value.slice(tmp[1].length);
            } else if ((tmp = value.match(/^\s+/))) {
                // whitespace is ignored
                value = value.slice(tmp[0].length);
            } else if ((tmp = value.match(/^24\/7/))) {
                // Reserved keyword.
                curr_rule_tokens.push([tmp[0], tmp[0], value.length ]);
                value = value.slice(tmp[0].length);
            } else if (/^;/.test(value)) {
                // semicolon terminates rule.
                // Next token belong to a new rule.
                finalizeRuleRanges();
                all_tokens.push([ curr_rule_tokens, last_rule_fallback_terminated, value.length ]);
                value = value.slice(1);

                curr_rule_tokens = [];
                last_rule_fallback_terminated = false;
            } else if (/^[:.]/.test(value)) {
                // Time separator (timesep).
                if (value[0] === '.') {
                    parsing_warnings.push([ -1, value.length - 1, 'hour_min_separator', t('hour min separator')]);
                }
                curr_rule_tokens.push([ ':', 'timesep', value.length ]);
                value = value.slice(1);
            } else if ((tmp = value.match(/^(?:PH|SH)/i))) {
                // special day name (holidays)
                curr_rule_tokens.push([tmp[0].toUpperCase(), 'holiday', value.length ]);
                value = value.slice(2);
            } else if ((tmp = value.match(/^[°\u2070-\u209F\u00B2\u00B3\u00B9]{1,2}/))) {
                const regular_number = normalizeUnicodeNumber(tmp[0]);
                let ok = '';
                if (curr_rule_tokens.length > 0 && matchTokens(curr_rule_tokens, curr_rule_tokens.length-1, 'number')) {
                    ok += ':';
                }
                ok += regular_number;
                for (let i = 0; i <= tmp[0].length; i++) {
                    if (value.charCodeAt(i) === 176) {
                        parsing_warnings.push([ -1, value.length - (1 + i),
                                'rant_degree_sign_used_for_zero', t('rant degree sign used for zero')]);
                    }
                }
                parsing_warnings.push([ -1, value.length - tmp[0].length,
                        'please_use_ok_for_ko', t('please use ok for ko', {'ko': tmp[0], 'ok': ok})]);
                value = ok + value.slice(tmp[0].length);
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
                let correct_val = returnCorrectWordOrToken(lower_word, value.length, phrase_correction?.correction);
                // A word_error_correction warning, if any, is the last one pushed by
                // returnCorrectWordOrToken; remember its index so the resolver can
                // rewrite exactly this warning later (not a same-word duplicate).
                const correction_warning_index = parsing_warnings.length > warn_count_before
                    ? parsing_warnings.length - 1
                    : null;
                // console.log('Error tolerance for string "' + tmp[1] + '" returned "' + correct_val + '".');
                if (typeof correct_val === 'object') {
                    curr_rule_tokens.push(createParserToken(correct_val[0], correct_val[1], value.length));
                    recordRangeTerm(lower_word, correct_val[1], curr_rule_tokens.length - 1);
                    value = value.slice(tmp[0].length);
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

                            if (hours_token && typeof hours_token[0] === 'number') {
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
                    const correct_tokens = tokenizeValue(correct_val)[0];
                    if (correct_tokens[1] === true) { // last_rule_fallback_terminated
                        throw formatLibraryBugMessage();
                    }
                    for (let i = 0; i < correct_tokens[0].length; i++) {
                        curr_rule_tokens.push(createParserToken(correct_tokens[0][i][0], correct_tokens[0][i][1], value.length));
                        // value.length - tmp[0].length does not have the desired effect for all test cases.
                    }
                    if (correct_tokens[0].length === 1) {
                        recordRangeTerm(lower_word, correct_tokens[0][0][1], curr_rule_tokens.length - 1, correction_warning_index);
                    }

                    value = value.slice(tmp[0].length);
                    // value = correct_val + value.substr(tmp[0].length);
                    // Does not work because it would generate the wrong length for formatWarnErrorMessage.
                } else {
                    /** @type {ParserToken|undefined} */
                    const previous_token = curr_rule_tokens[curr_rule_tokens.length - 1];
                    /** @type {{index: number, type: 'weekday'|'month'}|null} */
                    const recognized = isUnknownSingleLetterToken(previous_token)
                        ? null
                        : recognizeRangeToken(lower_word, resolver_layers, weekdays, months);
                    if (recognized && recognized.index >= 0) {
                        // Not in the flat map, but the cross-locale index recognises it
                        // as a weekday/month name. Push provisionally; finalizeRuleRanges
                        // resolves the actual meaning by locale/geo/coherence or rejects it.
                        curr_rule_tokens.push([recognized.index, recognized.type, value.length]);
                        // Emit the same "use the English abbreviation" hint the flat map
                        // used to; finalizeRuleRanges rewrites it if the resolved meaning
                        // differs from this provisional one.
                        const provisional = (recognized.type === 'weekday' ? weekdays : months)[recognized.index];
                        const recognition_warning_index = parsing_warnings.length;
                        parsing_warnings.push([
                            -1,
                            value.length - lower_word.length,
                            'word_error_correction',
                            t('please use English abbreviation ok for ko', { ko: lower_word, ok: provisional }),
                        ]);
                        recordRangeTerm(lower_word, recognized.type, curr_rule_tokens.length - 1, recognition_warning_index);
                        value = value.slice(tmp[0].length);
                    } else if (ambiguous_season_words.has(lower_word)) {
                        throw formatWarnErrorMessage(
                            -1,
                            value.length - tmp[0].length,
                            t('season words ambiguous')
                        );
                    } else {
                        // No correction available. Insert as single character token and let the parser handle the error.
                        curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length - 1 ]);
                        value = value.slice(1);
                    }
                }
                if (typeof tmp[2] === 'string' && tmp[2] !== '') {
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

                value = value.slice(tmp[1].length + (typeof tmp[2] === 'string' ? tmp[2].length : 0));
                if (typeof tmp[2] === 'string' && tmp[2] !== '') {
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
                value = value.slice(2);

                last_rule_fallback_terminated = true;
            } else if ((tmp = value.match(/^"([^"]+)"/))) {
                // Comment following the specification.
                // Any character is allowed inside the comment except " itself.
                curr_rule_tokens.push([tmp[1], 'comment', value.length ]);
                value = value.slice(tmp[0].length);
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
                value = value.slice(tmp[0].length);
            } else if (/^(?:␣|\s)/.test(value)) {
                // Using "␣" as space is not expected to be a normal
                // mistake. Just ignore it to make using taginfo easier.
                value = value.slice(1);
            } else {
                // other single-character tokens
                curr_rule_tokens.push([value[0].toLowerCase(), value[0].toLowerCase(), value.length ]);
                value = value.slice(1);
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
     * @param {import('./word-error-correction.mjs').Correction} [matched_correction] Selected phrase correction.
     * @returns {string|[number|string, string]|undefined} (valid) opening_hours sub string; object
     *     with [ internal_value, token_name ] if value is correct; or undefined
     *     if word could not be found (and thus is not corrected).
     */
    function returnCorrectWordOrToken(word, value_length, matched_correction) {
        let correctWordOrToken;
        /** @type {[number|string, string]|undefined} */
        const token_from_map = string_to_token_map[word];
        if (typeof token_from_map === 'object') {
            return token_from_map;
        }

        // Check for ambiguous words first - show warning and provide default correction
        /** @type {Record<string, string>} */
        const ambiguous_word_corrections = word_error_correction.ambiguous;
        if (ambiguous_word_corrections && ambiguous_word_corrections[word]) {
            const warningMessage = ambiguous_word_corrections[word];
            parsing_warnings.push([
                -1,
                value_length - word.length,
                'ambiguous_word',
                warningMessage
            ]);
            // For ambiguous words, extract the first possible correction from the warning message
            // and use it as a default to keep parsing working
            const warningText = ambiguous_word_corrections[word];
            const match = warningText.match(/: (\w+) \(/);
            if (match && match[1]) {
                return match[1]; // Return the first suggested correction (e.g. "Nov" from "Nov (Czech)")
            }
            // Fallback: continue with normal processing
            return undefined;
        }

        const correction = matched_correction || correction_lookup.findWord(word);
        if (correction) {
            const warningMessage = t(correction.comment, {'ko': word, 'ok': correction.replacement});

            parsing_warnings.push([
                -1,
                value_length - word.length,
                'word_error_correction',
                warningMessage
            ]);
            correctWordOrToken = correction.replacement;
        }

        return correctWordOrToken;
    }
    /* }}} */


    return tokenizeValue(value);
}
