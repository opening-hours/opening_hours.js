/*
 * SPDX-FileCopyrightText: © 2026 opening_hours.js contributors
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Geo tier-2 source: map a POI country code to the set of languages that are
 * plausible at that location (its official languages).
 *
 * The data itself is generated from CLDR `territoryInfo` into `layers.regionLangs`
 * (see gen_locale_resolver_layers.mjs), so this module ships no CLDR dependency — it only looks
 * up and caches.
 */

const cache = new Map();

/**
 * @param {string|undefined} countryCode - e.g. "de", "LT" (case-insensitive).
 * @param {{ regionLangs?: Record<string, string[]> }} layers - generated layer data; uses `layers.regionLangs`.
 * @returns {Set<string>} language codes plausible at that location (may be empty).
 */
export function regionLanguages(countryCode, layers) {
    if (typeof countryCode !== 'string' || countryCode === '') {
        return new Set();
    }
    const cc = countryCode.toLowerCase();
    if (cache.has(cc)) {
        return cache.get(cc);
    }

    const generated = (layers && layers.regionLangs && layers.regionLangs[cc]) || [];
    const langs = new Set(generated);

    cache.set(cc, langs);
    return langs;
}

/** Test helper: drop memoised results (e.g. between unit tests with different data). */
export function clearRegionLanguageCache() {
    cache.clear();
}
