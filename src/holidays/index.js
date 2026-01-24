/**
 * Holiday definitions for opening_hours.js
 *
 * All countries are now sourced from generated-openholidays.js
 * - Countries with OpenHolidays API: School holidays 2020-2027
 * - YAML-only countries: Public holidays + legacy school holidays
 *
 * To update: Run `node scripts/fetch-school-holidays.mjs`
 */

// Re-export all countries from generated file (OpenHolidays + YAML)
export * from './generated-openholidays.js';
