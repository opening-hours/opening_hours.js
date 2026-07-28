#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2026 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * Check that every regional holiday definition in the generated holiday data
 * has a non-empty _state_code. This script is part of the test suite.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const HOLIDAYS_DIR = path.resolve(new URL('../src/holidays', import.meta.url).pathname);
const GENERATED_FILE = path.join(HOLIDAYS_DIR, 'generated-openholidays.js');

/**
 * Country-wide PH/SH definitions and metadata are not regions.
 * A region is a named mapping with its own PH or SH list.
 * @param {string} key - Country or region key to inspect.
 * @param {object} value - Holiday definition associated with the key.
 * @returns {boolean} Whether the value represents a holiday region.
 */
function isHolidayRegion(key, value) {
    return typeof value === 'object'
        && value !== null
        && !Array.isArray(value)
        && !key.startsWith('_')
        && (Array.isArray(value.PH) || Array.isArray(value.SH));
}

const generatedSource = await fs.readFile(GENERATED_FILE, 'utf8');
const generatedData = await import(`data:text/javascript;base64,${Buffer.from(generatedSource).toString('base64')}`);
const missingRegions = [];

for (const [countryCode, holidayData] of Object.entries(generatedData)) {
    for (const [regionName, regionDefinition] of Object.entries(holidayData)) {
        if (!isHolidayRegion(regionName, regionDefinition)) {
            continue;
        }

        // A missing or empty code makes the region impossible to identify reliably.
        if (typeof regionDefinition._state_code !== 'string'
            || regionDefinition._state_code.trim() === '') {
            missingRegions.push(`${countryCode}: ${regionName} (generated)`);
        }
    }
}

if (missingRegions.length > 0) {
    console.error('Regions without _state_code:');
    console.error(missingRegions.join('\n'));
    process.exitCode = 1;
} else {
    console.log('All holiday regions have _state_code.');
}
