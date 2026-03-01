/*
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Word Error Correction Generator
 *
 * Generates a comprehensive multilingual word error correction database for the opening_hours.js library.
 * Combines manual corrections with automatically generated corrections from international date/time data.
 *
 * Features:
 * - Discovers 240+ supported locales using Intl.DateTimeFormat
 * - Extracts localized weekday and month names (long & short forms) via Intl.DateTimeFormat
 * - Converts locale codes to readable language names via Intl.DisplayNames
 * - Detects ambiguous words with different meanings across languages
 * - Generates warnings for conflicts (e.g., "listopad": Oct in Croatian vs Nov in Czech/Polish)
 * - Uses native JavaScript APIs without external dependencies
 *
 * Input:
 * - src/locales/word_error_correction_manual.yaml (manual corrections)
 * - Intl.DateTimeFormat API (localized date/time terms)
 * - Intl.DisplayNames API (locale code → language name mapping)
 *
 * Output:
 * - src/locales/word_error_correction.yaml containing:
 *   • All manual corrections (preserved as-is)
 *   • 2400+ automatic corrections for weekdays/months
 *   • "Ambiguous words" section with conflict warnings
 *   • Complete source documentation
 */

import fs from 'node:fs';
import yaml from 'yaml';
import path from 'node:path';

console.log('═══════════════════════════════════════');
console.log('Word Error Correction Generator');
console.log('═══════════════════════════════════════\n');

// Define file paths
const basePath = path.resolve(process.cwd(), 'src/locales');
const manualYamlPath = path.join(basePath, 'word_error_correction_manual.yaml');
const outputPath = path.join(basePath, 'word_error_correction.yaml');

// 1. Load manual corrections
console.log('► Loading manual corrections...');
let manualCorrections = {};
if (fs.existsSync(manualYamlPath)) {
    const manualYamlContent = fs.readFileSync(manualYamlPath, 'utf8');
    manualCorrections = yaml.parse(manualYamlContent) || {};

    const totalManual = Object.values(manualCorrections)
        .reduce((sum, category) => sum + Object.keys(category).length, 0);

    console.log(`  ✓ Loaded ${totalManual} manual entries from: ${path.relative(process.cwd(), manualYamlPath)}`);
} else {
    console.log(`  ✗ Manual corrections file not found: ${manualYamlPath}`);
}

// 2. Add automatic corrections for all available languages
console.log('\n► Discovering supported locales...');

// Dynamic discovery of all available locales using pattern-based testing
console.log('  → Testing locale patterns (aa-zz and aaa-zzz)...');
const discoveredLocales = [];

// Test all 2-letter locale codes (aa to zz) for Intl support
const letters = 'abcdefghijklmnopqrstuvwxyz';
console.log('    → Testing 2-letter codes...');
for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
        const locale = letters[i] + letters[j];
        try {
            const supported = Intl.DateTimeFormat.supportedLocalesOf([locale]);
            if (supported.length > 0) {
                discoveredLocales.push(locale);
            }
        } catch {
            // Ignore unsupported locales
        }
    }
}

const twoLetterCount = discoveredLocales.length;
console.log(`    ✓ Found ${twoLetterCount} supported 2-letter locales`);

// Test all 3-letter locale codes (aaa to zzz) for Intl support
console.log('    → Testing 3-letter codes...');
for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
        for (let k = 0; k < letters.length; k++) {
            const locale = letters[i] + letters[j] + letters[k];
            try {
                const supported = Intl.DateTimeFormat.supportedLocalesOf([locale]);
                if (supported.length > 0) {
                    discoveredLocales.push(locale);
                }
            } catch {
                // Ignore unsupported locales
            }
        }
    }
}

const threeLetterCount = discoveredLocales.length - twoLetterCount;
console.log(`    ✓ Found ${threeLetterCount} additional 3-letter locales`);
console.log(`    → Total discovered: ${discoveredLocales.length} locales`);

// Filter discovered locales to get only those actually supported by Intl.DateTimeFormat
const supportedLocales = Intl.DateTimeFormat.supportedLocalesOf(discoveredLocales);

console.log(`  ✓ Discovered ${discoveredLocales.length} base locales, ${supportedLocales.length} supported`);
console.log(`  → Will analyze ${supportedLocales.length} languages for conflicts and corrections`);

// Helper function to escape regex special characters in automatically generated keys
// This prevents issues like "ma." being treated as regex wildcard instead of literal "ma."
// Manual corrections in word_error_correction_manual.yaml can still contain regex patterns
function escapeRegexCharacters(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate dynamic month and weekday abbreviations using English locale as reference
const currentYear = new Date().getFullYear();
const englishMonthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
const englishWeekdayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short' });

// Generate dynamic abbreviations for months (Jan, Feb, Mar, ...)
const monthAbbreviations = [];
for (let i = 0; i < 12; i++) {
    const date = new Date(currentYear, i, 1);
    monthAbbreviations.push(englishMonthFormatter.format(date));
}

// Generate dynamic abbreviations for weekdays (Su, Mo, Tu, ...)
// Note: Using 2-letter abbreviations as expected by the opening_hours system
const weekdayAbbreviations = [];
const firstSunday = new Date(currentYear, 0, 7 - new Date(currentYear, 0, 1).getDay()); // Find first Sunday
for (let i = 0; i < 7; i++) {
    const date = new Date(firstSunday);
    date.setDate(firstSunday.getDate() + i);
    const fullAbbr = englishWeekdayFormatter.format(date);
    // Convert 3-letter to 2-letter abbreviations (Sun -> Su, Mon -> Mo, etc.)
    weekdayAbbreviations.push(fullAbbr.substring(0, 2));
}

// 3. Preserve structure - copy manual corrections as base
const finalData = { ...manualCorrections };

// 4. Detect ambiguous words by analyzing conflicts across languages
console.log('\n► Detecting ambiguous words...');

function addWordConflict(wordConflicts, word, locale, meaning, type, form) {
    if (!wordConflicts[word]) {
        wordConflicts[word] = [];
    }
    wordConflicts[word].push({ locale, meaning, type, form });
}

const wordConflicts = {};
const languageInfo = {};

supportedLocales.forEach(locale => {
    try {
        // Get language name for better descriptions
        if (!languageInfo[locale]) {
            try {
                const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
                languageInfo[locale] = displayNames.of(locale);
            } catch {
                languageInfo[locale] = locale.charAt(0).toUpperCase() + locale.slice(1);
            }
        }

        const formatters = {
            monthLong: new Intl.DateTimeFormat(locale, { month: 'long' }),
            monthShort: new Intl.DateTimeFormat(locale, { month: 'short' }),
            weekdayLong: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
            weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short' })
        };

        // Check months and weekdays for conflicts
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const monthLong = formatters.monthLong.format(date).toLowerCase();
            const monthShort = formatters.monthShort.format(date).toLowerCase();

            if (monthLong && monthLong !== monthAbbreviations[i].toLowerCase()) {
                addWordConflict(wordConflicts, monthLong, locale, monthAbbreviations[i], 'month', 'long');
            }
            if (monthShort && monthShort !== monthAbbreviations[i].toLowerCase()) {
                addWordConflict(wordConflicts, monthShort, locale, monthAbbreviations[i], 'month', 'short');
            }
        }

        for (let i = 0; i < 7; i++) {
            const date = new Date(firstSunday);
            date.setDate(firstSunday.getDate() + i);
            const weekdayLong = formatters.weekdayLong.format(date).toLowerCase();
            const weekdayShort = formatters.weekdayShort.format(date).toLowerCase();

            if (weekdayLong && weekdayLong !== weekdayAbbreviations[i].toLowerCase()) {
                addWordConflict(wordConflicts, weekdayLong, locale, weekdayAbbreviations[i], 'weekday', 'long');
            }
            if (weekdayShort && weekdayShort !== weekdayAbbreviations[i].toLowerCase()) {
                addWordConflict(wordConflicts, weekdayShort, locale, weekdayAbbreviations[i], 'weekday', 'short');
            }
        }

    } catch (error) {
        console.log(`  ✗ Error processing ${locale}: ${error.message}`);
    }
});

// Identify conflicts and add to ambiguous words section
const ambiguousWordsCategory = 'Ambiguous words';
if (!finalData[ambiguousWordsCategory]) {
    finalData[ambiguousWordsCategory] = {};
}

const ambiguousWords = {};

Object.keys(wordConflicts).forEach(word => {
    const occurrences = wordConflicts[word];
    if (occurrences.length > 1) {
        // Check if the meanings are actually different
        const uniqueMeanings = [...new Set(occurrences.map(occ => occ.meaning))];
        if (uniqueMeanings.length > 1) {
            // This is a genuine conflict! Create warning message
            const conflictInfo = occurrences.map(occ =>
                `${occ.meaning} (${languageInfo[occ.locale]})`
            );

            ambiguousWords[word] = {
                warning: `Word "${word}" is ambiguous: ${conflictInfo.join(' or ')}. Please specify language context or use English ${occurrences[0].type} name.`,
                occurrences: occurrences
            };
        }
    }
});

// Add ambiguous words to the final data structure (only long forms, discard short forms)
Object.keys(ambiguousWords).forEach(word => {
    // Check if this word is a short form by looking at its occurrences
    const hasShortForm = ambiguousWords[word].occurrences.some(occ => occ.form === 'short');

    if (!hasShortForm) {
        // Only add long form ambiguous words as warnings
        finalData[ambiguousWordsCategory][word] = ambiguousWords[word].warning;
    } else {
        console.log(`    → Discarding ambiguous short form "${word}" (no warning added)`);
    }
});

// Display statistics for detected ambiguous words
console.log(`  ✓ Found ${Object.keys(ambiguousWords).length} ambiguous words:`);
Object.keys(ambiguousWords).forEach(word => {
    const conflicts = ambiguousWords[word].occurrences.map(occ =>
        `${occ.meaning} (${languageInfo[occ.locale]}${occ.form ? '/' + occ.form : ''})`
    ).join(' vs ');
    console.log(`    ▪ ${word}: ${conflicts}`);
});

// 5. Generate automatic corrections for all supported languages
console.log('\n► Generating automatic corrections...');
console.log(`  → Processing ${supportedLocales.length} locales...`);

// Dynamic category name generation based on existing manual corrections
// Use the main "ko" category for automatic corrections, not the small "so" category
const autoCategory = 'please use English abbreviation ok for ko';
if (!finalData[autoCategory]) {
    finalData[autoCategory] = {};
}

let totalAutoCorrections = 0;
let numericKeysFiltered = 0;
let existingKeysFiltered = 0;
let ambiguousKeysFiltered = 0;

// Collect all existing keys from manual corrections to avoid conflicts
const existingKeys = new Set();
Object.keys(manualCorrections).forEach(category => {
    Object.keys(manualCorrections[category]).forEach(key => {
        existingKeys.add(key.toLowerCase());
    });
});

console.log(`  → Found ${existingKeys.size} existing manual correction keys to avoid conflicts`);

supportedLocales.forEach(locale => {
    try {
        const weekdayLongFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
        const weekdayShortFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        const monthLongFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });
        const monthShortFormatter = new Intl.DateTimeFormat(locale, { month: 'short' });

        let localeCount = 0;

        // Generate weekday corrections (long forms)
        for (let i = 0; i < 7; i++) {
            const date = new Date(firstSunday);
            date.setDate(firstSunday.getDate() + i);
            const localWeekdayLong = weekdayLongFormatter.format(date).toLowerCase();
            if (localWeekdayLong && localWeekdayLong !== weekdayAbbreviations[i].toLowerCase()) {
                // Check if it's a numeric key and count it
                if (/^\d+$/.test(localWeekdayLong)) {
                    numericKeysFiltered++;
                } else if (existingKeys.has(localWeekdayLong)) {
                    // Check if it conflicts with existing manual corrections
                    existingKeysFiltered++;
                } else if (ambiguousWords[localWeekdayLong]) {
                    // Skip ambiguous words - they are only warnings
                    ambiguousKeysFiltered++;
                    continue;
                } else if (!finalData[autoCategory][localWeekdayLong]) {
                    // Escape regex special characters in automatically generated keys
                    const escapedKey = escapeRegexCharacters(localWeekdayLong);
                    finalData[autoCategory][escapedKey] = weekdayAbbreviations[i];
                    localeCount++;
                }
            }
        }

        // Generate weekday corrections (short forms - only unambiguous ones)
        for (let i = 0; i < 7; i++) {
            const date = new Date(firstSunday);
            date.setDate(firstSunday.getDate() + i);
            const localWeekdayShort = weekdayShortFormatter.format(date).toLowerCase();
            if (localWeekdayShort && localWeekdayShort !== weekdayAbbreviations[i].toLowerCase()) {
                // Check if it's a numeric key and count it
                if (/^\d+$/.test(localWeekdayShort)) {
                    numericKeysFiltered++;
                } else if (existingKeys.has(localWeekdayShort)) {
                    // Check if it conflicts with existing manual corrections
                    existingKeysFiltered++;
                } else if (ambiguousWords[localWeekdayShort]) {
                    // Skip ambiguous words - they are only warnings
                    ambiguousKeysFiltered++;
                    continue;
                } else if (!finalData[autoCategory][localWeekdayShort]) {
                    // Escape regex special characters in automatically generated keys
                    const escapedKey = escapeRegexCharacters(localWeekdayShort);
                    finalData[autoCategory][escapedKey] = weekdayAbbreviations[i];
                    localeCount++;
                }
            }
        }

        // Generate month corrections (long forms)
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const localMonthLong = monthLongFormatter.format(date).toLowerCase();
            if (localMonthLong && localMonthLong !== monthAbbreviations[i].toLowerCase()) {
                // Check if it's a numeric key and count it
                if (/^\d+$/.test(localMonthLong)) {
                    numericKeysFiltered++;
                } else if (existingKeys.has(localMonthLong)) {
                    // Check if it conflicts with existing manual corrections
                    existingKeysFiltered++;
                } else if (ambiguousWords[localMonthLong]) {
                    // Skip ambiguous words - they are only warnings
                    ambiguousKeysFiltered++;
                    continue;
                } else if (!finalData[autoCategory][localMonthLong]) {
                    // Escape regex special characters in automatically generated keys
                    const escapedKey = escapeRegexCharacters(localMonthLong);
                    finalData[autoCategory][escapedKey] = monthAbbreviations[i];
                    localeCount++;
                }
            }
        }

        // Generate month corrections (short forms - only unambiguous ones)
        for (let i = 0; i < 12; i++) {
            const date = new Date(currentYear, i, 1);
            const localMonthShort = monthShortFormatter.format(date).toLowerCase();
            if (localMonthShort && localMonthShort !== monthAbbreviations[i].toLowerCase()) {
                // Check if it's a numeric key and count it
                if (/^\d+$/.test(localMonthShort)) {
                    numericKeysFiltered++;
                } else if (existingKeys.has(localMonthShort)) {
                    // Check if it conflicts with existing manual corrections
                    existingKeysFiltered++;
                } else if (ambiguousWords[localMonthShort]) {
                    // Skip ambiguous words - they are only warnings
                    ambiguousKeysFiltered++;
                    continue;
                } else if (!finalData[autoCategory][localMonthShort]) {
                    // Escape regex special characters in automatically generated keys
                    const escapedKey = escapeRegexCharacters(localMonthShort);
                    finalData[autoCategory][escapedKey] = monthAbbreviations[i];
                    localeCount++;
                }
            }
        }

        if (localeCount > 0) {
            console.log(`    ✓ ${locale}: ${localeCount} corrections`);
            totalAutoCorrections += localeCount;
        }

    } catch (error) {
        console.log(`    ✗ Error processing ${locale}: ${error.message}`);
    }
});

console.log(`  → Total automatic corrections: ${totalAutoCorrections}`);
console.log(`  → Numeric keys filtered out: ${numericKeysFiltered}`);
console.log(`  → Existing manual keys avoided: ${existingKeysFiltered}`);
console.log(`  → Ambiguous words excluded: ${ambiguousKeysFiltered}`);

// 6. Write final YAML structure
console.log('\n► Writing output file...');
const yamlOutput = yaml.stringify(finalData, {
    defaultStringType: 'QUOTE_DOUBLE',
    lineWidth: 0
});

const finalYamlContent = `---
# Generated word_error_correction.yaml
# Sources:
#   - Manual corrections: ${path.relative(process.cwd(), manualYamlPath)}
#   - Automatic corrections: Intl.DateTimeFormat API (${supportedLocales.length} locales)
#   - Language names: Intl.DisplayNames API
# Note: Ambiguous words are handled in separate section with warnings

${yamlOutput}`;

fs.writeFileSync(outputPath, finalYamlContent, 'utf8');

// 7. Output final statistics
console.log('\n═══════════════════════════════════════');
console.log('Final Statistics');
console.log('═══════════════════════════════════════');
console.log(`Output file: ${path.relative(process.cwd(), outputPath)}`);
console.log(`Categories: ${Object.keys(finalData).length}`);
console.log('\nCategory breakdown:');

let totalEntries = 0;
Object.keys(finalData).forEach(category => {
    const count = Object.keys(finalData[category]).length;
    totalEntries += count;
    console.log(`  ▪ ${category}: ${count} entries`);
});

console.log(`\n→ Total corrections: ${totalEntries}`);
console.log(`→ Ambiguous words: ${Object.keys(finalData[ambiguousWordsCategory] || {}).length} (warnings only)`);
console.log('\n✓ Word error correction generation completed successfully!');
