/**
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
import resources from './translations.yaml';

/**
 * Replace `{{varName}}` (or `{{-varName}}`) placeholders in a translation string.
 * The `-` prefix is a legacy i18next no-HTML-escape marker; it has no effect here.
 *
 * @param {string} str  - Translation string containing `{{…}}` placeholders.
 * @param {Object} vars - Map of placeholder names to replacement values.
 * @returns {string}
 */
function interpolate(str, vars) {
    return str.replace(/{{-?([^{}]*)}}/g, function(match, varName) {
        const name = varName.trim();
        if (name in vars) {
            return vars[name];
        }
        return match;
    });
}

/**
 * Extract the base language subtag from a locale tag (e.g. 'de-DE' → 'de').
 *
 * Accepts BCP 47 tags (e.g. 'de-DE') and POSIX identifiers per ISO 15897 (e.g. 'de_DE').
 * For non-strings, returns 'en' (the default fallback locale).
 *
 * @param {string|null|undefined} locale - Locale tag.
 * @returns {string} Base language, e.g. 'de'.
 */
function baseLanguage(locale) {
    if (locale && typeof locale === 'string') {
        return locale.split(/[-_]/)[0];
    }
    return 'en';
}

/**
 * Build the locale fallback chain for a given locale tag.
 *
 * 'de-DE' → ['de-DE', 'de', 'en']
 * 'de'    → ['de', 'en']
 * null    → ['en']
 *
 * @param {string|null|undefined} locale - BCP 47 locale tag.
 * @returns {string[]}
 */
function localeChain(locale) {
    const base = baseLanguage(locale);
    // Deduplicate entries like ['de', 'de', 'en'] or ['en', 'en'].
    return [...new Set([locale, base, 'en'].filter(Boolean))];
}

/**
 * Walk the resource tree for the first locale in the fallback chain that has
 * a translation for the given key.
 *
 * Tree shape: resources[locale].opening_hours[section][key]
 *
 * @param {string|null|undefined} locale  - BCP 47 locale tag.
 * @param {string}                section - 'texts' or 'pretty'.
 * @param {string}                key     - Translation key (dot-separated for nesting).
 * @returns {*} Matched value, or `undefined` if not found anywhere in the chain.
 */
function lookup(locale, section, key) {
    const keyPath = key.split('.');
    for (const loc of localeChain(locale)) {
        // Navigate to resources[locale].opening_hours[section], then drill down by key path.
        let value = resources[loc]?.opening_hours?.[section];
        for (const segment of keyPath) value = value?.[segment];
        // Return as soon as we find a value defined by the resource tree.
        if (value !== undefined) return value;
    }
    return undefined;
}

/**
 * Translate a key into the requested locale, falling back through the locale
 * chain to English. Returns the key itself when no translation is found.
 *
 * @param {string|null|undefined} locale  - BCP 47 locale tag (e.g. 'de', 'de-DE').
 * @param {string}                section - 'texts' (error/warning messages) or
 *                                          'pretty' (prettified output tokens).
 * @param {string}                key     - Translation key (dot-separated for nesting).
 * @param {Object}               [vars]   - Variables to interpolate via `{{varName}}`.
 * @returns {string}
 */
export function translate(locale, section, key, vars) {
    const result = lookup(locale, section, key);

    if (typeof result === 'string') {
        if (vars) {
            return interpolate(result, vars);
        }
        return result;
    }

    return key;
}
