#!/usr/bin/env node
/* Info, license and author {{{
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015 Robin Schneider <ypid@riseup.net>
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
 *
 *
 * Additional features:
 *   * Can log all values and if they could be evaluated or not to a log file
 *   to compare versions.  Just `touch real_test.opening_hours.log` to generate
 *   this for the tag opening_hours.
 *
 *   * Can write out statistics to compare the number of values and how many
 *   could be parsed.  Just `touch real_test.opening_hours.stats.csv` to
 *   generate this for the tag opening_hours.
 *
 *   * You can restrict the tags which should be parsed. Just specify them as
 *   parameter.
 * }}}
 */

/* Required modules {{{ */
const opening_hours = require('../build/opening_hours.js');
const fs            = require('node:fs');
const colors        = require('colors');
const sprintf       = require('sprintf-js').sprintf;
const assert        = require('node:assert');
/* }}} */

const test_framework = new opening_hours_test();

/* Add as much tests (for different tags) as you like. Just make sure that the
 * export is present by adding it as dependence to the related_tags.txt file.
 * Tests will not be executed in order listed there due to non-blocking aspect
 * of JS and node.js.
 */

/* Configuration {{{ */

colors.setTheme({
    result: [ 'green', 'bold' ],
});

/* Also used by opening_hours_map/opening_hours_map.html */
test_framework.config = {
    'opening_hours:kitchen': {
    },
    'opening_hours:warm_kitchen': {
    },
    'smoking_hours': {
        manually_ignored: [ 'yes' ],
    },
    'collection_times': {
        oh_mode: 2
        /* oh_mode 2: "including the hyphen because there are post boxes which are
         * emptied several (undefined) times or one (undefined) time in a certain time
         * frame. This shall be covered also.".
         * Ref: https://wiki.openstreetmap.org/wiki/Key:collection_times */
    },
    'service_times': {
        manually_ignored: [ 'automatic' ],
        oh_mode: 2,
    },
    'fee': {
        manually_ignored: [ 'yes', 'no', 'interval', 'unknown' ],
    },
    'lit': {
        manually_ignored: [ 'interval', 'limited' ],
        map: {
            'yes'      : 'sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"',
            'automatic': 'unknown "specified as automatic: When someone enters the way the lights are turned on."',
            'no'       : 'off "specified as no: There are no lights installed."',
            // 'interval' : 'unknown "specified as interval"',
            // 'limited'  : 'unknown "specified as limited"',
        }
    },
}

/*
 * Difference when ignoring values and when not ignoring values based on:
 * exportISO3166-2DE-HB2015-02-21T00:00:00.json
 *
 * fee:
 * not ignoring 2018-02-21T00:00:00.000Z, 568, 12, 9, 3, 0, 0, 2, 5
 * ignoring     2018-02-21T00:00:00.000Z, 115, 9, 9, 3, 0, 0, 2, 5
 *
 * lit:
 * not ignoring 2018-02-21T00:00:00.000Z, 6852, 2, 0, 0, 0, 0, 0, 0
 * ignoring     2018-02-21T00:00:00.000Z, 0, 0, 0, 0, 0, 0, 0, 0
 *
 * opening_hours:
 * not ignoring 2018-02-21T00:00:00.000Z, 1994, 1388, 1987, 1381, 5, 5, 965, 1539
 * ignoring     2018-02-21T00:00:00.000Z, 1994, 1388, 1987, 1381, 5, 5, 965, 1539
 */

/* }}} */

/* Parameter handling {{{ */
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 export*.json [export*.json]')
    .describe('h', 'Display the usage')
    .describe('v', 'Verbose output')
    .describe('d', 'Debug output')
    .describe('p', 'Generate a CSV file containing a overview of the following week showing how many facilities will be open for each hour of the week.')
    .describe('I', 'Ignore all bad values which are defined manually like the value "fixme". Does not include --ignore-bad-oh-values.')
    .describe('i', 'Ignore values which are not covered by the specification for opening_hours but might be used like "on" for the "lit" tag.'
        + ' The default is to not ignore any which will result in those values not being parsed as correct values.')
    .describe('m', 'Map values which would get ignored by the --ignore-bad-oh-values option to there meaning in the opening_hours syntax.'
        + ' For example, map "yes" to "sunset-sunrise open "specified as yes"".')
    .boolean(['v', 'd', 'I', 'i', 'm'])
    .alias('h', 'help')
    .alias('v', 'verbose')
    .alias('d', 'debug')
    .alias('I', 'ignore-manual-values')
    .alias('i', 'ignore-bad-oh-values')
    .alias('p', 'punchcard')
    .alias('m', 'map-bad-oh-values')
    .argv;

if (argv.help || argv._.length === 0) {
    yargs.showHelp();
    process.exit(0);
}
/* }}} */

// test_framework.tag_key_name('opening_hours');
for (let i = 0; i < argv._.length; i++) {
    const filename = argv._[i];
    test_framework.json_file(filename);
}

/* Test framework {{{ */
function opening_hours_test() {

    // let percent_number_format     = '%04.1f %%';
    // Looks kind of unusual.
    const percent_number_format            = '%.1f %%';
    const total_value_number_format        = '%7d';
    const total_differ_value_number_format = '%6d';
    const ms_runtime_number_format         = '%5d';

    const related_tags_file = 'related_tags.txt';

    const nominatimTestJSON = {'place_id':'44651229','licence':'Data \u00a9 OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright','osm_type':'way','osm_id':'36248375','lat':'49.5400039','lon':'9.7937133','display_name':'K 2847, Lauda-K\u00f6nigshofen, Main-Tauber-Kreis, Regierungsbezirk Stuttgart, Baden-W\u00fcrttemberg, Germany, European Union','address':{'road':'K 2847','city':'Lauda-K\u00f6nigshofen','county':'Main-Tauber-Kreis','state_district':'Regierungsbezirk Stuttgart','state':'Baden-W\u00fcrttemberg','country':'Germany','country_code':'de','continent':'European Union'}};

    console.log('The holiday definitions for the country ' + nominatimTestJSON.address.country_code + ' are used so the result will probably be a bit worse in reality but you can change that by providing the definition for missing holidays.\n');

    this.config = {};

    this.parse_tag = function (tag_key_name, info, data) { /* {{{ */
        const options = this.config[tag_key_name];

        const how_often_print_stats = 15000;
        const importance_threshold  = 30;
        const global_manually_ignored = [ 'fixme', 'FIXME' ];

            const ignored_values = [];
            if (argv['ignore-manual-values'] && typeof options === 'object' && typeof options.manually_ignored === 'object') {
                for (let i = 0; i < global_manually_ignored.length; i++) {
                    ignored_values.push(global_manually_ignored[i]);
                }
                for (const i in options.manually_ignored) {
                    ignored_values.push(options.manually_ignored[i]);
                }
            }

            console.log('Parsing ' + tag_key_name.blue.bold
                + (ignored_values.length === 0 ? '' : ' (ignoring: ' + ignored_values.join(', ') + ')') + ' …');

            let success_differ       = 0; // increment only by one despite that the value might appears more than one time
            let success              = 0; // increment by number of appearances
            let total_differ         = 0; // number of different values
            let total                = 0; // total number of values (if one value appears more than one, it counts more than one)
            let warnings             = 0; // number of values which throw warnings
            let warnings_differ      = 0; // number of values which throw warnings (only one warning is counted for each value if more appear)
            let not_pretty           = 0; // number of values which are not the same as the value returned by oh.prettifyValue()
            let not_pretty_differ    = 0; // number of values which are not pretty (only one warning is counted for each value if more appear)
            let important_and_failed = [];

            let logfile_out_string = '';

            for (let i = 0; i < data.data.length; i++) {
                if (ignored_values.indexOf(data.data[i].value) === -1) {
                    total_differ++;
                    total += data.data[i].count;
                }
            }

            const time_at_test_begin = new Date();

            const punchcard_data = {};
            const punchcard_data_out = {};
            // eslint-disable-next-line no-unused-vars
            const punchcard_debug = [];
            // eslint-disable-next-line no-unused-vars
            const punchcard_debug2 = [];
            const day_number_to_name = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
            const cur_date = new Date();
            let punchcard_csv = '';
            for (let i = 0; i < day_number_to_name.length; i++) {
                punchcard_data[i] = [];
                for (let hours_per_day = 0; hours_per_day < 24; hours_per_day++) {
                    punchcard_data[i][hours_per_day] = 0;
                    if (i === 0) {
                        punchcard_csv += ',' + hours_per_day;
                    }
                }
            }
            punchcard_csv += '\n';

            let parsed_values = 0; // total number of values which are "parsed" (if one value appears more than one, it counts more than one)
            for (let i = 0; i < total_differ; i++) {
                const oh_value = data.data[i].value;
                if (ignored_values.indexOf(oh_value) === -1) {
                    let oh_crashed = true,
                        oh_warnings = [],
                        oh_value_prettified,
                        oh;
                    if (argv.debug) {
                        console.info(oh_value);
                    }
                    try {
                        oh = new opening_hours(
                            oh_value,
                            nominatimTestJSON,
                            {
                                'tag_key': tag_key_name,
                                'map_value': argv['map-bad-oh-values'],
                            }
                        );
                        oh_warnings = oh.getWarnings();
                        oh_value_prettified = oh.prettifyValue();

                        oh_crashed = false;
                    } catch {
                        oh_crashed = true;
                    }

                    if (typeof oh_warnings !== 'object') {
                        oh_warnings = 1; // oh_crashed by oh.getWarnings()
                    } else {
                        oh_warnings = oh_warnings.length;
                    }

                    logfile_out_string += (Number(!oh_crashed)) + ' ' + oh_value + '\n';
                    if (!oh_crashed) {
                        success_differ++;
                        success += data.data[i].count;
                        warnings_differ += Number(!!oh_warnings);
                        warnings += data.data[i].count * Number(!!oh_warnings);
                        not_pretty_differ += Number(oh_value_prettified !== oh_value);
                        not_pretty += data.data[i].count * Number(oh_value_prettified !== oh_value);
                        // console.log('passed', oh_value);
                        if (argv.punchcard && tag_key_name === 'opening_hours') {
                            const check_date = new Date(cur_date.getFullYear(), cur_date.getMonth(), cur_date.getDate(), 0, 1, 0);
                            const iterator = oh.getIterator(check_date);
                            for (let t_offset = 0; t_offset <= 7 * 24; t_offset++) {
                                if (iterator.getState()) {
                                    punchcard_data[check_date.getDay()][check_date.getHours()] += data.data[i].count;
                                    // if (argv.verbose && check_date.getDay() === 3 && check_date.getHours() === 0) {
                                        // punchcard_debug.push([data.data[i].count, oh_value]);
                                    // }
                                    // if (argv.verbose && check_date.getDay() === 3 && check_date.getHours() === 1) {
                                        // punchcard_debug2.push([data.data[i].count, oh_value]);
                                    // }
                                }

                                check_date.setHours(check_date.getHours() + 1);
                                iterator.setDate(check_date);
                            }
                        }

                    } else if (data.data[i].count > importance_threshold) {
                        important_and_failed.push([oh_value, data.data[i].count]);
                    }
                    parsed_values += data.data[i].count;

                    if (i !== 0 && i % how_often_print_stats === 0) {
                        log_to_user(false, total, i, i, parsed_values,
                            success, success_differ, warnings, warnings_differ, not_pretty, not_pretty_differ,
                            time_at_test_begin);
                    }
                }
            }
            if (total_differ >= how_often_print_stats) {
                console.log();
            }

            log_to_user(true, total, total_differ, undefined, parsed_values,
                success, success_differ, warnings, warnings_differ, not_pretty, not_pretty_differ,
                time_at_test_begin);

            if (important_and_failed.length > 0) {
                important_and_failed = important_and_failed.sort(Comparator);
                for (let i = 0; i < important_and_failed.length; i++) {
                    const value = important_and_failed[i][0];
                    const count = important_and_failed[i][1];
                    console.log('Failed with value which appears ' + sprintf(total_differ_value_number_format, count) + ' times: ' + value);
                }
            }
            console.log();

            /* Generate logs {{{ */
            /* Just `touch` the file that you want logs for. */
            if (fs.existsSync('real_test.' + tag_key_name + '.log')) {
                try {
                    fs.renameSync('real_test.' + tag_key_name + '.log', 'real_test.last.' + tag_key_name + '.log');
                } catch {
                    /* Ignore */
                }
                fs.writeFile('real_test.' + tag_key_name + '.log', logfile_out_string, function(err) {
                        if (err) {
                            throw(err);
                        }
                    }
                );
            } /* }}} */

            let csv_filename;
            let csv_punchcard_filename;
            switch (info.export_format) {
            case 'overpass':
                csv_filename = [
                     'export',
                     tag_key_name,
                     info.key,
                     info.value,
                     'stats.csv'
                ].join('♡');
                csv_punchcard_filename = [
                     'punchcard',
                     info.key,
                     info.value,
                     'csv'
                ].join('♡');
                break;
            case 'taginfo':
                csv_filename = 'real_test.' + tag_key_name + '.stats.csv';
                csv_punchcard_filename = 'punchcard.csv';
                break;
            default: throw('Unknown export_format.');
            }

            if (argv.punchcard && tag_key_name === 'opening_hours') {
                for (let i = 0; i < day_number_to_name.length; i++) {
                    for (let hours_per_day = 0; hours_per_day < 24; hours_per_day++) {
                        punchcard_data[i][hours_per_day] = (punchcard_data[i][hours_per_day] / total * 100).toFixed(2);
                    }
                    punchcard_data_out[day_number_to_name[i]] = punchcard_data[i];
                    punchcard_csv += day_number_to_name[i].toString() + ',' + punchcard_data[i].join(',') + '\n';
                }
                if (argv.verbose) {
                    console.log(punchcard_data_out);
                    // if (punchcard_debug.length > 0) {
                        // punchcard_debug = punchcard_debug.sort(Comparator);
                        // for (let i = 0; i < punchcard_debug.length; i++) {
                            // let count = punchcard_debug[i][0];
                            // let value = punchcard_debug[i][1];
                            // console.log('Open ' + sprintf(total_differ_value_number_format, count) + ' times: ' + value);
                        // }
                    // }
                    // console.log("NeXt debug");
                    // if (punchcard_debug2.length > 0) {
                        // punchcard_debug2 = punchcard_debug2.sort(Comparator);
                        // for (let i = 0; i < punchcard_debug2.length; i++) {
                            // let count = punchcard_debug2[i][0];
                            // let value = punchcard_debug2[i][1];
                            // console.log('Open ' + sprintf(total_differ_value_number_format, count) + ' times: ' + value);
                        // }
                    // }
                }
                fs.writeFile(csv_punchcard_filename, punchcard_csv, function(err) {
                    if (err) {
                        throw(err);
                    }
                });
            }

            if (info.export_format === 'overpass' || fs.existsSync('real_test.' + tag_key_name + '.stats.csv')) { /* Generate stats {{{ */
                if (!fs.existsSync(csv_filename)) {
                    fs.closeSync(fs.openSync(csv_filename, 'w'));
                }
                if (fs.statSync(csv_filename).size === 0) {
                    fs.appendFile(
                        csv_filename,
                        [
                            'Time',
                            'Number of values', 'Number of different values',
                            'Number of values which could be parsed', 'Number of different values which could be parsed',
                            'Number of values which returned a warning', 'Number of different values which returned a warning',
                            'Number of values which are not prettified', 'Number of different values which are not prettified',
                        ].join(', ') + '\n',
                        function(err) {
                            if (err) {
                                throw(err);
                            }
                        }
                    );
                }
                if (info.export_format === 'taginfo') {
                    info.timestamp = get_dump_creation_time_from_file('taginfo_sources.json');
                    console.log(info.timestamp);
                }
                if (typeof(info.timestamp) !== 'object') {
                    throw('dump creation time is unknown.');
                }
                const timestamp = info.timestamp.toISOString();
                let known_timestamp = false;
                const csv_line = [
                    timestamp,
                    total, total_differ,
                    success, success_differ,
                    warnings, warnings_differ,
                    not_pretty, not_pretty_differ
                ].join(', ');
                fs.readFileSync(csv_filename, 'utf8').split('\n').forEach(function (line) {
                    if (!known_timestamp && line.match(new RegExp('^' + timestamp))) {
                        console.error('Skipping write to stats file. An entry does already exist for the timestamp: ' + timestamp);
                        console.log('Line: ' + csv_line);
                        known_timestamp = true;
                    }
                });
                if (!known_timestamp) {
                    fs.appendFile(
                        csv_filename,
                        csv_line + '\n',
                        function(err) {
                            if (err)
                                throw(err);
                        }
                    );
                }
            } /* }}} */

    } /* }}} */

    this.tag_key_name = function (tag_key_name /* tag key, uses the data from the taginfo API */) { /* {{{ */
        this.json_file('export.' + tag_key_name + '.json');
    } /* }}} */

    this.json_file = function (filename /* file exported by the taginfo API */) { /* {{{ */
        if (!fs.existsSync(filename)) {
            console.error('File ' + filename + ' does not exist.');
            return;
        }

        const filename_asciified = filename.replace(/♡/g, '@');
        /* TODO: JavaScript could not handle [^♡] */
        let re = filename_asciified.match(/^export@([^@]+)@([^@]+)(@[^@]+|).json$/);
        let info;
        const related_tags = [];
        if (re !== null) {
            info = {
                'key': re[1],
                'value': re[2],
                'timestamp': re[3].replace(/^@/, ''),
                'filename': filename,
                'export_format': 'overpass',
            };
            assert.strictEqual(typeof(info.key)       , 'string')
            assert.strictEqual(typeof(info.value)     , 'string')
            assert.strictEqual(typeof(info.timestamp) , 'string')
            if (info.timestamp.length > 0) {
                info.timestamp = new Date(info.timestamp);
            } else {
                info.timestamp = new Date();
            }
            // console.log(info);
            fs.readFileSync(related_tags_file, 'utf8').split('\n').forEach(function (line) {
                if (line.match(/^[^#]/)) {
                    related_tags.push(line);
                }
            });
        } else if ((re = filename.match(/^export\.([^.]+).json$/))) {
            info = {
                'key': re[1],
                'filename': filename,
                'export_format': 'taginfo',
            };
            assert.strictEqual(typeof(info.key)       , 'string')
        } else {
            throw 'Filename of unknown type given.';
        }

        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) {
                console.error('Error for tag "' + this.tag_key_name + '": ' + err);
                return;
            }

            const taginfo_format = {};

            data = JSON.parse(data);

            if (info.export_format === 'overpass') {
                let no_data_returned = true;
                for (let elements_number = 0; elements_number < data.elements.length; elements_number++) {
                    const elem = data.elements[elements_number];
                    if (typeof(elem.tags) === 'undefined') {
                        elem.tags = [];
                    }
                    Object.keys(elem.tags).forEach(function (key) {
                        if (related_tags.indexOf(key) !== -1) {
                            const val = elem.tags[key];
                            if (typeof(taginfo_format[key]) === 'undefined') {
                                taginfo_format[key] = { data: [] };
                            }
                            let known_value = false;
                            Object.keys(taginfo_format[key].data).forEach(function (data_index) {
                                const tag = taginfo_format[key].data[data_index];
                                if (tag.value === val) {
                                    known_value = data_index;
                                }
                            });
                            if (known_value) {
                                taginfo_format[key].data[known_value].count++;
                            } else {
                                taginfo_format[key].data.push(
                                    {
                                        'value': val,
                                        'count': 1,
                                    }
                                );
                            }
                            no_data_returned = false;
                        }
                    });
                }
                if (no_data_returned) {
                    /*
                     * The following line fixes the problem when no data is returned at all.
                     * This can happen when the overpass API returns no elements for a query (when no
                     * opening_hours, lit, … did exist at the given time). The problem then would
                     * be that the check if the statistics have already been processed would fail and
                     * the non existing data would be downloaded again on the next run. This did
                     * not yet happen: ^The holiday definitions.\+\(\_.\)\{1,8\}rm
                     */
                    taginfo_format['no_data_returned'] = { data: [] };
                }
            }


            if (info.export_format === 'overpass') {
                // console.log(JSON.stringify(taginfo_format, null, '    '));
                Object.keys(taginfo_format).forEach(function (tag_key_name) {
                    // FIXME: no access to 'this' …
                    test_framework.parse_tag(tag_key_name, info, taginfo_format[tag_key_name]);
                });
            } else {
                test_framework.parse_tag(info.key, info, data);
            }
        });
    }; /* }}} */

    /* log_to_user {{{ */
    function log_to_user(tests_done, total, total_differ, currently_parsed_value, parsed_values,
        success, success_differ, warnings, warnings_differ, not_pretty, not_pretty_differ, time_at_test_begin) {

        const delta = (new Date()).getTime() - time_at_test_begin.getTime();

        // if (tests_done)
            // console.log('Done:');

        console.log(
            sprintf(total_value_number_format, success) + '/' + sprintf(total_value_number_format, total) +
            ' (' + get_percent(success, parsed_values) +
                ( tests_done ?
                    ', not pretty: ' + get_percent(not_pretty, parsed_values)
                  :
                    '' /* Need the space to fit one line on the screen … */
                ) +
            ', with warnings: ' + get_percent(warnings , parsed_values) + ')' +
            ', only different values: '+ sprintf(total_differ_value_number_format, success_differ) +'/'+ sprintf(total_differ_value_number_format, total_differ) +
            ' (' + get_percent(success_differ, total_differ) + ')' +
            ' tests passed. ' +
                ( tests_done ?
                    sprintf(total_value_number_format, total) + ' values' +
                    ' in ' + sprintf(ms_runtime_number_format, delta) + ' ms (' + sprintf('%0.1f', total/delta*1000) + ' n/sec).\n'
                :
                    // sprintf(total_value_number_format, total_differ - currently_parsed_value) + ' left … ' +
                    sprintf(total_value_number_format, currently_parsed_value) + ' values' +
                    ' in ' + sprintf(ms_runtime_number_format, delta) + ' ms (' + sprintf('%0.1f', currently_parsed_value/delta*1000) + ' n/sec).'
                )
        );
    } /* }}} */

    function get_percent(passing_values, parsed_values) {
        return sprintf('%6s', sprintf(percent_number_format, passing_values / parsed_values * 100)).result;
        /* "100.0 %" would be 7 characters long, but that does not happen to often. */
    }

    /* Helper functions {{{ */
    function Comparator(a, b){
        if (a[1] > b[1]) return -1;
        if (a[1] < b[1]) return 1;
        return 0;
    }
    function get_dump_creation_time_from_file(file) {
        try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            for (let i = 0; i < data.length; i++) {
                if (data[i].name === 'Database') {
                    return new Date(data[i].data_until);
                }
            }
        } catch {
            return;
        }
    }
    /* }}} */
}
/* }}} */
