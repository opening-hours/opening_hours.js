/*
 * SPDX-FileCopyrightText: © 2026 opening_hours.js contributors
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Layered, context-sensitive resolver for weekdays and months.
 *
 * Pure function — no I/O, no globals. Given a sequence of raw lexemes (e.g. the
 * operands of `Mo-Tr` or `Jan-Mär`), the active locale, the expected token TYPE
 * (which the parser's grammatical context always knows) and the generated layer
 * data, it resolves each token and reports a confidence per token and per range.
 *
 * Resolution order per token (within the expected type):
 *   Layer 0 canonical    → silent   (locale-neutral syntax, always valid)
 *   Layer 2 universal    → info     (unambiguous English aliases)
 *   Layer 3 cross-locale → info     if it matches the active locale
 *                        → warning  if it matches a language of the POI's country (geo tier-2)
 *                        → warning  if unambiguous AND coherent with neighbour tokens
 *                        → warning  if the value is purely foreign (no English anchor) and unambiguous
 *                        → error    if it mixes canonical English syntax with a foreign token, or is ambiguous
 *
 * The active locale is not a separate data layer — it is one of the trusted
 * languages applied to the cross-locale index (parallel to the geo languages).
 * A former per-locale table is fully recoverable from the cross-locale index by
 * base language, so it is neither generated nor consulted.
 *
 * Geo tier-2: the POI's country (from the nominatim country code) yields the set
 * of locally plausible languages. A foreign token that matches one of them is
 * accepted with a warning — this is what separates `Mo-Tr` `@DE` (reject, #588)
 * from `Mo-Tr` `@LT` (accept, Lithuanian) and `Mo-montag` `@DE` (accept, German).
 *
 * Coherence (two pass) resolves Layer 3 tokens against their neighbours:
 *   - `Mo-Tr` (en):  `Tr` only matches lt, no lt context, locale is en → ERROR (#588)
 *   - `Mo-Tr` (lt):  `Tr` is Lithuanian, matches active locale         → info
 *   - понедельник-пятница (en): both corroborate ru                    → warning
 */

import { normalizeToken } from './normalize.mjs';

const SEVERITY = { silent: 0, info: 1, warning: 2, error: 3 };
const SEVERITY_NAME = ['silent', 'info', 'warning', 'error'];

const CANONICAL_HINT = {
    weekday: 'Mo, Tu, We, Th, Fr, Sa, Su',
    month: 'Jan, Feb, Mar, … Dec',
};

function classify(raw, type, layers) {
    const token = normalizeToken(raw);
    const result = {
        raw, token, type, meaning: null, lang: null, layer: null,
        kind: 'unknown', confidence: 'error', candidates: null, message: null,
    };

    if (token in layers.canonical[type]) {
        return Object.assign(result, {
            meaning: layers.canonical[type][token], layer: 0, kind: 'canonical', confidence: 'silent',
        });
    }

    if (token in layers.universal[type]) {
        return Object.assign(result, {
            meaning: layers.universal[type][token], layer: 2, kind: 'universal', confidence: 'info',
        });
    }

    // Layer 3: only candidates matching the grammatically expected type.
    const candidates = (layers.crossLocale[token] || []).filter(candidate => candidate.type === type);
    if (candidates.length) {
        return Object.assign(result, { kind: 'foreign', candidates });
    }

    result.message = `Unknown ${type} token "${raw}".`;
    return result;
}

function uniqueMeaning(candidates) {
    const meanings = new Set(candidates.map(candidate => candidate.meaning));
    return meanings.size === 1 ? [...meanings][0] : null;
}

function candidateSummary(candidates) {
    return candidates
        .map(candidate => `${candidate.meaning} (${candidate.lang})`)
        .join(', ');
}

function resolveForeign(token, allForeign, localeLang, regionLangs, hasAnchor) {
    const candidates = token.candidates;

    // 1. Matches the active locale directly → accept.
    const localeMatches = candidates.filter(candidate => candidate.lang === localeLang);
    if (localeMatches.length) {
        const meaning = uniqueMeaning(localeMatches);
        if (meaning) {
            return Object.assign(token, { meaning, lang: localeLang, layer: 3, confidence: 'info' });
        }
    }

    // 1b. Geo tier-2: matches an official language of the POI's country → accept
    // with a warning (it may mean something else in another language).
    if (regionLangs && regionLangs.size) {
        const regionMatches = candidates.filter(candidate => regionLangs.has(candidate.lang));
        const meaning = uniqueMeaning(regionMatches);
        if (meaning) {
            const lang = regionMatches[0].lang;
            return Object.assign(token, {
                meaning, lang, layer: 3, confidence: 'warning',
                message: `Interpreted "${token.raw}" as ${meaning} (${lang}); a local language at this location.`,
            });
        }
    }

    // 2. Mutual corroboration: a sibling foreign token supports the same language.
    const neighbourLangs = new Set();
    for (const other of allForeign) {
        if (other === token) {
            continue;
        }
        for (const candidate of other.candidates) {
            neighbourLangs.add(candidate.lang);
        }
    }
    const sharedLangs = [...new Set(candidates.map(candidate => candidate.lang))]
        .filter(lang => neighbourLangs.has(lang))
        .sort((a, b) => a.localeCompare(b, 'en'));
    if (sharedLangs.length) {
        const lang = sharedLangs[0];
        const meaning = uniqueMeaning(candidates.filter(candidate => candidate.lang === lang));
        if (meaning) {
            return Object.assign(token, {
                meaning, lang, layer: 3, confidence: 'warning',
                message: `Interpreted "${token.raw}" as ${meaning} (${lang}); coherent with neighbouring tokens.`,
            });
        }
    }

    // 4. Pure-foreign value: no canonical/English anchor in the group. The user is
    //    writing consistently in a non-English language, not mixing a typo into
    //    English syntax (which is the `Mo-Tr` / #588 signature). Tolerate an
    //    unambiguous foreign token with a warning; only genuinely ambiguous ones
    //    (e.g. `listopad` = Nov/Oct) still need a locale/location.
    if (!hasAnchor) {
        const meaning = uniqueMeaning(candidates);
        if (meaning) {
            const lang = candidates.find(candidate => candidate.meaning === meaning).lang;
            return Object.assign(token, {
                meaning, lang, layer: 3, confidence: 'warning',
                message: `Interpreted "${token.raw}" as ${meaning} (${lang}); non-English value without a set locale or location.`,
            });
        }
    }

    // 5. Mixed canonical + foreign (suspicious, e.g. Mo-Tr) or ambiguous → reject.
    const hint = `Use a canonical abbreviation (${CANONICAL_HINT[token.type]}) or set the intended locale.`;
    token.confidence = 'error';
    token.layer = 3;
    token.meaning = uniqueMeaning(candidates);
    token.message = token.meaning
        ? `Token "${token.raw}" is not valid for locale "${localeLang}"; it only matches ${candidateSummary(candidates)}. ${hint}`
        : `Token "${token.raw}" is ambiguous across languages (${candidateSummary(candidates)}). ${hint}`;
    return token;
}

/**
 * Resolve a sequence of raw lexemes of a single grammatical type.
 * @param {string[]} rawTokens - e.g. ['Mo', 'Tr'] for `Mo-Tr`, ['Jan', 'Mär'] for `Jan-Mär`.
 * @param {{ locale: string, type: 'weekday'|'month', layers: object, regionLangs?: Set<string> }} options - Locale and resolver data.
 * @returns {{ ok: boolean, confidence: string, tokens: object[] }} Resolved tokens and overall confidence.
 */
export function resolveRange(rawTokens, { locale, type, layers, regionLangs }) {
    const localeLang = String(locale || '').split('-')[0].toLowerCase();

    // Pass A — classify every token by layer.
    const tokens = rawTokens.map(raw => classify(raw, type, layers));

    // Whether the value mixes canonical / universal English syntax with the
    // foreign token(s). Purely-foreign values are treated more leniently.
    const hasAnchor = tokens.some(token => token.kind === 'canonical' || token.kind === 'universal');

    // Pass B — resolve foreign (Layer 3) tokens using neighbour context + geo tier-2.
    const foreign = tokens.filter(token => token.kind === 'foreign');
    for (const token of foreign) {
        resolveForeign(token, foreign, localeLang, regionLangs, hasAnchor);
        // For an accepted but cross-locale ambiguous token, record the alternative
        // meanings (and the languages that use them) so the caller can warn that the
        // same lexeme means something else elsewhere.
        if (token.meaning && token.confidence !== 'error' && Array.isArray(token.candidates)) {
            const byMeaning = new Map();
            for (const candidate of token.candidates) {
                if (!byMeaning.has(candidate.meaning)) {
                    byMeaning.set(candidate.meaning, new Set());
                }
                byMeaning.get(candidate.meaning).add(candidate.lang);
            }
            if (byMeaning.size > 1) {
                token.alternatives = [...byMeaning.entries()]
                    .filter(([meaning]) => meaning !== token.meaning)
                    .map(([meaning, langs]) => ({
                        meaning,
                        langs: [...langs].sort((a, b) => a.localeCompare(b, 'en')),
                    }));
            }
        }
    }

    const severity = tokens.reduce((max, token) => Math.max(max, SEVERITY[token.confidence]), 0);
    return {
        ok: severity < SEVERITY.error,
        confidence: SEVERITY_NAME[severity],
        tokens,
    };
}
