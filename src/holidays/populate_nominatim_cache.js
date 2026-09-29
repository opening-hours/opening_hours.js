#!/usr/bin/env node
/* SPDX-FileCopyrightText: © opening_hours.js contributors */
/* SPDX-License-Identifier: AGPL-3.0-only */

/**
 * Refreshes the generated Nominatim response fixtures used by the holiday
 * tests. It reads country YAML definitions, requests each configured
 * Nominatim URL sequentially, waits between requests, and writes the sorted
 * responses to the corresponding files in `nominatim_cache`.
 *
 * Existing files are kept by default. Use `--overwrite` for a refresh and
 * `--input-file` to process one country definition at a time.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const YAML = require('yaml');

/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {{delay: number, inputFile: string|null, overwrite: boolean, verbose: boolean}} Options */

const CACHE_DIR = 'nominatim_cache';
const KEEP_STATE_LEVEL_ADDRESS_ATTRS = new Set(['country', 'country_code']);
const NOMINATIM_SORTING = [
  'place_id', 'licence', 'osm_type', 'osm_id', 'lat', 'lon', 'display_name', 'address',
];

/**
 * @param {string} message Message to write.
 * @param {Options} options Generator options.
 */
function log(message, options) {
  if (options.verbose) console.log(message);
}

/**
 * @param {string[]} argv Command-line arguments.
 * @returns {Options} Parsed options.
 */
function parseArgs(argv) {
  /** @type {Options} */
  const options = { delay: 1000, inputFile: null, overwrite: false, verbose: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '-v' || argument === '--verbose') options.verbose = true;
    else if (argument === '--overwrite') options.overwrite = true;
    else if (argument === '-i' || argument === '--input-file') options.inputFile = argv[++index];
    else if (argument === '--delay') {
      options.delay = Number(argv[++index]);
      if (!Number.isFinite(options.delay) || options.delay < 0) throw new Error('--delay must be non-negative');
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

/**
 * @param {string} url Nominatim URL.
 * @param {number} delay Delay after the request.
 * @returns {Promise<JsonObject|unknown[]>} Parsed response.
 */
async function requestJson(url, delay) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': 'opening_hours.js nominatim cache generator' } }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Nominatim returned HTTP ${statusCode}: ${body.slice(0, 200)}`));
          return;
        }
        try { resolve(/** @type {JsonObject|unknown[]} */ (JSON.parse(body))); } catch (error) { reject(new Error(`Invalid JSON from Nominatim: ${error instanceof Error ? error.message : String(error)}`)); }
      });
    });
    request.on('error', reject);
  }).finally(() => sleep(delay));
}

/**
 * @param {number} milliseconds Delay duration.
 * @returns {Promise<void>} Resolves after the delay.
 */
function sleep(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }

/**
 * @param {JsonObject} response Nominatim response.
 * @returns {JsonObject} Ordered response.
 */
function sortResponse(response) {
  /** @type {JsonObject} */
  const ordered = {};
  for (const key of NOMINATIM_SORTING) if (Object.prototype.hasOwnProperty.call(response, key)) ordered[key] = response[key];
  for (const key of Object.keys(response).sort()) if (!Object.prototype.hasOwnProperty.call(ordered, key)) ordered[key] = response[key];
  return ordered;
}

/**
 * @param {string} definitionFile Definition file.
 * @param {string|number|undefined} state Region code.
 * @returns {string} Cache filename.
 */
function cacheFileName(definitionFile, state) {
  const countryCode = path.basename(definitionFile).split('.')[0];
  return `${countryCode}${state === undefined ? '' : `_${state}`}.yaml`;
}

/**
 * @param {JsonObject} response Nominatim response.
 * @param {string|number|undefined} state Region code.
 * @returns {string} Serialized YAML.
 */
function serializeResponse(response, state) {
  const ordered = sortResponse(response);
  const omittedAddress = [];
  if (state === undefined && ordered.address) {
    const originalAddress = /** @type {JsonObject} */ (/** @type {unknown} */ (ordered.address));
    /** @type {JsonObject} */
    const address = {};
    for (const key of Object.keys(originalAddress).sort()) {
      if (KEEP_STATE_LEVEL_ADDRESS_ATTRS.has(key)) address[key] = originalAddress[key];
      else omittedAddress.push(`${key}: ${YAML.stringify(originalAddress[key]).trim()}`);
    }
    ordered.address = address;
  }
  const yaml = `---\n${YAML.stringify(ordered, { lineWidth: 0, singleQuote: true })}`;
  return omittedAddress.length
    ? yaml.replace('boundingbox:\n', `${omittedAddress.map((line) => `  # ${line}`).join('\n')}\n\nboundingbox:\n`)
    : yaml;
}

/**
 * @param {string} url Nominatim URL.
 * @param {string} definitionFile Definition file.
 * @param {string|number|undefined} state Region code.
 * @param {Options} options Generator options.
 */
async function handleNominatimUrl(url, definitionFile, state, options) {
  const cacheFile = path.join(CACHE_DIR, cacheFileName(definitionFile, state));
  if (!options.overwrite && fs.existsSync(cacheFile)) return;
  log(`Loading ${url}`, options);
  let response = await requestJson(url, options.delay);
  if (Array.isArray(response)) {
    if (response.length === 0) {
      console.warn(`Nominatim returned no result for ${url}; keeping any existing cache`);
      return;
    }
    const parsedUrl = new URL(url);
    const firstResult = /** @type {JsonObject} */ (response[0]);
    const query = new URLSearchParams({ format: 'json', lat: String(firstResult.lat), lon: String(firstResult.lon), zoom: '18', addressdetails: '1', 'accept-language': parsedUrl.searchParams.get('accept-language') || '' });
    parsedUrl.pathname = '/reverse';
    parsedUrl.search = query.toString();
    response = await requestJson(parsedUrl.toString(), options.delay);
  }
  const objectResponse = /** @type {JsonObject} */ (response);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, serializeResponse(objectResponse, state));
  log(`Writing file ${cacheFile}`, options);
}

/**
 * @param {string} definitionFile Definition file.
 * @param {Options} options Generator options.
 */
async function handleDefinitionFile(definitionFile, options) {
  if (path.basename(definitionFile) === 'xa.yaml') {
    log(`Skipping example definition ${definitionFile}`, options);
    return;
  }
  /** @type {JsonObject} */
  const definition = YAML.parse(fs.readFileSync(definitionFile, 'utf8'));
  if (typeof definition._nominatim_url === 'string') {
    await handleNominatimUrl(definition._nominatim_url, definitionFile, undefined, options);
  }
  for (const [name, region] of Object.entries(definition)) {
    if (!region || typeof region !== 'object') continue;
    /** @type {JsonObject} */
    const regionDefinition = /** @type {JsonObject} */ (region);
    if (typeof regionDefinition._nominatim_url !== 'string') continue;
    const state = typeof regionDefinition._state_code === 'string' || typeof regionDefinition._state_code === 'number'
      ? regionDefinition._state_code
      : name;
    if (/[A-Z]/.test(String(state))) throw new Error(`Found upper case _state_code ${state} in file ${definitionFile}`);
    await handleNominatimUrl(regionDefinition._nominatim_url, definitionFile, state, options);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = options.inputFile ? [options.inputFile] : fs.readdirSync('.').filter((file) => file.endsWith('.yaml')).sort();
  for (const file of files) await handleDefinitionFile(file, options);
}

main().catch((error) => {
  process.stderr.write(`ERROR: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
