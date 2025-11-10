#!/usr/bin/env node
/* Info, license and author {{{
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
const opening_hours = require('../build/opening_hours.js');
const fs            = require('node:fs');
const glob          = require('glob');
const YAML          = require('yaml');
/* }}} */

/* Parameter handling {{{ */
const yargs = require('yargs')
    .usage('Usage: $0 export_list.conf')
    .describe('h', 'Display the usage')
    .describe('v', 'Verbose output')
    .describe('f', 'From year (including)')
    .demandOption('f')
    .describe('t', 'Until year (including)')
    .demandOption('t')
    .describe('p', 'Export public holidays. Can not be used together with --school-holidays.')
    // .default('p', true)
    .describe('s', 'Export school holidays. Can not be used together with --public-holidays.')
    .describe('c', 'Country (for which the holidays apply). Defaults to Germany.')
    .describe('a', 'Iterate over all locations.')
    .describe('o', 'Omit hyphen in ISO 8061 dates.')
    .default('o', false)
    .default('c', 'de')
    .describe('r', 'Region (for which the holidays apply). If not given, the country wide definition is used.')
    .boolean(['p', 's', 'a'])
    .alias('h', 'help')
    .alias('v', 'verbose')
    .alias('f', 'from')
    .alias('t', 'to')
    .alias('p', ['public-holidays', 'ph'])
    .alias('s', ['school-holidays', 'sh'])
    .alias('c', 'country')
    .alias('r', 'state')
    .alias('a', 'all-locations')
    .string(['c', 'r', ])
    .alias('o', 'omit-date-hyphens')
    .help(false);

const argv = yargs.parse();

if (argv.help || argv._.length === 0) {
    yargs.showHelp();
    process.exit(0);
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
const nominatim_by_loc = {};
for (const nominatim_file of glob.sync('src/holidays/nominatim_cache/*.yaml')) {
    const country_state = nominatim_file.match(/^.*\/([^/]*)\.yaml$/)[1];
    nominatim_by_loc[country_state] = YAML.parse(fs.readFileSync(nominatim_file, 'utf8'));
}

/* }}} */
/* }}} */

const filepath = argv._[0];

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

function write_config_file(filepath, oh_value, nominatim_file_lookup_string, from_date, to_date) {
    const nominatim_data = nominatim_by_loc[nominatim_file_lookup_string] || nominatim_by_loc[argv.country];

    if (typeof nominatim_data !== 'object') {
        console.error(nominatim_file_lookup_string + ' is currently not supported.');
        process.exit(1);
    }

    let oh;
    try {
        oh = new opening_hours(oh_value, nominatim_data);
    } catch (err) {
        let error_message = 'Error creating new opening_hours(\'' + oh_value + '\', ' + JSON.stringify(nominatim_data) + '): ';
        error_message += 'Error: ' + err + '. Please file an issue at https://github.com/opening-hours/opening_hours.js/issues';
        console.error(error_message);
        process.exit(0);
    }

    const intervals = oh.getOpenIntervals(from_date, to_date);

    let output_lines = [];
    for (let i = 0; i < intervals.length; i++) {
        const holiday_entry = intervals[i];
        const output_line = [
            getISODate(holiday_entry[0], 0, argv['omit-date-hyphens']),
        ];
        if (oh_value === 'SH') { /* Add end date */
            output_line[0] += '--' + getISODate(holiday_entry[1], -1, argv['omit-date-hyphens']);
        }

        output_line.push(holiday_entry[3]);
        output_lines.push(output_line.join(' '));
    }
    output_lines = output_lines.join('\n');
    if (argv.verbose) {
        console.log(`${nominatim_file_lookup_string}:\n${output_lines}`);
    }
    fs.writeFileSync(filepath, output_lines);
}

/* Helper functions {{{ */
// https://stackoverflow.com/a/2998822
function pad(num, size) {
    let s = String(num);
    while (s.length < size) {
        s = '0' + s;
    }
    return s;
}

function getISODate(date, day_offset, omit_date_hyphens) { /* Is a valid ISO 8601 date, but not so nice. */
    /* Returns date as 20151231 */
    if (typeof day_offset !== 'number') {
        day_offset = 0;
    }

    date.setDate(date.getDate() + day_offset);
    const date_parts = [date.getFullYear(), pad(date.getMonth() + 1, 2), pad(date.getDate(), 2)];
    if (omit_date_hyphens) {
        return date_parts.join('')
    } else {
        return date_parts.join('-')
    }
}

/* }}} */
