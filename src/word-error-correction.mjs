// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/** @typedef {Record<string, Record<string, string>>} CorrectionCategories */
/** @typedef {{ literal: CorrectionCategories, regex: CorrectionCategories, ambiguous: Record<string, string> }} WordErrorCorrectionData */
/** @typedef {{ pattern: string, replacement: string, comment: string }} Correction */
/** @typedef {{ correction: Correction, match: string[] }} PhraseCorrection */

/**
 * @param {CorrectionCategories} categories Warning categories and their rules.
 * @returns {Correction[]} Flattened correction rules in data order.
 */
function flattenCorrections(categories) {
    return Object.entries(categories).flatMap(([comment, entries]) =>
        Object.entries(entries).map(([pattern, replacement]) => ({ pattern, replacement, comment }))
    );
}

/**
 * @param {string} pattern Correction pattern.
 * @returns {RegExp} Anchored phrase matcher with an optional trailing dot.
 */
function compilePhrase(pattern) {
    return new RegExp('^(' + pattern + ')(\\.?)(?=$|[^\\p{L}\\p{N}_])', 'iu');
}

/**
 * @param {WordErrorCorrectionData} data Literal and regex correction rules.
 * @returns {{ findWord: (word: string) => Correction|undefined, findPhrase: (input: string) => PhraseCorrection|undefined }} Correction lookup.
 */
export function createCorrectionLookup(data) {
    const literalEntries = flattenCorrections(data.literal);
    const literals = new Map(literalEntries.map(correction => [correction.pattern.toLowerCase(), correction]));
    const regexEntries = flattenCorrections(data.regex).map(correction => ({
        correction,
        matcher: new RegExp('^(?:' + correction.pattern + ')$', 'iu'),
    }));
    const phrases = [
        ...literalEntries.filter(({ pattern }) => pattern.includes(' ')).map(correction => ({
            correction,
            matcher: compilePhrase(correction.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        })),
        ...regexEntries.filter(({ correction }) => correction.pattern.includes(' ') || correction.pattern.includes('\\s'))
            .map(({ correction }) => ({ correction, matcher: compilePhrase(correction.pattern) })),
    ];

    return {
        findWord(word) {
            return literals.get(word.toLowerCase())
                || regexEntries.find(({ matcher }) => matcher.test(word))?.correction;
        },
        findPhrase(input) {
            /** @type {PhraseCorrection|undefined} */
            let longest;
            for (const { correction, matcher } of phrases) {
                const match = input.match(matcher);
                if (match && match[1].length > 0 && (!longest || match[1].length > longest.match[1].length)) {
                    longest = { correction, match };
                }
            }
            return longest;
        },
    };
}
