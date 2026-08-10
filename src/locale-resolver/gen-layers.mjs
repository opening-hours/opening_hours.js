/*
 * SPDX-FileCopyrightText: © 2026 opening_hours.js contributors
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */

/**
 * Layer generator for the locale-resolver rebuild.
 *
 * Produces the layered data structure consumed by resolver.mjs, for BOTH
 * weekdays and months — proving the model is not weekday-specific. Every token
 * keeps a candidate SET `{ lang, meaning, type }` and the data is separated by
 * layer / provenance:
 *
 *   - canonical  (Layer 0): locale-neutral syntax (Su…Sa, Jan…Dec), per type
 *   - universal  (Layer 2): unambiguous English aliases (full + abbreviated), per type
 *   - crossLocale(Layer 3): names across ALL CLDR languages, merged into one
 *                           token index; each candidate carries its `type`
 *   - regionLangs(geo tier): official languages per country (POI plausibility)
 *
 * The active locale is NOT a separate data layer: it is just one of the
 * "trusted languages" the resolver applies to the crossLocale index (parallel
 * to the geo/country languages). A former per-locale table would be 100 %
 * recoverable from crossLocale by base language, so it is not emitted.
 *
 * Sources: pinned cldr-dates-full package and manual-aliases.yaml for
 * established non-CLDR abbreviations used in opening_hours data.
 * Output: src/locale-resolver/layers.json
 *
 * Run from the repo root:  node src/locale-resolver/gen-layers.mjs
 */

/** @typedef {Record<string, any>} JsonObject */ // eslint-disable-line jsdoc/reject-any-type
/** @typedef {'weekday'|'month'} LayerType */
/** @typedef {{ token: string, meaning: string }} LocaleTerm */
/** @typedef {{ lang: string, meaning: string, type: LayerType }} Candidate */
/** @typedef {Record<string, any>} GenericRecord */ // eslint-disable-line jsdoc/reject-any-type
/** @typedef {{ keys: string[], meanings: string[], tables: (gregorian: JsonObject|undefined) => any[], canonical: Record<string, string>, universal: Record<string, string> }} LayerSpec */ // eslint-disable-line jsdoc/reject-any-type

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import { normalizeToken } from './normalize.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const basePath = process.cwd();
const cldrDatesMainPath = path.resolve(basePath, 'node_modules/cldr-dates-full/main');
const cldrPackageJson = path.resolve(basePath, 'node_modules/cldr-dates-full/package.json');
const territoryInfoPath = path.resolve(basePath, 'node_modules/cldr-core/supplemental/territoryInfo.json');
const manualAliasesPath = path.join(scriptDir, 'manual-aliases.yaml');
const outputPath = path.join(scriptDir, 'layers.json');

// Type definitions: canonical order matches src/index.js string_to_token_map.
/** @type {Record<string, LayerSpec>} */
const TYPES = {
    weekday: {
        keys: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        meanings: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
        tables: gregorian => [
            gregorian?.days?.format?.wide, gregorian?.days?.format?.abbreviated,
            gregorian?.days?.['stand-alone']?.wide, gregorian?.days?.['stand-alone']?.abbreviated,
        ],
        canonical: { su: 'Su', mo: 'Mo', tu: 'Tu', we: 'We', th: 'Th', fr: 'Fr', sa: 'Sa' },
        universal: {
            monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th',
            friday: 'Fr', saturday: 'Sa', sunday: 'Su',
            mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', sun: 'Su',
        },
    },
    month: {
        keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        meanings: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        tables: gregorian => [
            gregorian?.months?.format?.wide, gregorian?.months?.format?.abbreviated,
            gregorian?.months?.['stand-alone']?.wide, gregorian?.months?.['stand-alone']?.abbreviated,
        ],
        canonical: {
            jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
            jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec',
        },
        universal: {
            january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', june: 'Jun',
            july: 'Jul', august: 'Aug', september: 'Sep', october: 'Oct',
            november: 'Nov', december: 'Dec', sept: 'Sep',
        },
    },
};

/**
 * @param {string} filePath - JSON file to read.
 * @returns {JsonObject} Parsed JSON object.
 */
function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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
 * @param {string} locale - CLDR locale identifier.
 * @returns {JsonObject|undefined} Gregorian calendar data, if available.
 */
function loadGregorian(locale) {
    const filePath = path.join(cldrDatesMainPath, locale, 'ca-gregorian.json');
    return readJson(filePath)?.main?.[locale]?.dates?.calendars?.gregorian;
}

/**
 * Collect all lexemes of a given type for a locale: wide + abbreviated,
 * format + stand-alone.
 * @param {JsonObject|undefined} gregorian - CLDR Gregorian calendar data.
 * @param {string} type - Layer type to collect.
 * @returns {LocaleTerm[]} Normalized locale terms.
 */
function localeTerms(gregorian, type) {
    const spec = TYPES[type];
    /** @type {LocaleTerm[]} */
    const terms = [];
    for (const table of spec.tables(gregorian)) {
        if (!table) {
            continue;
        }
        spec.keys.forEach((key, index) => {
            const token = normalizeToken(table[key]);
            if (token) {
                terms.push({ token, meaning: spec.meanings[index] });
            }
        });
    }
    return terms;
}

/**
 * @param {GenericRecord} obj - Object to sort.
 * @returns {GenericRecord} Sorted object.
 */
function sortObject(obj) {
    return Object.fromEntries(
        Object.keys(obj).sort((a, b) => a.localeCompare(b, 'en')).map(key => [key, obj[key]]),
    );
}

/** @returns {Record<string, Record<string, Record<string, string>>>} Manual aliases by type and language. */
function loadManualAliases() {
    if (!fs.existsSync(manualAliasesPath)) {
        return {};
    }
    return yaml.parse(fs.readFileSync(manualAliasesPath, 'utf8')) || {};
}

// Layer 2b (geo): official languages per country, from CLDR supplemental territoryInfo.
// Only 2-letter country codes (matching nominatim country_code); only official +
// de_facto_official status (regional/minority languages are intentionally excluded
// from the tier-2 default and can be added later if needed).
function buildRegionLangs() {
    if (!fs.existsSync(territoryInfoPath)) {
        throw new Error(`CLDR territoryInfo not found: ${territoryInfoPath}`);
    }
    const info = readJson(territoryInfoPath).supplemental.territoryInfo;
    const OFFICIAL = new Set(['official', 'de_facto_official']);
    /** @type {Record<string, string[]>} */
    const regionLangs = {};
    for (const [territory, data] of Object.entries(info)) {
        if (!/^[A-Z]{2}$/.test(territory)) {
            continue; // skip numeric macro-regions (001, 150, …)
        }
        const population = data.languagePopulation || {};
        const langs = Object.entries(population)
            .filter(([, entry]) => OFFICIAL.has(entry._officialStatus))
            .map(([lang]) => lang.split('_')[0].toLowerCase());
        const unique = [...new Set(langs)].sort((a, b) => a.localeCompare(b, 'en'));
        if (unique.length) {
            regionLangs[territory.toLowerCase()] = unique;
        }
    }
    return sortObject(regionLangs);
}

console.log('Generating weekday + month layers from CLDR…');
const locales = listCldrLocales();
const cldrVersion = readJson(cldrPackageJson).version;
console.log(`  CLDR locales: ${locales.length} (cldr-dates-full ${cldrVersion})`);

// Build regionLangs first so we can use the set of known official languages as a
// filter for crossLocale. This keeps constructed and obscure languages (e.g.
// Esperanto, Interlingua) out of the candidates index, which prevents them from
// appearing in ambiguity warnings and reduces data size.
const regionLangs = buildRegionLangs();
const officialLangs = new Set(Object.values(regionLangs).flat());

/** @type {Record<string, Record<string, string>>} */
const canonical = {};
/** @type {Record<string, Record<string, string>>} */
const universal = {};
for (const type of Object.keys(TYPES)) {
    canonical[type] = TYPES[type].canonical;
    universal[type] = TYPES[type].universal;
}

const manualAliases = loadManualAliases();

/** @type {Map<string, Map<string, Candidate>>} */
const crossLocaleSets = new Map(); // token -> Map(`${lang}|${meaning}|${type}` -> candidate)

for (const locale of locales) {
    const baseLang = locale.split('-')[0].toLowerCase();
    const gregorian = loadGregorian(locale);
    if (!gregorian) {
        continue;
    }

    for (const type of Object.keys(TYPES)) {
        const terms = localeTerms(gregorian, type);
        if (!terms.length) {
            continue;
        }

        for (const { token, meaning } of terms) {
            // Layer 3: skip tokens already covered by earlier (safer) layers for this type.
            if (token in canonical[type] || token in universal[type]) {
                continue;
            }
            // Only index languages that are an official language of at least one
            // country. This filters out constructed languages (Esperanto, etc.) and
            // very obscure languages that would never appear as geo-tier or coherence
            // matches, and keeps warnings free of noise.
            if (!officialLangs.has(baseLang)) {
                continue;
            }
            const set = crossLocaleSets.get(token) ?? new Map();
            crossLocaleSets.set(token, set);
            set.set(`${baseLang}|${meaning}|${type}`, {
                lang: baseLang,
                meaning,
                type: /** @type {LayerType} */ (type),
            });
        }
    }
}

for (const [type, languages] of Object.entries(manualAliases)) {
    for (const [lang, aliases] of Object.entries(languages)) {
        for (const [rawToken, meaning] of Object.entries(aliases)) {
            const token = normalizeToken(rawToken);
            if (!token || token in canonical[type] || token in universal[type]) {
                continue;
            }
            const set = crossLocaleSets.get(token) ?? new Map();
            crossLocaleSets.set(token, set);
            set.set(`${lang}|${meaning}|${type}`, {
                lang,
                meaning,
                type: /** @type {LayerType} */ (type),
            });
        }
    }
}

/** @type {Record<string, Candidate[]>} */
const crossLocale = {};
for (const [token, set] of crossLocaleSets) {
    crossLocale[token] = [...set.values()].sort(
        (a, b) => a.lang.localeCompare(b.lang, 'en')
            || a.type.localeCompare(b.type, 'en')
            || a.meaning.localeCompare(b.meaning, 'en'),
    );
}

const candidateCount = Object.values(crossLocale).reduce((sum, list) => sum + list.length, 0);

const output = {
    meta: {
        generated: new Date().toISOString().slice(0, 10),
        cldrDatesFull: cldrVersion,
        localeCount: locales.length,
        types: Object.keys(TYPES),
        crossLocaleTokens: Object.keys(crossLocale).length,
        crossLocaleCandidates: candidateCount,
        regionCount: Object.keys(regionLangs).length,
    },
    canonical,
    universal,
    crossLocale: sortObject(crossLocale),
    regionLangs,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`  Layer 3 tokens  : ${output.meta.crossLocaleTokens} (${candidateCount} candidates)`);
console.log(`  Region langs    : ${output.meta.regionCount} countries`);
console.log(`  Written → ${path.relative(basePath, outputPath)}`);
