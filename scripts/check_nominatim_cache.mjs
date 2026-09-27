#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © opening_hours.js contributors
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * Check that every _nominatim_url entry in the generated holiday data has a
 * matching fixture file in src/holidays/nominatim_cache. This script is part
 * of the test suite.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const HOLIDAYS_DIR = path.resolve(new URL('../src/holidays', import.meta.url).pathname);
const GENERATED_FILE = path.join(HOLIDAYS_DIR, 'generated-openholidays.js');
const CACHE_DIR = path.join(HOLIDAYS_DIR, 'nominatim_cache');

/**
 * @param {string} countryCode - Country code the definition belongs to.
 * @param {object} countryDefinition - Generated holiday data for the country.
 * @returns {string[]} Expected cache filenames for this country.
 */
function expectedCacheFiles(countryCode, countryDefinition) {
    const expected = [];

    if (typeof countryDefinition._nominatim_url === 'string') {
        expected.push(`${countryCode}.yaml`);
    }

    for (const [regionName, regionDefinition] of Object.entries(countryDefinition)) {
        if (typeof regionDefinition !== 'object' || regionDefinition === null || Array.isArray(regionDefinition)) {
            continue;
        }
        if (typeof regionDefinition._nominatim_url !== 'string') {
            continue;
        }

        const state = typeof regionDefinition._state_code === 'string' || typeof regionDefinition._state_code === 'number'
            ? regionDefinition._state_code
            : regionName;
        expected.push(`${countryCode}_${state}.yaml`);
    }

    return expected;
}

const generatedSource = await fs.readFile(GENERATED_FILE, 'utf8');
const generatedData = await import(`data:text/javascript;base64,${Buffer.from(generatedSource).toString('base64')}`);
const cachedFiles = new Set(await fs.readdir(CACHE_DIR));
const missingFiles = [];

for (const [countryCode, countryDefinition] of Object.entries(generatedData)) {
    for (const expectedFile of expectedCacheFiles(countryCode, countryDefinition)) {
        if (!cachedFiles.has(expectedFile)) {
            missingFiles.push(expectedFile);
        }
    }
}

if (missingFiles.length > 0) {
    console.error('Missing Nominatim cache fixtures:');
    console.error(missingFiles.join('\n'));
    console.error('\nRun from src/holidays: node populate_nominatim_cache.js --input-file <country>.yaml');
    process.exitCode = 1;
} else {
    console.log('All _nominatim_url entries have a matching cache fixture.');
}
