/**
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
import resources from './translations.yaml';

/**
 * Replace `{{varName}}` (or `{{-varName}}`) placeholders in a translation string.
 * The `-` prefix is a legacy i18next no-HTML-escape marker; it has no effect here.
 * @param {string} str  - Translation string containing `{{…}}` placeholders.
 * @param {Record<string, unknown>} vars - Map of placeholder names to replacement values.
 * @returns {string} The interpolated translation string.
 */
function interpolate(str, vars) {
    return str.replace(/{{-?([^{}]*)}}/g, function(match, varName) {
        const name = varName.trim();
        if (name in vars) {
            return String(vars[name]);
        }
        return match;
    });
}

/**
 * Extract the base language subtag from a locale tag (e.g. 'de-DE' → 'de').
 *
 * Accepts BCP 47 tags (e.g. 'de-DE') and POSIX identifiers per ISO 15897 (e.g. 'de_DE').
 * For non-strings, returns 'en' (the default fallback locale).
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
 * @param {string|null|undefined} locale - BCP 47 locale tag.
 * @returns {string[]} Locale tags ordered from most to least specific.
 */
function localeChain(locale) {
    const base = baseLanguage(locale);
    // Deduplicate entries like ['de', 'de', 'en'] or ['en', 'en'].
    const locales = locale ? [locale, base, 'en'] : [base, 'en'];
    return [...new Set(locales)];
}

/**
 * Translate a key into the requested locale, falling back through the locale
 * chain to English. Returns the key itself when no translation is found.
 * @param {string|null|undefined} locale   - BCP 47 locale tag (e.g. 'de', 'de-DE').
 * @param {string}                section  - 'texts' (error/warning messages) or
 *                                           'pretty' (prettified output tokens).
 * @param {string}                key      - Translation key.
 * @param {Record<string, unknown>} [vars] - Variables to interpolate via `{{varName}}`.
 * @returns {string} The translated string, or the key when no translation exists.
 */
export function translate(locale, section, key, vars) {
    for (const loc of localeChain(locale)) {
        const result = resources[loc]?.[section]?.[key];
        if (typeof result === 'string') {
            return vars ? interpolate(result, vars) : result;
        }
    }
    return key;
}
