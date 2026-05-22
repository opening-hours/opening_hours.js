#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: © 2026 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * Generate School Holidays from OpenHolidays API Data (Git Submodule)
 *
 * Strategy:
 * 1. Read school holiday data from local Git submodule (openholidaysapi.data)
 * 2. Parse CSV files for each country/subdivision (current year ±15)
 * 3. Merge with YAML data (PH, metadata) → Complete JavaScript file
 * 4. Generate subdivision entries using full names (with short-code fallback if missing)
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
const GENERATED_FILE = path.join(HOLIDAYS_DIR, 'generated-openholidays.js');

// Statistics
const stats = {
  countries: [],
  redundant: []
};

/**
 * Parse CSV file (semicolon-separated)
 * Handles quoted fields containing semicolons and commas
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  // Helper function to split CSV line respecting quotes
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

  const headers = splitCSVLine(lines[0]);
  const rows = [];

  for (const line of lines.slice(1)) {
    const values = splitCSVLine(line);
    const row = {};
    for (const [i, header] of headers.entries()) {
      row[header] = values[i] || '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Load subdivision names from subdivisions.csv
 * Returns: { "BW": "Baden-Württemberg", ... }
 */
async function loadSubdivisionNames(country) {
  try {
    const csvPath = path.join(SUBMODULE_DIR, country, 'subdivisions.csv');
    const content = await fs.readFile(csvPath, 'utf8');
    const rows = parseCSV(content);

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
    console.error(`Error reading submodule: ${error.message}`);
  }

  return Array.from(countries).sort();
}

/**
 * Load complete YAML data (PH, SH, meta) for merging
 */
async function loadCompleteYaml(country) {
  try {
    const yamlPath = path.join(HOLIDAYS_DIR, `${country}.yaml`);
    const content = await fs.readFile(yamlPath, 'utf8');
    return yaml.load(content) || {};
  } catch {
    return {};
  }
}

/**
 * Check if a YAML file has school holidays data
 */
async function yamlHasSchoolHolidays(country) {
  try {
    const yamlData = await loadCompleteYaml(country);

    // Case 1: SH on root level
    if (yamlData.SH && Array.isArray(yamlData.SH) && yamlData.SH.length > 0) {
      return true;
    }

    // Case 2: SH nested in regions/states
    for (const [key, value] of Object.entries(yamlData)) {
      if (key.startsWith('_') || key === 'PH') continue;
      if (value && typeof value === 'object' && value.SH && Array.isArray(value.SH) && value.SH.length > 0) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Load school holidays from CSV files in submodule
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
 */
function convertCSVToInternalFormat(csvData, country, yearRange) {
  // Group by subdivision -> holiday name -> years
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
  const result = {};

  // Holiday order (by approximate occurrence in year)
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
 */
async function generateJavaScriptFile(countriesData, yearRange, submodule) {
  const commitDate = new Date(submodule.commitUnixTimestamp * 1000).toISOString().split('T')[0];

  const lines = [
    '/**',
    ' * Auto-generated school holidays from OpenHolidays API Data (Git Submodule)',
    ' * DO NOT EDIT MANUALLY - Run: node scripts/fetch-school-holidays.mjs',
    ` * Submodule: ${submodule.hash} (${commitDate})`,
    ' */',
    ''
  ];

  for (const [country, { source, csvData }] of Object.entries(countriesData)) {
    // Load YAML data for PH and metadata
    const yamlData = await loadCompleteYaml(country);
    const merged = { ...yamlData };

    if (source === 'submodule') {
      // Convert CSV data to internal format
      const convertedSH = convertCSVToInternalFormat(csvData, country, yearRange);

      // Load subdivision names for this country
      const subdivisionNames = await loadSubdivisionNames(country);

      // Add school holidays data
      for (const [subdivision, subdivisionData] of Object.entries(convertedSH)) {
        if (subdivision === '_countrywide') {
          // Country-wide SH
          merged.SH = subdivisionData.SH;
        } else {
          // Subdivision-specific SH - Use ONLY the full name, not the short code
          // to avoid conflicts (e.g., "SH" for Schleswig-Holstein conflicts with "SH" for School Holidays)

          if (subdivisionNames[subdivision]) {
            const fullName = subdivisionNames[subdivision];
            if (!merged[fullName]) {
              merged[fullName] = {};
            }
            merged[fullName].SH = subdivisionData.SH;
          } else {
            // Fallback: if no full name available, use the short code
            // (but this shouldn't happen for properly configured data)
            if (!merged[subdivision]) {
              merged[subdivision] = {};
            }
            merged[subdivision].SH = subdivisionData.SH;
          }
        }
      }
    }

    // Sort keys: PH first, SH second, metadata (_*), then subdivisions alphabetically
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
 * Validate that all generated countries are exported in index.js
 */
async function validateExports(generatedCountries) {
  const INDEX_FILE = path.join(HOLIDAYS_DIR, 'index.js');

  try {
    const indexContent = await fs.readFile(INDEX_FILE, 'utf8');

    // Check if index.js uses wildcard export (export *)
    const wildcardMatch = indexContent.match(/export\s*\*\s*from\s*['"]\.\/generated-openholidays\.js['"]/);

    if (wildcardMatch) {
      console.log('\n✅ Export validation: Using wildcard export (export *) - all countries automatically exported\n');
      return;
    }

    // Extract explicit export list from index.js
    // Matches: export { ad, al, ar, ... } from './generated-openholidays.js';
    const exportMatch = indexContent.match(/export\s*\{([^}]+)\}\s*from\s*['"]\.\/generated-openholidays\.js['"]/);

    if (!exportMatch) {
      console.log('\n⚠️  Warning: Could not find exports in index.js');
      console.log('   Please manually verify that all countries are exported.\n');
      return;
    }

    // Parse exported countries
    const exportedCountries = exportMatch[1]
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)
      .sort();

    const sortedGenerated = [...generatedCountries].sort();

    // Find missing countries
    const missing = sortedGenerated.filter(c => !exportedCountries.includes(c));
    const extra = exportedCountries.filter(c => !sortedGenerated.includes(c));

    if (missing.length === 0 && extra.length === 0) {
      console.log('\n✅ Export validation: All countries are properly exported\n');
      return;
    }

    // Report issues
    console.log('\n⚠️  Export validation failed:\n');

    if (missing.length > 0) {
      console.log(`   Missing in index.js exports (${missing.length}):`);
      console.log(`   ${missing.join(', ')}\n`);
      console.log(`   → Add to export list in ${INDEX_FILE}`);
      console.log('');
    }

    if (extra.length > 0) {
      console.log(`   Extra in index.js exports (${extra.length}):`);
      console.log(`   ${extra.join(', ')}\n`);
      console.log('   → These countries were not generated but are exported');
      console.log('');
    }

    // Suggest fix
    if (missing.length > 0) {
      const fixedExports = [...new Set([...exportedCountries, ...missing])].sort().join(', ');
      console.log('   Suggested export line:');
      console.log(`   export { ${fixedExports} } from './generated-openholidays.js';\n`);
    }

  } catch (error) {
    console.log(`\n⚠️  Warning: Could not validate exports: ${error.message}\n`);
  }
}

/**
 * Build school holidays for all countries
 */
async function buildSchoolHolidays() {
  console.log('═'.repeat(60));
  console.log('School Holidays Build (from Git Submodule)');
  console.log('═'.repeat(60));
  console.log();

  // Check if submodule exists
  try {
    await fs.access(SUBMODULE_DIR);
  } catch {
    console.error('❌ Submodule not found!');
    console.error('   Run: git submodule update --init --recursive\n');
    throw new Error('Submodule openholidaysapi.data not initialized');
  }

  // Discover all countries (submodule + YAML)
  console.log('🔍 Discovering countries...\n');
  const submoduleCountries = await discoverCountriesInSubmodule();
  const yamlCountries = await discoverYamlCountries();
  const allCountries = new Set([...submoduleCountries, ...yamlCountries]);
  console.log(`📊 Found ${allCountries.size} countries total\n`);

  // Process each country
  console.log('Processing countries...\n');
  const results = {};

  for (const country of Array.from(allCountries).sort()) {
    const csvData = await loadSchoolHolidaysFromSubmodule(country);
    const hasYamlSH = await yamlHasSchoolHolidays(country);
    const yamlData = await loadCompleteYaml(country);

    // Check for PH at country level OR in subdivisions
    let hasPH = yamlData.PH && Array.isArray(yamlData.PH) && yamlData.PH.length > 0;

    if (!hasPH) {
      // Check if any subdivision has PH
      for (const [key, value] of Object.entries(yamlData)) {
        if (!key.startsWith('_') && typeof value === 'object' && value.PH && Array.isArray(value.PH) && value.PH.length > 0) {
          hasPH = true;
          break;
        }
      }
    }

    if (csvData) {
      // Has school holidays from submodule
      let status = '✅ ';
      const sources = [];

      if (hasYamlSH) {
        status = '⚠️  ';
        stats.redundant.push(country);
      }

      sources.push('openholidaysapi.data (SH)');
      if (hasPH) {
        sources.push('YAML (PH)');
      }

      console.log(`${status}${country.toUpperCase()}: ${sources.join(' + ')}`);
      stats.countries.push(country);
      results[country] = { source: 'submodule', csvData };
    } else if (hasPH) {
      // Only has PH from YAML, no SH
      console.log(`📄 ${country.toUpperCase()}: YAML (PH only, no SH)`);
      results[country] = { source: 'yaml-only', csvData: null };
    }
  }

  // Generate JavaScript file (limit to submodule commit year ±15)
  // Using submodule timestamp ensures reproducible builds
  // @see https://reproducible-builds.org/docs/timestamps/
  const submodule = await getSubmoduleInfo();
  const referenceYear = new Date(submodule.commitUnixTimestamp * 1000).getUTCFullYear();
  const yearRange = [referenceYear - 15, referenceYear + 15];
  console.log(`📅 Year range: ${yearRange[0]}–${yearRange[1]}`);
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
  console.log(`✅ Countries with school holidays: ${stats.countries.length}`);
  console.log();

  if (stats.redundant.length > 0) {
    console.log('⚠️  Redundant (cleanup recommended):');
    for (const country of stats.redundant) {
      console.log(`   - ${country.toUpperCase()}: Remove SH from src/holidays/${country}.yaml`);
    }
    console.log();
  }

  console.log(`📦 Generated: ${GENERATED_FILE} (${jsSizeKB} KB)`);

  // Validate exports in index.js
  await validateExports(Object.keys(results));

  console.log('═'.repeat(60));

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
