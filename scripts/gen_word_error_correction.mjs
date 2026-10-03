/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Word Error Correction Generator
 *
 * Generates multilingual word-correction data used by opening_hours.js.
 * Preserves manual corrections and derives ambiguity warnings from CLDR locale data.
 *
 * Features:
 * - Uses pinned CLDR package data for deterministic generation
 * - Scans localized weekday and month terms (long and short forms)
 * - Detects ambiguous words with different meanings across languages
 * - Generates warnings for conflicts (e.g., "listopad": Oct in Croatian vs Nov in Czech/Polish)
 *
 * Input:
 * - src/locales/word_error_correction_manual.yaml (manual corrections)
 * - cldr-dates-full (localized date/time terms)
 * - cldr-localenames-full (locale code to language name mapping)
 *
 * Output:
 * - src/locales/word_error_correction.yaml containing:
 *   • All manual corrections (preserved as-is)
 *   • "Ambiguous words" section with conflict warnings
 *   • Source/version metadata for reproducible generation
 *
 * Weekday/month names are resolved by the locale resolver at runtime,
 * so this generator no longer emits them as flat corrections.
 * CLDR is still analyzed here to detect genuinely ambiguous words.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

console.log('═══════════════════════════════════════');
console.log('Word Error Correction Generator');
console.log('═══════════════════════════════════════\n');

const basePath = process.cwd();
const localesPath = path.resolve(basePath, 'src/locales');
const manualYamlPath = path.join(localesPath, 'word_error_correction_manual.yaml');
const outputPath = path.join(localesPath, 'word_error_correction.yaml');

const cldrDatesMainPath = path.resolve(basePath, 'node_modules/cldr-dates-full/main');
const cldrLocalenamesPath = path.resolve(
    basePath,
    'node_modules/cldr-localenames-full/main/en/languages.json'
);

// Keep English abbreviations explicit and stable across runtime/CLDR updates.
const monthAbbreviations = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const weekdayAbbreviations = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** @typedef {Record<string, string | undefined>} LocalizedTerms */
/** @typedef {{ wide?: LocalizedTerms, abbreviated?: LocalizedTerms }} LocalizedTermForms */
/** @typedef {{ format?: LocalizedTermForms, 'stand-alone'?: LocalizedTermForms }} CalendarNameData */
/** @typedef {{ months?: CalendarNameData, days?: { format?: LocalizedTermForms } }} GregorianData */
/** @typedef {{ locale: string, meaning: string, type: string, form: string }} WordConflictOccurrence */
/** @typedef {{ warning: string, occurrences: WordConflictOccurrence[] }} AmbiguousWord */

/**
 * Read and parse a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {ReturnType<typeof JSON.parse>} Parsed JSON value.
 */
function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Normalize a value for case-insensitive matching.
 * @param {unknown} term - Value to normalize.
 * @returns {string} Normalized term.
 */
function normalizeTerm(term) {
    return String(term || '').trim().toLowerCase();
}

/**
 * Sort an object's keys alphabetically.
 * @param {object} obj - Object whose keys to sort.
 * @returns {string[]} Sorted keys.
 */
function sortedKeys(obj) {
    return Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Sort a string map alphabetically by key.
 * @param {Record<string, string>} obj - Map to sort.
 * @returns {Record<string, string>} Sorted map.
 */
function sortObject(obj) {
    return Object.fromEntries(sortedKeys(obj).map(key => [key, obj[key]]));
}

function listCldrLocales() {
    if (!fs.existsSync(cldrDatesMainPath)) {
        throw new Error(`CLDR dates path does not exist: ${cldrDatesMainPath}`);
    }

    return fs.readdirSync(cldrDatesMainPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(locale => fs.existsSync(path.join(cldrDatesMainPath, locale, 'ca-gregorian.json')))
        .sort((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Load Gregorian calendar data for a locale.
 * @param {string} locale - CLDR locale identifier.
 * @returns {GregorianData | undefined} Parsed Gregorian calendar data, if present.
 */
function loadGregorianData(locale) {
    const filePath = path.join(cldrDatesMainPath, locale, 'ca-gregorian.json');
    const data = readJson(filePath);
    return data?.main?.[locale]?.dates?.calendars?.gregorian;
}

/**
 * Resolve a locale code to its display name.
 * @param {string} locale - Locale identifier.
 * @param {Record<string, string>} languageNames - CLDR language display names.
 * @returns {string} Display name or the locale identifier as fallback.
 */
function languageName(locale, languageNames) {
    return languageNames[locale]
        || languageNames[locale.split('-')[0]]
        || locale;
}

/**
 * Collect localized weekday and month terms for a locale.
 * Months include both 'format' and 'stand-alone' forms; weekdays use 'format'.
 * @param {GregorianData} gregorian - CLDR Gregorian calendar data.
 * @returns {{ raw: string | undefined, meaning: string, type: string, form: string }[]} Localized terms.
 */
function collectTerms(gregorian) {
    const months = gregorian?.months || {};
    const days = gregorian?.days || {};
    const monthWide = months.format?.wide || {};
    const monthAbbr = months.format?.abbreviated || {};
    const monthSaWide = months['stand-alone']?.wide || {};
    const monthSaAbbr = months['stand-alone']?.abbreviated || {};
    const dayWide = days.format?.wide || {};
    const dayAbbr = days.format?.abbreviated || {};

    const terms = [];
    for (let i = 0; i < 12; i++) {
        const meaning = monthAbbreviations[i];
        const key = String(i + 1);
        terms.push({ raw: monthWide[key], meaning, type: 'month', form: 'long' });
        terms.push({ raw: monthSaWide[key], meaning, type: 'month', form: 'long' });
        terms.push({ raw: monthAbbr[key], meaning, type: 'month', form: 'short' });
        terms.push({ raw: monthSaAbbr[key], meaning, type: 'month', form: 'short' });
    }
    for (let i = 0; i < 7; i++) {
        const meaning = weekdayAbbreviations[i];
        const key = weekdayKeys[i];
        terms.push({ raw: dayWide[key], meaning, type: 'weekday', form: 'long' });
        terms.push({ raw: dayAbbr[key], meaning, type: 'weekday', form: 'short' });
    }
    return terms;
}

// 1. Load manual corrections
console.log('► Loading manual corrections...');
/** @type {Record<string, Record<string, string>>} */
let manualCorrections = {};
if (fs.existsSync(manualYamlPath)) {
    manualCorrections = yaml.parse(fs.readFileSync(manualYamlPath, 'utf8')) || {};
    const totalManual = Object.values(manualCorrections)
        .reduce((sum, category) => sum + Object.keys(category).length, 0);
    console.log(`  ✓ Loaded ${totalManual} manual entries from: ${path.relative(basePath, manualYamlPath)}`);
} else {
    console.log(`  ✗ Manual corrections file not found: ${manualYamlPath}`);
}

// 2. Load locale data from pinned CLDR packages
console.log('\n► Loading CLDR locale data...');
const supportedLocales = listCldrLocales();
console.log(`  ✓ Found ${supportedLocales.length} CLDR locales`);

const cldrDatesVersion = readJson(path.resolve(basePath, 'node_modules/cldr-dates-full/package.json')).version;
const cldrLocalenamesVersion = readJson(path.resolve(basePath, 'node_modules/cldr-localenames-full/package.json')).version;
console.log(`  → cldr-dates-full: ${cldrDatesVersion}`);
console.log(`  → cldr-localenames-full: ${cldrLocalenamesVersion}`);
console.log(`  → Will analyze ${supportedLocales.length} locales for conflicts and corrections`);

const languageNames = readJson(cldrLocalenamesPath)?.main?.en?.localeDisplayNames?.languages || {};

// 3. Preserve structure - copy manual corrections as base
const finalData = { ...manualCorrections };

const ambiguousWordsCategory = 'Ambiguous words';
if (!finalData[ambiguousWordsCategory]) {
    finalData[ambiguousWordsCategory] = {};
}

const autoCategory = 'please use English abbreviation ok for ko';
if (!finalData[autoCategory]) {
    finalData[autoCategory] = {};
}

/** @type {Record<string, WordConflictOccurrence[]>} */
const wordConflicts = {};

/**
 * Record a word's occurrence in a locale.
 * @param {string} word - Normalized word.
 * @param {string} locale - Locale where the word occurs.
 * @param {string} meaning - English month or weekday abbreviation.
 * @param {string} type - Whether the meaning is a month or weekday.
 * @param {string} form - Long or short localized form.
 */
function addWordConflict(word, locale, meaning, type, form) {
    if (!wordConflicts[word]) {
        wordConflicts[word] = [];
    }
    wordConflicts[word].push({ locale, meaning, type, form });
}

// Load and extract each locale's terms once; reused by both phases below.
const localeTerms = supportedLocales
    .flatMap(locale => {
        const gregorian = loadGregorianData(locale);
        return gregorian ? [{ locale, terms: collectTerms(gregorian) }] : [];
    });

// 4. Detect ambiguous words by analyzing conflicts across languages
console.log('\n► Detecting ambiguous words...');
for (const { locale, terms } of localeTerms) {
    for (const { raw, meaning, type, form } of terms) {
        const term = normalizeTerm(raw);
        if (term && term !== meaning.toLowerCase()) {
            addWordConflict(term, locale, meaning, type, form);
        }
    }
}

/** @type {Record<string, AmbiguousWord>} */
const ambiguousWords = {};
for (const word of sortedKeys(wordConflicts)) {
    const occurrences = wordConflicts[word];
    const uniqueMeanings = [...new Set(occurrences.map(occ => occ.meaning))];

    if (uniqueMeanings.length > 1) {
        const conflictInfo = [];
        const seen = new Set();
        for (const occ of occurrences) {
            const label = `${occ.meaning} (${languageName(occ.locale, languageNames)})`;
            if (seen.has(label)) {
                continue;
            }
            seen.add(label);
            conflictInfo.push(label);
        }

        ambiguousWords[word] = {
            warning: `Word "${word}" is ambiguous: ${conflictInfo.join(' or ')}. Please specify language context or use English ${occurrences[0].type} name.`,
            occurrences
        };
    }
}

for (const word of sortedKeys(ambiguousWords)) {
    const hasShortForm = ambiguousWords[word].occurrences.some(occ => occ.form === 'short');
    if (!hasShortForm) {
        finalData[ambiguousWordsCategory][word] = ambiguousWords[word].warning;
    }
}
console.log(`  → Ambiguous words tracked: ${Object.keys(ambiguousWords).length}`);

// 5. Weekday/month names are no longer auto-generated as flat corrections.
// They are resolved by the locale resolver at runtime, while this generator
// keeps manual corrections and ambiguity warnings only.

finalData[autoCategory] = sortObject(finalData[autoCategory]);
finalData[ambiguousWordsCategory] = sortObject(finalData[ambiguousWordsCategory]);

// 6. Write final YAML structure
console.log('\n► Writing output file...');
const yamlOutput = yaml.stringify(finalData, {
    defaultStringType: 'PLAIN',
    lineWidth: 0
});

const finalYamlContent = `---
# Generated word_error_correction.yaml
# Sources:
#   - Manual corrections: ${path.relative(basePath, manualYamlPath)}
#   - CLDR dates: cldr-dates-full@${cldrDatesVersion}
#   - CLDR language names: cldr-localenames-full@${cldrLocalenamesVersion}
# Note: Ambiguous words are handled in separate section with warnings

${yamlOutput}`;

fs.writeFileSync(outputPath, finalYamlContent, 'utf8');

console.log('\n=======================================');
console.log('Final Statistics');
console.log('=======================================');
console.log(`Output file: ${path.relative(basePath, outputPath)}`);
console.log(`Categories: ${Object.keys(finalData).length}`);
console.log('\nCategory breakdown:');

let totalEntries = 0;
for (const category of Object.keys(finalData)) {
    const count = Object.keys(finalData[category]).length;
    totalEntries += count;
    console.log(`  ▪ ${category}: ${count} entries`);
}

console.log(`\n→ Total corrections: ${totalEntries}`);
console.log(`→ Ambiguous words: ${Object.keys(finalData[ambiguousWordsCategory] || {}).length} (warnings only)`);
console.log('\n✓ Word error correction generation completed successfully!');
