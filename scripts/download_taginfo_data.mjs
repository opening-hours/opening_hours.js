#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * Download taginfo data with pagination support for large keys
 * Usage: node download_taginfo_data.mjs <output-file> <key> [max-values]
 * Example: node download_taginfo_data.mjs export.opening_hours.json opening_hours 5000
 *
 * Taginfo rejects requests for keys with many values unless paging parameters
 * are given (HTTP 412), so this script always fetches with pagination and
 * limits the result to the most common values to keep test runtime reasonable.
 */

import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node download_taginfo_data.mjs <output-file> <key> [max-values]');
    process.exit(1);
}

const [outputFile, key, maxValues] = args;
const parsedMax = parseInt(maxValues, 10);
const maxValuesToFetch = !isNaN(parsedMax) && parsedMax > 0 ? parsedMax : Infinity;
const baseUrl = 'https://taginfo.openstreetmap.org/api/4/key/values';
const resultsPerPage = 999; // API maximum

/**
 * @typedef {object} TaginfoResponse
 * @property {unknown[]} [data] Values returned for the requested page.
 * @property {string} [data_until] Timestamp of the source data.
 * @property {number} [total] Total number of matching values.
 */

/**
 * @param {number} page Page number to fetch.
 * @returns {Promise<TaginfoResponse>} Parsed Taginfo response.
 */
async function fetchPage(page) {
    const url = `${baseUrl}?key=${encodeURIComponent(key)}&page=${page}&rp=${resultsPerPage}`;
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.json();
}

async function downloadAll() {
    console.error(`Downloading taginfo data for key: ${key} (max ${maxValuesToFetch} values)`);

    /** @type {unknown[]} */
    let allData = [];
    let page = 1;

    let response = await fetchPage(page);
    const dataUntil = response.data_until || new Date().toISOString();
    const total = response.total || 0;

    while (response.data?.length) {
        allData.push(...response.data);

        console.error(`Page ${page}: Downloaded ${response.data.length} values (${allData.length}/${Math.min(maxValuesToFetch, total)} requested, ${total} total exist)`);

        if (response.data.length < resultsPerPage || allData.length >= maxValuesToFetch) {
            // Last page or enough values
            break;
        }

        page++;

        // Rate limiting - be nice to taginfo
        await new Promise(resolve => setTimeout(resolve, 200));
        response = await fetchPage(page);
    }

    // Trim to max if we fetched more
    if (allData.length > maxValuesToFetch) {
        console.error(`Trimming to ${maxValuesToFetch} most common values`);
        allData = allData.slice(0, maxValuesToFetch);
    }

    // Create output in taginfo format
    const output = {
        url: `${baseUrl}?key=${key}`,
        data_until: dataUntil,
        total: allData.length,
        data: allData,
        note: total > allData.length ? `Limited to ${allData.length} most common values out of ${total} total` : undefined
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.error(`Successfully downloaded ${allData.length} values to ${outputFile}`);
    if (total > allData.length) {
        console.error(`Note: Limited to most common values (${total} total values exist in taginfo)`);
    }
}

downloadAll().catch(err => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
});
