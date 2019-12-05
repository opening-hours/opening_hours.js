#!/usr/bin/env node
/* Info, license and author {{{
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015-2017 Robin Schneider <ypid@riseup.net>
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
var opening_hours = require('./opening_hours.js');
var fs            = require('fs');
var glob          = require('glob');
var yaml          = require('js-yaml');
/* }}} */

/* Parameter handling {{{ */
var optimist = require('optimist')
    .usage('Usage: $0 export_list.conf')
    .describe('h', 'Display the usage')
    .describe('v', 'Verbose output')
    .describe('f', 'From year (including)')
    .demand('f')
    .describe('t', 'Until year (including)')
    .demand('t')
    .describe('p', 'Export public holidays. Can not be used togehter with --school-holidays.')
    // .default('p', true)
    .describe('s', 'Export school holidays. Can not be used together with --public-holidays.')
    .describe('c', 'Country (for which the holidays apply). Defaults to Germany.')
    .describe('o', 'Omit hyphen in ISO 8061 dates.')
    .default('o', false)
    .default('c', 'de')
    .describe('r', 'Region (for which the holidays apply). If not given, the country wide definition is used.')
    .boolean(['p', 's', ])
    .alias('h', 'help')
    .alias('v', 'verbose')
    .alias('f', 'from')
    .alias('t', 'to')
    .alias('p', ['public-holidays', 'ph'])
    .alias('s', ['school-holidays', 'sh'])
    .alias('c', 'country')
    .alias('r', 'state')
    .alias('o', 'omit-date-hyphens');

var argv = optimist.argv;

if (argv.help || argv._.length === 0) {
    optimist.showHelp();
    process.exit(0);
}

/* Error handling {{{ */
if (argv['public-holidays'] && argv['school-holidays']) {
    console.error("--school-holidays and --public-holidays can not be used together.");
    process.exit(1);
}
if (!(argv['public-holidays'] || argv['school-holidays'])) {
    console.error("Either --school-holidays or --public-holidays has to be specified.");
    process.exit(1);
}
let nominatim_by_loc = {};
for (let nominatim_file of glob.sync("holidays/nominatim_cache/*.yaml")) {
    let country_state = nominatim_file.match(/^.*\/([^/]*)\.yaml$/)[1];
    nominatim_by_loc[country_state] = yaml.safeLoad(fs.readFileSync(nominatim_file));
}
const nominatim_data = nominatim_by_loc[argv.country + '_' + argv.state] || nominatim_by_loc[argv.country];

if (typeof nominatim_data !== 'object') {
    console.error(argv.country + (", " + argv.state ? typeof nominatim_data !== 'object' : '') + " is currently not supported.");
    process.exit(1);
}

/* }}} */
/* }}} */

var filepath = argv._[0];

var oh_value = argv['public-holidays'] ? 'PH' : 'SH';

write_config_file(filepath, oh_value, nominatim_data, new Date(argv.from, 0, 1), new Date(argv.to + 1, 0, 1));

function write_config_file(filepath, oh_value, nominatim_data, from_date, to_date) {
    try {
        oh = new opening_hours(oh_value, nominatim_data);
    } catch (err) {
        console.error('Something went wrong. Please file a issue at https://github.com/opening-hours/opening_hours.js/issues');
        process.exit(0);
    }

    var intervals = oh.getOpenIntervals(from_date, to_date);

    var stream = fs.createWriteStream(filepath);

    stream.once('open', function(fd) {
        for (var i = 0; i < intervals.length; i++) {
            var holiday_entry = intervals[i];
            var output_line = [
                getISODate(holiday_entry[0], 0, argv['omit-date-hyphens']),
            ];
            if (oh_value === 'SH') { /* Add end date */
                output_line[0] += '--' + getISODate(holiday_entry[1], -1, argv['omit-date-hyphens']);
            }

            output_line.push(holiday_entry[3]);
            if (argv.verbose) {
                console.log(output_line.join(' '))
            }
            stream.write(output_line.join(' ') + "\n");
        }
        stream.end();
    });
}

/* Helper functions {{{ */
// https://stackoverflow.com/a/2998822
function pad(num, size) {
    var s = String(num);
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}

function getISODate(date, day_offset, omit_date_hyphens) { /* Is a valid ISO 8601 date, but not so nice. */
    /* Returns date as 20151231 */
    if (typeof day_offset !== 'number') {
        day_offset = 0;
    }

    date.setDate(date.getDate() + day_offset);
    var date_parts = [date.getFullYear(), pad(date.getMonth() + 1, 2), pad(date.getDate(), 2)];
    if (omit_date_hyphens) {
        return date_parts.join('')
    } else {
        return date_parts.join('-')
    }
}

/* }}} */
