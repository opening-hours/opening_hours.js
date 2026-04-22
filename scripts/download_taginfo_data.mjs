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
 * For keys with many values, taginfo returns HTTP 412 without pagination.
 * This script fetches data with pagination and limits to most common values
 * to keep test runtime reasonable.
 */

import https from 'node:https';
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
const resultsPerPage = 999; // API limit when using filter=all

function fetchPage(page, useFilter = false) {
    return new Promise((resolve, reject) => {
        let url = `${baseUrl}?key=${encodeURIComponent(key)}&page=${page}&rp=${resultsPerPage}`;
        if (useFilter) {
            url += '&filter=all';
        }

        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON: ${e.message}`));
                    }
                } else if (res.statusCode === 412) {
                    // Precondition Failed - need to use filter=all
                    resolve({ needsPaging: true });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function downloadAll() {
    console.error(`Downloading taginfo data for key: ${key} (max ${maxValuesToFetch} values)`);

    // Try first without filter to see if we need pagination
    const firstResponse = await fetchPage(1, false);
    const needsFilter = firstResponse.needsPaging;

    if (needsFilter) {
        console.error('Response indicates paging is required, fetching with filter=all...');
    }

    // Fetch pages with filter if needed
    let allData = [];
    let page = 1;
    let total = 0;
    let dataUntil = '';

    while (allData.length < maxValuesToFetch) {
        const response = await fetchPage(page, needsFilter);

        if (!response.data || response.data.length === 0) {
            break;
        }

        if (page === 1) {
            dataUntil = response.data_until || new Date().toISOString();
            total = response.total || 0;
        }

        allData = allData.concat(response.data);

        console.error(`Page ${page}: Downloaded ${response.data.length} values (${allData.length}/${Math.min(maxValuesToFetch, total)} requested, ${total} total exist)`);

        if (response.data.length < resultsPerPage) {
            // Last page
            break;
        }

        page++;

        // Rate limiting - be nice to taginfo
        await new Promise(resolve => setTimeout(resolve, 200));
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
