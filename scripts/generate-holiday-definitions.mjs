#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: © 2026 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * Generate country holiday definitions from OpenHolidays data and YAML.
 *
 * Strategy:
 * 1. Read school holiday CSV data from the local openholidaysapi.data submodule
 * 2. Parse data for each country/subdivision (current year ±15)
 * 3. Merge with existing YAML holiday definitions (PH, metadata)
 * 4. Generate complete country definitions
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const HOLIDAYS_DIR = path.join(ROOT_DIR, 'src', 'holidays');
const SUBMODULE_DIR = path.join(ROOT_DIR, 'submodules', 'openholidaysapi.data', 'src');
const GENERATED_FILE = path.join(HOLIDAYS_DIR, 'generated-openholidays.mjs');

/**
 * Types used to parse and convert school holiday data.
 * @typedef {Record<string, string>} CsvRow
 * @typedef {Record<string, string | number[]> & { name: string }} HolidayData
 * @typedef {Record<string, HolidayData>} HolidaysByName
 * @typedef {Record<string, HolidaysByName>} HolidaysBySubdivision
 * @typedef {{ SH: HolidayData[] }} SubdivisionSchoolHolidays
 * @typedef {Record<string, SubdivisionSchoolHolidays>} SchoolHolidaysBySubdivision
 * @typedef {Record<string, number>} HolidayOrder
 * @typedef {{ source: 'submodule', csvData: CsvRow[] }} SubmoduleCountryData
 * @typedef {{ source: 'yaml-only', csvData: null }} YamlOnlyCountryData
 * @typedef {SubmoduleCountryData | YamlOnlyCountryData} CountryBuildData
 */

/**
 * Parse CSV file (semicolon-separated)
 * Handles quoted fields containing semicolons and commas
 * @param {string} content - Semicolon-separated CSV content.
 * @returns {CsvRow[]} Parsed CSV rows.
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  /**
   * Split a CSV line into fields, respecting quotes
   * @param {string} line - Single CSV line.
   * @returns {string[]} Trimmed field values.
   */
  function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        // Check if it's an escaped quote (doubled quotes)
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ';' && !inQuotes) {
        result.push(current.trim().replace(/\r$/, ''));
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    result.push(current.trim().replace(/\r$/, ''));
    return result;
  }

  const [headerLine, ...dataLines] = lines;
  const headers = splitCSVLine(headerLine);

  /** @type {CsvRow[]} */
  const rows = [];

  for (const line of dataLines) {
    const values = splitCSVLine(line);
    /** @type {CsvRow} */
    const row = {};
    for (let column = 0; column < headers.length; column++) {
      row[headers[column]] = values[column] || '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Load subdivision names from subdivisions.csv
 * Returns: { "BW": "Baden-Württemberg", ... }
 * @param {string} country - Country code to load subdivision names for.
 * @returns {Promise<Record<string, string>>} Subdivision codes mapped to localized names.
 */
async function loadSubdivisionNames(country) {
  try {
    const csvPath = path.join(SUBMODULE_DIR, country, 'subdivisions.csv');
    const content = await fs.readFile(csvPath, 'utf8');
    const rows = parseCSV(content);

    /** @type {Record<string, string>} */
    const names = {};
    for (const row of rows) {
      const shortName = row.ShortName;
      // Parse multi-language names: "DE Baden-Württemberg,EN Baden-Württemberg"
      // The first language in the list is the local language (OpenHolidays convention)
      const nameField = row.Name || '';
      const nameParts = nameField.split(',');
      let fullName = '';

      for (const part of nameParts) {
        const match = part.match(/^[A-Z]{2}\s+(.+)$/);
        if (match) {
          fullName = match[1].trim();
          break;
        }
      }

      if (shortName && fullName) {
        names[shortName] = fullName;
      }
    }

    return names;
  } catch {
    return {};
  }
}

/**
 * Discover all countries with school holidays in submodule
 * @returns {Promise<string[]>} Country codes with school holiday data.
 */
async function discoverCountriesInSubmodule() {
  const countries = new Set();

  try {
    const dirs = await fs.readdir(SUBMODULE_DIR);

    for (const dir of dirs) {
      // Skip files and non-country directories
      if (dir === 'countries.csv' || dir === 'languages.csv' || dir.startsWith('.')) {
        continue;
      }

      const holidaysDir = path.join(SUBMODULE_DIR, dir, 'holidays');

      try {
        const files = await fs.readdir(holidaysDir);
        const hasSchoolHolidays = files.some(f => f.startsWith('holidays.school.'));

        if (hasSchoolHolidays) {
          countries.add(dir.toLowerCase());
        }
      } catch {
        // Directory doesn't have holidays folder
      }
    }
  } catch (error) {
    console.error('Error reading submodule:', error);
  }

  return Array.from(countries).sort();
}

/**
 * Load complete YAML data (PH, SH, meta) for merging
 * @param {string} country - Country code to load holiday data for.
 * @returns {Promise<import('../src/holidays/holiday-definitions.d.ts').CountryHolidayDefinitions>} Parsed country holiday data.
 */
async function loadCompleteYaml(country) {
  try {
    const yamlPath = path.join(HOLIDAYS_DIR, `${country}.yaml`);
    const content = await fs.readFile(yamlPath, 'utf8');
    const data = yaml.load(content);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    // js-yaml can parse a timestamp scalar as a Date object.
    const isPlainObject = Object.getPrototypeOf(data) === Object.prototype;
    if (!isPlainObject) return {};

    return data;
  } catch {
    return {};
  }
}

/**
 * Check if parsed YAML data contains a non-empty holiday list.
 * @param {unknown} data - Parsed YAML value.
 * @param {string} holidayType - Holiday key to check, such as PH or SH.
 * @returns {boolean} Whether the value contains holidays for that key.
 */
function hasHolidayData(data, holidayType) {
  if (!data || typeof data !== 'object' || !(holidayType in data)) return false;
  const holidayData = /** @type {Record<string, unknown>} */ (data);
  const holidays = holidayData[holidayType];
  return Array.isArray(holidays) && holidays.length > 0;
}

/**
 * Load school holidays from CSV files in submodule
 * @param {string} country - Country code to load school holidays for.
 * @returns {Promise<CsvRow[]|null>} Parsed holiday rows, or null if unavailable.
 */
async function loadSchoolHolidaysFromSubmodule(country) {
  const holidaysDir = path.join(SUBMODULE_DIR, country, 'holidays');

  try {
    const files = await fs.readdir(holidaysDir);
    const schoolHolidayFiles = files.filter(f => f.startsWith('holidays.school.'));

    if (schoolHolidayFiles.length === 0) {
      return null;
    }

    // Load all school holiday files
    /** @type {CsvRow[]} */
    const allHolidays = [];
    for (const file of schoolHolidayFiles) {
      const filePath = path.join(holidaysDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      const rows = parseCSV(content);

      allHolidays.push(...rows);
    }

    return allHolidays;
  } catch {
    return null;
  }
}

/**
 * Convert CSV data to opening_hours.js format
 * @param {CsvRow[]} csvData - Parsed school holiday rows.
 * @param {string} country - Country code the rows belong to.
 * @param {number[]} yearRange - Inclusive range of years to include.
 * @returns {SchoolHolidaysBySubdivision} School holidays grouped by subdivision.
 */
function convertCSVToInternalFormat(csvData, country, yearRange) {
  // Group by subdivision -> holiday name -> years
  /** @type {HolidaysBySubdivision} */
  const bySubdivision = {};

  for (const row of csvData) {
    const startDate = new Date(row.StartDate);
    // If EndDate is missing or invalid, use StartDate (single-day holiday)
    const endDateStr = row.EndDate && row.EndDate.trim() ? row.EndDate : row.StartDate;
    const endDate = new Date(endDateStr);

    // OpenHolidays EndDate is INCLUSIVE, and opening_hours.js also expects INCLUSIVE end dates
    // The library adds +1 day internally when creating intervals (see src/index.js line 2549)
    // So we keep the date as-is from CSV

    const year = startDate.getFullYear();

    // Limit to configured year range
    if (year < yearRange[0] || year > yearRange[1]) {
      continue;
    }

    // Skip entries with invalid dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn(`Skipping entry with invalid date: ${row.StartDate} - ${row.EndDate}`);
      continue;
    }

    // Skip exception entries (e.g., school-specific variations)
    const tags = row.Tags || '';
    if (tags.includes('Exception')) {
      continue;
    }

    // Parse holiday name (multi-language: "CA Vacances de Nadal,DE Weihnachtsferien,EN Christmas holidays")
    // The first language in the list is the local language (OpenHolidays convention)
    const nameField = row.Name || '';
    const nameParts = nameField.split(',');
    let holidayName = 'School Holiday';

    for (const part of nameParts) {
      const match = part.match(/^[A-Z]{2}\s+(.+)$/);
      if (match) {
        holidayName = match[1].trim();
        break;
      }
    }

    // Get subdivisions (comma-separated, e.g., "BW" or "")
    // Some files use "Subdivisions", others use "Groups" (e.g., MV uses "Groups")
    const subdivisionsField = row.Subdivisions || row.Groups || '';
    const subdivisionCodes = subdivisionsField
      ? subdivisionsField.split(',').map(s => s.trim()).filter(s => s)
      : ['_countrywide'];

    // Process each subdivision
    for (const subdivisionCode of subdivisionCodes) {
      if (!bySubdivision[subdivisionCode]) {
        bySubdivision[subdivisionCode] = {};
      }
      if (!bySubdivision[subdivisionCode][holidayName]) {
        bySubdivision[subdivisionCode][holidayName] = { name: holidayName };
      }

      // Add year data: [start_month, start_day, end_month, end_day]
      // OpenHolidays CSV uses INCLUSIVE dates, and opening_hours.js also expects INCLUSIVE
      bySubdivision[subdivisionCode][holidayName][year] = [
        startDate.getMonth() + 1,
        startDate.getDate(),
        endDate.getMonth() + 1,
        endDate.getDate()
      ];
    }
  }

  // Convert to final format: { subdivision: { SH: [holiday_objects] } }
  /** @type {SchoolHolidaysBySubdivision} */
  const result = {};

  // Holiday order (by approximate occurrence in year)
  /** @type {HolidayOrder} */
  const holidayOrder = {
    'Winterferien': 1,
    'Halbjahresferien': 2,
    'Osterferien': 3,
    'Pfingstferien': 4,
    'Tag nach Himmelfahrt': 4.5,
    'Sommerferien': 5,
    'Tag vor dem 3. Oktober': 6,
    'Herbstferien': 7,
    'Tag nach dem Reformationstag': 8,
    'Kirchentag und Tag nach dem 1. Mai': 3.5,
    'Weihnachtsferien': 9,
    // English names
    'Winter Holidays': 1,
    'Mid-Term Holidays': 2,
    'Easter Holidays': 3,
    'Pentecost Holidays': 4,
    'Summer Holidays': 5,
    'Autumn Holidays': 7,
    'Christmas Holidays': 9
  };

  for (const [subdivision, holidays] of Object.entries(bySubdivision)) {
    const sortedHolidays = Object.values(holidays).sort((a, b) => {
      const orderA = holidayOrder[a.name] || 99;
      const orderB = holidayOrder[b.name] || 99;
      return orderA - orderB;
    });

    result[subdivision] = {
      SH: sortedHolidays
    };
  }

  return result;
}

/**
 * Get submodule commit info for reproducible builds
 * @returns {Promise<{ hash: string, commitUnixTimestamp: number }>} Submodule hash and commit timestamp.
 */
async function getSubmoduleInfo() {
  const { execSync } = await import('child_process');
  const submodulePath = path.join(ROOT_DIR, 'submodules', 'openholidaysapi.data');

  const hash = execSync('git rev-parse --short HEAD', {
    cwd: submodulePath,
    encoding: 'utf8'
  }).trim();

  // Commit timestamp in seconds (for year range calculation)
  const commitUnixTimestamp = parseInt(
    execSync('git show --no-patch --format=%ct HEAD', {
      cwd: submodulePath,
      encoding: 'utf8'
    }).trim(),
    10
  );

  return { hash, commitUnixTimestamp };
}

/**
 * Generate JavaScript file with holiday definitions
 * @param {Record<string, CountryBuildData>} countriesData - Generated holiday data grouped by country.
 * @param {number[]} yearRange - Inclusive range of years included in the output.
 * @param {Awaited<ReturnType<typeof getSubmoduleInfo>>} submodule - Metadata for the source data submodule.
 * @returns {Promise<string>} Generated JavaScript source.
 */
async function generateJavaScriptFile(countriesData, yearRange, submodule) {
  const commitDate = new Date(submodule.commitUnixTimestamp * 1000).toISOString().split('T')[0];

  const lines = [
    '/**',
    ' * Auto-generated school holidays from OpenHolidays API Data (Git Submodule)',
    ' * DO NOT EDIT MANUALLY - Run: node scripts/generate-holiday-definitions.mjs',
    ` * Submodule: ${submodule.hash} (${commitDate})`,
    ' */',
    ''
  ];

  for (const [country, countryData] of Object.entries(countriesData)) {
    // Load YAML data for PH and metadata
    const yamlData = await loadCompleteYaml(country);
    const merged = { ...yamlData };

    if (countryData.source === 'submodule') {
      // Convert CSV data to internal format
      const convertedSH = convertCSVToInternalFormat(countryData.csvData, country, yearRange);

      // Load subdivision names for this country
      const subdivisionNames = await loadSubdivisionNames(country);

      // Add school holidays data
      for (const [subdivision, subdivisionData] of Object.entries(convertedSH)) {
        if (subdivision === '_countrywide') {
          // Country-wide SH
          merged.SH = subdivisionData.SH;
        } else {
          // Prefer full names to avoid conflicts with keys like "SH" for School Holidays.
          // Fall back to the short code only when no full name is available.
          const fullName = subdivisionNames[subdivision] || subdivision;
          const existingData = merged[fullName];

          if (existingData && typeof existingData === 'object' && !Array.isArray(existingData)) {
            existingData._state_code ??= subdivision.toLowerCase();
            existingData.SH = subdivisionData.SH;
          } else {
            merged[fullName] = {
              _state_code: subdivision.toLowerCase(),
              SH: subdivisionData.SH
            };
          }
        }
      }
    }

    // Sort keys: PH first, SH second, metadata (_*), then subdivisions alphabetically
    /** @type {import('../src/holidays/holiday-definitions.d.ts').CountryHolidayDefinitions} */
    const sortedMerged = {};
    const keys = Object.keys(merged).sort((a, b) => {
      if (a === 'PH') return -1;
      if (b === 'PH') return 1;
      if (a === 'SH') return -1;
      if (b === 'SH') return 1;
      if (a.startsWith('_') && !b.startsWith('_')) return -1;
      if (!a.startsWith('_') && b.startsWith('_')) return 1;

      // Alphabetic for everything else
      return a.localeCompare(b);
    });

    for (const key of keys) {
      sortedMerged[key] = merged[key];
    }

    // Format output
    lines.push('/** @type {import(\'./holiday-definitions.d.ts\').CountryHolidayDefinitions} */');
    lines.push(`export const ${country} = ${formatCompactObject(sortedMerged, 0)};`);
    lines.push('');
  }

  if (lines.length === 6) {
    lines.push('// No school holidays data available yet');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format object in compact style
 * @param {object} obj - Object to format.
 * @param {number} indent - Current indentation level.
 * @returns {string} Formatted JavaScript object literal.
 */
function formatCompactObject(obj, indent) {
  const ind = '  '.repeat(indent);
  const ind2 = '  '.repeat(indent + 1);
  const lines = ['{'];

  const entries = Object.entries(obj);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const comma = i < entries.length - 1 ? ',' : '';

    if (key === 'PH' && Array.isArray(value)) {
      // Public holidays array - keep compact
      lines.push(`${ind2}PH: ${JSON.stringify(value)}${comma}`);
    } else if (key === 'SH' && Array.isArray(value)) {
      // School holidays - custom format
      lines.push(`${ind2}SH: [`);
      for (const holiday of value) {
        lines.push(`${ind2}  {`);
        lines.push(`${ind2}    name: ${JSON.stringify(holiday.name)},`);

        const years = Object.keys(holiday).filter(k => k !== 'name').sort();
        for (const year of years) {
          lines.push(`${ind2}    ${year}: ${JSON.stringify(holiday[year])},`);
        }

        lines.push(`${ind2}  },`);
      }
      lines.push(`${ind2}]${comma}`);
    } else if (key.startsWith('_') || typeof value === 'string' || typeof value === 'number') {
      // Metadata or primitives - single line
      lines.push(`${ind2}${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Nested object (subdivisions)
      lines.push(`${ind2}${JSON.stringify(key)}: ${formatCompactObject(value, indent + 1)}${comma}`);
    } else {
      lines.push(`${ind2}${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
    }
  }

  lines.push(`${ind}}`);
  return lines.join('\n');
}

/**
 * Discover all YAML files
 * @returns {Promise<string[]>} Country codes with YAML data.
 */
async function discoverYamlCountries() {
  const countries = new Set();

  try {
    const files = await fs.readdir(HOLIDAYS_DIR);
    for (const file of files) {
      if (file.endsWith('.yaml')) {
        countries.add(file.replace('.yaml', ''));
      }
    }
  } catch {
    // No YAML files
  }

  return Array.from(countries).sort();
}

/**
 * Build school holidays for all countries
 * @returns {Promise<Record<string, CountryBuildData>>} Generated holiday data grouped by country.
 */
async function buildSchoolHolidays() {
  const counts = {
    phAndSH: 0,
    shOnly: 0,
    phOnly: 0
  };

  console.log();
  console.log('═'.repeat(60));
  console.log('Holiday Data Build\n');
  console.log('Combining school holidays from openholidaysapi.data with\npublic holidays from YAML.');
  console.log('═'.repeat(60));
  console.log();

  // Check if submodule exists
  try {
    await fs.access(SUBMODULE_DIR);
  } catch {
    console.error('✗ OpenHolidays submodule not found.');
    console.error('   Run: git submodule update --init --recursive\n');
    throw new Error('Submodule openholidaysapi.data not initialized');
  }

  // Discover all countries (submodule + YAML)
  console.log('Discovering countries...\n');
  const submoduleCountries = await discoverCountriesInSubmodule();
  const yamlCountries = await discoverYamlCountries();
  const submoduleCountrySet = new Set(submoduleCountries);
  const sharedCountryCount = yamlCountries.filter(country => submoduleCountrySet.has(country)).length;
  const allCountries = new Set([...submoduleCountries, ...yamlCountries]);
  console.log(`Found ${allCountries.size} unique countries: ${submoduleCountries.length} with SH in openholidaysapi.data, ${yamlCountries.length} in YAML, ${sharedCountryCount} in both.\n`);
  console.log('Processing countries...\n');

  /** @type {Record<string, CountryBuildData>} */
  const results = {};

  for (const country of Array.from(allCountries).sort()) {
    const csvData = await loadSchoolHolidaysFromSubmodule(country);
    const yamlData = await loadCompleteYaml(country);

    // Check for PH at country level OR in subdivisions
    let hasPH = hasHolidayData(yamlData, 'PH');

    if (!hasPH) {
      // Check if any subdivision has PH
      for (const [key, value] of Object.entries(yamlData)) {
        if (!key.startsWith('_') && hasHolidayData(value, 'PH')) {
          hasPH = true;
          break;
        }
      }
    }

    if (csvData) {
      // Has school holidays from submodule
      const status = hasPH ? '✓' : '○';
      const description = hasPH ? 'PH and SH' : 'SH only';

      if (hasPH) {
        counts.phAndSH++;
      } else {
        counts.shOnly++;
      }

      console.log(`${status} ${country.toUpperCase()}: ${description}`);
      results[country] = { source: 'submodule', csvData };
    } else if (hasPH) {
      // Only has PH from YAML, no SH
      console.log(`· ${country.toUpperCase()}: PH only`);
      counts.phOnly++;
      results[country] = { source: 'yaml-only', csvData: null };
    }
  }

  // Generate JavaScript file (limit to submodule commit year ±15)
  // Using submodule timestamp ensures reproducible builds
  // @see https://reproducible-builds.org/docs/timestamps/
  const submodule = await getSubmoduleInfo();
  const referenceYear = new Date(submodule.commitUnixTimestamp * 1000).getUTCFullYear();
  const yearRange = [referenceYear - 15, referenceYear + 15];
  const jsContent = await generateJavaScriptFile(results, yearRange, submodule);
  await fs.writeFile(GENERATED_FILE, jsContent, 'utf8');

  const jsStats = await fs.stat(GENERATED_FILE);
  const jsSizeKB = Math.round(jsStats.size / 1024);

  // Print summary
  console.log();
  console.log('═'.repeat(60));
  console.log('Summary');
  console.log('═'.repeat(60));
  console.log();
  console.log(`Year range: ${yearRange[0]}-${yearRange[1]}`);
  console.log();
  console.log(`✓  ${'PH and SH'.padEnd(10)}  ${counts.phAndSH}`);
  console.log(`○  ${'SH only'.padEnd(10)}  ${counts.shOnly}`);
  console.log(`·  ${'PH only'.padEnd(10)}  ${counts.phOnly}`);
  console.log();

  console.log(`Generated: ${path.relative(ROOT_DIR, GENERATED_FILE)} (${jsSizeKB} KB)`);
  console.log();
  console.log('═'.repeat(60));
  console.log();

  return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildSchoolHolidays().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { buildSchoolHolidays };
