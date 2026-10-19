#!/usr/bin/env node
/* Info, license and author {{{
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 * SPDX-License-Identifier: AGPL-3.0-only
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015 Robin Schneider <ypid@riseup.net>
 *
 * Written for: https://github.com/anschuetz/linuxmuster/issues/1#issuecomment-110888829
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 * }}} */

/* Required modules {{{ */
import openingHours from 'opening_hours';
import fs, { globSync } from 'node:fs';
import { basename } from 'node:path';
import YAML from 'yaml';
/* }}} */

/* Parameter handling {{{ */
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const cli = yargs(hideBin(process.argv))
    .usage('Usage: $0 export_list.conf')
    .option('help', { alias: 'h', type: 'boolean', description: 'Display the usage' })
    .option('verbose', { alias: 'v', type: 'boolean', description: 'Verbose output' })
    .option('from', {
        alias: 'f',
        type: 'number',
        description: 'From year (including)',
    })
    .option('to', {
        alias: 't',
        type: 'number',
        description: 'Until year (including)',
    })
    .option('public-holidays', {
        alias: ['p', 'ph'],
        type: 'boolean',
        description: 'Export public holidays. Can not be used together with --school-holidays.',
    })
    .option('school-holidays', {
        alias: ['s', 'sh'],
        type: 'boolean',
        description: 'Export school holidays. Can not be used together with --public-holidays.',
    })
    .option('country', {
        alias: 'c',
        type: 'string',
        default: 'de',
        description: 'Country (for which the holidays apply). Defaults to Germany.',
    })
    .option('state', {
        alias: 'r',
        type: 'string',
        description: 'Region (for which the holidays apply). If not given, the country wide definition is used.',
    })
    .option('all-locations', {
        alias: 'a',
        type: 'boolean',
        description: 'Iterate over all locations.',
    })
    .option('omit-date-hyphens', {
        alias: 'o',
        type: 'boolean',
        default: false,
        description: 'Omit hyphen in ISO 8061 dates.',
    })
    .help(false);

const argv = cli.parseSync();

if (argv.help || argv._.length === 0) {
    cli.showHelp();
    process.exit(0);
}
if (argv.from === undefined || argv.to === undefined) {
    console.error('Missing required arguments: from, to');
    process.exit(1);
}

/* Error handling {{{ */
if (argv['public-holidays'] && argv['school-holidays']) {
    console.error('--school-holidays and --public-holidays can not be used together.');
    process.exit(1);
}
if (!(argv['public-holidays'] || argv['school-holidays'] || argv['all-locations'])) {
    console.error('Either --school-holidays or --public-holidays has to be specified.');
    process.exit(1);
}
/** @type {Record<string, import('opening_hours').nominatim_object>} */
const nominatim_by_loc = {};
for (const nominatim_file of globSync('src/holidays/nominatim_cache/*.yaml')) {
    const country_state = basename(nominatim_file, '.yaml');
    const nominatim_data = YAML.parse(fs.readFileSync(nominatim_file, 'utf8'));
    nominatim_by_loc[country_state] = nominatim_data;
}

/* }}} */
/* }}} */

const filepath = String(argv._[0]);

const oh_value = argv['public-holidays'] ? 'PH' : 'SH';

if (argv['all-locations']) {
    for (const nominatim_file_lookup_string in nominatim_by_loc) {
        write_config_file(filepath, oh_value, nominatim_file_lookup_string, new Date(argv.from, 0, 1), new Date(argv.to + 1, 0, 1));
    }
} else {
    let nominatim_file_lookup_string;
    if (typeof argv.state === 'string') {
        nominatim_file_lookup_string = argv.country + '_' + argv.state;
    } else {
        nominatim_file_lookup_string = argv.country;
    }
    write_config_file(filepath, oh_value, nominatim_file_lookup_string, new Date(argv.from, 0, 1), new Date(argv.to + 1, 0, 1));
}

/**
 * Export holiday intervals for one location to a file.
 * @param {string} filepath - Output file path.
 * @param {'PH'|'SH'} oh_value - Holiday selector to export.
 * @param {string} nominatim_file_lookup_string - Country or country/state cache key.
 * @param {Date} from_date - Start of the export period.
 * @param {Date} to_date - End of the export period.
 */
function write_config_file(filepath, oh_value, nominatim_file_lookup_string, from_date, to_date) {
    const nominatim_data = nominatim_by_loc[nominatim_file_lookup_string] || nominatim_by_loc[argv.country];

    if (!nominatim_data) {
        console.error(nominatim_file_lookup_string + ' is currently not supported.');
        process.exit(1);
    }

    /** @type {import('opening_hours').opening_hours} */
    let oh;
    try {
        oh = new openingHours(oh_value, nominatim_data);
    } catch (err) {
        let error_message = 'Error creating new opening_hours(\'' + oh_value + '\', ' + JSON.stringify(nominatim_data) + '): ';
        error_message += 'Error: ' + err + '. Please file an issue at https://github.com/opening-hours/opening_hours.js/issues';
        console.error(error_message);
        process.exit(0);
    }

    const intervals = oh.getOpenIntervals(from_date, to_date);

    /** @type {string[]} */
    const output_lines = [];
    for (let i = 0; i < intervals.length; i++) {
        const holiday_entry = intervals[i];
        const output_line = [
            getISODate(holiday_entry[0], 0, argv['omit-date-hyphens']),
        ];
        if (oh_value === 'SH') { /* Add end date */
            output_line[0] += '--' + getISODate(holiday_entry[1], -1, argv['omit-date-hyphens']);
        }

        output_line.push(holiday_entry[3] ?? '');
        output_lines.push(output_line.join(' '));
    }
    const output = output_lines.join('\n');
    if (argv.verbose) {
        console.log(`${nominatim_file_lookup_string}:\n${output}`);
    }
    fs.writeFileSync(filepath, output);
}

/* Helper functions {{{ */
/**
 * Format a date as an ISO 8601 date string in local time.
 * @param {Date} date - Date to format.
 * @param {number} day_offset - Days to add before formatting.
 * @param {boolean} omit_date_hyphens - Whether to omit separators (20151231 instead of 2015-12-31).
 * @returns {string} ISO date string.
 */
function getISODate(date, day_offset, omit_date_hyphens) {
    const shifted_date = new Date(date);
    shifted_date.setDate(shifted_date.getDate() + day_offset);
    const date_parts = [
        shifted_date.getFullYear(),
        String(shifted_date.getMonth() + 1).padStart(2, '0'),
        String(shifted_date.getDate()).padStart(2, '0'),
    ];
    return date_parts.join(omit_date_hyphens ? '' : '-');
}

/* }}} */
