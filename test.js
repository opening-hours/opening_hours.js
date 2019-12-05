#!/usr/bin/env node

// preamble {{{

/* Parameter handling {{{ */
var optimist = require('optimist')
    .usage('Usage: $0 [optional parameters]')
    .describe('h', 'Display the usage')
    // .describe('v', 'Verbose output')
    .describe('f', 'File path to the opening_hours.js libary file to run the tests against.')
    .describe('l', 'Locale for error/warning messages and prettified values.')
    .alias('h', 'help')
    // .alias('v', 'verbose')
    .alias('f', 'library-file')
    .alias('l', 'locale')
    .default('f', './opening_hours.js')
    .default('l', 'en');

var argv = optimist.argv;

if (argv.help) {
    optimist.showHelp();
    process.exit(0);
}
/* }}} */

/* Required modules {{{ */
var opening_hours = require('./' + argv['library-file']);
var colors        = require('colors');
var sprintf       = require('sprintf-js').sprintf;
var timekeeper    = require('timekeeper');
var moment        = require('moment');
var glob          = require('glob');
var yaml          = require('js-yaml');
var fs            = require('fs');
/* }}} */

colors.setTheme({
    passed:  [ 'green'  , 'bold' ] , // printed with console.log
    warn:    [ 'blue'   , 'bold' ] , // printed with console.info
    failed:  [ 'red'    , 'bold' ] , // printed with console.warn
    crashed: [ 'magenta', 'bold' ] , // printed with console.error
    ignored: [ 'yellow' , 'bold' ] ,
});

// Because of DST and such things, the timezone needs to be set to
// Europe/Berlin for some tests to be reproducible.
process.env.TZ = 'Europe/Berlin';

/* Fake time to make "The year is in the past." test deterministic. */
var timekeeperTime = new Date('Sat May 23 2018 23:23:23 GMT+0200 (CEST)');
timekeeper.travel(timekeeperTime); // Travel to that date.

var test = new opening_hours_test();

// test.extensive_testing = true;
// FIXME: Do it.

/* }}} */

// Nominatim data {{{

var nominatim_by_loc = {};
for (var nominatim_file of glob.sync("holidays/nominatim_cache/*.yaml")) {
    var country_state = nominatim_file.match(/^.*\/([^/]*)\.yaml$/)[1];
    nominatim_by_loc[country_state] = yaml.safeLoad(fs.readFileSync(nominatim_file));
}

var nominatim_default = nominatim_by_loc.de_bw;

// https://nominatim.openstreetmap.org/reverse?format=json&lat=60.5487429714954&lon=9.81602098644987&zoom=18&addressdetails=1
var nominatim_sunrise_below = {
  "place_id": "71977948",
  "licence": "Data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright",
  "osm_type": "way",
  "osm_id": "118145917",
  "lat": "60.5467949",
  "lon": "9.8269589",
  "display_name": "243, Ringerike, Buskerud, Norway",
  "address": {
    "road": "243",
    "county": "Ringerike",
    "state": "Buskerud",
    "country": "Norway",
    "country_code": "no"
  }
};

// https://nominatim.openstreetmap.org/reverse?format=json&lat=27.567&lon=-71.093&zoom=18&addressdetails=1
// Actual response: {"error":"Unable to geocode"}
var nominatim_no_valid_address = {
    "place_id": "-966",
    "licence": "Data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright",
    "osm_type": "way",
    "osm_id": "-42",
    "lat": "27.567",
    "lon": "-71.093",
    "display_name": "-23, None, None, None",
    "address": {
        "road": "-23",
        "county": "None",
        "state": "None",
        "country": "None",
        "country_code": "none"
    }
};

/* }}} */

var sane_value_suffix = '; 00:01-00:02 closed "warning at correct position?"';
// Suffix to add to values to make the value more complex and to spot problems
// easier without changing there meaning (in most cases).
var value_suffix = '; 00:23-00:42 unknown "warning at correct position?"';
// This suffix value is there to test if the warning marks the correct position of the problem.
var value_suffix_to_disable_time_not_used = ' 12:00-15:00';
var value_perfectly_valid = [
    'Mo-Fr 12:00-18:00; We off; Sa,PH 12:00-17:00; Th[3],Th[-1] off',
    'open; Tu-Su 08:30-09:00 off; Tu-Su,PH 14:00-14:30 off; Mo 08:00-13:00 off',
    /* Don‘t use 24/7 instead of "open". PH usage does not make much sense … */
];
/* Used in the README and other places.
 * Those values must be perfectly valid and not return any warnings,
 * regardless of the warnings_severity.
 */

/* Avoid the warning that no time selector was used in a rule. Use this if you
 * are checking for values which should return another warning.
 * warning.
 */


// time ranges {{{
test.addTest('Time intervals', [
        '10:00-12:00',
        '08:00-09:00; 10:00-12:00',
        '10:00-12:00,',
        '10:00-12:00;',
        '10-12', // Do not use. Returns warning.
        '10:00-11:00,11:00-12:00',
        '10:00-12:00,10:30-11:30',
        '10:00-14:00; 12:00-14:00 off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 12:00' ],
        [ '2012-10-02 10:00', '2012-10-02 12:00' ],
        [ '2012-10-03 10:00', '2012-10-03 12:00' ],
        [ '2012-10-04 10:00', '2012-10-04 12:00' ],
        [ '2012-10-05 10:00', '2012-10-05 12:00' ],
        [ '2012-10-06 10:00', '2012-10-06 12:00' ],
        [ '2012-10-07 10:00', '2012-10-07 12:00' ],
    ], 1000 * 60 * 60 * 2 * 7, 0, true, {}, 'not last test');

test.addTest('Time intervals', [
        '24/7; Mo 15:00-16:00 off', // throws a warning, use next value which is evaluated the same but is more logical.
        'open; Mo 15:00-16:00 off',
        '00:00-24:00; Mo 15:00-16:00 off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 15:00' ],
        [ '2012-10-01 16:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * (24 * 6 + 23), 0, true, {}, 'not last test');

test.addTest('Time zero intervals (always closed)', [
        'off',
        'closed',
        ignored('always closed', 'prettifyValue'),
        'off; closed',
        '24/7 closed "always closed"', // Used on the demo page.
        '24/7: closed "always closed"',
        '24/7 closed: "always closed"',
        '24/7: closed: "always closed"',
        'closed "always closed"',
        'off "always closed"',
        '00:00-24:00 closed',
        '24/7 closed',
    ], '2012-10-01 0:00', '2018-10-08 0:00', [
    ], 0, 0, true, {}, 'not last test');

test.addTest('Time zero intervals (always closed), prettifyValue is OK …', [
        ignored('yes', 'prettifyValue'),
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 06:00', false, 'specified as yes: At night (unknown time schedule or daylight detection)' ], // 6
        [ '2012-10-01 18:00', '2012-10-02 06:00', false, 'specified as yes: At night (unknown time schedule or daylight detection)' ], // 12
        [ '2012-10-02 18:00', '2012-10-03 00:00', false, 'specified as yes: At night (unknown time schedule or daylight detection)' ], // 6
    ], 1000 * 60 * 60 * (6 + 12 + 6), 0, true, {}, 'not last test', { 'map_value': true, 'tag_key': 'lit' });

// error tolerance {{{
test.addTest('Error tolerance: dot as time separator', [
        '10:00-12:00', // reference value for prettify
        '10.00-12.00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 12:00' ],
        [ '2012-10-02 10:00', '2012-10-02 12:00' ],
        [ '2012-10-03 10:00', '2012-10-03 12:00' ],
        [ '2012-10-04 10:00', '2012-10-04 12:00' ],
        [ '2012-10-05 10:00', '2012-10-05 12:00' ],
        [ '2012-10-06 10:00', '2012-10-06 12:00' ],
        [ '2012-10-07 10:00', '2012-10-07 12:00' ],
    ], 1000 * 60 * 60 * 2 * 7, 0, true, {}, 'not last test');

test.addTest('Error tolerance: dot as time separator', [
        '10:00-14:00; 12:00-14:00 off', // reference value for prettify
        '10-14; 12-14 off', // '22-2', // Do not use. Returns warning.
        '10.00-14.00; 12.00-14.00 off',
        // '10.00-12.00;10.30-11.30',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 12:00' ],
        [ '2012-10-02 10:00', '2012-10-02 12:00' ],
        [ '2012-10-03 10:00', '2012-10-03 12:00' ],
        [ '2012-10-04 10:00', '2012-10-04 12:00' ],
        [ '2012-10-05 10:00', '2012-10-05 12:00' ],
        [ '2012-10-06 10:00', '2012-10-06 12:00' ],
        [ '2012-10-07 10:00', '2012-10-07 12:00' ],
    ], 1000 * 60 * 60 * 2 * 7, 0, true, {}, 'not last test');

test.addTest('Error tolerance: Correctly handle pm time.', [
        '10:00-12:00,13:00-20:00',       // reference value for prettify
        '10-12,13-20',
        '10am-12pm,1pm-8pm',
        '10:00am-12:00pm,1:00pm-8:00pm',
        '10:00am-12:00pm,1.00pm-8.00pm',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 12:00' ],
        [ '2012-10-01 13:00', '2012-10-01 20:00' ],
        [ '2012-10-02 10:00', '2012-10-02 12:00' ],
        [ '2012-10-02 13:00', '2012-10-02 20:00' ],
    ], 1000 * 60 * 60 * (2 + 7) * 2, 0, true, {}, 'not last test');

/* Legacy 12-hour clock am/pm format {{{ */

/*
 * https://en.wikipedia.org/wiki/12-hour_clock
 * '1pm-8pm/10am-12am', // Can not be corrected as / is a valid token
 */

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '00:00-00:01',       // reference value for prettify
        '12:00am-12:01am',
        '12:00 a.m. - 12:01am',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 00:01' ],
        [ '2012-10-02 00:00', '2012-10-02 00:01' ],
    ], 1000 * 60 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '01:00-11:00',       // reference value for prettify
        '01:00am-11:00am',
        '01am-11am',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 01:00', '2012-10-01 11:00' ],
        [ '2012-10-02 01:00', '2012-10-02 11:00' ],
    ], 1000 * 60 * 60 * 10 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '11:59-12:00',       // reference value for prettify
        '11:59am-12:00pm',
        '11:59a.m.-12:00 p.m.',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 11:59', '2012-10-01 12:00' ],
        [ '2012-10-02 11:59', '2012-10-02 12:00' ],
    ], 1000 * 60 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '12:01-12:59',       // reference value for prettify
        '12:01pm-12:59pm',
        '12:01p.m.-12:59 p.m.',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 12:01', '2012-10-01 12:59' ],
        [ '2012-10-02 12:01', '2012-10-02 12:59' ],
    ], 1000 * 60 * 58 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '13:00-13:01',       // reference value for prettify
        '01:00pm-01:01pm',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 13:00', '2012-10-01 13:01' ],
        [ '2012-10-02 13:00', '2012-10-02 13:01' ],
    ], 1000 * 60 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Correctly handle am/pm time.', [
        '23:00-23:59',       // reference value for prettify
        '11:00pm-11:59pm',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 23:00', '2012-10-01 23:59' ],
        [ '2012-10-02 23:00', '2012-10-02 23:59' ],
    ], 1000 * 60 * 59 * 2, 0, true, {}, 'not only test');

/* }}} */

test.addTest('Error tolerance: Time intervals, short time', [
        'Mo 07:00-18:00', //reference value for prettify
        'Montags 07:00-18:00', //reference value for prettify
        'Mo 7-18', // throws a warning, use previous value which is equal.
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 07:00', '2012-10-01 18:00' ],
    ], 1000 * 60 * 60 * 11, 0, true, {}, 'not last test');

test.addTest('Error tolerance: Time range', [
        'Mo 12:00-14:00', // reference value for prettify
        'Mo12:00-14:00',
        'Mo 12:00→14:00',
        'Mo 12:00–14:00',
        'Mo 12:00−14:00',
        'Mo 12:00—14:00',
        'Mo 12:00ー14:00',
        'Mo 12:00=14:00',
        'Mo 12:00 to 14:00',
        'Mo 12:00 до 14:00',
        'Mo 12:00 a 14:00',
        'Mo 12:00 as 14:00',
        'Mo 12:00 á 14:00',
        'Mo 12:00 ás 14:00',
        'Mo 12:00 à 14:00',
        'Mo 12:00 às 14:00',
        'Mo 12:00 ate 14:00',
        'Mo 12:00 till 14:00',
        'Mo 12:00 til 14:00',
        'Mo 12:00 until 14:00',
        'Mo 12:00 through 14:00',
        'Mo 12:00~14:00',
        'Mo 12:00～14:00',
        'Mo 12:00-14：00',
        'Mo 12°°-14:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 14:00' ],
    ], 1000 * 60 * 60 * 2, 0, true, {}, 'not only test');

test.addTest('Error tolerance: Time range', [
        'Mo 00:30-14:09' + sane_value_suffix, // reference value for prettify
        'Mo 00³°-14:09' + sane_value_suffix,
        'Mo 00:³°-14:09' + sane_value_suffix,
        'Mo °°³°-14:09' + sane_value_suffix,
        'Mo ⁰⁰:³⁰-¹⁴:⁰⁹' + sane_value_suffix,
        'Mo ₀₀₃₀-₁₄⁰⁹' + sane_value_suffix,
        'Mo ₀₀:₃₀-₁₄:₀₉' + sane_value_suffix,
        'Mo ₀:₃₀-₁₄:₀₉' + sane_value_suffix,
        'Mo ₀:₃₀-₁₄:₉' + sane_value_suffix,
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:30', '2012-10-01 14:09' ],
    ], 1000 * 60 * (60 * 13 + 39), 0, true, {}, 'not only test');
// }}}

// time range spanning midnight {{{
test.addTest('Time ranges spanning midnight', [
        '22:00-02:00',
        '22:00-26:00',
        '22-2', // Do not use. Returns warning.
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 22:00', '2012-10-02 02:00' ],
        [ '2012-10-02 22:00', '2012-10-03 02:00' ],
        [ '2012-10-03 22:00', '2012-10-04 02:00' ],
        [ '2012-10-04 22:00', '2012-10-05 02:00' ],
        [ '2012-10-05 22:00', '2012-10-06 02:00' ],
        [ '2012-10-06 22:00', '2012-10-07 02:00' ],
        [ '2012-10-07 22:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * 4 * 7, 0, true, nominatim_default);

test.addTest('Time ranges spanning midnight', [
        '22:00-26:00', // reference value for prettify
        '22-26', // Do not use. Returns warning.
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 22:00', '2012-10-02 02:00' ],
        [ '2012-10-02 22:00', '2012-10-03 02:00' ],
        [ '2012-10-03 22:00', '2012-10-04 02:00' ],
        [ '2012-10-04 22:00', '2012-10-05 02:00' ],
        [ '2012-10-05 22:00', '2012-10-06 02:00' ],
        [ '2012-10-06 22:00', '2012-10-07 02:00' ],
        [ '2012-10-07 22:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * 4 * 7, 0, true, nominatim_default);

test.addTest('Time ranges spanning midnight', [
        'We 22:00-22:00',
        'We22:00-22:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-03 22:00', '2012-10-04 22:00' ],
    ], 1000 * 60 * 60 * 24, 0, true, {}, 'not last test');

test.addTest('Time ranges spanning midnight with date overwriting', [
        '22:00-02:00; Tu 12:00-14:00',
        '22:00-02:00; Tu12:00-14:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 22:00', '2012-10-02 00:00' ],
        [ '2012-10-02 12:00', '2012-10-02 14:00' ],
        [ '2012-10-03 00:00', '2012-10-03 02:00' ],
        [ '2012-10-03 22:00', '2012-10-04 02:00' ],
        [ '2012-10-04 22:00', '2012-10-05 02:00' ],
        [ '2012-10-05 22:00', '2012-10-06 02:00' ],
        [ '2012-10-06 22:00', '2012-10-07 02:00' ],
        [ '2012-10-07 22:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * (6 * 4 + 2), 0, true, {}, 'not last test');

test.addTest('Time ranges spanning midnight with date overwriting (complex real world example)', [
        'Su-Tu 11:00-01:00, We-Th 11:00-03:00, Fr 11:00-06:00, Sa 11:00-07:00',
        'Su-Tu 11:00-01:00, We-Th11:00-03:00, Fr 11:00-06:00, Sa 11:00-07:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 01:00', ], // Mo: Su-Tu 11:00-01:00
        [ '2012-10-01 11:00', '2012-10-02 01:00', ], // Mo: Su-Tu 11:00-01:00
        [ '2012-10-02 11:00', '2012-10-03 01:00', ], // Tu: Su-Tu 11:00-01:00
        [ '2012-10-03 11:00', '2012-10-04 03:00', ], // We: We-Th 11:00-03:00
        [ '2012-10-04 11:00', '2012-10-05 03:00', ], // Th: We-Th 11:00-03:00
        [ '2012-10-05 11:00', '2012-10-06 06:00', ], // Fr: Fr 11:00-06:00
        [ '2012-10-06 11:00', '2012-10-07 07:00', ], // Sa: Sa 11:00-07:00
        [ '2012-10-07 11:00', '2012-10-08 00:00', ], // Su: Su-Tu 11:00-01:00
    ], 1000 * 60 * 60 * (1 + 14 * 2 + 16 * 2 + 19 + 20 + 13), 0, true);

test.addTest('Time ranges spanning midnight (maximum supported)', [
        'Tu 23:59-48:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-02 23:59', '2012-10-04 00:00' ],
    ], 1000 * 60 * (24 * 60 + 1), 0, true, {}, 'not last test');

test.addTest('Time ranges spanning midnight with open ened (maximum supported)', [
        'Tu 23:59-40:00+',
        // 'Tu 23:59-00:00 open, 24:00-40:00 open, 40:00+ open, 40:00+',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-02 23:59', '2012-10-03 16:00' ],
        [ '2012-10-03 16:00', '2012-10-04 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * (16 * 60 + 1), 1000 * 60 * 60 * 8, true, {}, 'not only test');
// }}}

// }}}

// open end {{{
test.addTest('Open end', [
        '07:00+ open "visit there website to know if they did already close"', // specified comments should not be overridden
        '07:00+ unknown "visit there website to know if they did already close"', // will always interpreted as unknown
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 07:00', '2012-10-02 00:00', true,  'visit there website to know if they did already close' ],
    ], 0, 1000 * 60 * 60 * (24 - 7), true, {}, 'not last test');

test.addTest('Open end', [
        '17:00+',
        '17:00-late',
        '17:00 til late',
        '17:00 till late',
        '17:00 bis Open End',
        '17:00-open end',
        // '17:00 – Open End', // '–' matches first.
        '17:00-openend',
        '17:00+; 15:00-16:00 off',
        '15:00-16:00 off; 17:00+',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 03:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 17:00', '2012-10-02 00:00', true, 'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * 60 * (3 + 24 - 17), true, nominatim_default, 'not last test');

test.addTest('Open end, variable time', [
        'sunrise+',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 07:22', '2012-10-02 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * (60 * 16 + 60 - 22), false, nominatim_default, 'not last test');

test.addTest('Open end, variable time', [
        '(sunrise+01:00)+',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 08:22', '2012-10-02 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * (60 * 15 + 60 - 22), false, nominatim_default, 'not last test');

test.addTest('Open end', [
        '17:00+ off',
        '17:00+off',
        '17:00-19:00 off',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
    ], 0, 0, true, {}, 'not last test');

test.addTest('Open end', [
        // '12:00-16:00,07:00+', // Fails. This is ok. Just put your time selectors in the correct order.
        '07:00+,12:00-16:00',
        '07:00+,12:00-13:00,13:00-16:00',
        '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"', // Now obsolete: https://github.com/opening-hours/opening_hours.js/issues/48
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 07:00', '2012-10-01 12:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 12:00', '2012-10-01 16:00' ],
    ], 1000 * 60 * 60 * 4, 1000 * 60 * 60 * 5, true, {}, 'not only test');

test.addTest('Open end', [
        '05:00-06:00,06:45-07:00+,13:00-16:00',
        '06:45-07:00+,05:00-06:00,13:00-16:00',
        '06:45-07:00+,05:00-06:00,13:00-14:00,14:00-16:00',
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 05:00', '2012-10-01 06:00' ],
        [ '2012-10-01 06:45', '2012-10-01 07:00' ],
        [ '2012-10-01 07:00', '2012-10-01 13:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 13:00', '2012-10-01 16:00' ],
    ], 1000 * 60 * 60 * (4 + 0.25), 1000 * 60 * 60 * 6, true, {}, 'not only test');

/* To complicated, just don‘t use them … {{{ */
test.addTest('Open end', [
        '17:00+,13:00-02:00; 02:00-03:00 closed "needed because of open end"',
        '17:00+,13:00-02:00; 02:00-03:00 closed "needed because of open end"',
        // '17:00-00:00 unknown "Specified as open end. Closing time was guessed.", 13:00-00:00 open' // First internal rule.
        // + ', ' [> overwritten part: 00:00-03:00 open' <] + '00:00-02:00 open', // Second internal rule.
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 13:00', '2012-10-02 02:00' ],
    ], 1000 * 60 * 60 * (2 + 24 - 13 + 2), 0, true, {}, 'not only test');

test.addTest('Open end', [
        '13:00-17:00+', // Use this.
        '13:00-17:00,17:00+',
        '13:00-02:00,17:00+', // Do not use.
        '13:00-17:00 open, 17:00+'
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 00:00', '2012-10-01 03:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 13:00', '2012-10-01 17:00' ],
        [ '2012-10-01 17:00', '2012-10-02 03:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * 60 * 4, 1000 * 60 * 60 * (3 + (3+4+3)), true, {}, 'not only test');

test.addTest('Open end', [
        // '05:00-06:00,17:00+,13:00-02:00',
        // '05:00-06:00,13:00-02:00,17:00+',
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 05:00', '2012-10-01 06:00' ],
        [ '2012-10-01 13:00', '2012-10-02 02:00' ],
    ], 1000 * 60 * 60 * (2 + 1 + (24 - 13 + 2)), 0, true, {}, 'not only test');
/* }}} */

// proposal: opening hours open end fixed time extension {{{
// https://wiki.openstreetmap.org/wiki/Proposed_features/opening_hours_open_end_fixed_time_extension

test.addTest('Fixed time followed by open end', [
        '14:00-17:00+',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 03:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 14:00', '2012-10-01 17:00' ],
        [ '2012-10-01 17:00', '2012-10-02 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * 60 * 3, 1000 * 60 * 60 * (3 + 7), true, {}, 'not last test');

test.addTest('Fixed time followed by open end, wrapping over midnight', [
        'Mo 22:00-04:00+',
        'Mo 22:00-28:00+',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 22:00', '2012-10-02 04:00' ],
        [ '2012-10-02 04:00', '2012-10-02 12:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * 60 * 6, 1000 * 60 * 60 * 8, true, {}, 'not last test');

test.addTest('variable time range followed by open end', [
        '14:00-sunset+',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-01 14:00', '2012-10-01 19:00' ],
        [ '2012-10-01 19:00', '2012-10-02 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * 60 * 5, 1000 * 60 * 60 * (4 + 5), false, nominatim_default, 'not last test');

test.addTest('variable time range followed by open end', [
        'sunrise-14:00+',
        'sunrise-14:00,14:00+', // Internally represented as two time selectors.
        'sunrise-14:00 open, 14:00+',
    ], '2012-10-01 0:00', '2012-10-02 5:00', [
        [ '2012-10-01 07:22', '2012-10-01 14:00' ],
        [ '2012-10-01 14:00', '2012-10-02 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * (38 + 60 * 6), 1000 * 60 * 60 * 10, false, nominatim_default, 'not only test');

test.addTest('variable time range followed by open end', [
        'sunrise-(sunset+01:00)+',
        'sunrise-(sunset+01:00)+; Su off',
    ], '2012-10-06 0:00', '2012-10-07 0:00', [
        [ '2012-10-06 00:00', '2012-10-06 05:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2012-10-06 07:29', '2012-10-06 19:50' ],
        [ '2012-10-06 19:50', '2012-10-07 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 1000 * 60 * (31 + (19 - 8) * 60 + 50), 1000 * 60 * (60 * 5 + 60 * 4 + 10), false, nominatim_default, 'not last test');

test.addTest('variable time range followed by open end, day wrap and different states', [
    'Fr 11:00-24:00+ open "geöffnet täglich von 11:00 Uhr bis tief in die Nacht"',
    'Fr 11:00-24:00+ open"geöffnet täglich von 11:00 Uhr bis tief in die Nacht"',
    'Fr 11:00-24:00+open "geöffnet täglich von 11:00 Uhr bis tief in die Nacht"',
    'Fr 11:00-24:00+open"geöffnet täglich von 11:00 Uhr bis tief in die Nacht"',
    'Fr11:00-24:00+open"geöffnet täglich von 11:00 Uhr bis tief in die Nacht"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-05 11:00', '2012-10-06 00:00', false, 'geöffnet täglich von 11:00 Uhr bis tief in die Nacht' ],
        [ '2012-10-06 00:00', '2012-10-06 08:00', true,  'geöffnet täglich von 11:00 Uhr bis tief in die Nacht' ],
    ], 1000 * 60 * 60 * 13, 1000 * 60 * 60 * 8, true, nominatim_default, 'not last test');
// }}}
// }}}

// variable times {{{
test.addTest('Variable times e.g. dawn, dusk', [
        'Mo dawn-dusk',
        'dawn-dusk',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 06:50', '2012-10-01 19:32' ],
    ], 1000 * 60 * (60 * 12 + 10 + 32), 0, false, nominatim_default, 'not last test');

test.addTest('Variable times e.g. sunrise, sunset', [
        'Mo sunrise-sunset',
        'sunrise-sunset',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 19:00' ],
    ], 1000 * 60 * (60 * 11 + 38), 0, false, nominatim_default);

test.addTest('Variable times e.g. sunrise, sunset without coordinates (→ constant times)', [
        'sunrise-sunset',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 06:00', '2012-10-01 18:00' ],
        [ '2012-10-02 06:00', '2012-10-02 18:00' ],
    ], 1000 * 60 * 60 * 12 * 2, 0, true);

test.addTest('Variable times e.g. sunrise, sunset', [
        'sunrise-sunset open "Beware of sunburn!"',
        // 'sunrise-sunset closed "Beware of sunburn!"', // Not so intuitive I guess.
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 19:00', false, 'Beware of sunburn!' ],
    ], 1000 * 60 * (60 * 11 + 38), 0, false, nominatim_default, 'not only test');

test.addTest('Variable times calculation without coordinates', [
        '(sunrise+01:02)-(sunset-00:30)',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 07:02', '2012-10-01 17:30' ],
        [ '2012-10-02 07:02', '2012-10-02 17:30' ],
    ], 1000 * 60 * (60 * 10 + 28) * 2, 0, true, {}, 'not last test');

test.addTest('Variable times e.g. dawn, dusk without coordinates (→ constant times)', [
        'dawn-dusk',
        '(dawn+00:00)-dusk', // testing variable time calculation, should not change time
        'dawn-(dusk-00:00)',
        '(dawn+00:00)-(dusk-00:00)',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 05:30', '2012-10-01 18:30' ],
        [ '2012-10-02 05:30', '2012-10-02 18:30' ],
    ], 1000 * 60 * 60 * 13 * 2, 0, true);

test.addTest('Variable times e.g. sunrise, sunset over a few days', [
        'sunrise-sunset', // If your timezone uses daylight saving times you will see a difference of around one hours between two days.
        'daylight', // Throws a warning.
    ], '2012-10-01 0:00', '2012-10-04 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 19:00' ],
        [ '2012-10-02 07:23', '2012-10-02 18:58' ],
        [ '2012-10-03 07:25', '2012-10-03 18:56' ],
    ], 1000 * 60 * ((60 * 11 + 38) + (60 * 11 + 37 - 2) + (60 * 11 + 35 - 4)), 0, false, nominatim_default, 'not only test');

test.addTest('Variable times calculation with coordinates', [
        '(sunrise+02:00)-sunset',
    ], '2012-10-01 0:00', '2012-10-04 0:00', [
        [ '2012-10-01 09:22', '2012-10-01 19:00' ],
        [ '2012-10-02 09:23', '2012-10-02 18:58' ],
        [ '2012-10-03 09:25', '2012-10-03 18:56' ],
    ], 1000 * 60 * ((60 * 11 + 38) + (60 * 11 + 37 - 2) + (60 * 11 + 35 - 4) - 60 * 2 * 3), 0, false, nominatim_default, 'not last test');

test.addTest('Variable times which moves over fix end time', [
        'sunrise-08:02',
    ], '2013-01-26 0:00', '2013-02-03 0:00', [
        // [ '2013-01-26 08:03', '2013-01-26 08:02' ], // Ignored because it would be interpreted as time range spanning midnight
        // [ '2013-01-27 08:02', '2013-01-27 08:02' ], // which is probably not what you want.
        [ '2013-01-28 08:00', '2013-01-28 08:02' ],
        [ '2013-01-29 07:59', '2013-01-29 08:02' ],
        [ '2013-01-30 07:58', '2013-01-30 08:02' ],
        [ '2013-01-31 07:56', '2013-01-31 08:02' ],
        [ '2013-02-01 07:55', '2013-02-01 08:02' ],
        [ '2013-02-02 07:54', '2013-02-02 08:02' ],
    ], 1000 * 60 * (6 * 2 + 1 + 2 + 4 + 5 + 6), 0, false, nominatim_default);

test.addTest('Variable times which moves over fix end time', [
        'sunrise-08:00',
    ], '2013-01-26 0:00', '2013-02-03 0:00', [
        [ '2013-01-29 07:59', '2013-01-29 08:00' ],
        [ '2013-01-30 07:58', '2013-01-30 08:00' ],
        [ '2013-01-31 07:56', '2013-01-31 08:00' ],
        [ '2013-02-01 07:55', '2013-02-01 08:00' ],
        [ '2013-02-02 07:54', '2013-02-02 08:00' ],
    ], 1000 * 60 * (1 + 2 + 4 + 5 + 6), 0, false, nominatim_default);

test.addTest('Variable times which moves over fix end time', [
        'sunrise-07:58',
    ], '2013-01-26 0:00', '2013-02-03 0:00', [
        [ '2013-01-31 07:56', '2013-01-31 07:58' ],
        [ '2013-02-01 07:55', '2013-02-01 07:58' ],
        [ '2013-02-02 07:54', '2013-02-02 07:58' ],
    ], 1000 * 60 * (2 + 3 + 4), 0, false, nominatim_default);

test.addTest('Variable times which moves over fix end time', [
        'sunrise-06:00',
    ], '2013-01-26 0:00', '2013-02-03 0:00', [
    // Not open in range. Constant sunrise <= end time < from time
    ], 0, 0, false, nominatim_default);

test.addTest('Variable times which moves over fix end time', [
        'sunrise-05:59', // end time < constant time < from time
    ], '2013-01-26 0:00', '2013-01-28 0:00', [
    [ '2013-01-26 00:00', '2013-01-26 05:59' ],
    [ '2013-01-26 08:02', '2013-01-27 05:59' ],
    [ '2013-01-27 08:00', '2013-01-28 00:00' ],
    ], 1000 * 60 * ((60 * 5 + 59) + (60 * 22 - 3) + (60 * 16)), 0, false, nominatim_default, 'not last test');

test.addTest('Variable times which moves over fix end time', [
        'sunrise-06:00', // from time < constant time <= end time
    ], '2013-04-15 0:00', '2013-04-19 0:00', [
        [ '2013-04-17 05:59', '2013-04-17 06:00' ],
        [ '2013-04-18 05:56', '2013-04-18 06:00' ],
    ], 1000 * 60 * (1 + 4), 0, false, nominatim_sunrise_below);

test.addTest('Variable times which moves over fix end time', [
        ignored('sunrise-05:59'), // from time < end time <= constant time
    ], '2013-04-13 0:00', '2013-04-19 0:00', [
        [ 'something else', '' ],
    ], 1000 * 60 * 3, 0, false, nominatim_sunrise_below, 'not last test');

test.addTest('Variable times spanning midnight', [
        'sunset-sunrise',
        'Mo-Su sunset-sunrise',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 07:22' ],
        [ '2012-10-01 19:00', '2012-10-02 07:23' ],
        [ '2012-10-02 18:58', '2012-10-03 00:00' ],
    ], 1000 * 60 * ((60 * 7 + 22) + (60 * (5 + 7) + 23) + (60 * 5 + 2)), 0, false, nominatim_default, 'not last test');

test.addTest('Variable times spanning midnight', [
        'sunset-sunrise',
        'Mo-Su sunset-sunrise',
        // '19:00-07:22 Mo-Su', // also works but is week stable
        'Mo-Su sunset-07:22',
        'Mo-Su 19:00-sunrise',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 07:22' ],
        [ '2012-10-01 19:00', '2012-10-02 00:00' ],
    ], 1000 * 60 * ((60 * 7 + 22) + (60 * 5)), 0, false, nominatim_default, 'not last test');
// }}}

// holidays {{{

/* Germany {{{ */
test.addTest('Variable days: public holidays', [
        'PH',
        'holiday',         // Throws a warning.
        'holidays',        // Throws a warning.
        'public holidays', // Throws a warning.
        'public holiday',  // Throws a warning.
    ], '2013-01-01 0:00', '2015-01-01 0:00', [
        [ '2013-01-01 00:00', '2013-01-02 00:00', false, 'Neujahrstag' ],
        [ '2013-01-06 00:00', '2013-01-07 00:00', false, 'Heilige Drei Könige' ],
        [ '2013-03-29 00:00', '2013-03-30 00:00', false, 'Karfreitag' ],
        [ '2013-04-01 00:00', '2013-04-02 00:00', false, 'Ostermontag' ],
        [ '2013-05-01 00:00', '2013-05-02 00:00', false, 'Tag der Arbeit' ],
        [ '2013-05-09 00:00', '2013-05-10 00:00', false, 'Christi Himmelfahrt' ],
        [ '2013-05-20 00:00', '2013-05-21 00:00', false, 'Pfingstmontag' ],
        [ '2013-05-30 00:00', '2013-05-31 00:00', false, 'Fronleichnam' ],
        [ '2013-10-03 00:00', '2013-10-04 00:00', false, 'Tag der Deutschen Einheit' ],
        [ '2013-11-01 00:00', '2013-11-02 00:00', false, 'Allerheiligen' ],
        [ '2013-12-25 00:00', '2013-12-26 00:00', false, '1. Weihnachtstag' ],
        [ '2013-12-26 00:00', '2013-12-27 00:00', false, '2. Weihnachtstag' ],
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Neujahrstag' ],
        [ '2014-01-06 00:00', '2014-01-07 00:00', false, 'Heilige Drei Könige' ],
        [ '2014-04-18 00:00', '2014-04-19 00:00', false, 'Karfreitag' ],
        [ '2014-04-21 00:00', '2014-04-22 00:00', false, 'Ostermontag' ],
        [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Tag der Arbeit' ],
        [ '2014-05-29 00:00', '2014-05-30 00:00', false, 'Christi Himmelfahrt' ],
        [ '2014-06-09 00:00', '2014-06-10 00:00', false, 'Pfingstmontag' ],
        [ '2014-06-19 00:00', '2014-06-20 00:00', false, 'Fronleichnam' ],
        [ '2014-10-03 00:00', '2014-10-04 00:00', false, 'Tag der Deutschen Einheit' ],
        [ '2014-11-01 00:00', '2014-11-02 00:00', false, 'Allerheiligen' ],
        [ '2014-12-25 00:00', '2014-12-26 00:00', false, '1. Weihnachtstag' ],
        [ '2014-12-26 00:00', '2014-12-27 00:00', false, '2. Weihnachtstag' ],
    ], 1000 * 60 * 60 * 24 * (20 + 2 * 2), 0, false, nominatim_default, 'not only test');

// http://www.schulferien.org/Kalender_mit_Ferien/kalender_2014_ferien_Baden_Wuerttemberg.html
test.addTest('Variable days: school holidays', [
        'SH',
    ], '2014-01-01 0:00', '2015-02-01 0:00', [
        [ '2014-01-01 00:00', '2014-01-05 00:00', false, 'Weihnachtsferien' ],
        [ '2014-04-14 00:00', '2014-04-26 00:00', false, 'Osterferien' ],
        [ '2014-06-10 00:00', '2014-06-22 00:00', false, 'Pfingstferien' ],
        [ '2014-07-31 00:00', '2014-09-14 00:00', false, 'Sommerferien' ],
        [ '2014-10-27 00:00', '2014-10-31 00:00', false, 'Herbstferien' ],
        [ '2014-12-22 00:00', '2015-01-06 00:00', false, 'Weihnachtsferien' ],
    ], 1000 * 60 * 60 * 24 * (4 + 12 + 12 + 1 + 31 + 13 + 4 + 15), 0, false, nominatim_default, 'not only test');

// http://www.schulferien.org/Kalender_mit_Ferien/kalender_2015_ferien_Baden_Wuerttemberg.html
// https://github.com/opening-hours/opening_hours.js/issues/83
test.addTest('Variable days: school holidays', [
        'SH',
    ], '2015-01-05 1:00', '2015-01-05 5:00', [
        [ '2015-01-05 01:00', '2015-01-05 05:00', false, 'Weihnachtsferien' ],
    ], 1000 * 60 * 60 * 4, 0, false, nominatim_default, 'not only test');

test.addTest('Variable days: Germany school holidays', [
        'SH',
    ], '2014-01-01 0:00', '2015-01-10 0:00', [
        [ '2014-01-01 00:00', '2014-01-04 00:00', false, 'Weihnachtsferien' ], // 3
        [ '2014-01-30 00:00', '2014-02-01 00:00', false, 'Winterferien' ],     // 2
        [ '2014-04-03 00:00', '2014-04-23 00:00', false, 'Osterferien' ],      // 20
        [ '2014-05-02 00:00', '2014-05-03 00:00', false, 'Osterferien' ],      // 1
        [ '2014-05-30 00:00', '2014-05-31 00:00', false, 'Pfingstferien' ],    // 1
        [ '2014-06-10 00:00', '2014-06-11 00:00', false, 'Pfingstferien' ],    // 1
        [ '2014-07-31 00:00', '2014-09-11 00:00', false, 'Sommerferien' ],     // 1 + 31 + 10
        [ '2014-10-27 00:00', '2014-11-09 00:00', false, 'Herbstferien' ],     // 5 + 8
        [ '2014-12-22 00:00', '2015-01-06 00:00', false, 'Weihnachtsferien' ], // 10 + 5
    ], 1000 * 60 * 60 * 24 * (3 + 2 + 20 + 1 + 1 + 1 + (1 + 31 + 10) + (5 + 8) + (10 + 5)), 0, false, nominatim_by_loc.de_hb, 'not last test');

test.addTest('Variable days: Germany school holidays. Rheinland-Pfalz', [
        'SH',
    ], '2016-01-10 0:00', '2023-12-30 0:00', [
        [ '2016-03-18 00:00', '2016-04-02 00:00', false, 'Osterferien' ],
        [ '2016-07-18 00:00', '2016-08-27 00:00', false, 'Sommerferien' ],
        [ '2016-10-10 00:00', '2016-10-22 00:00', false, 'Herbstferien' ],
        [ '2016-12-22 00:00', '2017-01-07 00:00', false, 'Weihnachtsferien' ],
        [ '2017-04-10 00:00', '2017-04-22 00:00', false, 'Osterferien' ],
        [ '2017-07-03 00:00', '2017-08-12 00:00', false, 'Sommerferien' ],
        [ '2017-10-02 00:00', '2017-10-14 00:00', false, 'Herbstferien' ],
        [ '2017-12-22 00:00', '2018-01-10 00:00', false, 'Weihnachtsferien' ],
        [ '2018-03-26 00:00', '2018-04-07 00:00', false, 'Osterferien' ],
        [ '2018-06-25 00:00', '2018-08-04 00:00', false, 'Sommerferien' ],
        [ '2018-10-01 00:00', '2018-10-13 00:00', false, 'Herbstferien' ],
        [ '2018-12-20 00:00', '2019-01-05 00:00', false, 'Weihnachtsferien' ],
        [ '2019-02-25 00:00', '2019-03-02 00:00', false, 'Winterferien' ],
        [ '2019-04-23 00:00', '2019-05-01 00:00', false, 'Osterferien' ],
        [ '2019-07-01 00:00', '2019-08-10 00:00', false, 'Sommerferien' ],
        [ '2019-09-30 00:00', '2019-10-12 00:00', false, 'Herbstferien' ],
        [ '2019-12-23 00:00', '2020-01-07 00:00', false, 'Weihnachtsferien' ],
        [ '2020-02-17 00:00', '2020-02-22 00:00', false, 'Winterferien' ],
        [ '2020-04-09 00:00', '2020-04-18 00:00', false, 'Osterferien' ],
        [ '2020-07-06 00:00', '2020-08-15 00:00', false, 'Sommerferien' ],
        [ '2020-10-12 00:00', '2020-10-24 00:00', false, 'Herbstferien' ],
        [ '2020-12-21 00:00', '2021-01-01 00:00', false, 'Weihnachtsferien' ],
        [ '2021-03-29 00:00', '2021-04-07 00:00', false, 'Osterferien' ],
        [ '2021-05-25 00:00', '2021-06-03 00:00', false, 'Pfingstferien' ],
        [ '2021-07-19 00:00', '2021-08-28 00:00', false, 'Sommerferien' ],
        [ '2021-10-11 00:00', '2021-10-23 00:00', false, 'Herbstferien' ],
        [ '2021-12-23 00:00', '2022-01-01 00:00', false, 'Weihnachtsferien' ],
        [ '2022-02-21 00:00', '2022-02-26 00:00', false, 'Winterferien' ],
        [ '2022-04-13 00:00', '2022-04-23 00:00', false, 'Osterferien' ],
        [ '2022-07-25 00:00', '2022-09-03 00:00', false, 'Sommerferien' ],
        [ '2022-10-17 00:00', '2022-11-01 00:00', false, 'Herbstferien' ],
        [ '2022-12-23 00:00', '2023-01-03 00:00', false, 'Weihnachtsferien' ],
        [ '2023-04-03 00:00', '2023-04-07 00:00', false, 'Osterferien' ],
        [ '2023-05-30 00:00', '2023-06-08 00:00', false, 'Pfingstferien' ],
        [ '2023-07-24 00:00', '2023-09-02 00:00', false, 'Sommerferien' ],
        [ '2023-10-16 00:00', '2023-10-28 00:00', false, 'Herbstferien' ],
        [ '2023-12-27 00:00', '2023-12-30 00:00', false, 'Weihnachtsferien' ],
    ], 54518400000, 0, false, nominatim_by_loc.de_rp, 'not only test');

/* }}} */

/* Holidays combined with other features {{{ */
test.addTest('Variable days: public holidays', [
        'open; PH off',
        // 'PH off; 24/7', // should not be the same if following the rules
    ], '2013-04-01 0:00', '2013-05-11 0:00', [
        [ '2013-04-02 00:00', '2013-05-01 00:00' ],
        [ '2013-05-02 00:00', '2013-05-09 00:00' ],
        [ '2013-05-10 00:00', '2013-05-11 00:00' ],
    ], 1000 * 60 * 60 * 24 * (30 - 1 + 7 + 1), 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: public holidays (with time range)', [
        'PH 12:00-13:00',
    ], '2012-01-01 0:00', '2012-04-01 0:00', [
        [ '2012-01-01 12:00', '2012-01-01 13:00', false, 'Neujahrstag' ],
        [ '2012-01-06 12:00', '2012-01-06 13:00', false, 'Heilige Drei Könige' ],
    ], 1000 * 60 * 60 * 2, 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: public holidays (with time range)', [
        'PH 12:00-13:00 open "this comment should override the holiday name which is returned as comment if PH matches."',
    ], '2012-01-01 0:00', '2012-04-01 0:00', [
        [ '2012-01-01 12:00', '2012-01-01 13:00', false, 'this comment should override the holiday name which is returned as comment if PH matches.' ],
        [ '2012-01-06 12:00', '2012-01-06 13:00', false, 'this comment should override the holiday name which is returned as comment if PH matches.' ],
    ], 1000 * 60 * 60 * 2, 0, false, nominatim_default, 'not last test');

test.addTest('PH: Only if PH is Wednesday', [
        'PH We,Fr',
        'PH: We,Fr', // Please don’t use ":" after holiday.
        ' We,Fr: PH', // Please don’t use ":" after holiday.
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
        [ '2012-01-06 00:00', '2012-01-07 00:00', false, 'Heilige Drei Könige' ],       // Fr
        [ '2012-04-06 00:00', '2012-04-07 00:00', false, 'Karfreitag' ],                // Fr
        [ '2012-10-03 00:00', '2012-10-04 00:00', false, 'Tag der Deutschen Einheit' ], // We
    ], 1000 * 60 * 60 * 24 * 3, 0, false, nominatim_default, 'not only test');

test.addTest('SH', [
        'SH Mo-Fr',
        'Schulferien Mo-Fr',
        'Ferien Mo-Fr',
        'schoolholiday Mo-Fr',
        'school holiday Mo-Fr',
        'school holidays Mo-Fr',
        'SH: Mo-Fr', // Please don’t use ":" after holiday.
        'SH on work day',
        'SH on work days',
    ], '2012-12-22 0:00', '2013-01-08 0:00', [
        [ '2012-12-24 00:00', '2012-12-29 00:00', false, 'Weihnachtsferien' ],
        [ '2012-12-31 00:00', '2013-01-05 00:00', false, 'Weihnachtsferien' ],
    ], 1000 * 60 * 60 * 24 * (5 * 2), 0, false, nominatim_default, 'not only test');

test.addTest('SH', [
        'SH Mo-Fr',
    ], '2012-12-22 0:00', '2013-01-08 0:00', [
        [ '2012-12-24 00:00', '2012-12-29 00:00', false, 'Weihnachtsferien' ],
        [ '2012-12-31 00:00', '2013-01-05 00:00', false, 'Weihnachtsferien' ],
    ], 1000 * 60 * 60 * 24 * (5 * 2), 0, false, null, 'not only test');

test.addTest('Variable days: public holidays', [
        'PH +1 day',
        'day after public holiday',
        'one day after public holiday',
    ], '2014-10-22 0:00', '2015-01-15 0:00', [
        [ '2014-11-02 00:00', '2014-11-03 00:00', false, 'Day after Allerheiligen' ],
        [ '2014-12-26 00:00', '2014-12-27 00:00', false, 'Day after 1. Weihnachtstag' ],
        [ '2014-12-27 00:00', '2014-12-28 00:00', false, 'Day after 2. Weihnachtstag' ],
        [ '2015-01-02 00:00', '2015-01-03 00:00', false, 'Day after Neujahrstag' ],
        [ '2015-01-07 00:00', '2015-01-08 00:00', false, 'Day after Heilige Drei Könige' ],
    ], 1000 * 60 * 60 * 24 * (3 + 2), 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: public holidays', [
        'PH -1 day Mo-We',
        'Mo-We PH -1 day',
        'day before public holiday Mo-We',
        'one day before public holiday Mo-We',
    ], '2014-10-25 0:00', '2015-01-15 0:00', [
        // [ '2014-10-31 00:00', '2014-11-01 00:00', false, 'Day before Allerheiligen' ],       // 31: Fr
        [ '2014-12-24 00:00', '2014-12-25 00:00', false, 'Day before 1. Weihnachtstag' ],    // 24: We
        // [ '2014-12-25 00:00', '2014-12-26 00:00', false, 'Day before 2. Weihnachtstag' ],    // 25: Th
        [ '2014-12-31 00:00', '2015-01-01 00:00', false, 'Day before Neujahrstag' ],         // 31: We
        [ '2015-01-05 00:00', '2015-01-06 00:00', false, 'Day before Heilige Drei Könige' ], // 05: Mo
    ], 1000 * 60 * 60 * 24 * 3, 0, false, nominatim_default, 'not last test');

// FIXME
test.addTest('Variable days: public holidays', [
        'SH PH -1 day Mo-We',
        'PH -1 day SH Mo-We',
    ], '2014-10-25 0:00', '2015-01-15 0:00', [
        // [ '2014-10-31 00:00', '2014-11-01 00:00', false, 'Day before Allerheiligen' ],       // 31: Fr
        [ '2014-12-24 00:00', '2014-12-25 00:00', false, 'Day before 1. Weihnachtstag' ],    // 24: We
        // [ '2014-12-25 00:00', '2014-12-26 00:00', false, 'Day before 2. Weihnachtstag' ],    // 25: Th
        [ '2014-12-31 00:00', '2015-01-01 00:00', false, 'Day before Neujahrstag' ],         // 31: We
        [ '2015-01-05 00:00', '2015-01-06 00:00', false, 'Day before Heilige Drei Könige' ], // 05: Mo
    ], 1000 * 60 * 60 * 24 * 3, 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: public holidays', [
        'PH -1 day',
        'PH-1day',
        'day before public holiday',
        'one day before public holiday',
    ], '2014-10-25 0:00', '2015-01-15 0:00', [
        // [ '2014-11-01 00:00', '2014-11-02 00:00' ],
        // [ '2014-12-25 00:00', '2014-12-27 00:00' ],
        [ '2014-10-31 00:00', '2014-11-01 00:00', false, 'Day before Allerheiligen' ],
        [ '2014-12-24 00:00', '2014-12-25 00:00', false, 'Day before 1. Weihnachtstag' ],
        [ '2014-12-25 00:00', '2014-12-26 00:00', false, 'Day before 2. Weihnachtstag' ],
        [ '2014-12-31 00:00', '2015-01-01 00:00', false, 'Day before Neujahrstag' ],
        [ '2015-01-05 00:00', '2015-01-06 00:00', false, 'Day before Heilige Drei Könige' ],
    ], 1000 * 60 * 60 * 24 * (3 + 2), 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: school holiday', [
        'open; SH off',
    ], '2014-01-01 0:00', '2014-06-15 0:00', [
        [ '2014-01-05 00:00', '2014-04-14 00:00' ],
        [ '2014-04-26 00:00', '2014-06-10 00:00' ],
    ], 1000 * 60 * 60 * 24 * (31 - 5 + 28 + 31 + 14 + 4 + 31 + 10) -(/* daylight saving time CEST */ 1000 * 60 * 60),
        0, false, nominatim_default, 'not last test');

test.addTest('SH: Only if SH is Wednesday', [
        'SH We',
        'SHWe',
        '2014 SH We',
    ], '2014-01-01 0:00', '2014-05-10 0:00', [
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Weihnachtsferien' ],
        [ '2014-04-16 00:00', '2014-04-17 00:00', false, 'Osterferien' ],
        [ '2014-04-23 00:00', '2014-04-24 00:00', false, 'Osterferien' ],
    ], 1000 * 60 * 60 * 24 * 3, 0, false, nominatim_default, 'not only test');

test.addTest('Variable days: school holidays', [
        'SH,PH',
        '2014 SH,PH',
        'Jan-Feb SH,PH',
        // 'PH,SH', // Note that later holidays override the comment for the first holidays.
    ], '2014-01-01 0:00', '2014-02-15 0:00', [
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Neujahrstag' ],
        [ '2014-01-02 00:00', '2014-01-05 00:00', false, 'Weihnachtsferien' ],
        [ '2014-01-06 00:00', '2014-01-07 00:00', false, 'Heilige Drei Könige' ],
    ], 1000 * 60 * 60 * 24 * (4 + 1), 0, false, nominatim_default, 'not last test');

test.addTest('Variable days: school holidays', [
        'Su,SH,PH',
        'SH,Su,PH',
        'SH,PH,Su',
        'PH,Su,SH',
        ignored('SH,Sonntag und an Feiertagen',  'prettifyValue'),
        ignored('SH,Sonn und Feiertag',  'prettifyValue'),
        ignored('SH,Sonn und Feiertags',  'prettifyValue'),
        ignored('SH,Sonn- und Feiertags',  'prettifyValue'),
        ignored('SH,Sonn- und Feiertage',  'prettifyValue'),
        ignored('SH,Sonn-/Feiertag',  'prettifyValue'),
        ignored('SH,Sonn-/Feiertags', 'prettifyValue'),
        ignored('SH und nur Sonn-/Feiertags', 'prettifyValue'),
        ignored('SH und Sonn-/Feiertags', 'prettifyValue'),
        ignored('SH und an Sonn- und Feiertagen', 'prettifyValue'),
    ], '2014-01-01 0:00', '2014-02-15 0:00', [
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Neujahrstag' ],
        [ '2014-01-02 00:00', '2014-01-05 00:00', false, 'Weihnachtsferien' ],
        [ '2014-01-05 00:00', '2014-01-06 00:00' ],
        [ '2014-01-06 00:00', '2014-01-07 00:00', false, 'Heilige Drei Könige' ],
        [ '2014-01-12 00:00', '2014-01-13 00:00' ],
        [ '2014-01-19 00:00', '2014-01-20 00:00' ],
        [ '2014-01-26 00:00', '2014-01-27 00:00' ],
        [ '2014-02-02 00:00', '2014-02-03 00:00' ],
        [ '2014-02-09 00:00', '2014-02-10 00:00' ],
    ], 1000 * 60 * 60 * 24 * (4 + 1 + 6), 0, false, nominatim_default, 'not only test');

test.addTest('Variable days: Everyday including public holidays', [
        'Mo-Su,PH',
        'PH,Mo-Su',
    ], '2014-01-01 0:00', '2014-01-15 0:00', [
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Neujahrstag' ],
        [ '2014-01-02 00:00', '2014-01-06 00:00' ],
        [ '2014-01-06 00:00', '2014-01-07 00:00', false, 'Heilige Drei Könige' ],
        [ '2014-01-07 00:00', '2014-01-15 00:00' ],
    ], 1000 * 60 * 60 * 24 * 14, 0, false, nominatim_default, 'not last test');

test.addTest('SH(summer holiday) workaround', [
        'Jul-Sep SH',
    ], '2015-01-01 0:00', '2016-01-01 0:00', [
        [ '2015-07-30 00:00', '2015-09-13 00:00', false, 'Sommerferien' ],
    ], 1000 * 60 * 60 * 24 * (2 + 31 + 12), 0, false, nominatim_default, 'not only test');
/* }}} */

/* Italy {{{ */
test.addTest('Variable days: Italian public holidays', [
        'PH',
    ], '2014-01-01 0:00', '2014-12-31 23:59', [
        [ '2014-01-01 00:00', '2014-01-02 00:00', false, 'Capodanno' ],
        [ '2014-01-06 00:00', '2014-01-07 00:00', false, 'Epifania' ],
        [ '2014-04-20 00:00', '2014-04-21 00:00', false, 'Pasqua' ],
        [ '2014-04-21 00:00', '2014-04-22 00:00', false, 'Lunedì di Pasqua' ],
        [ '2014-04-25 00:00', '2014-04-26 00:00', false, 'Liberazione dal nazifascismo (1945)' ],
        [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Festa del lavoro' ],
        [ '2014-06-02 00:00', '2014-06-03 00:00', false, 'Festa della Repubblica' ],
        [ '2014-08-15 00:00', '2014-08-16 00:00', false, 'Assunzione di Maria' ],
        // [ '2014-09-07 00:00', '2014-09-08 00:00', false, 'Festa dell’unità nazionale' ],
        [ '2014-11-01 00:00', '2014-11-02 00:00', false, 'Ognissanti' ],
        [ '2014-12-08 00:00', '2014-12-09 00:00', false, 'Immacolata Concezione' ],
        [ '2014-12-25 00:00', '2014-12-26 00:00', false, 'Natale di Gesù' ],
        [ '2014-12-26 00:00', '2014-12-27 00:00', false, 'Santo Stefano' ],
    ], 1000 * 60 * 60 * 24 * 12, 0, false, nominatim_by_loc.it, 'not last test');
/* }}} */

/* Romania {{{ */
test.addTest('SH for Romania', [
    'SH',
], '2015-01-01 0:00', '2016-09-05 0:00', [
    [ '2015-01-01 00:00', '2015-01-05 00:00', false, 'Vacanța de iarnă' ],
    [ '2015-01-31 00:00', '2015-02-09 00:00', false, 'Vacanţa intersemestrială' ],
    [ '2015-04-11 00:00', '2015-04-20 00:00', false, 'Vacanța de primăvară' ],
    [ '2015-06-20 00:00', '2015-09-14 00:00', false, 'Vacanța de vară' ],
    [ '2015-12-19 00:00', '2016-01-04 00:00', false, 'Vacanța de iarnă' ],
    [ '2016-01-30 00:00', '2016-02-08 00:00', false, 'Vacanţa intersemestrială' ],
    [ '2016-04-23 00:00', '2016-05-04 00:00', false, 'Vacanța de primăvară' ],
    [ '2016-06-18 00:00', '2016-09-05 00:00', false, 'Vacanța de vară' ],
], 19267200000, 0, false, nominatim_by_loc.ro, 'not only test');
/* }}} */

/* Austria {{{ */

test.addTest('SH for Austria', [
    'SH',
], '2017-01-01 0:00', '2018-02-01 0:00', [
	[ '2017-01-01 00:00', '2017-01-08 00:00', false, 'Weihnachtsferien' ],
	[ '2017-02-05 00:00', '2017-02-11 00:00', false, 'Semesterferien' ],
	[ '2017-03-24 00:00', '2017-04-04 00:00', false, 'Osterferien' ],
	[ '2017-05-19 00:00', '2017-05-23 00:00', false, 'Pfingstferien' ],
	[ '2017-07-01 00:00', '2017-09-04 00:00', false, 'Sommerferien' ],
	[ '2017-12-24 00:00', '2018-01-07 00:00', false, 'Weihnachtsferien' ],
], 9241200000, 0, false, nominatim_by_loc.at_1, 'not only test');

/* }}} */

/* Russian holidays {{{ */
test.addTest('Variable days: Russian common public holidays', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 0), 0, false, nominatim_by_loc.ru, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Tatarstan', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-08-30 00:00', '2014-08-31 00:00', false, 'День Республики Татарстан' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
    [ '2014-11-06 00:00', '2014-11-07 00:00', false, 'День Конституции Республики Татарстан' ],
], 1000 * 60 * 60 * 24 * (14 + 4), 0, false, nominatim_by_loc.ru_tatarstan, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Bashkortostan', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-10-11 00:00', '2014-10-12 00:00', false, 'День Республики Башкирии' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, 'День Конституции Башкортостана' ],
], 1000 * 60 * 60 * 24 * (14 + 4), 0, false, nominatim_by_loc.ru_bashkortostan, 'not last test');

test.addTest('Variable days: Russian public holidays. Chuvash Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-06-24 00:00', '2014-06-25 00:00', false, 'День Чувашской республики' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_chuvashia, 'not last test');

test.addTest('Variable days: Russian public holidays. Sakha Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-04-27 00:00', '2014-04-28 00:00', false, 'День Республики Саха' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-06-23 00:00', '2014-06-24 00:00', false, 'Ысыах' ],
    [ '2014-09-27 00:00', '2014-09-28 00:00', false, 'День государственности Республики Саха' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 3), 0, false, nominatim_by_loc.ru_sakha, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Kalmykia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-01-14 00:00', '2014-01-15 00:00', false, 'Цаган Сар' ],
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-04-05 00:00', '2014-04-06 00:00', false, 'День принятия Степного Уложения (Конституции) Республики Калмыкия' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-06 00:00', '2014-06-07 00:00', false, 'День рождения Будды Шакьямун' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
    [ '2014-12-15 00:00', '2014-12-16 00:00', false, 'Зул' ],
    [ '2014-12-28 00:00', '2014-12-29 00:00', false, 'День памяти жертв депортации калмыцкого народа' ],
], 1000 * 60 * 60 * 24 * (14 + 5), 0, false, nominatim_by_loc.ru_kalmykia, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Buryatia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-01-14 00:00', '2014-01-15 00:00', false, 'Сагаалган' ], // Цаган сар
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_buryatia, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Karelia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-08 00:00', '2014-06-09 00:00', false, 'День Республики Карелия' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-09-30 00:00', '2014-10-01 00:00', false, 'День освобождения Карелии от фашистских захватчиков' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 2), 0, false, nominatim_by_loc.ru_karelia, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Udmurtia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-05-31 00:00', '2014-06-01 00:00', false, 'День Государственности Удмуртской Республики' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_udmurtia, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Adygea', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-10-05 00:00', '2014-10-06 00:00', false, 'День образования Республики Адыгея' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 3), 0, false, nominatim_by_loc.ru_adygea, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Dagestan', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-26 00:00', '2014-07-27 00:00', false, 'День Конституции Республики Дагестан' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-09-15 00:00', '2014-09-16 00:00', false, 'День единства народов Дагестана' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 4), 0, false, nominatim_by_loc.ru_dagestan, 'not last test');

test.addTest('Variable days: Russian public holidays. Republic of Ingushetia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-04 00:00', '2014-06-05 00:00', false, 'День образования Республики Ингушетия' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
    // local
], 1000 * 60 * 60 * 24 * (14 + 3), 0, false, nominatim_by_loc.ru_ingushetia, 'not last test');

test.addTest('Variable days: Russian public holidays. Karachay-Cherkess Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-03 00:00', '2014-05-04 00:00', false, 'День возрождения карачаевского народа' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 3), 0, false, nominatim_by_loc.ru_karachay_cherkess, 'not last test');

test.addTest('Variable days: Russian public holidays. Chechen Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-04-16 00:00', '2014-04-17 00:00', false, 'День мира в Чеченской Республике' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 3), 0, false, nominatim_by_loc.ru_chechnya, 'not last test');

test.addTest('Variable days: Russian public holidays. Kabardino-Balkar Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-03-28 00:00', '2014-03-29 00:00', false, 'День возрождения балкарского народа' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-05-21 00:00', '2014-05-22 00:00', false, 'Черкесский день траура' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, 'Ураза-байрам' ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, 'День государственности Кабардино-Балкарской Республики' ],
    [ '2014-10-04 00:00', '2014-10-05 00:00', false, 'Курбан-байрам' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 5), 0, false, nominatim_by_loc.ru_kabardino_balkaria, 'not last test');

test.addTest('Variable days: Russian public holidays. Altai Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-01-14 00:00', '2014-01-15 00:00', false, 'Чага-Байрам' ], // Цаган Сар
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_altai, 'not last test');

test.addTest('Variable days: Russian public holidays. Tyva Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-01-14 00:00', '2014-01-15 00:00', false, 'Народный праздник Шагаа' ], // Цаган Сар
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-08-15 00:00', '2014-08-16 00:00', false, 'День Республики Тыва' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 2), 0, false, nominatim_by_loc.ru_tuva, 'not last test');

test.addTest('Variable days: Russian public holidays. Saratov Oblast', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-04-29 00:00', '2014-04-30 00:00', false, 'Радоница' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_saratov, 'not last test');

test.addTest('Variable days: Russian public holidays. Bryansk Oblast', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-04-29 00:00', '2014-04-30 00:00', false, 'Радоница' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-09-17 00:00', '2014-09-18 00:00', false, 'День освобождения города Брянска' ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 2), 0, false, nominatim_by_loc.ru_bryansk, 'not last test');

test.addTest('Variable days: Russian public holidays. Komi Republic', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, '1. Новогодние каникулы' ],
    [ '2014-01-02 00:00', '2014-01-03 00:00', false, '2. Новогодние каникулы' ],
    [ '2014-01-03 00:00', '2014-01-04 00:00', false, '3. Новогодние каникулы' ],
    [ '2014-01-04 00:00', '2014-01-05 00:00', false, '4. Новогодние каникулы' ],
    [ '2014-01-05 00:00', '2014-01-06 00:00', false, '5. Новогодние каникулы' ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, '6. Новогодние каникулы' ],
    [ '2014-01-07 00:00', '2014-01-08 00:00', false, 'Рождество Христово' ],
    [ '2014-01-08 00:00', '2014-01-09 00:00', false, '8. Новогодние каникулы' ], // 7
    [ '2014-02-23 00:00', '2014-02-24 00:00', false, 'День защитника Отечества' ],
    [ '2014-03-08 00:00', '2014-03-09 00:00', false, 'Международный женский день' ],
    [ '2014-05-01 00:00', '2014-05-02 00:00', false, 'Праздник Весны и Труда' ],
    [ '2014-05-09 00:00', '2014-05-10 00:00', false, 'День Победы' ],
    [ '2014-06-12 00:00', '2014-06-13 00:00', false, 'День России' ],
    [ '2014-08-22 00:00', '2014-08-23 00:00', false, 'День Республики Коми' ], // local
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, 'День народного единства' ],
], 1000 * 60 * 60 * 24 * (14 + 1), 0, false, nominatim_by_loc.ru_komi, 'not last test');
/* }}} */

/* U.S. holidays {{{ */
test.addTest('Variable days: United States common public holidays', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (7 + 0), 0, false, nominatim_by_loc.us, 'not last test');

test.addTest('Variable days: United States public holidays. Alabama', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Robert E. Lee/Martin Luther King Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "George Washington/Thomas Jefferson Birthday" ],
    [ '2014-04-28 00:00', '2014-04-29 00:00', false, "Confederate Memorial Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-06-02 00:00', '2014-06-03 00:00', false, "Jefferson Davis' Birthday" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_al, 'not last test');

test.addTest('Variable days: United States public holidays. Alaska', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-31 00:00', '2014-04-01 00:00', false, "Seward's Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-18 00:00', '2014-10-19 00:00', false, "Alaska Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2 - 1), 0, false, nominatim_by_loc.us_ak, 'not last test');

test.addTest('Variable days: United States public holidays. Arizona', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Dr. Martin Luther King Jr./Civil Rights Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_az, 'not last test');

test.addTest('Variable days: United States public holidays. Arkansas', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Dr. Martin Luther King Jr. and Robert E. Lee's Birthdays" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "George Washington's Birthday and Daisy Gatson Bates Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ar, 'not last test');

test.addTest('Variable days: United States public holidays. California', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-31 00:00', '2014-04-01 00:00', false, "César Chávez Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ca, 'not last test');

test.addTest('Variable days: United States public holidays. Colorado', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_co, 'not last test');

test.addTest('Variable days: United States public holidays. Connecticut', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-12 00:00', '2014-02-13 00:00', false, "Lincoln's Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_ct, 'not last test');

test.addTest('Variable days: United States public holidays. Delaware', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Day After Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_de, 'not last test');

test.addTest('Variable days: United States public holidays. District of Columbia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-16 00:00', '2014-04-17 00:00', false, "Emancipation Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_dc, 'not last test');

test.addTest('Variable days: United States public holidays. Florida', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Friday after Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 - 1), 0, false, nominatim_by_loc.us_fl, 'not last test');

test.addTest('Variable days: United States public holidays. Georgia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-04-28 00:00', '2014-04-29 00:00', false, "Confederate Memorial Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Robert E. Lee's Birthday" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Washington's Birthday" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 3 - 1), 0, false, nominatim_by_loc.us_ga, 'not last test');

test.addTest('Variable days: United States public holidays. Guam', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-05 00:00', '2014-03-06 00:00', false, "Guam Discovery Day" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-07-21 00:00', '2014-07-22 00:00', false, "Liberation Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-02 00:00', '2014-11-03 00:00', false, "All Souls' Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-08 00:00', '2014-12-09 00:00', false, "Lady of Camarin Day" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 5), 0, false, nominatim_by_loc.us_gu, 'not last test');

test.addTest('Variable days: United States public holidays. Hawaii', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-26 00:00', '2014-03-27 00:00', false, "Prince Jonah Kuhio Kalanianaole Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-06-11 00:00', '2014-06-12 00:00', false, "Kamehameha Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-08-15 00:00', '2014-08-16 00:00', false, "Statehood Day"  ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 4 - 1), 0, false, nominatim_by_loc.us_hi, 'not last test');

test.addTest('Variable days: United States public holidays. Idaho', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr.-Idaho Human Rights Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_id, 'not last test');

test.addTest('Variable days: United States public holidays. Illinois', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-12 00:00', '2014-02-13 00:00', false, "Lincoln's Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-03 00:00', '2014-03-04 00:00', false, "Casimir Pulaski Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_il, 'not last test');

test.addTest('Variable days: United States public holidays. Indiana', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-06 00:00', '2014-05-07 00:00', false, "Primary Election Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Lincoln's Birthday" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 4), 0, false, nominatim_by_loc.us_in, 'not last test');

test.addTest('Variable days: United States public holidays. Iowa', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-12 00:00', '2014-02-13 00:00', false, "Lincoln's Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ia, 'not last test');

test.addTest('Variable days: United States public holidays. Kansas', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_ks, 'not last test');

test.addTest('Variable days: United States public holidays. Kentucky', [
    'PH',
], '2014-01-01 0:00', '2015-01-01 00:00', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-31 00:00', '2015-01-01 00:00', false, "New Year's Eve" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_ky, 'not last test');

test.addTest('Variable days: United States public holidays. Louisiana', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-04 00:00', '2014-03-05 00:00', false, "Mardi Gras" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_la, 'not last test');

test.addTest('Variable days: United States public holidays. Maine', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-21 00:00', '2014-04-22 00:00', false, "Patriots' Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_me, 'not last test');

test.addTest('Variable days: United States public holidays. Maryland', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Native American Heritage Day" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_md, 'not last test');

test.addTest('Variable days: United States public holidays. Massachusetts', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-21 00:00', '2014-04-22 00:00', false, "Patriots' Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ma, 'not last test');

test.addTest('Variable days: United States public holidays. Michigan', [
    'PH',
], '2014-01-01 0:00', '2015-01-01 00:00', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-31 00:00', '2015-01-01 00:00', false, "New Year's Eve" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_mi, 'not last test');

test.addTest('Variable days: United States public holidays. Minnesota', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_mn, 'not last test');

test.addTest('Variable days: United States public holidays. Mississippi', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King's and Robert E. Lee's Birthdays" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-28 00:00', '2014-04-29 00:00', false, "Confederate Memorial Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ms, 'not last test');

test.addTest('Variable days: United States public holidays. Missouri', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-08 00:00', '2014-05-09 00:00', false, "Truman Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_mo, 'not last test');

test.addTest('Variable days: United States public holidays. Montana', [
    'PH',
], '2014-01-01 0:00', '2015-01-01 00:00', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-31 00:00', '2015-01-01 00:00', false, "New Year's Eve" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_mt, 'not last test');

test.addTest('Variable days: United States public holidays. Nebraska', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-25 00:00', '2014-04-26 00:00', false, "Arbor Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ne, 'not last test');

test.addTest('Variable days: United States public holidays. Nevada', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-31 00:00', '2014-11-01 00:00', false, "Nevada Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Family Day" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2 - 1), 0, false, nominatim_by_loc.us_nv, 'not last test');

test.addTest('Variable days: United States public holidays. New Hampshire', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Civil Rights Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Day after Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_nh, 'not last test');

test.addTest('Variable days: United States public holidays. New Jersey', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-12 00:00', '2014-02-13 00:00', false, "Lincoln's Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_nj, 'not last test');

test.addTest('Variable days: United States public holidays. New Mexico', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Day after Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1 - 1), 0, false, nominatim_by_loc.us_nm, 'not last test');

test.addTest('Variable days: United States public holidays. New York', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-12 00:00', '2014-02-13 00:00', false, "Lincoln's Birthday" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_ny, 'not last test');

test.addTest('Variable days: United States public holidays. North Carolina', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Day after Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-26 00:00', '2014-12-27 00:00', false, "Day after Christmas" ],
], 1000 * 60 * 60 * 24 * (10 + 4), 0, false, nominatim_by_loc.us_nc, 'not last test');

test.addTest('Variable days: United States public holidays. Ohio', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_oh, 'not last test');

test.addTest('Variable days: United States public holidays. Oklahoma', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Day after Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ok, 'not last test');

test.addTest('Variable days: United States public holidays. Oregon', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_or, 'not last test');

test.addTest('Variable days: United States public holidays. Pennsylvania', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-06-14 00:00', '2014-06-15 00:00', false, "Flag Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_pa, 'not last test');

test.addTest('Variable days: United States public holidays. Puerto Rico', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "Día de Año Nuevo" ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, "Día de Reyes" ],
    [ '2014-01-13 00:00', '2014-01-14 00:00', false, "Natalicio de Eugenio María de Hostos" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Natalicio de Martin Luther King, Jr." ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Día de los Presidentes" ],
    [ '2014-03-22 00:00', '2014-03-23 00:00', false, "Día de la Abolición de Esclavitud" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Viernes Santo" ],
    [ '2014-04-21 00:00', '2014-04-22 00:00', false, "Natalicio de José de Diego" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Recordación de los Muertos de la Guerra" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Día de la Independencia" ],
    [ '2014-07-25 00:00', '2014-07-26 00:00', false, "Constitución de Puerto Rico" ],
    [ '2014-07-27 00:00', '2014-07-28 00:00', false, "Natalicio de Dr. José Celso Barbosa" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Día del Trabajo" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Día de la Raza Descubrimiento de América" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Día del Veterano" ],
    [ '2014-11-19 00:00', '2014-11-20 00:00', false, "Día del Descubrimiento de Puerto Rico" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Día de Acción de Gracias" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Noche Buena" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Día de Navidad" ],
], 1000 * 60 * 60 * 24 * (10 + 9), 0, false, nominatim_by_loc.us_pr, 'not last test');

test.addTest('Variable days: United States public holidays. Rhode Island', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-08-11 00:00', '2014-08-12 00:00', false, "Victory Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 +  1), 0, false, nominatim_by_loc.us_ri, 'not last test');

test.addTest('Variable days: United States public holidays. South Carolina', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-10 00:00', '2014-05-11 00:00', false, "Confederate Memorial Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_sc, 'not last test');

test.addTest('Variable days: United States public holidays. South Dakota', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Native American Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_sd, 'not last test');

test.addTest('Variable days: United States public holidays. Tennessee', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_tn, 'not last test');

test.addTest('Variable days: United States public holidays. Texas', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Friday after Thanksgiving" ],
    [ '2014-12-24 00:00', '2014-12-25 00:00', false, "Christmas Eve" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-26 00:00', '2014-12-27 00:00', false, "Day after Christmas" ],
], 1000 * 60 * 60 * 24 * (10 + 3), 0, false, nominatim_by_loc.us_tx, 'not last test');

test.addTest('Variable days: United States public holidays. United States Virgin Islands', [
    'PH',
], '2014-01-01 0:00', '2015-01-01 00:00', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-06 00:00', '2014-01-07 00:00', false, "Three Kings Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-31 00:00', '2014-04-01 00:00', false, "Transfer Day" ],
    [ '2014-04-17 00:00', '2014-04-18 00:00', false, "Holy Thursday" ],
    [ '2014-04-18 00:00', '2014-04-19 00:00', false, "Good Friday" ],
    [ '2014-04-21 00:00', '2014-04-22 00:00', false, "Easter Monday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-03 00:00', '2014-07-04 00:00', false, "Emancipation Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-07-28 00:00', '2014-07-29 00:00', false, "Hurricane Supplication Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Virgin Islands-Puerto Rico Friendship Day" ],
    [ '2014-10-25 00:00', '2014-10-26 00:00', false, "Hurricane Thanksgiving" ],
    [ '2014-11-01 00:00', '2014-11-02 00:00', false, "Liberty Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
    [ '2014-12-26 00:00', '2014-12-27 00:00', false, "Christmas Second Day" ],
    [ '2014-12-31 00:00', '2015-01-01 00:00', false, "New Year's Eve" ],
], 1000 * 60 * 60 * 24 * (10 + 11), 0, false, nominatim_by_loc.us_vi, 'not last test');

test.addTest('Variable days: United States public holidays. Utah', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-07-24 00:00', '2014-07-25 00:00', false, "Pioneer Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_ut, 'not last test');

test.addTest('Variable days: United States public holidays. Vermont', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-03-04 00:00', '2014-03-05 00:00', false, "Town Meeting Day" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-08-18 00:00', '2014-08-19 00:00', false, "Battle of Bennington" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_vt, 'not last test');

test.addTest('Variable days: United States public holidays. Virginia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-17 00:00', '2014-01-18 00:00', false, "Lee-Jackson Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 1), 0, false, nominatim_by_loc.us_va, 'not last test');

test.addTest('Variable days: United States public holidays. Washington', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_wa, 'not last test');

test.addTest('Variable days: United States public holidays. West Virginia', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-06-20 00:00', '2014-06-21 00:00', false, "West Virginia Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-11-28 00:00', '2014-11-29 00:00', false, "Lincoln's Day" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_wv, 'not last test');

test.addTest('Variable days: United States public holidays. Wisconsin', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-08-12 00:00', '2014-08-13 00:00', false, "Primary Election Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-04 00:00', '2014-11-05 00:00', false, "Election Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 2), 0, false, nominatim_by_loc.us_wi, 'not last test');

test.addTest('Variable days: United States public holidays. Wyoming', [
    'PH',
], '2014-01-01 0:00', '2014-12-31 23:59', [
    [ '2014-01-01 00:00', '2014-01-02 00:00', false, "New Year's Day" ],
    [ '2014-01-20 00:00', '2014-01-21 00:00', false, "Martin Luther King, Jr. Day" ],
    [ '2014-02-17 00:00', '2014-02-18 00:00', false, "Washington's Birthday" ],
    [ '2014-05-26 00:00', '2014-05-27 00:00', false, "Memorial Day" ],
    [ '2014-07-04 00:00', '2014-07-05 00:00', false, "Independence Day" ],
    [ '2014-09-01 00:00', '2014-09-02 00:00', false, "Labor Day" ],
    [ '2014-10-13 00:00', '2014-10-14 00:00', false, "Columbus Day" ],
    [ '2014-11-11 00:00', '2014-11-12 00:00', false, "Veterans Day" ],
    [ '2014-11-27 00:00', '2014-11-28 00:00', false, "Thanksgiving" ],
    [ '2014-12-25 00:00', '2014-12-26 00:00', false, "Christmas Day" ],
], 1000 * 60 * 60 * 24 * (10 + 0), 0, false, nominatim_by_loc.us_wy, 'not last test');
/* }}} */

/* Czech holidays {{{ */
test.addTest('Variable days: Czech Republic public holidays.', [
    'PH',
], '2015-01-01 0:00', '2015-12-31 23:59', [
    [ '2015-01-01 00:00', '2015-01-02 00:00', false, "Den obnovy samostatného českého státu" ],
    [ '2015-04-03 00:00', '2015-04-04 00:00', false, 'Velký pátek' ],
    [ '2015-04-06 00:00', '2015-04-07 00:00', false, "Velikonoční pondělí" ],
    [ '2015-05-01 00:00', '2015-05-02 00:00', false, "Svátek práce" ],
    [ '2015-05-08 00:00', '2015-05-09 00:00', false, "Den vítězství" ],
    [ '2015-07-05 00:00', '2015-07-06 00:00', false, "Den slovanských věrozvěstů Cyrila a Metoděje" ],
    [ '2015-07-06 00:00', '2015-07-07 00:00', false, "Den upálení mistra Jana Husa" ],
    [ '2015-09-28 00:00', '2015-09-29 00:00', false, "Den české státnosti" ],
    [ '2015-10-28 00:00', '2015-10-29 00:00', false, "Den vzniku samostatného československého státu" ],
    [ '2015-11-17 00:00', '2015-11-18 00:00', false, "Den boje za svobodu a demokracii" ],
    [ '2015-12-24 00:00', '2015-12-25 00:00', false, "Štědrý den" ],
    [ '2015-12-25 00:00', '2015-12-26 00:00', false, "1. svátek vánoční" ],
    [ '2015-12-26 00:00', '2015-12-27 00:00', false, "2. svátek vánoční" ],
], 1000 * 60 * 60 * 24 * (13 + 0), 0, false, nominatim_by_loc.cz, 'not last test');
/* }}} */

/* Swedish holidays {{{ */
test.addTest('Variable days: Swedish public holidays.', [
    'PH',
], '2015-01-01 0:00', '2015-12-31 23:59', [
    [ '2015-01-01 00:00', '2015-01-02 00:00', false, 'nyårsdagen' ],
    [ '2015-01-06 00:00', '2015-01-07 00:00', false, 'trettondedag jul' ],
    [ '2015-04-03 00:00', '2015-04-04 00:00', false, 'långfredagen' ],
    [ '2015-04-05 00:00', '2015-04-06 00:00', false, 'påskdagen' ],
    [ '2015-04-06 00:00', '2015-04-07 00:00', false, 'annandag påsk' ],
    [ '2015-05-01 00:00', '2015-05-02 00:00', false, 'första maj' ],
    [ '2015-05-24 00:00', '2015-05-25 00:00', false, 'pingstdagen' ],
    [ '2015-06-06 00:00', '2015-06-07 00:00', false, 'nationaldagen' ],
    [ '2015-06-20 00:00', '2015-06-21 00:00', false, 'midsommardagen' ],
    [ '2015-10-31 00:00', '2015-11-01 00:00', false, 'alla helgons dag' ],
    [ '2015-12-25 00:00', '2015-12-26 00:00', false, 'juldagen' ],
    [ '2015-12-26 00:00', '2015-12-27 00:00', false, 'annandag jul' ],
], 1000 * 60 * 60 * 24 * 12, 0, false, nominatim_by_loc.se, 'not last test');

test.addTest('Variable days: Weekday in given week.', [
    'PH',
], '2016-06-10 0:00', '2016-11-31 23:59', [
    [ '2016-06-25 00:00', '2016-06-26 00:00', false, 'midsommardagen' ],
    [ '2016-11-05 00:00', '2016-11-06 00:00', false, 'alla helgons dag' ],
], 1000 * 60 * 60 * 24 * 2, 0, false, nominatim_by_loc.se, 'not last test');

test.addTest('Variable days: Weekday in given week.', [
    'PH',
], '2017-06-10 0:00', '2017-11-31 23:59', [
    [ '2017-06-24 00:00', '2017-06-25 00:00', false, 'midsommardagen' ],
    [ '2017-11-04 00:00', '2017-11-05 00:00', false, 'alla helgons dag' ],
], 1000 * 60 * 60 * 24 * 2, 0, false, nominatim_by_loc.se, 'not last test');

/* }}} */

/* Ireland holidays {{{ */
test.addTest('Variable days: Ireland public holidays.', [
    'PH',
], '2017-01-01 0:00', '2020-12-31 23:59', [
	[ '2017-01-01 00:00', '2017-01-02 00:00', false, 'New Year’s Day' ],
	[ '2017-03-17 00:00', '2017-03-18 00:00', false, 'St Patrick’s Day' ],
	[ '2017-04-14 00:00', '2017-04-15 00:00', false, 'Good Friday' ],
	[ '2017-04-17 00:00', '2017-04-18 00:00', false, 'Easter Monday' ],
	[ '2017-05-01 00:00', '2017-05-02 00:00', false, 'May Bank Holiday' ],
	[ '2017-06-05 00:00', '2017-06-06 00:00', false, 'June Bank Holiday' ],
	[ '2017-08-07 00:00', '2017-08-08 00:00', false, 'August Bank Holiday' ],
	[ '2017-10-30 00:00', '2017-10-31 00:00', false, 'October Bank Holiday (Halloween)' ],
	[ '2017-12-25 00:00', '2017-12-26 00:00', false, 'Christmas' ],
	[ '2017-12-26 00:00', '2017-12-27 00:00', false, 'St Stephen’s Day' ],
	[ '2017-12-27 00:00', '2017-12-28 00:00', false, 'Bank Holiday' ],
	[ '2018-01-01 00:00', '2018-01-02 00:00', false, 'New Year’s Day' ],
	[ '2018-03-17 00:00', '2018-03-18 00:00', false, 'St Patrick’s Day' ],
	[ '2018-03-19 00:00', '2018-03-20 00:00', false, 'St Patrick’s Day' ],
	[ '2018-03-30 00:00', '2018-03-31 00:00', false, 'Good Friday' ],
	[ '2018-04-02 00:00', '2018-04-03 00:00', false, 'Easter Monday' ],
	[ '2018-05-07 00:00', '2018-05-08 00:00', false, 'May Bank Holiday' ],
	[ '2018-06-04 00:00', '2018-06-05 00:00', false, 'June Bank Holiday' ],
	[ '2018-08-06 00:00', '2018-08-07 00:00', false, 'August Bank Holiday' ],
	[ '2018-10-29 00:00', '2018-10-30 00:00', false, 'October Bank Holiday (Halloween)' ],
	[ '2018-12-25 00:00', '2018-12-26 00:00', false, 'Christmas' ],
	[ '2018-12-26 00:00', '2018-12-27 00:00', false, 'St Stephen’s Day' ],
	[ '2018-12-27 00:00', '2018-12-28 00:00', false, 'Bank Holiday' ],
	[ '2019-01-01 00:00', '2019-01-02 00:00', false, 'New Year’s Day' ],
	[ '2019-03-17 00:00', '2019-03-19 00:00', false, 'St Patrick’s Day' ], /* Two days */
	[ '2019-04-19 00:00', '2019-04-20 00:00', false, 'Good Friday' ],
	[ '2019-04-22 00:00', '2019-04-23 00:00', false, 'Easter Monday' ],
	[ '2019-05-06 00:00', '2019-05-07 00:00', false, 'May Bank Holiday' ],
	[ '2019-06-03 00:00', '2019-06-04 00:00', false, 'June Bank Holiday' ],
	[ '2019-08-05 00:00', '2019-08-06 00:00', false, 'August Bank Holiday' ],
	[ '2019-10-28 00:00', '2019-10-29 00:00', false, 'October Bank Holiday (Halloween)' ],
	[ '2019-12-25 00:00', '2019-12-26 00:00', false, 'Christmas' ],
	[ '2019-12-26 00:00', '2019-12-27 00:00', false, 'St Stephen’s Day' ],
	[ '2019-12-27 00:00', '2019-12-28 00:00', false, 'Bank Holiday' ],
	[ '2020-01-01 00:00', '2020-01-02 00:00', false, 'New Year’s Day' ],
	[ '2020-03-17 00:00', '2020-03-18 00:00', false, 'St Patrick’s Day' ],
	[ '2020-04-10 00:00', '2020-04-11 00:00', false, 'Good Friday' ],
	[ '2020-04-13 00:00', '2020-04-14 00:00', false, 'Easter Monday' ],
	[ '2020-05-04 00:00', '2020-05-05 00:00', false, 'May Bank Holiday' ],
	[ '2020-06-01 00:00', '2020-06-02 00:00', false, 'June Bank Holiday' ],
	[ '2020-08-03 00:00', '2020-08-04 00:00', false, 'August Bank Holiday' ],
	[ '2020-10-26 00:00', '2020-10-27 00:00', false, 'October Bank Holiday (Halloween)' ],
	[ '2020-12-25 00:00', '2020-12-26 00:00', false, 'Christmas' ],
	[ '2020-12-26 00:00', '2020-12-27 00:00', false, 'St Stephen’s Day' ],
	[ '2020-12-27 00:00', '2020-12-28 00:00', false, 'Bank Holiday' ],
], 1000 * 60 * 60 * 24 * 46, 0, false, nominatim_by_loc.ie, 'not only test');

/* }}} */

// }}}

// weekdays {{{
test.addTest('Weekdays', [
        'Mo,Th,Sa,Su 10:00-12:00',
        'Mo,Th,weekend 10:00-12:00',        // Throws a warning.
        'Mo & Th and weekends 10:00-12:00', // Throws a warning.
        'Mo,Th,Sa,Su 10:00-12:00',          // Throws a warning.
        'Mo,Th,Sa-Su 10:00-12:00',
        'Th,Sa-Mo 10:00-12:00',
        '10:00-12:00; Tu-We 00:00-24:00 off; Fr 00:00-24:00 off',
        '10:00-12:00; Tu-We off; Fr off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 12:00' ],
        [ '2012-10-04 10:00', '2012-10-04 12:00' ],
        [ '2012-10-06 10:00', '2012-10-06 12:00' ],
        [ '2012-10-07 10:00', '2012-10-07 12:00' ],
    ], 1000 * 60 * 60 * 2 * 4, 0, true);

test.addTest('Omitted time', [
        'Mo,We',
        'Mo&We', // error tolerance
        'Mo and We', // error tolerance
        'Mo-We; Tu off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 0:00', '2012-10-02 0:00' ],
        [ '2012-10-03 0:00', '2012-10-04 0:00' ],
    ], 1000 * 60 * 60 * 24 * 2, 0, true, {}, 'not last test');

test.addTest('Time ranges spanning midnight w/weekdays', [
        'We 22:00-02:00',
        'We 22:00-26:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-03 22:00', '2012-10-04 02:00' ],
    ], 1000 * 60 * 60 * 4, 0, true);

test.addTest('Exception rules', [
        'Mo-Fr 10:00-16:00; We 12:00-18:00'
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 16:00' ],
        [ '2012-10-02 10:00', '2012-10-02 16:00' ],
        [ '2012-10-03 12:00', '2012-10-03 18:00' ], // Not 10:00-18:00
        [ '2012-10-04 10:00', '2012-10-04 16:00' ],
        [ '2012-10-05 10:00', '2012-10-05 16:00' ],
    ], 1000 * 60 * 60 * 6 * 5, 0, true);
// }}}

// full range {{{
test.addTest('Full range', [
        '00:00-24:00',
        '00:00-00:00',
        '12:00-12:00',
        'Mo-Su 00:00-24:00',
        'Tu-Mo 00:00-24:00',
        'We-Tu 00:00-24:00',
        'Th-We 00:00-24:00',
        'Fr-Th 00:00-24:00',
        'Sa-Fr 00:00-24:00',
        'Su-Sa 00:00-24:00',
        '24/7',
        '24/7; 24/7',     // Use value above.
        '0-24',           // Do not use. Returns warning.
        'midnight-24:00', // Do not use. Returns warning.
        '24 hours',       // Do not use. Returns warning.
        'open',
        '12:00-13:00; 24/7', // '12:00-13:00' is always ignored.
        '00:00-24:00,12:00-13:00', // '00:00-24:00' already matches entire day. '12:00-13:00' is pointless.
        'Mo-Fr,Sa,Su',
        ignored('PH,Mo-Fr,Sa,Su', 'check for week stable not implemented'),
        ignored('PH,Mo-Fr,Sa,Su,SH', 'check for week stable not implemented'),
        ignored('Mo-Fr,Sa,PH,Su,SH', 'check for week stable not implemented'),
        // Is actually week stable, but check for that needs extra logic.
        'Jan-Dec',
        'Feb-Jan',
        'Dec-Nov',
        ignored('Jan 01-Dec 31', 'check for week stable not implemented'),
        'week 01-53',
        'Mo 00:00-24:00; Tu 00:00-24:00; We 00:00-24:00; Th 00:00-24:00; Fr 00:00-24:00; Sa 00:00-24:00; Su 00:00-24:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 0:00', '2012-10-08 0:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, true, nominatim_default, 'not only test');

test.addTest('24/7 as time interval alias (don’t use 24/7 as showen here)', [
        'Mo,We 00:00-24:00', // preferred because more explicit
        'Mo,We 24/7', // throws a warning
        'Mo,We open', // throws a warning
        ignored('Mo,We: open', 'prettifyValue'), // throws a warning
        'Mo,We', // throws a warning
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 0:00', '2012-10-02 0:00' ],
        [ '2012-10-03 0:00', '2012-10-04 0:00' ],
    ], 1000 * 60 * 60 * 24 * 2, 0, true, {}, 'not last test');
// }}}

// constrained weekdays {{{
test.addTest('Constrained weekdays', [
        'We[4,5] 10:00-12:00',
        'We[4-5] 10:00-12:00',
        'We[4],We[5] 10:00-12:00',
        'We[4] 10:00-12:00; We[-1] 10:00-12:00',
        'We[-1,-2] 10:00-12:00',
    ], '2012-10-01 0:00', '2012-11-01 0:00', [
        [ '2012-10-24 10:00', '2012-10-24 12:00' ],
        [ '2012-10-31 10:00', '2012-10-31 12:00' ],
    ], 1000 * 60 * 60 * 2 * 2, 0, false);

test.addTest('Calculations based on constrained weekdays', [
        // FIXME
        'Sa[-1] +3 days 10:00-12:00',
        'Sa[-1] +3 day 10:00-12:00', // 3 day is bad English but our library does tread them as synonym, but oh.prettifyValue fixes this of course ;)
    ], '2013-08-21 0:00', '2014-02-01 0:00', [
        [ '2013-09-03 10:00', '2013-09-03 12:00' ],
        [ '2013-10-01 10:00', '2013-10-01 12:00' ],
        [ '2013-10-29 10:00', '2013-10-29 12:00' ],
        [ '2013-12-03 10:00', '2013-12-03 12:00' ],
        [ '2013-12-31 10:00', '2013-12-31 12:00' ],
        [ '2014-01-28 10:00', '2014-01-28 12:00' ],
    ], 1000 * 60 * 60 * 2 * 6, 0, false, {}, 'not only test');

test.addTest('Calculations based on constrained weekdays: last weekend in month', [
        'Sa[-1],Sa[-1] +1 day 10:00-12:00',
    ], '2013-08-21 0:00', '2013-10-03 0:00', [
        [ '2013-08-31 10:00', '2013-08-31 12:00' ],
        [ '2013-09-01 10:00', '2013-09-01 12:00' ],
        [ '2013-09-28 10:00', '2013-09-28 12:00' ],
        [ '2013-09-29 10:00', '2013-09-29 12:00' ],
    ], 1000 * 60 * 60 * 2 * 4, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays: last weekend in month', [
        'Sa[-1],Sa[-1] +1 day',
    ], '2013-08-21 0:00', '2013-10-03 0:00', [
        [ '2013-08-31 00:00', '2013-09-02 00:00' ],
        [ '2013-09-28 00:00', '2013-09-30 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays', [
        'Sa[2] +3 days 10:00-12:00',
    ], '2013-08-21 0:00', '2013-12-01 0:00', [
    [ '2013-09-17 10:00', '2013-09-17 12:00' ],
    [ '2013-10-15 10:00', '2013-10-15 12:00' ],
    [ '2013-11-12 10:00', '2013-11-12 12:00' ],
    ], 1000 * 60 * 60 * 2 * 3, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays', [
        'Sa[1] -5 days',
    ], '2013-08-21 0:00', '2014-02-01 0:00', [
        [ '2013-09-02 00:00', '2013-09-03 00:00' ],
        [ '2013-09-30 00:00', '2013-10-01 00:00' ],
        [ '2013-10-28 00:00', '2013-10-29 00:00' ],
        [ '2013-12-02 00:00', '2013-12-03 00:00' ],
        [ '2013-12-30 00:00', '2013-12-31 00:00' ],
        [ '2014-01-27 00:00', '2014-01-28 00:00' ],
    ], 1000 * 60 * 60 * 24 * 6, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays', [
        'Su[-1] -1 day',
    ], '2013-08-21 0:00', '2014-02-01 0:00', [
        [ '2013-08-24 00:00', '2013-08-25 00:00' ],
        [ '2013-09-28 00:00', '2013-09-29 00:00' ],
        [ '2013-10-26 00:00', '2013-10-27 00:00' ],
        [ '2013-11-23 00:00', '2013-11-24 00:00' ],
        [ '2013-12-28 00:00', '2013-12-29 00:00' ],
        [ '2014-01-25 00:00', '2014-01-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * 6, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays', [
        'Aug Su[-1] +1 day', // 25: Su;  26 Su +1 day
    ], '2013-08-01 0:00', '2013-10-08 0:00', [
        [ '2013-08-26 00:00', '2013-08-27 00:00' ],
    ], 1000 * 60 * 60 * 24, 0, false, {}, 'not last test');

test.addTest('Calculations based on constrained weekdays', [
        'Aug Su[-1] +1 day',
    ], '2013-08-26 8:00', '2013-10-08 0:00', [
        [ '2013-08-26 08:00', '2013-08-27 00:00' ],
    ], 1000 * 60 * 60 * 16, 0, false, {}, 'not last test');

test.addTest('Constrained weekday (complex real world example)', [
        'Apr-Oct: Su[2] 14:00-18:00; Aug Su[-1] -1 day 10:00-18:00, Aug: Su[-1] 10:00-18:00',
        'Apr-Oct: Su[2] 14:00-18:00; Aug Su[-1] -1 day 10:00-18:00; Aug: Su[-1] 10:00-18:00', // better use this instead
    ], '2013-08-01 0:00', '2013-10-08 0:00', [
        [ '2013-08-11 14:00', '2013-08-11 18:00' ],
        [ '2013-08-24 10:00', '2013-08-24 18:00' ],
        [ '2013-08-25 10:00', '2013-08-25 18:00' ],
        [ '2013-09-08 14:00', '2013-09-08 18:00' ],
    ], 1000 * 60 * 60 * (4 * 2 + 4 * 4), 0, false, {}, 'not last test');
// }}}

// additional rules {{{
test.addTest('Additional rules', [
        'Mo-Fr 10:00-16:00, We 12:00-18:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 16:00' ],
        [ '2012-10-02 10:00', '2012-10-02 16:00' ],
        [ '2012-10-03 10:00', '2012-10-03 18:00' ],
        [ '2012-10-04 10:00', '2012-10-04 16:00' ],
        [ '2012-10-05 10:00', '2012-10-05 16:00' ],
    ], 1000 * 60 * 60 * (6 * 5 + 2), 0, true, {}, 'not last test', { 'warnings_severity': 5, 'tag_key': 'opening_hours:kitchen' });

test.addTest('Additional rules', [
        'Mo-Fr 08:00-12:00, We 14:00-18:00',
        'Mo-Fr 08:00-12:00, We 14:00-18:00; Su off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 08:00', '2012-10-01 12:00' ],
        [ '2012-10-02 08:00', '2012-10-02 12:00' ],
        [ '2012-10-03 08:00', '2012-10-03 12:00' ],
        [ '2012-10-03 14:00', '2012-10-03 18:00' ],
        [ '2012-10-04 08:00', '2012-10-04 12:00' ],
        [ '2012-10-05 08:00', '2012-10-05 12:00' ],
    ], 1000 * 60 * 60 * (5 * 4 + 4), 0, true, {}, 'not last test');
// }}}

// fallback rules {{{
test.addTest('Fallback group rules (unknown)', [
        'We-Fr 10:00-24:00 open "it is open" || "please call"',
        'We-Fr 10:00-24:00 open "it is open" || "please call" || closed "should never appear"',
        'We-Fr 10:00-24:00 open "it is open" || "please call" || unknown "should never appear"',
        'We-Fr 10:00-24:00 open "it is open" || "please call" || open "should never appear"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-03 10:00', true,  'please call' ],
        [ '2012-10-03 10:00', '2012-10-04 00:00', false, 'it is open' ],
        [ '2012-10-04 00:00', '2012-10-04 10:00', true,  'please call' ],
        [ '2012-10-04 10:00', '2012-10-05 00:00', false, 'it is open' ],
        [ '2012-10-05 00:00', '2012-10-05 10:00', true,  'please call' ],
        [ '2012-10-05 10:00', '2012-10-06 00:00', false, 'it is open' ],
        [ '2012-10-06 00:00', '2012-10-08 00:00', true,  'please call' ],
    ], 1000 * 60 * 60 * 14 * 3, 1000 * 60 * 60 * (10 * 3 + 24 * (2 + 2)), true, {}, 'not last test');

test.addTest('Fallback group rules (unknown). Example for the tokenizer documentation.', [
        'We-Fr 10:00-24:00 open "it is open", Mo closed "It‘s monday." || 2012 "please call"; Jan 01 open "should never appear"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-03 10:00', true,  'please call' ],
        [ '2012-10-03 10:00', '2012-10-04 00:00', false, 'it is open' ],
        [ '2012-10-04 00:00', '2012-10-04 10:00', true,  'please call' ],
        [ '2012-10-04 10:00', '2012-10-05 00:00', false, 'it is open' ],
        [ '2012-10-05 00:00', '2012-10-05 10:00', true,  'please call' ],
        [ '2012-10-05 10:00', '2012-10-06 00:00', false, 'it is open' ],
        [ '2012-10-06 00:00', '2012-10-08 00:00', true,  'please call' ],
    ], 1000 * 60 * 60 * 14 * 3, 1000 * 60 * 60 * (10 * 3 + 24 * (2 + 2)), false, {}, 'not only test');

test.addTest('Fallback group rules', [
        'We-Fr 10:00-24:00 open "first" || We "please call" || open "we are open!!!"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-03 00:00', false, 'we are open!!!' ], // Mo,Tu
        [ '2012-10-03 00:00', '2012-10-03 10:00', true,  'please call' ],    // We
        [ '2012-10-03 10:00', '2012-10-04 00:00', false, 'first' ],          // We
        [ '2012-10-04 00:00', '2012-10-04 10:00', false, 'we are open!!!' ], // Th
        [ '2012-10-04 10:00', '2012-10-05 00:00', false, 'first' ],          // Th
        [ '2012-10-05 00:00', '2012-10-05 10:00', false, 'we are open!!!' ], // Fr
        [ '2012-10-05 10:00', '2012-10-06 00:00', false, 'first' ],          // Fr
        [ '2012-10-06 00:00', '2012-10-08 00:00', false, 'we are open!!!' ], // Sa,Su
    ], 1000 * 60 * 60 * (24 * 2 * 2 + 14 * 3 + 10 * 2), 1000 * 60 * 60 * 10, true, {}, 'not last test');

// example from Netzwolf
test.addTest('Fallback group rules', [
        'Mo-Fr 08:00-12:00,14:00-18:00, Sa 09:00-13:00, PH off || Tu 06:00-06:00 open "Notdienst"', // Original value.
        'Mo-Fr 08:00-12:00,14:00-18:00; Sa 09:00-13:00; PH off || Tu 06:00-06:00 open "Notdienst"', // Use this instead.
        // Additional rule is not needed.
    ], '2013-10-01 0:00', '2013-10-08 0:00', [
        [ '2013-10-01 06:00', '2013-10-01 08:00', false, 'Notdienst' ], // Tu
        [ '2013-10-01 08:00', '2013-10-01 12:00' ],
        [ '2013-10-01 12:00', '2013-10-01 14:00', false, 'Notdienst' ],
        [ '2013-10-01 14:00', '2013-10-01 18:00' ],
        [ '2013-10-01 18:00', '2013-10-02 06:00', false, 'Notdienst' ],
        [ '2013-10-02 08:00', '2013-10-02 12:00' ], // We
        [ '2013-10-02 14:00', '2013-10-02 18:00' ],
        [ '2013-10-04 08:00', '2013-10-04 12:00' ],
        [ '2013-10-04 14:00', '2013-10-04 18:00' ],
        [ '2013-10-05 09:00', '2013-10-05 13:00' ], // Sa
        [ '2013-10-07 08:00', '2013-10-07 12:00' ], // Mo
        [ '2013-10-07 14:00', '2013-10-07 18:00' ],
    ], 1000 * 60 * 60 * ((4 * 8 + 4) + (2 + 2 + (6 + 6))), 0, false, nominatim_default, 'not last test');

// example from Netzwolf
test.addTest('Fallback group rules', [
        'Mo-Fr 08:00-11:00 || Th-Sa 12:00-13:00 open "Emergency only"',
        'Mo-Fr 08:00-11:00, Th-Sa 12:00-13:00 open "Emergency only"',
        // Additional rule does the same in this case because the second rule (including the time range) does not overlap the first rule.
        // Both variants are valid.
    ], '2013-10-01 0:00', '2013-10-08 0:00', [
        [ '2013-10-01 08:00', '2013-10-01 11:00' ],
        [ '2013-10-02 08:00', '2013-10-02 11:00' ],
        [ '2013-10-03 08:00', '2013-10-03 11:00' ],
        [ '2013-10-03 12:00', '2013-10-03 13:00', false, 'Emergency only' ],
        [ '2013-10-04 08:00', '2013-10-04 11:00' ],
        [ '2013-10-04 12:00', '2013-10-04 13:00', false, 'Emergency only' ],
        [ '2013-10-05 12:00', '2013-10-05 13:00', false, 'Emergency only' ],
        [ '2013-10-07 08:00', '2013-10-07 11:00' ],
    ], 1000 * 60 * 60 * (3 * 5 + 3 * 1), 0, true, nominatim_default, 'not last test');

test.addTest('Fallback group rules, with some closed times', [
        'Mo,Tu,Th 09:00-12:00; Fr 14:00-17:30 || "Termine nach Vereinbarung"; We off',
        'Mo-Th 09:00-12:00; '+'Fr 14:00-17:30 || "Termine nach Vereinbarung"; We off',
        'Mo-Th 09:00-12:00; '+'Fr 14:00-17:30 || unknown "Termine nach Vereinbarung"; We off',
    ], '2013-10-01 0:00', '2013-10-08 0:00', [
        [ '2013-10-01 00:00', '2013-10-01 09:00', true,  'Termine nach Vereinbarung' ], // 9
        [ '2013-10-01 09:00', '2013-10-01 12:00' ], // Tu
        [ '2013-10-01 12:00', '2013-10-02 00:00', true,  'Termine nach Vereinbarung' ], // 12
        // We off
        [ '2013-10-03 00:00', '2013-10-03 09:00', true,  'Termine nach Vereinbarung' ], // 9
        [ '2013-10-03 09:00', '2013-10-03 12:00' ],
        [ '2013-10-03 12:00', '2013-10-04 14:00', true,  'Termine nach Vereinbarung' ], // 12 + 14
        [ '2013-10-04 14:00', '2013-10-04 17:30' ], // Fr
        [ '2013-10-04 17:30', '2013-10-07 09:00', true,  'Termine nach Vereinbarung' ], // 2.5 + 4 + 24 * 2 + 9
        [ '2013-10-07 09:00', '2013-10-07 12:00' ], // Mo
        [ '2013-10-07 12:00', '2013-10-08 00:00', true,  'Termine nach Vereinbarung' ], // 12
    ], 1000 * 60 * 60 * (3 * 3 + 3.5), 1000 * 60 * 60 * (9 + 12 + 9 + (12 + 14) + (2.5 + 4 + 24 * 2 + 9) + 12), true, {}, 'not last test');
// }}}

// week ranges {{{
test.addTest('Week ranges', [
        'week 01,3 00:00-24:00',
        'week 01,3 00:00-24:00 || closed "should not change the test result"',
        // because comments for closed states are not compared (not returned by the high-level API).
        'week 01,3: 00:00-24:00',
        'week 01,week 03: 00:00-24:00',
        'week 01: 00:00-24:00; week 03: 00:00-24:00',
        'week 01; week 03',
        'week 01-3/2 00:00-24:00',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-02 00:00', '2012-01-09 00:00' ],
        [ '2012-01-16 00:00', '2012-01-23 00:00' ],
        [ '2012-12-31 00:00', '2013-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (2 * 7 + 1), 0, false, {}, 'not last test');

test.addTest('Week ranges', [
        'week 02,4 00:00-24:00',
        'week 02-4/2 00:00-24:00',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-09 00:00', '2012-01-16 00:00' ],
        [ '2012-01-23 00:00', '2012-01-30 00:00' ],
    ], 1000 * 60 * 60 * 24 * (7 + 7), 0, false);

test.addTest('Week range limit', [
        'week 02-53',
        'week 02-53 00:00-24:00',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        [ '2012-01-01 00:00', '2012-01-02 00:00' ], // Checked against http://www.schulferien.org/kalenderwoche/kalenderwochen_2012.html
        [ '2012-01-09 00:00', '2012-12-31 00:00' ],
        [ '2013-01-07 00:00', '2013-12-30 00:00' ],
    ], 1000 * 60 * 60 * 24 * (365 * 2 - 2 * 7 - 2/* FIXME: ??? */ + /* 2012 is leap year */ 1), 0, false, {}, 'not only test');

test.addTest('Week range full range', [
        'week 01-53',
        'week 01-53 00:00-24:00',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        [ '2012-01-01 00:00', '2014-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (365 * 2 + /* 2012 is leap year */ 1), 0, true, {}, 'not last test');

test.addTest('Week range second week', [
        'week 02 00:00-24:00',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        [ '2012-01-09 00:00', '2012-01-16 00:00' ],
        [ '2013-01-07 00:00', '2013-01-14 00:00' ],
    ], 1000 * 60 * 60 * 24 * 7 * 2, 0, false, {}, 'not only test');

(function() {
var week_range_result = [
    [
        [ '2012-01-02 00:00', '2012-01-09 00:00' ],
        [ '2012-01-16 00:00', '2012-01-23 00:00' ],
        [ '2012-01-30 00:00', '2012-02-06 00:00' ],
        [ '2012-02-13 00:00', '2012-02-20 00:00' ],
    ], 1000 * 60 * 60 * 24 * 7 * 4, 0 ];
test.addTest('Week range', [
        'week 01-53/2 00:00-24:00',
    ], '2011-12-30 0:00', '2012-02-22 0:00', week_range_result[0],
    week_range_result[1], week_range_result[2], false);

test.addTest('Week range', [
        'week 01-53/2 00:00-24:00',
    ], '2012-01-01 0:00', '2012-02-22 0:00', week_range_result[0],
    week_range_result[1], week_range_result[2], false, {}, 'not only test');
})();

test.addTest('Week range', [
        'week 02-53/2 We; week 01-53/2 Sa 00:00-24:00',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        /* Long test on per day base {{{ */
        [ '2012-01-07 00:00', '2012-01-08 00:00' ], // Sa, KW1
        [ '2012-01-11 00:00', '2012-01-12 00:00' ], // We, KW2
        [ '2012-01-21 00:00', '2012-01-22 00:00' ], // Sa, KW3
        [ '2012-01-25 00:00', '2012-01-26 00:00' ],
        [ '2012-02-04 00:00', '2012-02-05 00:00' ],
        [ '2012-02-08 00:00', '2012-02-09 00:00' ],
        [ '2012-02-18 00:00', '2012-02-19 00:00' ],
        [ '2012-02-22 00:00', '2012-02-23 00:00' ],
        [ '2012-03-03 00:00', '2012-03-04 00:00' ],
        [ '2012-03-07 00:00', '2012-03-08 00:00' ],
        [ '2012-03-17 00:00', '2012-03-18 00:00' ],
        [ '2012-03-21 00:00', '2012-03-22 00:00' ],
        [ '2012-03-31 00:00', '2012-04-01 00:00' ],
        [ '2012-04-04 00:00', '2012-04-05 00:00' ],
        [ '2012-04-14 00:00', '2012-04-15 00:00' ],
        [ '2012-04-18 00:00', '2012-04-19 00:00' ],
        [ '2012-04-28 00:00', '2012-04-29 00:00' ],
        [ '2012-05-02 00:00', '2012-05-03 00:00' ],
        [ '2012-05-12 00:00', '2012-05-13 00:00' ],
        [ '2012-05-16 00:00', '2012-05-17 00:00' ],
        [ '2012-05-26 00:00', '2012-05-27 00:00' ],
        [ '2012-05-30 00:00', '2012-05-31 00:00' ],
        [ '2012-06-09 00:00', '2012-06-10 00:00' ],
        [ '2012-06-13 00:00', '2012-06-14 00:00' ],
        [ '2012-06-23 00:00', '2012-06-24 00:00' ],
        [ '2012-06-27 00:00', '2012-06-28 00:00' ],
        [ '2012-07-07 00:00', '2012-07-08 00:00' ],
        [ '2012-07-11 00:00', '2012-07-12 00:00' ],
        [ '2012-07-21 00:00', '2012-07-22 00:00' ],
        [ '2012-07-25 00:00', '2012-07-26 00:00' ],
        [ '2012-08-04 00:00', '2012-08-05 00:00' ],
        [ '2012-08-08 00:00', '2012-08-09 00:00' ],
        [ '2012-08-18 00:00', '2012-08-19 00:00' ],
        [ '2012-08-22 00:00', '2012-08-23 00:00' ],
        [ '2012-09-01 00:00', '2012-09-02 00:00' ],
        [ '2012-09-05 00:00', '2012-09-06 00:00' ],
        [ '2012-09-15 00:00', '2012-09-16 00:00' ],
        [ '2012-09-19 00:00', '2012-09-20 00:00' ],
        [ '2012-09-29 00:00', '2012-09-30 00:00' ],
        [ '2012-10-03 00:00', '2012-10-04 00:00' ],
        [ '2012-10-13 00:00', '2012-10-14 00:00' ],
        [ '2012-10-17 00:00', '2012-10-18 00:00' ],
        [ '2012-10-27 00:00', '2012-10-28 00:00' ],
        [ '2012-10-31 00:00', '2012-11-01 00:00' ],
        [ '2012-11-10 00:00', '2012-11-11 00:00' ],
        [ '2012-11-14 00:00', '2012-11-15 00:00' ],
        [ '2012-11-24 00:00', '2012-11-25 00:00' ],
        [ '2012-11-28 00:00', '2012-11-29 00:00' ],
        [ '2012-12-08 00:00', '2012-12-09 00:00' ],
        [ '2012-12-12 00:00', '2012-12-13 00:00' ],
        [ '2012-12-22 00:00', '2012-12-23 00:00' ], // Sa, KW51
        [ '2012-12-26 00:00', '2012-12-27 00:00' ], // We, KW52
        [ '2013-01-05 00:00', '2013-01-06 00:00' ], // Sa, KW01
        [ '2013-01-09 00:00', '2013-01-10 00:00' ],
        [ '2013-01-19 00:00', '2013-01-20 00:00' ],
        [ '2013-01-23 00:00', '2013-01-24 00:00' ],
        [ '2013-02-02 00:00', '2013-02-03 00:00' ],
        [ '2013-02-06 00:00', '2013-02-07 00:00' ],
        [ '2013-02-16 00:00', '2013-02-17 00:00' ],
        [ '2013-02-20 00:00', '2013-02-21 00:00' ],
        [ '2013-03-02 00:00', '2013-03-03 00:00' ],
        [ '2013-03-06 00:00', '2013-03-07 00:00' ],
        [ '2013-03-16 00:00', '2013-03-17 00:00' ],
        [ '2013-03-20 00:00', '2013-03-21 00:00' ],
        [ '2013-03-30 00:00', '2013-03-31 00:00' ],
        [ '2013-04-03 00:00', '2013-04-04 00:00' ],
        [ '2013-04-13 00:00', '2013-04-14 00:00' ],
        [ '2013-04-17 00:00', '2013-04-18 00:00' ],
        [ '2013-04-27 00:00', '2013-04-28 00:00' ],
        [ '2013-05-01 00:00', '2013-05-02 00:00' ],
        [ '2013-05-11 00:00', '2013-05-12 00:00' ],
        [ '2013-05-15 00:00', '2013-05-16 00:00' ],
        [ '2013-05-25 00:00', '2013-05-26 00:00' ],
        [ '2013-05-29 00:00', '2013-05-30 00:00' ],
        [ '2013-06-08 00:00', '2013-06-09 00:00' ],
        [ '2013-06-12 00:00', '2013-06-13 00:00' ],
        [ '2013-06-22 00:00', '2013-06-23 00:00' ],
        [ '2013-06-26 00:00', '2013-06-27 00:00' ],
        [ '2013-07-06 00:00', '2013-07-07 00:00' ],
        [ '2013-07-10 00:00', '2013-07-11 00:00' ],
        [ '2013-07-20 00:00', '2013-07-21 00:00' ],
        [ '2013-07-24 00:00', '2013-07-25 00:00' ],
        [ '2013-08-03 00:00', '2013-08-04 00:00' ],
        [ '2013-08-07 00:00', '2013-08-08 00:00' ],
        [ '2013-08-17 00:00', '2013-08-18 00:00' ],
        [ '2013-08-21 00:00', '2013-08-22 00:00' ],
        [ '2013-08-31 00:00', '2013-09-01 00:00' ],
        [ '2013-09-04 00:00', '2013-09-05 00:00' ],
        [ '2013-09-14 00:00', '2013-09-15 00:00' ],
        [ '2013-09-18 00:00', '2013-09-19 00:00' ],
        [ '2013-09-28 00:00', '2013-09-29 00:00' ],
        [ '2013-10-02 00:00', '2013-10-03 00:00' ],
        [ '2013-10-12 00:00', '2013-10-13 00:00' ],
        [ '2013-10-16 00:00', '2013-10-17 00:00' ],
        [ '2013-10-26 00:00', '2013-10-27 00:00' ],
        [ '2013-10-30 00:00', '2013-10-31 00:00' ],
        [ '2013-11-09 00:00', '2013-11-10 00:00' ],
        [ '2013-11-13 00:00', '2013-11-14 00:00' ],
        [ '2013-11-23 00:00', '2013-11-24 00:00' ],
        [ '2013-11-27 00:00', '2013-11-28 00:00' ],
        [ '2013-12-07 00:00', '2013-12-08 00:00' ],
        [ '2013-12-11 00:00', '2013-12-12 00:00' ],
        [ '2013-12-21 00:00', '2013-12-22 00:00' ], // Sa, KW51
        [ '2013-12-25 00:00', '2013-12-26 00:00' ], // We, KW52
        /* }}} */
    ], 1000 * 60 * 60 * 24 * 104, 0, false);

(function() {
var week_range_result = [
    [
        [ '2012-01-23 00:00', '2012-04-23 00:00' ],
        [ '2013-01-21 00:00', '2013-04-22 00:00' ],
        [ '2014-01-20 00:00', '2014-04-21 00:00' ],
        [ '2015-01-19 00:00', '2015-04-20 00:00' ],
        [ '2016-01-25 00:00', '2016-04-25 00:00' ],
        [ '2017-01-23 00:00', '2017-04-24 00:00' ],
        // Checked against http://www.schulferien.org/kalenderwoche/kalenderwochen_2017.html
    ], 1000 * 60 * 60 * (24 * 7 * 6 * (16 - 3) - /* daylight saving */ 6), 0 ];

test.addTest('Week range (beginning in last year)', [
        'week 04-16',
    ], '2011-12-30 0:00', '2018-01-01 0:00', week_range_result[0],
    week_range_result[1], week_range_result[2], false, {}, 'not only test');

test.addTest('Week range (beginning in matching year)', [
        'week 04-16',
    ], '2012-01-01 0:00', '2018-01-01 0:00', week_range_result[0],
    week_range_result[1], week_range_result[2], false, {}, 'not last test');
})();

test.addTest('Week range first week', [
        'week 01',
    ], '2014-12-01 0:00', '2015-02-01 0:00', [
        [ '2014-12-29 00:00', '2015-01-05 00:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, false, {}, 'not only test');

test.addTest('Week range first week', [
        'week 01',
        'week 01 open',
        'week 01 00:00-24:00',
    ], '2012-12-01 0:00', '2024-02-01 0:00', [
        [ '2012-12-31 00:00', '2013-01-07 00:00' ],
        [ '2013-12-30 00:00', '2014-01-06 00:00' ],
        [ '2014-12-29 00:00', '2015-01-05 00:00' ],
        [ '2016-01-04 00:00', '2016-01-11 00:00' ],
        [ '2017-01-02 00:00', '2017-01-09 00:00' ],
        [ '2018-01-01 00:00', '2018-01-08 00:00' ],
        [ '2018-12-31 00:00', '2019-01-07 00:00' ],
        [ '2019-12-30 00:00', '2020-01-06 00:00' ],
        [ '2021-01-04 00:00', '2021-01-11 00:00' ],
        [ '2022-01-03 00:00', '2022-01-10 00:00' ],
        [ '2023-01-02 00:00', '2023-01-09 00:00' ],
        [ '2024-01-01 00:00', '2024-01-08 00:00' ],
        // Checked against http://www.schulferien.org/kalenderwoche/kalenderwochen_2024.html
    ], 1000 * 60 * 60 * 24 * 7 * 12, 0, false, {}, 'not only test');

test.addTest('Week range first week', [
        'week 01 00:00-23:59',
    ], '2012-12-01 0:00', '2024-02-01 0:00', [
        /* Long test on per day base {{{ */
        [ '2012-12-31 00:00', '2012-12-31 23:59' ],
        [ '2013-01-01 00:00', '2013-01-01 23:59' ],
        [ '2013-01-02 00:00', '2013-01-02 23:59' ],
        [ '2013-01-03 00:00', '2013-01-03 23:59' ],
        [ '2013-01-04 00:00', '2013-01-04 23:59' ],
        [ '2013-01-05 00:00', '2013-01-05 23:59' ],
        [ '2013-01-06 00:00', '2013-01-06 23:59' ],
        [ '2013-12-30 00:00', '2013-12-30 23:59' ],
        [ '2013-12-31 00:00', '2013-12-31 23:59' ],
        [ '2014-01-01 00:00', '2014-01-01 23:59' ],
        [ '2014-01-02 00:00', '2014-01-02 23:59' ],
        [ '2014-01-03 00:00', '2014-01-03 23:59' ],
        [ '2014-01-04 00:00', '2014-01-04 23:59' ],
        [ '2014-01-05 00:00', '2014-01-05 23:59' ],
        [ '2014-12-29 00:00', '2014-12-29 23:59' ],
        [ '2014-12-30 00:00', '2014-12-30 23:59' ],
        [ '2014-12-31 00:00', '2014-12-31 23:59' ],
        [ '2015-01-01 00:00', '2015-01-01 23:59' ],
        [ '2015-01-02 00:00', '2015-01-02 23:59' ],
        [ '2015-01-03 00:00', '2015-01-03 23:59' ],
        [ '2015-01-04 00:00', '2015-01-04 23:59' ],
        [ '2016-01-04 00:00', '2016-01-04 23:59' ],
        [ '2016-01-05 00:00', '2016-01-05 23:59' ],
        [ '2016-01-06 00:00', '2016-01-06 23:59' ],
        [ '2016-01-07 00:00', '2016-01-07 23:59' ],
        [ '2016-01-08 00:00', '2016-01-08 23:59' ],
        [ '2016-01-09 00:00', '2016-01-09 23:59' ],
        [ '2016-01-10 00:00', '2016-01-10 23:59' ],
        [ '2017-01-02 00:00', '2017-01-02 23:59' ],
        [ '2017-01-03 00:00', '2017-01-03 23:59' ],
        [ '2017-01-04 00:00', '2017-01-04 23:59' ],
        [ '2017-01-05 00:00', '2017-01-05 23:59' ],
        [ '2017-01-06 00:00', '2017-01-06 23:59' ],
        [ '2017-01-07 00:00', '2017-01-07 23:59' ],
        [ '2017-01-08 00:00', '2017-01-08 23:59' ],
        [ '2018-01-01 00:00', '2018-01-01 23:59' ],
        [ '2018-01-02 00:00', '2018-01-02 23:59' ],
        [ '2018-01-03 00:00', '2018-01-03 23:59' ],
        [ '2018-01-04 00:00', '2018-01-04 23:59' ],
        [ '2018-01-05 00:00', '2018-01-05 23:59' ],
        [ '2018-01-06 00:00', '2018-01-06 23:59' ],
        [ '2018-01-07 00:00', '2018-01-07 23:59' ],
        [ '2018-12-31 00:00', '2018-12-31 23:59' ],
        [ '2019-01-01 00:00', '2019-01-01 23:59' ],
        [ '2019-01-02 00:00', '2019-01-02 23:59' ],
        [ '2019-01-03 00:00', '2019-01-03 23:59' ],
        [ '2019-01-04 00:00', '2019-01-04 23:59' ],
        [ '2019-01-05 00:00', '2019-01-05 23:59' ],
        [ '2019-01-06 00:00', '2019-01-06 23:59' ],
        [ '2019-12-30 00:00', '2019-12-30 23:59' ],
        [ '2019-12-31 00:00', '2019-12-31 23:59' ],
        [ '2020-01-01 00:00', '2020-01-01 23:59' ],
        [ '2020-01-02 00:00', '2020-01-02 23:59' ],
        [ '2020-01-03 00:00', '2020-01-03 23:59' ],
        [ '2020-01-04 00:00', '2020-01-04 23:59' ],
        [ '2020-01-05 00:00', '2020-01-05 23:59' ],
        [ '2021-01-04 00:00', '2021-01-04 23:59' ],
        [ '2021-01-05 00:00', '2021-01-05 23:59' ],
        [ '2021-01-06 00:00', '2021-01-06 23:59' ],
        [ '2021-01-07 00:00', '2021-01-07 23:59' ],
        [ '2021-01-08 00:00', '2021-01-08 23:59' ],
        [ '2021-01-09 00:00', '2021-01-09 23:59' ],
        [ '2021-01-10 00:00', '2021-01-10 23:59' ],
        [ '2022-01-03 00:00', '2022-01-03 23:59' ],
        [ '2022-01-04 00:00', '2022-01-04 23:59' ],
        [ '2022-01-05 00:00', '2022-01-05 23:59' ],
        [ '2022-01-06 00:00', '2022-01-06 23:59' ],
        [ '2022-01-07 00:00', '2022-01-07 23:59' ],
        [ '2022-01-08 00:00', '2022-01-08 23:59' ],
        [ '2022-01-09 00:00', '2022-01-09 23:59' ],
        [ '2023-01-02 00:00', '2023-01-02 23:59' ],
        [ '2023-01-03 00:00', '2023-01-03 23:59' ],
        [ '2023-01-04 00:00', '2023-01-04 23:59' ],
        [ '2023-01-05 00:00', '2023-01-05 23:59' ],
        [ '2023-01-06 00:00', '2023-01-06 23:59' ],
        [ '2023-01-07 00:00', '2023-01-07 23:59' ],
        [ '2023-01-08 00:00', '2023-01-08 23:59' ],
        [ '2024-01-01 00:00', '2024-01-01 23:59' ],
        [ '2024-01-02 00:00', '2024-01-02 23:59' ],
        [ '2024-01-03 00:00', '2024-01-03 23:59' ],
        [ '2024-01-04 00:00', '2024-01-04 23:59' ],
        [ '2024-01-05 00:00', '2024-01-05 23:59' ],
        [ '2024-01-06 00:00', '2024-01-06 23:59' ],
        [ '2024-01-07 00:00', '2024-01-07 23:59' ],
        /* }}} */
    ], 1000 * 60 * (60 * 24 * 7 * 12 - 7 * 12), 0, false, {}, 'not last test');

(function() {

// timekeeper makes the Date() Object nonReactive. Reset the timekeeper
timekeeper.reset();

var toTime = moment(new Date()).add(1, 'day').hours(23).minutes(59).seconds(0).milliseconds(0);
var isOddWeekStart = (toTime % 2 === 0) ? '01' : '02';

/*
 * Temporally disabled as they are not deterministic. Waiting for feedback:
 * https://github.com/opening-hours/opening_hours.js/pull/191
 *
 * ignored('week ' + isOddWeekStart + '-53/2 Mo-Su 07:30-08:00', 'notDeterministic'),
 * could be used to ignore the test but the problem is as the tests are not
 * deterministic and the test log is compared, it potentially would still
 * break the tests.
 *
test.addTest('Week range. Working with Objects not Strings. from = moment(new Date())', [
        'week ' + isOddWeekStart + '-53/2 Mo-Su 07:30-08:00',
    ], moment(new Date()), toTime.toDate(), [
        [toTime.hours(7).minutes(30).toDate(), toTime.hours(8).minutes(0).toDate()],
    ], 1800000, 0, false);

test.addTest('Week range. Working with Objects not Strings. from = moment(new Date()).seconds(0).milliseconds(0)', [
        'week ' + isOddWeekStart + '-53/2 Mo-Su 07:30-08:00',
    ], moment(new Date()).seconds(0).milliseconds(0), toTime.toDate(), [
        [toTime.hours(7).minutes(30).toDate(), toTime.hours(8).minutes(0).toDate()],
    ], 1800000, 0, false);

test.addTest('Week range. Working with Objects not Strings. from = new Date()', [
        'week ' + isOddWeekStart + '-53/2 Mo-Su 07:30-08:00',
    ], new Date(), toTime, [
        [toTime.hours(7).minutes(30).toDate(), toTime.hours(8).minutes(0).toDate()],
    ], 1800000, 0, false);
*/

// re Set the original fake value
timekeeper.travel(timekeeperTime); // Travel to that date.
})();
// }}}

// full months/month ranges {{{
test.addTest('Only in one month of the year', [
        'Apr 08:00-12:00',
        'Apr: 08:00-12:00',
    ], '2013-04-28 0:00', '2014-04-03 0:00', [
        [ '2013-04-28 08:00', '2013-04-28 12:00' ],
        [ '2013-04-29 08:00', '2013-04-29 12:00' ],
        [ '2013-04-30 08:00', '2013-04-30 12:00' ],
        [ '2014-04-01 08:00', '2014-04-01 12:00' ],
        [ '2014-04-02 08:00', '2014-04-02 12:00' ],
    ], 1000 * 60 * 60 * (5 * 4), 0, false, {}, 'not last test');

test.addTest('Month ranges', [
        'Nov-Feb 00:00-24:00',
        'Nov-Feb00:00-24:00',
        'Nov-Feb',
        'Nov-Feb 00-24', // Do not use. Returns warning and corrected value.
        'Nov-Feb: 00:00-24:00',
        'Jan,Feb,Nov,Dec 00:00-24:00',
        '00:00-24:00; Mar-Oct off',
        'open; Mar-Oct off',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-01 00:00', '2012-03-01 00:00' ],
        [ '2012-11-01 00:00', '2013-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (31 + 29 + 30 + 31), 0, false);

test.addTest('Month ranges', [
        'Nov-Nov 00:00-24:00',
        'Nov-Nov',
        '2012 Nov-Nov',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-11-01 00:00', '2012-12-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * 30, 0, false, {}, 'not last test');
// }}}

// monthday ranges {{{
test.addTest('Month ranges', [
        'Jan 01,Dec 24-25; Nov Th[4]',
        'Jan 01,Dec 24.-25.; Nov Th[4]',
        'Jan 01,Dec 24,25; Nov Th[4]', // Was supported by time_domain as well.
        '2012 Jan 01,2012 Dec 24-25; 2012 Nov Th[4]',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-01 00:00', '2012-01-02 00:00' ],
        [ '2012-11-22 00:00', '2012-11-23 00:00' ],
        [ '2012-12-24 00:00', '2012-12-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');

test.addTest('Month ranges', [
        'Jan 01,Dec 11,Dec 15-17,Dec 19-23/2,Dec 24-25',
        'Jan 01,Dec 11,15-17,19-23/2,24,25', // Was supported by time_domain as well.
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-01 00:00', '2012-01-02 00:00' ],
        [ '2012-12-11 00:00', '2012-12-12 00:00' ],
        [ '2012-12-15 00:00', '2012-12-18 00:00' ],
        [ '2012-12-19 00:00', '2012-12-20 00:00' ],
        [ '2012-12-21 00:00', '2012-12-22 00:00' ],
        [ '2012-12-23 00:00', '2012-12-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * (1 + 1 + 3 + 1 + 1 + 3), 0, false, {}, 'not last test');

test.addTest('Monthday ranges', [
        'Jan 23-31 00:00-24:00; Feb 01-12 00:00-24:00',
        'Jan 23-Feb 12 00:00-24:00',
        'Jan 23-Feb 12: 00:00-24:00',
        '2012 Jan 23-2012 Feb 12 00:00-24:00',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-23 0:00', '2012-02-13 00:00' ],
    ], 1000 * 60 * 60 * 24 * 21, 0, false);

test.addTest('Monthday ranges', [
        'Jan 31-Feb 01,Aug 00:00-24:00', // FIXME: Also fails in 9f323b9d06720b6efffc7420023e746ff8f1b309.
        'Jan 31-Feb 01,Aug: 00:00-24:00',
        'Aug,Jan 31-Feb 01',
        'Jan 31-Feb 01; Aug',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-31 00:00', '2012-02-02 00:00' ],
        [ '2012-08-01 00:00', '2012-09-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (2 + 31), 0, false, {}, 'not last test');

test.addTest('Monthday ranges', [
        ignored('Jan 23,25'), // must be expressed as Jan 23,Jan 25
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
    ], 1000 * 60 * 60 * 24 * 21, 0, false, {}, 'not last test');

test.addTest('Monthday ranges', [
        'Dec 24,Jan 02: 18:00-22:00',
        'Dec 24,Jan 02: 18:00-22:00; Jan 20: off',
        'Dec 24,Jan 02 18:00-22:00',
        'Dec 24.,Jan 02: 18:00-22:00',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-02 18:00', '2012-01-02 22:00' ],
        [ '2012-12-24 18:00', '2012-12-24 22:00' ],
    ], 1000 * 60 * 60 * (4 * 2), 0, false, {}, 'not last test');

test.addTest('Monthday ranges (with year)', [
        '2012 Jan 23-31 00:00-24:00; 2012 Feb 01-12 00:00-24:00',
    ], '2012-01-01 0:00', '2015-01-01 0:00', [
        [ '2012-01-23 0:00', '2012-02-13 00:00' ],
    ], 1000 * 60 * 60 * 24 * 21, 0, false, {}, 'not last test');

test.addTest('Monthday ranges spanning year boundary', [
        'Dec 31-Jan 01',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        [ '2012-01-01 0:00', '2012-01-02 00:00' ],
        [ '2012-12-31 0:00', '2013-01-02 00:00' ],
        [ '2013-12-31 0:00', '2014-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');

test.addTest('Full day (with year)', [
        '2013 Dec 31,2014 Jan 05',
        '2013 Dec 31; 2014 Jan 05',
        '2013/10 Dec 31; 2014/10 Jan 05', // force to use parseYearRange
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
        [ '2013-12-31 00:00', '2014-01-01 00:00' ],
        [ '2014-01-05 00:00', '2014-01-06 00:00' ],
    ], 1000 * 60 * 60 * 24 * 2, 0, false, {}, 'not only test');

test.addTest('Date range which only applies for one year', [
        '2013 Dec 31',
        '2013 Dec 31; 2014 Jan 05; 2014+ off',
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
        [ '2013-12-31 0:00', '2014-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24, 0, false);

test.addTest('Monthday (with year) ranges spanning year boundary', [
        '2013 Dec 31-2014 Jan 02',
        'open; 2010 Jan 01-2013 Dec 30 off; 2014 Jan 03-2016 Jan 01 off',
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
        [ '2013-12-31 0:00', '2014-01-03 00:00' ],
    ], 1000 * 60 * 60 * 24 * 3, 0, false, {}, 'not last test');

test.addTest('Monthday ranges with constrained weekday', [
        'Jan Su[2]-Jan 15',
    ], '2012-01-01 0:00', '2015-01-01 0:00', [
        [ '2012-01-08 00:00', '2012-01-16 00:00' ], // 8
        [ '2013-01-13 00:00', '2013-01-16 00:00' ], // 3
        [ '2014-01-12 00:00', '2014-01-16 00:00' ], // 4
    ], 1000 * 60 * 60 * 24 * (8 + 3 + 4), 0, false, {}, 'not only test');

test.addTest('Monthday ranges with constrained weekday', [
        'Jan 20-Jan Su[-1]',
    ], '2012-01-01 0:00', '2015-01-01 0:00', [
        [ '2012-01-20 00:00', '2012-01-29 00:00' ],
        [ '2013-01-20 00:00', '2013-01-27 00:00' ],
        [ '2014-01-20 00:00', '2014-01-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * (9 + 7 + 6), 0, false, {}, 'not last test');

test.addTest('Monthday ranges with constrained weekday', [
        'Jan Su[1] +2 days-Jan Su[3] -2 days', // just for testing, can probably be expressed better
    ], '2012-01-01 0:00', '2015-01-01 0:00', [
        [ '2012-01-03 00:00', '2012-01-13 00:00' ],
        [ '2013-01-08 00:00', '2013-01-18 00:00' ],
        [ '2014-01-07 00:00', '2014-01-17 00:00' ],
    ], 1000 * 60 * 60 * 24 * (10 * 3), 0, false, {}, 'not last test');

test.addTest('Monthday ranges with constrained weekday spanning year', [
        'Dec 20-Dec Su[-1] +4 days',
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
        [ '2011-12-20 00:00', '2011-12-29 00:00' ],
        [ '2012-12-20 00:00', '2013-01-03 00:00' ],
        [ '2013-12-20 00:00', '2014-01-02 00:00' ],
        [ '2014-12-20 00:00', '2015-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (9 + 11 + 3 + 11 + 2 + 11 + 1), 0, false, {}, 'not last test');

test.addTest('Monthday ranges with constrained', [
        'Nov Su[-1]-Dec Su[1] -1 day',
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
        [ '2011-11-27 00:00', '2011-12-03 00:00' ],
        [ '2012-11-25 00:00', '2012-12-01 00:00' ],
        [ '2013-11-24 00:00', '2013-11-30 00:00' ],
        [ '2014-11-30 00:00', '2014-12-06 00:00' ],
    ], 1000 * 60 * 60 * 24 * ((4 + 2) + (6) + (6) + (1 + 5)), 0, false, {}, 'not last test');

test.addTest('Monthday ranges with constrained weekday spanning year', [
        ignored('Jan Su[1] -5 days-Jan 10'),
    ], '2011-01-01 0:00', '2015-01-01 0:00', [
    ], 1000 * 60 * 60 * 24 * (9 + 11 + 3 + 11 + 2 + 11 + 1), 0, false, {}, 'not last test');

test.addTest('Monthday ranges', [
        'Mar Su[-1]-Oct Su[-1] -1 day open; Oct Su[-1]-Mar Su[-1] -1 day off',
        'Mar Su[-1]-Oct Su[-1] -1 day open',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-03-25 00:00', '2012-10-27 00:00' ],
    ], 18658800000, 0, false, {}, 'not last test');

test.addTest('Month ranges with year', [
        '2012 Jan 10-15,Jan 11',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-10 00:00', '2012-01-16 00:00' ],
    ], 1000 * 60 * 60 * 24 * 6, 0, false, {}, 'not last test');

test.addTest('Complex monthday ranges', [
        'Jan 23-31,Feb 01-12 00:00-24:00',
        'Jan 23-Feb 11,Feb 12 00:00-24:00', // preferred
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-23 0:00', '2012-02-13 00:00' ],
    ], 1000 * 60 * 60 * 24 * 21, 0, false, {}, 'not last test');

// leap years {{{
test.addTest('Leap year monthday', [
        '2016 Feb 29',
    ], '2012-01-01 0:00', '2019-01-01 0:00', [
        [ '2016-02-29 00:00', '2016-03-01 00:00' ],
    ], 1000 * 60 * 60 * 24, 0, false, {}, 'not last test');

test.addTest('Leap year monthday', [
        '2015 Feb 29',
    ], '2012-01-01 0:00', '2019-01-01 0:00', [
    ], 0, 0, false, {}, 'not last test');

test.addTest('Last day in month', [
        // something like this:
        'Jan 31,Mar 31,Apr 30,May 31,Jun 30,Jul 31,Aug 31,Sep 30,Oct 31,Nov 30,Dec 31 open "last day in month"; '
        // The year selector can also be used but is not required as the monthday selector should only match if day exists.
        + 'Feb 29 open "last day in month (Feb, leap year)"; 2009/4,2010/4,2011/4 Feb 28 open "last day in month (Feb, not leap year)"',
        // There is no shortcut yet. Make sure that you include comments to help other mappers to understand this and to find and replace the value easier if a sorter version was introduced.
        'Jan 31,Mar 31,Apr 30,May 31,Jun 30,Jul 31,Aug 31,Sep 30,Oct 31,Nov 30,Dec 31 open "last day in month"; 2008/4 Feb 29 open "last day in month (Feb, leap year)"; 2009/4,2010/4,2011/4 Feb 28 open "last day in month (Feb, not leap year)"',
    ], '2012-01-01 0:00', '2014-01-01 0:00', [
        [ '2012-01-31 00:00', '2012-02-01 00:00', false, 'last day in month' ],
        [ '2012-02-29 00:00', '2012-03-01 00:00', false, 'last day in month (Feb, leap year)' ],
        [ '2012-03-31 00:00', '2012-04-01 00:00', false, 'last day in month' ],
        [ '2012-04-30 00:00', '2012-05-01 00:00', false, 'last day in month' ],
        [ '2012-05-31 00:00', '2012-06-01 00:00', false, 'last day in month' ],
        [ '2012-06-30 00:00', '2012-07-01 00:00', false, 'last day in month' ],
        [ '2012-07-31 00:00', '2012-08-01 00:00', false, 'last day in month' ],
        [ '2012-08-31 00:00', '2012-09-01 00:00', false, 'last day in month' ],
        [ '2012-09-30 00:00', '2012-10-01 00:00', false, 'last day in month' ],
        [ '2012-10-31 00:00', '2012-11-01 00:00', false, 'last day in month' ],
        [ '2012-11-30 00:00', '2012-12-01 00:00', false, 'last day in month' ],
        [ '2012-12-31 00:00', '2013-01-01 00:00', false, 'last day in month' ],
        [ '2013-01-31 00:00', '2013-02-01 00:00', false, 'last day in month' ],
        [ '2013-02-28 00:00', '2013-03-01 00:00', false, 'last day in month (Feb, not leap year)' ],
        [ '2013-03-31 00:00', '2013-04-01 00:00', false, 'last day in month' ],
        [ '2013-04-30 00:00', '2013-05-01 00:00', false, 'last day in month' ],
        [ '2013-05-31 00:00', '2013-06-01 00:00', false, 'last day in month' ],
        [ '2013-06-30 00:00', '2013-07-01 00:00', false, 'last day in month' ],
        [ '2013-07-31 00:00', '2013-08-01 00:00', false, 'last day in month' ],
        [ '2013-08-31 00:00', '2013-09-01 00:00', false, 'last day in month' ],
        [ '2013-09-30 00:00', '2013-10-01 00:00', false, 'last day in month' ],
        [ '2013-10-31 00:00', '2013-11-01 00:00', false, 'last day in month' ],
        [ '2013-11-30 00:00', '2013-12-01 00:00', false, 'last day in month' ],
        [ '2013-12-31 00:00', '2014-01-01 00:00', false, 'last day in month' ],
    ], 1000 * 60 * 60 * (24 * 24 - 1), 0, false, {}, 'not last test');
// }}}

// periodical monthdays {{{
test.addTest('Periodical monthdays', [
        'Jan 01-31/8 00:00-24:00',
        'Jan 01-31/8: 00:00-24:00',
        'Jan 01-31/8',
        '2012 Jan 01-31/8',
        '2012 Jan 01-31/8; 2010 Dec 01-31/8',
        '2012 Jan 01-31/8; 2015 Dec 01-31/8',
        '2012 Jan 01-31/8; 2025 Dec 01-31/8',
        '2012 Jan 01-31/8: 00:00-24:00',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-01 0:00', '2012-01-02 00:00' ],
        [ '2012-01-09 0:00', '2012-01-10 00:00' ],
        [ '2012-01-17 0:00', '2012-01-18 00:00' ],
        [ '2012-01-25 0:00', '2012-01-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');

test.addTest('Periodical monthdays', [
        'Jan 10-31/7',
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-10 0:00', '2012-01-11 00:00' ],
        [ '2012-01-17 0:00', '2012-01-18 00:00' ],
        [ '2012-01-24 0:00', '2012-01-25 00:00' ],
        [ '2012-01-31 0:00', '2012-02-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');
// }}}

// }}}

// year ranges {{{
test.addTest('Date range which only applies for specific year', [
        // FIXME
        '2013,2015,2050-2053,2055/2,2020-2029/3,2060+ Jan 01', // Used on the demo page.
        '2013,2015,2050-2053,2055/2,2020-2029/3,2060+ Jan 01 Mo-Su',
    ], '2011-01-01 0:00', '2065-01-01 0:00', [
        [ '2013-01-01 00:00', '2013-01-02 00:00' ],
        [ '2015-01-01 00:00', '2015-01-02 00:00' ],
        [ '2020-01-01 00:00', '2020-01-02 00:00' ],
        [ '2023-01-01 00:00', '2023-01-02 00:00' ],
        [ '2026-01-01 00:00', '2026-01-02 00:00' ],
        [ '2029-01-01 00:00', '2029-01-02 00:00' ],
        [ '2050-01-01 00:00', '2050-01-02 00:00' ],
        [ '2051-01-01 00:00', '2051-01-02 00:00' ],
        [ '2052-01-01 00:00', '2052-01-02 00:00' ],
        [ '2053-01-01 00:00', '2053-01-02 00:00' ],
        [ '2055-01-01 00:00', '2055-01-02 00:00' ],
        [ '2057-01-01 00:00', '2057-01-02 00:00' ],
        [ '2059-01-01 00:00', '2059-01-02 00:00' ],
        [ '2060-01-01 00:00', '2060-01-02 00:00' ],
        [ '2061-01-01 00:00', '2061-01-02 00:00' ],
        [ '2062-01-01 00:00', '2062-01-02 00:00' ],
        [ '2063-01-01 00:00', '2063-01-02 00:00' ],
        [ '2064-01-01 00:00', '2064-01-02 00:00' ],
    ], 1000 * 60 * 60 * 24 * 18, 0, false, {}, 'not last test');

test.addTest('Date range which only applies for specific year', [
        '2060+',
    ], '2011-01-01 0:00', '2065-01-01 0:00', [
        [ '2060-01-01 00:00', '2065-01-01 00:00' ],
    ], 157852800000, 0, false, {}, 'not last test');

test.addTest('Date range which only applies for specific year', [
        '2040-2050',
    ], '2011-01-01 0:00', '2065-01-01 0:00', [
        [ '2040-01-01 00:00', '2051-01-01 00:00' ],
    ], 347155200000, 0, false, {}, 'not last test');

test.addTest('Date range which only applies for specific year', [
        '2012-2016',
    ], '2011-01-01 0:00', '2065-01-01 0:00', [
        [ '2012-01-01 00:00', '2017-01-01 00:00' ],
    ], 157852800000, 0, false, {}, 'not last test');
// }}}

// selector combination and order {{{
test.addTest('Selector combination', [
        'week 02 We',            // week + weekday
        'Jan 11-Jan 11 week 02', // week + monthday
        'Jan 11-Jan 11: week 02: 00:00-24:00', // week + monthday
        'Jan 11 week 02',        // week + monthday
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-11 0:00', '2012-01-12 00:00' ],
    ], 1000 * 60 * 60 * 24, 0, false, {}, 'not only test');

test.addTest('Selector combination', [
        'Jan week 02',           // week + month
        'Jan-Feb Jan 09-Jan 15', // month + monthday
        'Jan-Feb Jan 09-15',     // month + monthday
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-09 0:00', '2012-01-16 00:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, false, {}, 'not last test');

test.addTest('Selector combination', [
        'Jan We',           // month + weekday
        'Jan 02-27 We',      // weekday + monthday
        'Dec 30-Jan 27 We', // weekday + monthday
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-01-04 0:00', '2012-01-05 00:00' ],
        [ '2012-01-11 0:00', '2012-01-12 00:00' ],
        [ '2012-01-18 0:00', '2012-01-19 00:00' ],
        [ '2012-01-25 0:00', '2012-01-26 00:00' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, {}, 'not last test');

test.addTest('Selector order', [
        // Result should not depend on selector order although there are some best practices:
        // Use the selector types which can cover the biggest range first e.g. year before month.
        ignored('Feb week 05', 'prettifyValue'),
        'Feb week 05',
        ignored('00:00-24:00 week 05 Feb', 'prettifyValue'),
        ignored('week 05 00:00-24:00 Feb', 'prettifyValue'),
        'Feb week 05 00:00-24:00',
        'Feb week 05: 00:00-24:00',
        'Feb week 05 Mo-Su 00:00-24:00',
        ignored('Mo-Su week 05 Feb 00:00-24:00', 'prettifyValue'),
        ignored('00:00-24:00 Mo-Su week 05 Feb', 'prettifyValue'),
        ignored('00:00-24:00 week 05 Mo-Su Feb', 'prettifyValue'),
        ignored('Mo-Su 00:00-24:00 week 05 Feb', 'prettifyValue'),
        ignored('2012 00:00-24:00 week 05 Feb', 'prettifyValue'),
        ignored('00:00-24:00 2012 week 05 Feb', 'prettifyValue'),
        ignored('week 05 Feb 2012-2014', 'prettifyValue'),
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-02-01 0:00', '2012-02-06 00:00' ],
    ], 1000 * 60 * 60 * 24 * 5, 0, false, {}, 'not last test');

test.addTest('Selector order', [
        ignored('Feb week 06', 'prettifyValue'),
        'Feb week 06',
        'Feb week 06 open',
        ignored('open week 06 Feb', 'prettifyValue'), // not preferred
    ], '2012-01-01 0:00', '2013-01-01 0:00', [
        [ '2012-02-06 0:00', '2012-02-13 00:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, false, {}, 'not last test');
// }}}

// comments {{{

test.addTest('Additional comment "Nach Vereinbarung"', [
        'Mo-Fr 08:00-12:00 open "Kein Termin erforderlich", Mo-Fr 13:00-17:00 open "Nach Vereinbarung"',
        'Mo-Fr 08:00-12:00 open "Kein Termin erforderlich", Mo-Fr 13:00-17:00 open nach_vereinbarung',
        'Mo-Fr 08:00-12:00 open "Kein Termin erforderlich", Mo-Fr 13:00-17:00 open nach Vereinbarung',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 08:00', '2012-10-01 12:00', false, 'Kein Termin erforderlich' ],
        [ '2012-10-01 13:00', '2012-10-01 17:00', false, 'Nach Vereinbarung' ],
    ], 1000 * 60 * 60 * (4 + 4), 0, true, {}, "not only test");

test.addTest('Additional comment "on appointment"', [
        'Mo-Fr 08:00-12:00 open "appointment not needed", Mo-Fr 13:00-17:00 open "on appointment"',
        'Mo-Fr 08:00-12:00 open "appointment not needed", Mo-Fr 13:00-17:00 open on_appointment',
        'Mo-Fr 08:00-12:00 open "appointment not needed", Mo-Fr 13:00-17:00 open on appointment',
        // 'Mo-Fr 08:00-12:00 open "appointment not needed", Mo-Fr 13:00-17:00 open by_appointment',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 08:00', '2012-10-01 12:00', false, 'appointment not needed' ],
        [ '2012-10-01 13:00', '2012-10-01 17:00', false, 'on appointment' ],
    ], 1000 * 60 * 60 * (4 + 4), 0, true, {}, "not only test");

test.addTest('Additional comments', [
        'Mo,Tu 10:00-16:00 open "no warranty"; We 12:00-18:00 open "female only"; Th closed "Not open because we are coding :)"; Fr 10:00-16:00 open "male only"; Sa 10:00-12:00 "Maybe open. Call us."',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 16:00', false, "no warranty" ],
        [ '2012-10-02 10:00', '2012-10-02 16:00', false, "no warranty" ],
        [ '2012-10-03 12:00', '2012-10-03 18:00', false, "female only" ],
        [ '2012-10-05 10:00', '2012-10-05 16:00', false, "male only" ],
        [ '2012-10-06 10:00', '2012-10-06 12:00', true, "Maybe open. Call us." ],
    ], 1000 * 60 * 60 * 6 * 4, 1000 * 60 * 60 * 2, true);

test.addTest('Additional comments for unknown', [
        'Sa 10:00-12:00 "Maybe open. Call us. (testing special tokens in comment: ; ;; \' || | test end)"',
        'Sa 10:00-12:00 unknown "Maybe open. Call us. (testing special tokens in comment: ; ;; \' || | test end)"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-06 10:00', '2012-10-06 12:00', true, "Maybe open. Call us. (testing special tokens in comment: ; ;; \' || | test end)" ],
    ], 0, 1000 * 60 * 60 * 2, true, {}, 'not last test');

test.addTest('Date overwriting with additional comments for unknown ', [
        'Mo-Fr 10:00-20:00 unknown "Maybe"; We 10:00-16:00 "Maybe open. Call us."',
        'Mo-Fr 10:00-20:00 unknown "Maybe"; We "Maybe open. Call us." 10:00-16:00',
        'Mo-Fr 10:00-20:00 unknown "Maybe"; "Maybe open. Call us." We 10:00-16:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 20:00', true, "Maybe" ],
        [ '2012-10-02 10:00', '2012-10-02 20:00', true, "Maybe" ],
        [ '2012-10-03 10:00', '2012-10-03 16:00', true, "Maybe open. Call us." ],
        [ '2012-10-04 10:00', '2012-10-04 20:00', true, "Maybe" ],
        [ '2012-10-05 10:00', '2012-10-05 20:00', true, "Maybe" ],
    ], 0, 1000 * 60 * 60 * (4 * 10 + 6), true, {}, 'not only test');

test.addTest('Additional comments with time ranges spanning midnight', [
        '22:00-26:00; We 12:00-14:00 unknown "Maybe open. Call us."',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 22:00', '2012-10-02 02:00' ],
        [ '2012-10-02 22:00', '2012-10-03 00:00' ],
        [ '2012-10-03 12:00', '2012-10-03 14:00', true,  'Maybe open. Call us.' ],
        [ '2012-10-04 00:00', '2012-10-04 02:00' ],
        [ '2012-10-04 22:00', '2012-10-05 02:00' ],
        [ '2012-10-05 22:00', '2012-10-06 02:00' ],
        [ '2012-10-06 22:00', '2012-10-07 02:00' ],
        [ '2012-10-07 22:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * 4 * 6, 1000 * 60 * 60 * 2, true, {}, 'not last test');

test.addTest('Additional comments for closed with time ranges spanning midnight', [
        '22:00-26:00; We 12:00-14:00 off "Not open because we are too tired"',
        '22:00-26:00; We 12:00-14:00 closed "Not open because we are too tired"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 02:00' ],
        [ '2012-10-01 22:00', '2012-10-02 02:00' ],
        [ '2012-10-02 22:00', '2012-10-03 02:00' ],
        [ '2012-10-03 22:00', '2012-10-04 02:00' ],
        [ '2012-10-04 22:00', '2012-10-05 02:00' ],
        [ '2012-10-05 22:00', '2012-10-06 02:00' ],
        [ '2012-10-06 22:00', '2012-10-07 02:00' ],
        [ '2012-10-07 22:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * 4 * 7, 0, true, {}, 'not last test');

test.addTest('Additional comments combined with additional rules', [
        'Mo 12:00-14:00 open "female only", Mo 14:00-16:00 open "male only"',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 14:00', false, 'female only' ],
        [ '2012-10-01 14:00', '2012-10-01 16:00', false, 'male only' ],
    ], 1000 * 60 * 60 * 4, 0, true, {}, 'not last test');

// did only not work in browser: drawTable
test.addTest('Additional comments combined with months', [
        'Apr-Sep; Oct-Dec "on request"',
        'Apr-Sep; Oct-Dec"on request"',
        'Oct-Dec "on request"; Apr-Sep',
    ], '2012-07-01 0:00', '2012-11-01 0:00', [
        [ '2012-07-01 00:00', '2012-10-01 00:00' ],
        [ '2012-10-01 00:00', '2012-11-01 00:00', true,  'on request' ],
    ], 7948800000, 2682000000, false, {}, 'not last test');
// }}}

// real world examples, mainly values which caused an issue {{{
test.addTest('Complex example used in README', [
        value_perfectly_valid[1], // preferred because more explicit
        '00:00-24:00; Tu-Su,PH 08:30-09:00 off; Tu-Su 14:00-14:30 off; Mo 08:00-13:00 off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 08:00' ],
        [ '2012-10-01 13:00', '2012-10-02 08:30' ],
        [ '2012-10-02 09:00', '2012-10-02 14:00' ],
        [ '2012-10-02 14:30', '2012-10-03 08:30' ],
        [ '2012-10-03 09:00', '2012-10-03 14:00' ],
        [ '2012-10-03 14:30', '2012-10-04 08:30' ],
        [ '2012-10-04 09:00', '2012-10-04 14:00' ],
        [ '2012-10-04 14:30', '2012-10-05 08:30' ],
        [ '2012-10-05 09:00', '2012-10-05 14:00' ],
        [ '2012-10-05 14:30', '2012-10-06 08:30' ],
        [ '2012-10-06 09:00', '2012-10-06 14:00' ],
        [ '2012-10-06 14:30', '2012-10-07 08:30' ],
        [ '2012-10-07 09:00', '2012-10-07 14:00' ],
        [ '2012-10-07 14:30', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * (24 * 7 - 5 - 0.5 * 6 - 0.5 * 6), 0, false, nominatim_default, 'not last test', { 'warnings_severity': 7 });

test.addTest('Complex example used in README and benchmark', [
        value_perfectly_valid[0], // preferred because shorter
        'Mo,Tu,Th,Fr 12:00-18:00; Sa,PH 12:00-17:00; Th[3] off; Th[-1] off',
        'Mo,Tu,Th,Fr 12:00-18:00; Sa,PH 12:00-17:00; Th[3],Th[-1] off',
    ], '2012-10-01 0:00', '2012-10-31 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 18:00' ],
        [ '2012-10-02 12:00', '2012-10-02 18:00' ],
        [ '2012-10-03 12:00', '2012-10-03 17:00', false, 'Tag der Deutschen Einheit' ],
        [ '2012-10-04 12:00', '2012-10-04 18:00' ],
        [ '2012-10-05 12:00', '2012-10-05 18:00' ],
        [ '2012-10-06 12:00', '2012-10-06 17:00' ],
        [ '2012-10-08 12:00', '2012-10-08 18:00' ],
        [ '2012-10-09 12:00', '2012-10-09 18:00' ],
        [ '2012-10-11 12:00', '2012-10-11 18:00' ],
        [ '2012-10-12 12:00', '2012-10-12 18:00' ],
        [ '2012-10-13 12:00', '2012-10-13 17:00' ],
        [ '2012-10-15 12:00', '2012-10-15 18:00' ],
        [ '2012-10-16 12:00', '2012-10-16 18:00' ],
        [ '2012-10-19 12:00', '2012-10-19 18:00' ],
        [ '2012-10-20 12:00', '2012-10-20 17:00' ],
        [ '2012-10-22 12:00', '2012-10-22 18:00' ],
        [ '2012-10-23 12:00', '2012-10-23 18:00' ],
        [ '2012-10-26 12:00', '2012-10-26 18:00' ],
        [ '2012-10-27 12:00', '2012-10-27 17:00' ],
        [ '2012-10-29 12:00', '2012-10-29 18:00' ],
        [ '2012-10-30 12:00', '2012-10-30 18:00' ],
    ], 1000 * 60 * 60 * (6 * 16 + 5 * 5), 0, false, nominatim_default, 'not last test', { 'warnings_severity': 7 });

test.addTest('Warnings corrected to additional rule (real world example)', [
        'Mo-Fr 09:00-12:00, Mo,Tu,Th 15:00-18:00', // reference value for prettify
        'Mo – Fr: 9 – 12 Uhr und Mo, Di, Do: 15 – 18 Uhr',
    ], '2014-09-01 0:00', '2014-09-08 0:00', [
        [ '2014-09-01 09:00', '2014-09-01 12:00' ],
        [ '2014-09-01 15:00', '2014-09-01 18:00' ],
        [ '2014-09-02 09:00', '2014-09-02 12:00' ],
        [ '2014-09-02 15:00', '2014-09-02 18:00' ],
        [ '2014-09-03 09:00', '2014-09-03 12:00' ],
        [ '2014-09-04 09:00', '2014-09-04 12:00' ],
        [ '2014-09-04 15:00', '2014-09-04 18:00' ],
        [ '2014-09-05 09:00', '2014-09-05 12:00' ],
    ], 1000 * 60 * 60 * (5 * 3 + 3 * 3), 0, true, {}, 'not last test');

test.addTest('Real world example: Was not processed right.', [
        'Mo off, Tu 14:00-18:00, We-Sa 10:00-18:00', // Reference value for prettify. Not perfect but still …
        'Mo geschl., Tu 14:00-18:00, We-Sa 10:00-18:00', // Reference value for prettify. Not perfect but still …
        'Mo: geschlossen, Di: 14-18Uhr, Mi-Sa: 10-18Uhr', // value as found in OSM
        // FIXME: See issue #50.
        'Mo off; Tu 14:00-18:00; We-Sa 10:00-18:00', // Please use this value instead. Mostly automatically corrected.
    ], '2014-01-06 0:00', '2014-01-13 0:00', [
        [ '2014-01-07 14:00', '2014-01-07 18:00' ],
        [ '2014-01-08 10:00', '2014-01-08 18:00' ],
        [ '2014-01-09 10:00', '2014-01-09 18:00' ],
        [ '2014-01-10 10:00', '2014-01-10 18:00' ],
        [ '2014-01-11 10:00', '2014-01-11 18:00' ],
    ], 1000 * 60 * 60 * (4 + 4 * 8), 0, true, {}, 'not last test');

test.addTest('Real world example: Was not processed right (month range/monthday range)', [
        'Aug,Dec 25-easter'
    ], '2014-01-01 0:00', '2015-01-01 0:00', [
        [ '2014-01-01 00:00', '2014-04-20 00:00' ],
        [ '2014-08-01 00:00', '2014-09-01 00:00' ],
        [ '2014-12-25 00:00', '2015-01-01 00:00' ],
    ], 1000 * 60 * 60 * (24 * ((31 + 28 + 31 + 19) + 31 + 7)  -1), 0, false, {}, 'not last test');

// https://www.openstreetmap.org/node/2554317486
test.addTest('Real world example: Was processed right (month range/monthday range with additional rule)', [
        'Nov-Mar Mo-Fr 11:30-17:00, Mo-Su 17:00-01:00'
    ], '2015-03-20 0:00', '2015-04-10 0:00', [
        [ '2015-03-20 00:00', '2015-03-20 01:00' ], // Fr
        [ '2015-03-20 11:30', '2015-03-21 01:00' ], // Fr
        [ '2015-03-21 17:00', '2015-03-22 01:00' ], // Sa
        [ '2015-03-22 17:00', '2015-03-23 01:00' ], // Su
        [ '2015-03-23 11:30', '2015-03-24 01:00' ], // Mo
        [ '2015-03-24 11:30', '2015-03-25 01:00' ],
        [ '2015-03-25 11:30', '2015-03-26 01:00' ],
        [ '2015-03-26 11:30', '2015-03-27 01:00' ],
        [ '2015-03-27 11:30', '2015-03-28 01:00' ],
        [ '2015-03-28 17:00', '2015-03-29 01:00' ], // Sa
        [ '2015-03-29 17:00', '2015-03-30 01:00' ], // Su
        [ '2015-03-30 11:30', '2015-03-31 01:00' ], // Mo
        [ '2015-03-31 11:30', '2015-04-01 01:00' ], // Tu
        [ '2015-04-01 17:00', '2015-04-02 01:00' ], // We
        [ '2015-04-02 17:00', '2015-04-03 01:00' ], // Th
        [ '2015-04-03 17:00', '2015-04-04 01:00' ], // Fr
        [ '2015-04-04 17:00', '2015-04-05 01:00' ], // Sa
        [ '2015-04-05 17:00', '2015-04-06 01:00' ], // Su
        [ '2015-04-06 17:00', '2015-04-07 01:00' ],
        [ '2015-04-07 17:00', '2015-04-08 01:00' ],
        [ '2015-04-08 17:00', '2015-04-09 01:00' ],
        [ '2015-04-09 17:00', '2015-04-10 00:00' ], // Th
    ], 1000 * 60 * 60 * (1 + (24 - 11.5 + 1) * 8 + (24 - 17 + 1) * 13 - 1), 0, false, {}, 'not only test');

// https://www.openstreetmap.org/node/305737670 {{{
test.addTest('Real world example: Was not processed right (month range/monthday range)', [ // FIXME -> SH
          'Mo-Sa 18:00+; SH off',
    ], '2014-09-01 0:00', '2014-09-21 0:00', [
        [ '2014-09-14 00:00', '2014-09-14 04:00', true,  'Specified as open end. Closing time was guessed.' ], // FIXME
        [ '2014-09-15 18:00', '2014-09-16 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-16 18:00', '2014-09-17 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-17 18:00', '2014-09-18 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-18 18:00', '2014-09-19 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-19 18:00', '2014-09-20 04:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-20 18:00', '2014-09-21 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * 60 * (4 + (6 + 4) * 5 + 6), false, nominatim_default, 'not only test');

test.addTest('Real world example: Was not processed right (month range/monthday range)', [
        // 'Tu-Th 12:00-14:00; SH off; Mo-Sa 18:00+',
        'SH off; Mo-Sa 18:00+',
        // 'SH off; Mo-Sa 18:00-19:00',
        // 'PH off; Mo-Sa 18:00-19:00',
        // 'Sep 01-14 "Sommerferien"; Mo-Sa 18:00+',
    ], '2014-09-01 0:00', '2014-09-21 0:00', [
        [ '2014-09-01 18:00', '2014-09-02 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-02 18:00', '2014-09-03 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-03 18:00', '2014-09-04 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-04 18:00', '2014-09-05 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-05 18:00', '2014-09-06 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-06 18:00', '2014-09-07 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-08 18:00', '2014-09-09 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-09 18:00', '2014-09-10 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-10 18:00', '2014-09-11 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-11 18:00', '2014-09-12 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-12 18:00', '2014-09-13 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-13 18:00', '2014-09-14 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-15 18:00', '2014-09-16 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-16 18:00', '2014-09-17 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-17 18:00', '2014-09-18 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-18 18:00', '2014-09-19 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-19 18:00', '2014-09-20 04:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-09-20 18:00', '2014-09-21 00:00', true, 'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * 60 * (17 * (6 + 4) + 6), false, nominatim_default, 'not only test');
/* }}} */

/* https://www.openstreetmap.org/node/863426086 {{{ */
/* Could be tricky because of overwriting and wrapping over midnight. */
test.addTest('Real world example: Was processed right (month range/monthday range)', [
        'Mo-Sa 17:15-01:00, PH,Su 17:15-24:00'
    ], '2014-10-01 0:00', '2014-10-05 0:00', [
        [ '2014-10-01 00:00', '2014-10-01 01:00' ],
        [ '2014-10-01 17:15', '2014-10-02 01:00' ],
        [ '2014-10-02 17:15', '2014-10-03 01:00' ],
        [ '2014-10-03 17:15', '2014-10-04 00:00', false, 'Tag der Deutschen Einheit' ],
        [ '2014-10-04 00:00', '2014-10-04 01:00' ],
        [ '2014-10-04 17:15', '2014-10-05 00:00' ],
    ], 1000 * 60 * 60 * (1 + (24 - 17.25 + 1) * 4  - 1), 0, false, nominatim_default, 'not only test');
/* }}} */

/* https://www.openstreetmap.org/node/1754337209/history {{{ */
test.addTest('Real world example: Was not processed right (month range/monthday range)', [
        // 'Jun 15-Sep 15: Th-Su 16:00-19:00; Sep 16-Dec 31: Sa,Su 16:00-19:00; Jan-Mar off; Dec 25-easter off'
        'Jun 15-Sep 15; Sep 16-Dec 31; Jan-Mar off; Dec 25-easter off'
    ], '2014-01-01 0:00', '2016-01-01 0:00', [
        [ '2014-06-15 00:00', '2014-12-25 00:00' ],
        [ '2015-06-15 00:00', '2015-12-25 00:00' ],
    ], 33357600000, 0, false, {}, 'not last test');
/* }}} */

test.addTest('Real world example: Was not processed right', [
        'Mo,Tu,We,Th,Fr,Su 11:00-01:00; Sa 11:00-02:00',
        'Mo, Tu, We, Th, Fr, Su 11:00-01:00; Sa 11:00-02:00',
    ], '2014-01-01 0:00', '2014-01-10 0:00', [
        [ '2014-01-01 00:00', '2014-01-01 01:00' ], // We
        [ '2014-01-01 11:00', '2014-01-02 01:00' ],
        [ '2014-01-02 11:00', '2014-01-03 01:00' ], // Th
        [ '2014-01-03 11:00', '2014-01-04 00:00' ], // Fr
        [ '2014-01-04 11:00', '2014-01-05 02:00' ], // Sa
        [ '2014-01-05 11:00', '2014-01-06 01:00' ], // Su
        [ '2014-01-06 11:00', '2014-01-07 01:00' ], // Mo
        [ '2014-01-07 11:00', '2014-01-08 01:00' ], // Tu
        [ '2014-01-08 11:00', '2014-01-09 01:00' ], // We
        [ '2014-01-09 11:00', '2014-01-10 00:00' ], // Th
    ], 1000 * 60 * 60 * (1 + 14 * 2 + 13 + 15 + 14 * 4 + 13), 0, true, {}, 'not last test');

// problem with combined monthday and month selector {{{
test.addTest('Real world example: Was not processed right.', [
        'Jan Su[-2]-Jan Su[-1]: Fr-Su 12:00+;'
        + ' Feb Su[-2]-Feb Su[-1]: Fr-Su 12:00+;'
        + ' Mar 01-Jul 31: Th-Su 12:00+;'
        + ' Aug 01-Nov 30,Dec: Tu-Su 12:00+;'
        + ' Dec 24-26,Dec 31: off', // Original value.
        'Jan Su[-2]-Jan Su[-1],Feb Su[-2]-Feb Su[-1]: Fr-Su 12:00+; Mar 01-Dec 31: Tu-Su 12:00+; Dec 24-26,Dec 31: off'
        // Optimized value. Should mean the same.
    ], '2014-11-29 0:00', '2015-01-11 0:00', [
        [ '2014-11-29 12:00', '2014-11-30 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-11-30 12:00', '2014-12-01 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-02 12:00', '2014-12-03 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-03 12:00', '2014-12-04 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-04 12:00', '2014-12-05 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-05 12:00', '2014-12-06 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-06 12:00', '2014-12-07 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-07 12:00', '2014-12-08 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-09 12:00', '2014-12-10 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-10 12:00', '2014-12-11 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-11 12:00', '2014-12-12 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-12 12:00', '2014-12-13 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-13 12:00', '2014-12-14 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-14 12:00', '2014-12-15 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-16 12:00', '2014-12-17 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-17 12:00', '2014-12-18 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-18 12:00', '2014-12-19 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-19 12:00', '2014-12-20 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-20 12:00', '2014-12-21 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-21 12:00', '2014-12-22 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-23 12:00', '2014-12-24 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-27 12:00', '2014-12-28 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-28 12:00', '2014-12-29 00:00', true,  'Specified as open end. Closing time was guessed.' ],
        [ '2014-12-30 12:00', '2014-12-31 00:00', true,  'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * 60 * 12 * 24, false, {}, 'not last test');

test.addTest('Simplifed real world example: Was not processed right.', [
        'Nov 01-20,Dec',
    ], '2014-01-01 0:00', '2015-01-02 0:00', [
        [ '2014-11-01 00:00', '2014-11-21 00:00' ],
        [ '2014-12-01 00:00', '2015-01-01 00:00' ],
    ], 1000 * 60 * 60 * 24 * (20 + 31), 0, false, {}, 'not last test');
// }}}

// https://www.openstreetmap.org/node/392512497/history
// test.addTest('Real world example: Was not processed right.', [
//         '"(Buffet)" Mo-Th 12:00-15:00,17:00-21:30; Fr 12:00-15:00,17:00-22:30; Sa 12:00-15:00,16:30-22:30; Su 12:00-15:00,16:30-21:30 || Su-Th 11:30-22:00 open "Takeout" || Fr-Sa 11:30-23:00 open "Takeout"',
//     ], '2013-08-01 0:00', '2013-10-08 0:00', [
//     ], 1000 * 60 * 60 * (4 * 2 + 4 * 4), 0, false, {}, 'not last test');

// https://github.com/opening-hours/opening_hours.js/issues/26 {{{
// Problem with wrap day in browser.
test.addTest('Real world example: Was processed right form library.', [
        'Mo 19:00+; We 14:00+; Su 10:00+ || "Führung, Sonderführungen nach Vereinbarung."',
    ], '2014-01-06 0:00', '2014-01-13 0:00', [
        [ '2014-01-06 00:00', '2014-01-06 19:00', true, 'Führung, Sonderführungen nach Vereinbarung.' ],
        [ '2014-01-06 19:00', '2014-01-07 05:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-01-07 05:00', '2014-01-08 14:00', true, 'Führung, Sonderführungen nach Vereinbarung.' ],
        [ '2014-01-08 14:00', '2014-01-09 00:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-01-09 00:00', '2014-01-12 10:00', true, 'Führung, Sonderführungen nach Vereinbarung.' ],
        [ '2014-01-12 10:00', '2014-01-13 00:00', true, 'Specified as open end. Closing time was guessed.' ],
    ], 0, 1000 * 60 * 60 * 24 * 7, true, {}, 'not last test');

test.addTest('Real world example: Was processed right form library.', [
        'Mo 19:00-05:00 || "Sonderführungen nach Vereinbarung."',
    ], '2014-01-06 0:00', '2014-01-13 0:00', [
        [ '2014-01-06 00:00', '2014-01-06 19:00', true,  'Sonderführungen nach Vereinbarung.' ],
        [ '2014-01-06 19:00', '2014-01-07 05:00' ],
        [ '2014-01-07 05:00', '2014-01-13 00:00', true,  'Sonderführungen nach Vereinbarung.' ],
    ], 1000 * 60 * 60 * 10, 1000 * 60 * 60 * (24 * 7 - 10), true, {}, 'not last test');

test.addTest('Real world example: Was processed right form library.', [
        'Mo 19:00+ || "Sonderführungen nach Vereinbarung."',
    ], '2014-01-07 1:00', '2014-01-13 0:00', [
        [ '2014-01-07 01:00', '2014-01-07 05:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2014-01-07 05:00', '2014-01-13 00:00', true, 'Sonderführungen nach Vereinbarung.' ],
    ], 0, 1000 * 60 * 60 * (24 * 6 - 1), true, {}, 'not last test');
// }}}

// https://github.com/opening-hours/opening_hours.js/issues/27 {{{
// Problem in browser.
//
// https://www.openstreetmap.org/way/163756418/history
test.addTest('Real world example: Was not processed right.', [
        'Jun 15-Sep 15: Th-Su 16:00-19:00; Sep 16-Dec 31: Sa,Su 16:00-19:00; Jan,Feb,Mar off; Dec 25,easter off',
    ], '2013-12-20 0:00', '2014-06-20 0:00', [
        [ '2013-12-21 16:00', '2013-12-21 19:00' ], // Sa
        [ '2013-12-22 16:00', '2013-12-22 19:00' ], // Su
        [ '2013-12-28 16:00', '2013-12-28 19:00' ], // Sa
        [ '2013-12-29 16:00', '2013-12-29 19:00' ], // Su
        [ '2014-06-15 16:00', '2014-06-15 19:00' ], // Su
        [ '2014-06-19 16:00', '2014-06-19 19:00' ], // Th
    ], 1000 * 60 * 60 * (3 * 6), 0, false, {}, 'not last test');

test.addTest('Based on real world example: Is processed right.', [
        'Nov-Dec Sa,Su 16:00-19:00; Dec 22 off',
    ], '2013-01-01 0:00', '2014-01-01 0:00', [
        [ '2013-11-02 16:00', '2013-11-02 19:00' ],
        [ '2013-11-03 16:00', '2013-11-03 19:00' ],
        [ '2013-11-09 16:00', '2013-11-09 19:00' ],
        [ '2013-11-10 16:00', '2013-11-10 19:00' ],
        [ '2013-11-16 16:00', '2013-11-16 19:00' ],
        [ '2013-11-17 16:00', '2013-11-17 19:00' ],
        [ '2013-11-23 16:00', '2013-11-23 19:00' ],
        [ '2013-11-24 16:00', '2013-11-24 19:00' ],
        [ '2013-11-30 16:00', '2013-11-30 19:00' ],
        [ '2013-12-01 16:00', '2013-12-01 19:00' ],
        [ '2013-12-07 16:00', '2013-12-07 19:00' ],
        [ '2013-12-08 16:00', '2013-12-08 19:00' ],
        [ '2013-12-14 16:00', '2013-12-14 19:00' ],
        [ '2013-12-15 16:00', '2013-12-15 19:00' ],
        [ '2013-12-21 16:00', '2013-12-21 19:00' ],
        [ '2013-12-28 16:00', '2013-12-28 19:00' ],
        [ '2013-12-29 16:00', '2013-12-29 19:00' ],
    ], 1000 * 60 * 60 * (3 * 17), 0, false, {}, 'not last test');

test.addTest('Based on real world example: Is processed right.', [
        'May-Sep: 00:00-24:00, Apr-Oct: Sa-Su 08:00-15:00',
        'Apr-Oct: Sa-Su 08:00-15:00, May-Sep: 00:00-24:00',
        'Apr-Oct: Sa-Su 08:00-15:00; May-Sep: 00:00-24:00',
    ], '2013-01-01 0:00', '2014-01-01 0:00', [
        [ '2013-04-06 08:00', '2013-04-06 15:00' ], // 8 days: Apr {{{
        [ '2013-04-07 08:00', '2013-04-07 15:00' ],
        [ '2013-04-13 08:00', '2013-04-13 15:00' ],
        [ '2013-04-14 08:00', '2013-04-14 15:00' ],
        [ '2013-04-20 08:00', '2013-04-20 15:00' ],
        [ '2013-04-21 08:00', '2013-04-21 15:00' ],
        [ '2013-04-27 08:00', '2013-04-27 15:00' ],
        [ '2013-04-28 08:00', '2013-04-28 15:00' ], // }}}
        [ '2013-05-01 00:00', '2013-10-01 00:00' ], // 31 + 30 + 31 + 31 + 30 days: May-Sep
        [ '2013-10-05 08:00', '2013-10-05 15:00' ], // 8 days: Oct {{{
        [ '2013-10-06 08:00', '2013-10-06 15:00' ],
        [ '2013-10-12 08:00', '2013-10-12 15:00' ],
        [ '2013-10-13 08:00', '2013-10-13 15:00' ],
        [ '2013-10-19 08:00', '2013-10-19 15:00' ],
        [ '2013-10-20 08:00', '2013-10-20 15:00' ],
        [ '2013-10-26 08:00', '2013-10-26 15:00' ],
        [ '2013-10-27 08:00', '2013-10-27 15:00' ], // }}}
    ], 1000 * 60 * 60 * (8 * 7 + (31 + 30 + 31 + 31 + 30) * 24 + 8 * 7), 0, false, {}, 'not last test');
// }}}

// https://github.com/opening-hours/opening_hours.js/issues/43 {{{
// https://www.openstreetmap.org/way/242311985
test.addTest('Real world example: Was not processed right.', [
        'Mo-Fr 07:00-19:30; Sa-Su 08:00-19:30 open, 19:30-21:00 open "No new laundry loads in"; Nov Th[4] off; Dec 25 off',
    ], '2014-12-23 0:00', '2014-12-27 0:00', [
        [ '2014-12-23 07:00', '2014-12-23 19:30' ], // Tu
        [ '2014-12-23 19:30', '2014-12-23 21:00', false, 'No new laundry loads in' ],
        [ '2014-12-24 07:00', '2014-12-24 19:30' ], // We
        [ '2014-12-24 19:30', '2014-12-24 21:00', false, 'No new laundry loads in' ],
        [ '2014-12-26 07:00', '2014-12-26 19:30' ], // Fr
        [ '2014-12-26 19:30', '2014-12-26 21:00', false, 'No new laundry loads in' ],
    ], 1000 * 60 * 60 * (12.5 + 1.5) * 3, 0, false, {}, 'not last test');
// }}}

/* https://www.openstreetmap.org/node/35608651/history {{{ */
test.addTest('Real world example: Was not processed right', [
        'Jan off; Feb off; Mar off; Apr Tu-Su 10:00-14:30, May Tu-Su 10:00-14:30; Jun Tu-Su 09:00-16:00; Jul Tu-Su 10:00-17:00; Aug Tu-Su 10:00-17:00; Sep Tu-Su 10:00-14:30; Oct Tu-Su 10:00-14:30 Nov off; Dec off', // FIXME
        'Nov-Mar off; Apr,May,Sep,Oct Tu-Su 10:00-14:30; Jun Tu-Su 09:00-16:00; Jul,Aug Tu-Su 10:00-17:00',
        'Nov-Mar off; Apr,May,Sep,Oct 10:00-14:30; Jun 09:00-16:00; Jul,Aug 10:00-17:00; Mo off'
    ], '2014-03-15 0:00', '2014-05-02 0:00', [
        [ '2014-04-01 10:00', '2014-04-01 14:30' ],
        [ '2014-04-02 10:00', '2014-04-02 14:30' ],
        [ '2014-04-03 10:00', '2014-04-03 14:30' ],
        [ '2014-04-04 10:00', '2014-04-04 14:30' ],
        [ '2014-04-05 10:00', '2014-04-05 14:30' ],
        [ '2014-04-06 10:00', '2014-04-06 14:30' ],
        [ '2014-04-08 10:00', '2014-04-08 14:30' ],
        [ '2014-04-09 10:00', '2014-04-09 14:30' ],
        [ '2014-04-10 10:00', '2014-04-10 14:30' ],
        [ '2014-04-11 10:00', '2014-04-11 14:30' ],
        [ '2014-04-12 10:00', '2014-04-12 14:30' ],
        [ '2014-04-13 10:00', '2014-04-13 14:30' ],
        [ '2014-04-15 10:00', '2014-04-15 14:30' ],
        [ '2014-04-16 10:00', '2014-04-16 14:30' ],
        [ '2014-04-17 10:00', '2014-04-17 14:30' ],
        [ '2014-04-18 10:00', '2014-04-18 14:30' ],
        [ '2014-04-19 10:00', '2014-04-19 14:30' ],
        [ '2014-04-20 10:00', '2014-04-20 14:30' ],
        [ '2014-04-22 10:00', '2014-04-22 14:30' ],
        [ '2014-04-23 10:00', '2014-04-23 14:30' ],
        [ '2014-04-24 10:00', '2014-04-24 14:30' ],
        [ '2014-04-25 10:00', '2014-04-25 14:30' ],
        [ '2014-04-26 10:00', '2014-04-26 14:30' ],
        [ '2014-04-27 10:00', '2014-04-27 14:30' ],
        [ '2014-04-29 10:00', '2014-04-29 14:30' ],
        [ '2014-04-30 10:00', '2014-04-30 14:30' ],
        [ '2014-05-01 10:00', '2014-05-01 14:30' ],
    ], 1000 * 60 * 60 * 27 * 4.5, 0, false, {}, 'not last test');

/* {{{ Test over a full year */
test.addTest('Real world example: Was not processed right (test over a full year)', [
        'Jan off; Feb off; Mar off; Apr Tu-Su 10:00-14:30, May Tu-Su 10:00-14:30; Jun Tu-Su 09:00-16:00; Jul Tu-Su 10:00-17:00; Aug Tu-Su 10:00-17:00; Sep Tu-Su 10:00-14:30; Oct Tu-Su 10:00-14:30; Nov off; Dec off',
        'Nov-Mar off; Apr,May,Sep,Oct Tu-Su 10:00-14:30; Jun Tu-Su 09:00-16:00; Jul,Aug Tu-Su 10:00-17:00',
        'Nov-Mar off; Apr,May,Sep,Oct 10:00-14:30; Jun 09:00-16:00; Jul,Aug 10:00-17:00; Mo off'
    ], '2014-03-15 0:00', '2015-05-02 0:00', [
        [ '2014-04-01 10:00', '2014-04-01 14:30' ],
        [ '2014-04-02 10:00', '2014-04-02 14:30' ],
        [ '2014-04-03 10:00', '2014-04-03 14:30' ],
        [ '2014-04-04 10:00', '2014-04-04 14:30' ],
        [ '2014-04-05 10:00', '2014-04-05 14:30' ],
        [ '2014-04-06 10:00', '2014-04-06 14:30' ],
        [ '2014-04-08 10:00', '2014-04-08 14:30' ],
        [ '2014-04-09 10:00', '2014-04-09 14:30' ],
        [ '2014-04-10 10:00', '2014-04-10 14:30' ],
        [ '2014-04-11 10:00', '2014-04-11 14:30' ],
        [ '2014-04-12 10:00', '2014-04-12 14:30' ],
        [ '2014-04-13 10:00', '2014-04-13 14:30' ],
        [ '2014-04-15 10:00', '2014-04-15 14:30' ],
        [ '2014-04-16 10:00', '2014-04-16 14:30' ],
        [ '2014-04-17 10:00', '2014-04-17 14:30' ],
        [ '2014-04-18 10:00', '2014-04-18 14:30' ],
        [ '2014-04-19 10:00', '2014-04-19 14:30' ],
        [ '2014-04-20 10:00', '2014-04-20 14:30' ],
        [ '2014-04-22 10:00', '2014-04-22 14:30' ],
        [ '2014-04-23 10:00', '2014-04-23 14:30' ],
        [ '2014-04-24 10:00', '2014-04-24 14:30' ],
        [ '2014-04-25 10:00', '2014-04-25 14:30' ],
        [ '2014-04-26 10:00', '2014-04-26 14:30' ],
        [ '2014-04-27 10:00', '2014-04-27 14:30' ],
        [ '2014-04-29 10:00', '2014-04-29 14:30' ],
        [ '2014-04-30 10:00', '2014-04-30 14:30' ],
        [ '2014-05-01 10:00', '2014-05-01 14:30' ],
        [ '2014-05-02 10:00', '2014-05-02 14:30' ],
        [ '2014-05-03 10:00', '2014-05-03 14:30' ],
        [ '2014-05-04 10:00', '2014-05-04 14:30' ],
        [ '2014-05-06 10:00', '2014-05-06 14:30' ],
        [ '2014-05-07 10:00', '2014-05-07 14:30' ],
        [ '2014-05-08 10:00', '2014-05-08 14:30' ],
        [ '2014-05-09 10:00', '2014-05-09 14:30' ],
        [ '2014-05-10 10:00', '2014-05-10 14:30' ],
        [ '2014-05-11 10:00', '2014-05-11 14:30' ],
        [ '2014-05-13 10:00', '2014-05-13 14:30' ],
        [ '2014-05-14 10:00', '2014-05-14 14:30' ],
        [ '2014-05-15 10:00', '2014-05-15 14:30' ],
        [ '2014-05-16 10:00', '2014-05-16 14:30' ],
        [ '2014-05-17 10:00', '2014-05-17 14:30' ],
        [ '2014-05-18 10:00', '2014-05-18 14:30' ],
        [ '2014-05-20 10:00', '2014-05-20 14:30' ],
        [ '2014-05-21 10:00', '2014-05-21 14:30' ],
        [ '2014-05-22 10:00', '2014-05-22 14:30' ],
        [ '2014-05-23 10:00', '2014-05-23 14:30' ],
        [ '2014-05-24 10:00', '2014-05-24 14:30' ],
        [ '2014-05-25 10:00', '2014-05-25 14:30' ],
        [ '2014-05-27 10:00', '2014-05-27 14:30' ],
        [ '2014-05-28 10:00', '2014-05-28 14:30' ],
        [ '2014-05-29 10:00', '2014-05-29 14:30' ],
        [ '2014-05-30 10:00', '2014-05-30 14:30' ],
        [ '2014-05-31 10:00', '2014-05-31 14:30' ],
        [ '2014-06-01 09:00', '2014-06-01 16:00' ],
        [ '2014-06-03 09:00', '2014-06-03 16:00' ],
        [ '2014-06-04 09:00', '2014-06-04 16:00' ],
        [ '2014-06-05 09:00', '2014-06-05 16:00' ],
        [ '2014-06-06 09:00', '2014-06-06 16:00' ],
        [ '2014-06-07 09:00', '2014-06-07 16:00' ],
        [ '2014-06-08 09:00', '2014-06-08 16:00' ],
        [ '2014-06-10 09:00', '2014-06-10 16:00' ],
        [ '2014-06-11 09:00', '2014-06-11 16:00' ],
        [ '2014-06-12 09:00', '2014-06-12 16:00' ],
        [ '2014-06-13 09:00', '2014-06-13 16:00' ],
        [ '2014-06-14 09:00', '2014-06-14 16:00' ],
        [ '2014-06-15 09:00', '2014-06-15 16:00' ],
        [ '2014-06-17 09:00', '2014-06-17 16:00' ],
        [ '2014-06-18 09:00', '2014-06-18 16:00' ],
        [ '2014-06-19 09:00', '2014-06-19 16:00' ],
        [ '2014-06-20 09:00', '2014-06-20 16:00' ],
        [ '2014-06-21 09:00', '2014-06-21 16:00' ],
        [ '2014-06-22 09:00', '2014-06-22 16:00' ],
        [ '2014-06-24 09:00', '2014-06-24 16:00' ],
        [ '2014-06-25 09:00', '2014-06-25 16:00' ],
        [ '2014-06-26 09:00', '2014-06-26 16:00' ],
        [ '2014-06-27 09:00', '2014-06-27 16:00' ],
        [ '2014-06-28 09:00', '2014-06-28 16:00' ],
        [ '2014-06-29 09:00', '2014-06-29 16:00' ],
        [ '2014-07-01 10:00', '2014-07-01 17:00' ],
        [ '2014-07-02 10:00', '2014-07-02 17:00' ],
        [ '2014-07-03 10:00', '2014-07-03 17:00' ],
        [ '2014-07-04 10:00', '2014-07-04 17:00' ],
        [ '2014-07-05 10:00', '2014-07-05 17:00' ],
        [ '2014-07-06 10:00', '2014-07-06 17:00' ],
        [ '2014-07-08 10:00', '2014-07-08 17:00' ],
        [ '2014-07-09 10:00', '2014-07-09 17:00' ],
        [ '2014-07-10 10:00', '2014-07-10 17:00' ],
        [ '2014-07-11 10:00', '2014-07-11 17:00' ],
        [ '2014-07-12 10:00', '2014-07-12 17:00' ],
        [ '2014-07-13 10:00', '2014-07-13 17:00' ],
        [ '2014-07-15 10:00', '2014-07-15 17:00' ],
        [ '2014-07-16 10:00', '2014-07-16 17:00' ],
        [ '2014-07-17 10:00', '2014-07-17 17:00' ],
        [ '2014-07-18 10:00', '2014-07-18 17:00' ],
        [ '2014-07-19 10:00', '2014-07-19 17:00' ],
        [ '2014-07-20 10:00', '2014-07-20 17:00' ],
        [ '2014-07-22 10:00', '2014-07-22 17:00' ],
        [ '2014-07-23 10:00', '2014-07-23 17:00' ],
        [ '2014-07-24 10:00', '2014-07-24 17:00' ],
        [ '2014-07-25 10:00', '2014-07-25 17:00' ],
        [ '2014-07-26 10:00', '2014-07-26 17:00' ],
        [ '2014-07-27 10:00', '2014-07-27 17:00' ],
        [ '2014-07-29 10:00', '2014-07-29 17:00' ],
        [ '2014-07-30 10:00', '2014-07-30 17:00' ],
        [ '2014-07-31 10:00', '2014-07-31 17:00' ],
        [ '2014-08-01 10:00', '2014-08-01 17:00' ],
        [ '2014-08-02 10:00', '2014-08-02 17:00' ],
        [ '2014-08-03 10:00', '2014-08-03 17:00' ],
        [ '2014-08-05 10:00', '2014-08-05 17:00' ],
        [ '2014-08-06 10:00', '2014-08-06 17:00' ],
        [ '2014-08-07 10:00', '2014-08-07 17:00' ],
        [ '2014-08-08 10:00', '2014-08-08 17:00' ],
        [ '2014-08-09 10:00', '2014-08-09 17:00' ],
        [ '2014-08-10 10:00', '2014-08-10 17:00' ],
        [ '2014-08-12 10:00', '2014-08-12 17:00' ],
        [ '2014-08-13 10:00', '2014-08-13 17:00' ],
        [ '2014-08-14 10:00', '2014-08-14 17:00' ],
        [ '2014-08-15 10:00', '2014-08-15 17:00' ],
        [ '2014-08-16 10:00', '2014-08-16 17:00' ],
        [ '2014-08-17 10:00', '2014-08-17 17:00' ],
        [ '2014-08-19 10:00', '2014-08-19 17:00' ],
        [ '2014-08-20 10:00', '2014-08-20 17:00' ],
        [ '2014-08-21 10:00', '2014-08-21 17:00' ],
        [ '2014-08-22 10:00', '2014-08-22 17:00' ],
        [ '2014-08-23 10:00', '2014-08-23 17:00' ],
        [ '2014-08-24 10:00', '2014-08-24 17:00' ],
        [ '2014-08-26 10:00', '2014-08-26 17:00' ],
        [ '2014-08-27 10:00', '2014-08-27 17:00' ],
        [ '2014-08-28 10:00', '2014-08-28 17:00' ],
        [ '2014-08-29 10:00', '2014-08-29 17:00' ],
        [ '2014-08-30 10:00', '2014-08-30 17:00' ],
        [ '2014-08-31 10:00', '2014-08-31 17:00' ],
        [ '2014-09-02 10:00', '2014-09-02 14:30' ],
        [ '2014-09-03 10:00', '2014-09-03 14:30' ],
        [ '2014-09-04 10:00', '2014-09-04 14:30' ],
        [ '2014-09-05 10:00', '2014-09-05 14:30' ],
        [ '2014-09-06 10:00', '2014-09-06 14:30' ],
        [ '2014-09-07 10:00', '2014-09-07 14:30' ],
        [ '2014-09-09 10:00', '2014-09-09 14:30' ],
        [ '2014-09-10 10:00', '2014-09-10 14:30' ],
        [ '2014-09-11 10:00', '2014-09-11 14:30' ],
        [ '2014-09-12 10:00', '2014-09-12 14:30' ],
        [ '2014-09-13 10:00', '2014-09-13 14:30' ],
        [ '2014-09-14 10:00', '2014-09-14 14:30' ],
        [ '2014-09-16 10:00', '2014-09-16 14:30' ],
        [ '2014-09-17 10:00', '2014-09-17 14:30' ],
        [ '2014-09-18 10:00', '2014-09-18 14:30' ],
        [ '2014-09-19 10:00', '2014-09-19 14:30' ],
        [ '2014-09-20 10:00', '2014-09-20 14:30' ],
        [ '2014-09-21 10:00', '2014-09-21 14:30' ],
        [ '2014-09-23 10:00', '2014-09-23 14:30' ],
        [ '2014-09-24 10:00', '2014-09-24 14:30' ],
        [ '2014-09-25 10:00', '2014-09-25 14:30' ],
        [ '2014-09-26 10:00', '2014-09-26 14:30' ],
        [ '2014-09-27 10:00', '2014-09-27 14:30' ],
        [ '2014-09-28 10:00', '2014-09-28 14:30' ],
        [ '2014-09-30 10:00', '2014-09-30 14:30' ],
        [ '2014-10-01 10:00', '2014-10-01 14:30' ],
        [ '2014-10-02 10:00', '2014-10-02 14:30' ],
        [ '2014-10-03 10:00', '2014-10-03 14:30' ],
        [ '2014-10-04 10:00', '2014-10-04 14:30' ],
        [ '2014-10-05 10:00', '2014-10-05 14:30' ],
        [ '2014-10-07 10:00', '2014-10-07 14:30' ],
        [ '2014-10-08 10:00', '2014-10-08 14:30' ],
        [ '2014-10-09 10:00', '2014-10-09 14:30' ],
        [ '2014-10-10 10:00', '2014-10-10 14:30' ],
        [ '2014-10-11 10:00', '2014-10-11 14:30' ],
        [ '2014-10-12 10:00', '2014-10-12 14:30' ],
        [ '2014-10-14 10:00', '2014-10-14 14:30' ],
        [ '2014-10-15 10:00', '2014-10-15 14:30' ],
        [ '2014-10-16 10:00', '2014-10-16 14:30' ],
        [ '2014-10-17 10:00', '2014-10-17 14:30' ],
        [ '2014-10-18 10:00', '2014-10-18 14:30' ],
        [ '2014-10-19 10:00', '2014-10-19 14:30' ],
        [ '2014-10-21 10:00', '2014-10-21 14:30' ],
        [ '2014-10-22 10:00', '2014-10-22 14:30' ],
        [ '2014-10-23 10:00', '2014-10-23 14:30' ],
        [ '2014-10-24 10:00', '2014-10-24 14:30' ],
        [ '2014-10-25 10:00', '2014-10-25 14:30' ],
        [ '2014-10-26 10:00', '2014-10-26 14:30' ],
        [ '2014-10-28 10:00', '2014-10-28 14:30' ],
        [ '2014-10-29 10:00', '2014-10-29 14:30' ],
        [ '2014-10-30 10:00', '2014-10-30 14:30' ],
        [ '2014-10-31 10:00', '2014-10-31 14:30' ],
        [ '2015-04-01 10:00', '2015-04-01 14:30' ],
        [ '2015-04-02 10:00', '2015-04-02 14:30' ],
        [ '2015-04-03 10:00', '2015-04-03 14:30' ],
        [ '2015-04-04 10:00', '2015-04-04 14:30' ],
        [ '2015-04-05 10:00', '2015-04-05 14:30' ],
        [ '2015-04-07 10:00', '2015-04-07 14:30' ],
        [ '2015-04-08 10:00', '2015-04-08 14:30' ],
        [ '2015-04-09 10:00', '2015-04-09 14:30' ],
        [ '2015-04-10 10:00', '2015-04-10 14:30' ],
        [ '2015-04-11 10:00', '2015-04-11 14:30' ],
        [ '2015-04-12 10:00', '2015-04-12 14:30' ],
        [ '2015-04-14 10:00', '2015-04-14 14:30' ],
        [ '2015-04-15 10:00', '2015-04-15 14:30' ],
        [ '2015-04-16 10:00', '2015-04-16 14:30' ],
        [ '2015-04-17 10:00', '2015-04-17 14:30' ],
        [ '2015-04-18 10:00', '2015-04-18 14:30' ],
        [ '2015-04-19 10:00', '2015-04-19 14:30' ],
        [ '2015-04-21 10:00', '2015-04-21 14:30' ],
        [ '2015-04-22 10:00', '2015-04-22 14:30' ],
        [ '2015-04-23 10:00', '2015-04-23 14:30' ],
        [ '2015-04-24 10:00', '2015-04-24 14:30' ],
        [ '2015-04-25 10:00', '2015-04-25 14:30' ],
        [ '2015-04-26 10:00', '2015-04-26 14:30' ],
        [ '2015-04-28 10:00', '2015-04-28 14:30' ],
        [ '2015-04-29 10:00', '2015-04-29 14:30' ],
        [ '2015-04-30 10:00', '2015-04-30 14:30' ],
        [ '2015-05-01 10:00', '2015-05-01 14:30' ],
    ], 1000 * 60 * 60 * (53 * 4.5 + 25 * 7 + 54 * 7 + 79 * 4.5), 0, false, {}, 'not last test');
// }}}
// }}}

test.addTest('Real world example: Was not processed right', [
        'Tu 10:00-12:00, Fr 16:00-18:00; unknown',
    ], '2014-01-01 0:00', '2016-01-01 0:00', [
    ], 0, 0, false, {}, 'not last test');

/* https://github.com/opening-hours/opening_hours.js/issues/75 {{{ */
test.addTest('Real world example: Problem with <additional_rule_separator> in holiday parser', [
        // 'PH, Aug-Sep 00:00-24:00', // Should fail.
        'PH; Aug-Sep 00:00-24:00',
    ], '2015-01-01 0:00', '2015-01-10 0:00', [
        [ '2015-01-01 00:00', '2015-01-02 00:00', false, 'Neujahrstag' ],
        [ '2015-01-06 00:00', '2015-01-07 00:00', false, 'Heilige Drei Könige' ],
    ], 1000 * 60 * 60 * 24 * 2, 0, false, nominatim_default, 'not only test');
test.addTest('Real world example: Problem with <additional_rule_separator> in holiday parser', [
        // 'We off, Mo,Tu,Th-Su,PH, Jun-Aug We 11:00-14:00,17:00+', // Should fail.
        'We off; Mo,Tu,Th-Su,PH; Jun-Aug We 11:00-14:00,17:00+',
        'We off; Mo,Tu,Th-Su,PH; Sommer We 11:00-14:00,17:00+',
        'We off; Mo,Tu,Th-Su,PH; sommer We 11:00-14:00,17:00+',
        'Mo,Tu,Th-Su,PH 00:00-24:00; Jun-Aug We 11:00-14:00,17:00+'
    ], '2015-05-25 0:00', '2015-06-10 0:00', [
        [ '2015-05-25 00:00', '2015-05-26 00:00', false, 'Pfingstmontag' ], // Mo: 1
        [ '2015-05-26 00:00', '2015-05-27 00:00' ], // Tu: 1
        [ '2015-05-28 00:00', '2015-06-03 00:00' ], // Th till Tu: 6
        [ '2015-06-03 11:00', '2015-06-03 14:00' ], // We
        [ '2015-06-03 17:00', '2015-06-04 03:00', true, 'Specified as open end. Closing time was guessed.' ],
        [ '2015-06-04 03:00', '2015-06-05 00:00', false, 'Fronleichnam' ], // Th
        [ '2015-06-05 00:00', '2015-06-10 00:00' ], // Fr-Tu: 5
    ], 1000 * 60 * 60 * (24 * (1 + 1 + 6 + 5) + 3 + (24 - 3)), 1000 * 60 * 60 * (24 - 17 + 3), false, nominatim_default, 'not last test');
/* }}} */

/* https://github.com/opening-hours/opening_hours.js/issues/87 {{{ */
test.addTest('Real world example: Problem with daylight saving?', [
        'Mo-Su,PH 15:00-03:00; easter -2 days 15:00-24:00',
    ], '2015-03-29 0:00', '2015-04-05 0:00', [
        [ '2015-03-29 00:00', '2015-03-29 03:00' ], // 3
        [ '2015-03-29 15:00', '2015-03-30 03:00' ], // 24-15 + 3
        [ '2015-03-30 15:00', '2015-03-31 03:00' ], // * 2
        [ '2015-03-31 15:00', '2015-04-01 03:00' ], // * 3
        [ '2015-04-01 15:00', '2015-04-02 03:00' ], // * 4
        [ '2015-04-02 15:00', '2015-04-03 00:00' ], // 24-15
        [ '2015-04-03 15:00', '2015-04-04 03:00' ], // * 5
        [ '2015-04-04 15:00', '2015-04-05 00:00' ], // 24-15
    ], 1000 * 60 * 60 * (3 + 5 * (24-15 + 3) + 2 * (24-15) - 1), 0, false, nominatim_default, 'not only test');
// }}}

/* {{{ https://www.openstreetmap.org/node/3010451545 */
test.addShouldFail('Incorrect syntax which should throw an error', [
        'Mo-Fr 17:00-12:00; Sa-Su 24:00-12:00',  // Website, after cleanup and *wrong* am/pm to normal time conversion.
    ], nominatim_default, 'not only test');

test.addTest('Real world example: Was not processed right', [
        'Mo-Fr 17:00-12:00, Su-Mo 00:00-12:00', // Rewritten and fixed.
    ], '2014-08-25 0:00', '2014-09-02 0:00', [
        [ '2014-08-25 00:00', '2014-08-25 12:00' ], // Mo
        [ '2014-08-25 17:00', '2014-08-26 12:00' ], // Mo to Tu
        [ '2014-08-26 17:00', '2014-08-27 12:00' ], // Tu to We
        [ '2014-08-27 17:00', '2014-08-28 12:00' ], // We to Th
        [ '2014-08-28 17:00', '2014-08-29 12:00' ], // Th to Fr
        [ '2014-08-29 17:00', '2014-08-30 12:00' ], // Fr to Sa
        [ '2014-08-31 00:00', '2014-08-31 12:00' ], // (Sa to) Su
        [ '2014-09-01 00:00', '2014-09-01 12:00' ], // (Su to) Mo
        [ '2014-09-01 17:00', '2014-09-02 00:00' ], // Mo to Tu
    ], 1000 * 60 * 60 * (12 + 5 * (7 + 12) + 2 * 12 + 7), 0, true, {}, 'not last test');
// }}}

// }}}

// variable events e.g. easter {{{
test.addTest('Variable events', [
        'easter',
    ], '2012-01-01 0:00', '2014-10-08 0:00', [
        [ '2012-04-08 00:00', '2012-04-09 00:00' ],
        [ '2013-03-31 00:00', '2013-04-01 00:00' ], // daylight saving time
        [ '2014-04-20 00:00', '2014-04-21 00:00' ],
    ], 1000 * 60 * 60 * (24 * 3 - 1), 0, false, nominatim_default, 'not last test');

test.addTest('Calculations based on variable events', [
        'easter +1 day open "Easter Monday"',
    ], '2012-01-01 0:00', '2014-10-08 0:00', [
        [ '2012-04-09 00:00', '2012-04-10 00:00', false, 'Easter Monday' ],
        [ '2013-04-01 00:00', '2013-04-02 00:00', false, 'Easter Monday' ],
        [ '2014-04-21 00:00', '2014-04-22 00:00', false, 'Easter Monday' ],
    ], 1000 * 60 * 60 * 24 * 3, 0, false, nominatim_default, 'not last test');

test.addTest('Calculations based on variable events', [
        'Apr 05-easter -1 day: open "Before easter"',
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
        [ '2012-04-05 00:00', '2012-04-07 00:00', false, 'Before easter' ],
    ], 1000 * 60 * 60 * 24 * 2, 0, false, nominatim_default, 'not only test');

test.addTest('Calculations based on variable events', [
        'easter-Apr 20: open "Around easter"',
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
        [ '2012-04-08 00:00', '2012-04-21 00:00', false, 'Around easter' ],
    ], 1000 * 60 * 60 * 24 * 13, 0, false, nominatim_default, 'not last test');

test.addTest('Calculations based on variable events', [
        'easter-Apr 02: open "Around easter"',
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
        [ '2012-01-01 00:00', '2012-04-03 00:00', false, 'Around easter' ],
        [ '2012-04-08 00:00', '2012-10-08 00:00', false, 'Around easter' ],
    ], 23842800000, 0, false, nominatim_default, 'not last test');

test.addTest('Calculations based on variable events', [
        '2012 easter -2 days-2012 easter +2 days: open "Around easter"', // Preferred because more explicit (year) and with the colon easier to read.
        'easter -2 days-easter +2 days: open "Around easter"',
        'easter -2 days-easter +2 days open "Around easter"',
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
        [ '2012-04-06 00:00', '2012-04-10 00:00', false, 'Around easter' ],
    ], 1000 * 60 * 60 * 24 * 4, 0, false, nominatim_default, 'not only test');
// }}}

// additional rules {{{

// for https://github.com/opening-hours/opening_hours.js/issues/16
test.addTest('Additional rules with comment', [
        'Fr 08:00-12:00, Fr 12:00-16:00 open "Notfallsprechstunde"',
        'Fr 08:00-12:00 || Fr 12:00-16:00 open "Notfallsprechstunde"', // should mean the same
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-05 08:00', '2012-10-05 12:00' ],
        [ '2012-10-05 12:00', '2012-10-05 16:00', false, 'Notfallsprechstunde' ],
    ], 1000 * 60 * 60 * (4 + 4), 0, true, {}, 'n last test');
// }}}

// points in time {{{
// See https://github.com/AMDmi3/opening_hours.js/issues/12

test.addTest('Points in time, mode 1', [
        'Mo 12:00,15:00; Tu-Fr 14:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 12:01' ],
        [ '2012-10-01 15:00', '2012-10-01 15:01' ],
        [ '2012-10-02 14:00', '2012-10-02 14:01' ],
        [ '2012-10-03 14:00', '2012-10-03 14:01' ],
        [ '2012-10-04 14:00', '2012-10-04 14:01' ],
        [ '2012-10-05 14:00', '2012-10-05 14:01' ],
    ], 1000 * 60 * 6, 0, true, nominatim_default, 'not last test', 1);

test.addTest('Points in time, mode 1', [
        'Mo sunrise,sunset',
        'Mon sunrise,sunset',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 07:23' ],
        [ '2012-10-01 19:00', '2012-10-01 19:01' ],
    ], 1000 * 60 * 2, 0, false, nominatim_default, 'not last test', { 'mode': 1, 'warnings_severity': 0 });
    // Should not return any warnings.

// based on real data which could not be parse:
// https://www.openstreetmap.org/way/159114283/history
test.addTest('Points in time with month, mode 1', [
        'Apr 08:00',
        'Apr: 08:00',
        'Apr. 08:00',
        ignored('Apr.: 08:00', 'prettifyValue'),
    ], '2012-04-01 0:00', '2012-04-03 0:00', [
        [ '2012-04-01 08:00', '2012-04-01 08:01' ],
        [ '2012-04-02 08:00', '2012-04-02 08:01' ],
    ], 1000 * 60 * 2, 0, false, {}, 'not only test', 1);

test.addTest('Points in time, mode 2', [
        'Mo sunrise,sunset',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 07:23' ],
        [ '2012-10-01 19:00', '2012-10-01 19:01' ],
    ], 1000 * 60 * 2, 0, false, nominatim_default, 'not last test', { 'tag_key': 'collection_times' });

test.addTest('Points in time, mode 2', [
        'Mo (sunrise+01:00)',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 08:22', '2012-10-01 08:23' ],
    ], 1000 * 60 * 1, 0, false, nominatim_default, 'not last test', { 'warnings_severity': 5, 'tag_key': 'collection_times' });
    // Test for warn_for_PH_missing.

test.addTest('Points in time and times ranges, mode 2', [
        'Mo 12:00,13:00-14:00',
        'Mo 13:00-14:00,12:00',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 12:01' ],
        [ '2012-10-01 13:00', '2012-10-01 14:00' ],
    ], 1000 * 60 * (1 + 60), 0, true, nominatim_default, 'not last test', 2);

// https://github.com/ypid/ComplexAlarm
test.addTest('Points in time, extrem example useful for ComplexAlarm', [
        'Mo-We 07:00; Th,Fr 05:45; Mo[1] 07:30; SH Mo-Fr (sunrise+03:00); PH off',
        'Monday-Wednesday 07:00; Thursday,Friday 05:45; Monday[1] 07:30; school holidays Monday-Friday (sunrise+03:00); public holidays off',
    ], '2014-07-21 0:00', '2014-08-08 0:00', [
        [ '2014-07-21 07:00', '2014-07-21 07:01' ],
        [ '2014-07-22 07:00', '2014-07-22 07:01' ],
        [ '2014-07-23 07:00', '2014-07-23 07:01' ],
        [ '2014-07-24 05:45', '2014-07-24 05:46' ],
        [ '2014-07-25 05:45', '2014-07-25 05:46' ],
        [ '2014-07-28 07:00', '2014-07-28 07:01' ],
        [ '2014-07-29 07:00', '2014-07-29 07:01' ],
        [ '2014-07-30 07:00', '2014-07-30 07:01' ],
        [ '2014-07-31 08:51', '2014-07-31 08:52', false, 'Sommerferien' ],
        [ '2014-08-01 08:52', '2014-08-01 08:53', false, 'Sommerferien' ],
        [ '2014-08-04 08:56', '2014-08-04 08:57', false, 'Sommerferien' ],
        [ '2014-08-05 08:58', '2014-08-05 08:59', false, 'Sommerferien' ],
        [ '2014-08-06 08:59', '2014-08-06 09:00', false, 'Sommerferien' ],
        [ '2014-08-07 09:01', '2014-08-07 09:02', false, 'Sommerferien' ],
    ], 1000 * 60 * 14, 0, false, nominatim_default, 'not only test', 1);

test.addTest('Points in time, extrem example useful for ComplexAlarm', [
        'Mo-We 07:00; Th,Fr 05:45; Mo[1] 07:30; SH Mo-Fr (sunrise+03:00); PH off',
    ], '2014-05-25 0:00', '2014-06-01 0:00', [
        [ '2014-05-26 07:00', '2014-05-26 07:01' ],
        [ '2014-05-27 07:00', '2014-05-27 07:01' ],
        [ '2014-05-28 07:00', '2014-05-28 07:01' ],
        // 29: Christi Himmelfahrt
        [ '2014-05-30 05:45', '2014-05-30 05:46' ],
    ], 1000 * 60 * 4, 0, false, nominatim_default, 'not only test', 1);

test.addTest('Points in time, extrem example useful for ComplexAlarm', [
        'Mo-We 07:00; Th 05:45; week 01-53/2 Fr 07:05; week 02-53/2 Fr 05:45; SH Mo-Fr (sunrise+03:00); PH off',
    ], '2014-08-25 0:00', '2014-11-01 0:00', [
        /* Long test on per day base {{{ */
        [ '2014-08-25 09:27', '2014-08-25 09:28', false, 'Sommerferien' ],
        [ '2014-08-26 09:28', '2014-08-26 09:29', false, 'Sommerferien' ],
        [ '2014-08-27 09:30', '2014-08-27 09:31', false, 'Sommerferien' ],
        [ '2014-08-28 09:31', '2014-08-28 09:32', false, 'Sommerferien' ],
        [ '2014-08-29 09:33', '2014-08-29 09:34', false, 'Sommerferien' ],
        [ '2014-09-01 09:37', '2014-09-01 09:38', false, 'Sommerferien' ],
        [ '2014-09-02 09:39', '2014-09-02 09:40', false, 'Sommerferien' ],
        [ '2014-09-03 09:40', '2014-09-03 09:41', false, 'Sommerferien' ],
        [ '2014-09-04 09:42', '2014-09-04 09:43', false, 'Sommerferien' ],
        [ '2014-09-05 09:43', '2014-09-05 09:44', false, 'Sommerferien' ],
        [ '2014-09-08 09:47', '2014-09-08 09:48', false, 'Sommerferien' ],
        [ '2014-09-09 09:49', '2014-09-09 09:50', false, 'Sommerferien' ],
        [ '2014-09-10 09:50', '2014-09-10 09:51', false, 'Sommerferien' ],
        [ '2014-09-11 09:52', '2014-09-11 09:53', false, 'Sommerferien' ],
        [ '2014-09-12 09:53', '2014-09-12 09:54', false, 'Sommerferien' ],
        [ '2014-09-15 07:00', '2014-09-15 07:01' ], // Mo
        [ '2014-09-16 07:00', '2014-09-16 07:01' ], // Tu
        [ '2014-09-17 07:00', '2014-09-17 07:01' ], // We
        [ '2014-09-18 05:45', '2014-09-18 05:46' ], // Th
        [ '2014-09-19 05:45', '2014-09-19 05:46' ], // Fr, KW38
        [ '2014-09-22 07:00', '2014-09-22 07:01' ], // Mo
        [ '2014-09-23 07:00', '2014-09-23 07:01' ], // Th
        [ '2014-09-24 07:00', '2014-09-24 07:01' ], // We
        [ '2014-09-25 05:45', '2014-09-25 05:46' ], // Th
        [ '2014-09-26 07:05', '2014-09-26 07:06' ], // Fr, KW39
        [ '2014-09-29 07:00', '2014-09-29 07:01' ], // Mo
        [ '2014-09-30 07:00', '2014-09-30 07:01' ], // Tu
        [ '2014-10-01 07:00', '2014-10-01 07:01' ], // We
        [ '2014-10-02 05:45', '2014-10-02 05:46' ], // Th
        // PH
        [ '2014-10-06 07:00', '2014-10-06 07:01' ], // Mo
        [ '2014-10-07 07:00', '2014-10-07 07:01' ], // Tu
        [ '2014-10-08 07:00', '2014-10-08 07:01' ], // We
        [ '2014-10-09 05:45', '2014-10-09 05:46' ], // Th
        [ '2014-10-10 07:05', '2014-10-10 07:06' ], // Fr, KW41
        [ '2014-10-13 07:00', '2014-10-13 07:01' ], // Mo
        [ '2014-10-14 07:00', '2014-10-14 07:01' ], // Tu
        [ '2014-10-15 07:00', '2014-10-15 07:01' ], // We
        [ '2014-10-16 05:45', '2014-10-16 05:46' ], // Th
        [ '2014-10-17 05:45', '2014-10-17 05:46' ], // Fr, KW42
        [ '2014-10-20 07:00', '2014-10-20 07:01' ], // Mo
        [ '2014-10-21 07:00', '2014-10-21 07:01' ], // Tu
        [ '2014-10-22 07:00', '2014-10-22 07:01' ], // We
        [ '2014-10-23 05:45', '2014-10-23 05:46' ], // Th
        [ '2014-10-24 07:05', '2014-10-24 07:06' ], // Fr, KW43
        [ '2014-10-27 10:02', '2014-10-27 10:03', false, 'Herbstferien' ], // Mo
        [ '2014-10-28 10:03', '2014-10-28 10:04', false, 'Herbstferien' ], // Tu
        [ '2014-10-29 10:05', '2014-10-29 10:06', false, 'Herbstferien' ], // We
        [ '2014-10-30 10:06', '2014-10-30 10:07', false, 'Herbstferien' ], // Th
        [ '2014-10-31 05:45', '2014-10-31 05:46' ], // Fr, KW44
        // FIXME: Fr: There is no school holiday this day but you will not have to go to school because of "Reformationstag".
        /* }}} */
    ], 1000 * 60 * 49, 0, false, nominatim_default, 'not only test', 1);

test.addTest('Points in time, extrem example useful for ComplexAlarm', [
        'Mo-We 07:00; Th 05:45; week 01-53/2 Fr 07:05; week 02-53/2 Fr 05:45; SH Mo-Fr (sunrise+03:00); PH off; easter -2 days-easter +2 days off "My little break from work every year."; 2014 Sep 01-2014 Sep 07 off "My vacations …"',
    ], '2014-08-25 0:00', '2014-11-01 0:00', [
        /* Long test on per day base {{{ */
        [ '2014-08-25 09:27', '2014-08-25 09:28', false, 'Sommerferien' ],
        [ '2014-08-26 09:28', '2014-08-26 09:29', false, 'Sommerferien' ],
        [ '2014-08-27 09:30', '2014-08-27 09:31', false, 'Sommerferien' ],
        [ '2014-08-28 09:31', '2014-08-28 09:32', false, 'Sommerferien' ],
        [ '2014-08-29 09:33', '2014-08-29 09:34', false, 'Sommerferien' ],
        // vacations
        [ '2014-09-08 09:47', '2014-09-08 09:48', false, 'Sommerferien' ],
        [ '2014-09-09 09:49', '2014-09-09 09:50', false, 'Sommerferien' ],
        [ '2014-09-10 09:50', '2014-09-10 09:51', false, 'Sommerferien' ],
        [ '2014-09-11 09:52', '2014-09-11 09:53', false, 'Sommerferien' ],
        [ '2014-09-12 09:53', '2014-09-12 09:54', false, 'Sommerferien' ],
        [ '2014-09-15 07:00', '2014-09-15 07:01' ], // Mo
        [ '2014-09-16 07:00', '2014-09-16 07:01' ], // Tu
        [ '2014-09-17 07:00', '2014-09-17 07:01' ], // We
        [ '2014-09-18 05:45', '2014-09-18 05:46' ], // Th
        [ '2014-09-19 05:45', '2014-09-19 05:46' ], // Fr, KW38
        [ '2014-09-22 07:00', '2014-09-22 07:01' ], // Mo
        [ '2014-09-23 07:00', '2014-09-23 07:01' ], // Th
        [ '2014-09-24 07:00', '2014-09-24 07:01' ], // We
        [ '2014-09-25 05:45', '2014-09-25 05:46' ], // Th
        [ '2014-09-26 07:05', '2014-09-26 07:06' ], // Fr, KW39
        [ '2014-09-29 07:00', '2014-09-29 07:01' ], // Mo
        [ '2014-09-30 07:00', '2014-09-30 07:01' ], // Tu
        [ '2014-10-01 07:00', '2014-10-01 07:01' ], // We
        [ '2014-10-02 05:45', '2014-10-02 05:46' ], // Th
        // PH
        [ '2014-10-06 07:00', '2014-10-06 07:01' ], // Mo
        [ '2014-10-07 07:00', '2014-10-07 07:01' ], // Tu
        [ '2014-10-08 07:00', '2014-10-08 07:01' ], // We
        [ '2014-10-09 05:45', '2014-10-09 05:46' ], // Th
        [ '2014-10-10 07:05', '2014-10-10 07:06' ], // Fr, KW41
        [ '2014-10-13 07:00', '2014-10-13 07:01' ], // Mo
        [ '2014-10-14 07:00', '2014-10-14 07:01' ], // Tu
        [ '2014-10-15 07:00', '2014-10-15 07:01' ], // We
        [ '2014-10-16 05:45', '2014-10-16 05:46' ], // Th
        [ '2014-10-17 05:45', '2014-10-17 05:46' ], // Fr, KW42
        [ '2014-10-20 07:00', '2014-10-20 07:01' ], // Mo
        [ '2014-10-21 07:00', '2014-10-21 07:01' ], // Tu
        [ '2014-10-22 07:00', '2014-10-22 07:01' ], // We
        [ '2014-10-23 05:45', '2014-10-23 05:46' ], // Th
        [ '2014-10-24 07:05', '2014-10-24 07:06' ], // Fr, KW43
        [ '2014-10-27 10:02', '2014-10-27 10:03', false, 'Herbstferien' ], // Mo
        [ '2014-10-28 10:03', '2014-10-28 10:04', false, 'Herbstferien' ], // Tu
        [ '2014-10-29 10:05', '2014-10-29 10:06', false, 'Herbstferien' ], // We
        [ '2014-10-30 10:06', '2014-10-30 10:07', false, 'Herbstferien' ], // Th
        [ '2014-10-31 05:45', '2014-10-31 05:46' ], // Fr, KW44
        // FIXME: Fr: There is no school holiday this day but you will not have to go to school because of "Reformationstag".
        /* }}} */
    ], 1000 * 60 * (49 - 5), 0, false, nominatim_default, 'not only test', 1);


// period times {{{
test.addTest('Points in time, period times', [
        'Mo-Fr 10:00-16:00/01:30',
        'Mo-Fr 10:00-16:00/90',
        'Mo-Fr 10:00-16:00/90; Sa off "testing at end for parser"',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 10:01' ],
        [ '2012-10-01 11:30', '2012-10-01 11:31' ],
        [ '2012-10-01 13:00', '2012-10-01 13:01' ],
        [ '2012-10-01 14:30', '2012-10-01 14:31' ],
        [ '2012-10-01 16:00', '2012-10-01 16:01' ],
        [ '2012-10-02 10:00', '2012-10-02 10:01' ],
        [ '2012-10-02 11:30', '2012-10-02 11:31' ],
        [ '2012-10-02 13:00', '2012-10-02 13:01' ],
        [ '2012-10-02 14:30', '2012-10-02 14:31' ],
        [ '2012-10-02 16:00', '2012-10-02 16:01' ],
    ], 1000 * 60 * 5 * 2, 0, true, {}, 'not only test', 1);

test.addTest('Points in time, period times', [
        'Mo-Fr 10:00-16:00/02:00',
        'Mo-Fr 10:00-16:00/120',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 10:00', '2012-10-01 10:01' ],
        [ '2012-10-01 12:00', '2012-10-01 12:01' ],
        [ '2012-10-01 14:00', '2012-10-01 14:01' ],
        [ '2012-10-01 16:00', '2012-10-01 16:01' ],
    ], 1000 * 60 * 4, 0, true, {}, 'not only test', 1);

test.addTest('Points in time, period times time wrap', [
        'Mo-Fr 22:00-03:00/01:00',
    ], '2012-10-01 0:00', '2012-10-03 0:00', [
        [ '2012-10-01 22:00', '2012-10-01 22:01' ],
        [ '2012-10-01 23:00', '2012-10-01 23:01' ],
        [ '2012-10-02 00:00', '2012-10-02 00:01' ],
        [ '2012-10-02 01:00', '2012-10-02 01:01' ],
        [ '2012-10-02 02:00', '2012-10-02 02:01' ],
        [ '2012-10-02 03:00', '2012-10-02 03:01' ],
        [ '2012-10-02 22:00', '2012-10-02 22:01' ],
        [ '2012-10-02 23:00', '2012-10-02 23:01' ],
    ], 1000 * 60 * 8, 0, true, {}, 'not last test', 1);

test.addTest('Points in time, period times with variable times', [
        'Mo-Fr sunrise-(sunset-02:00)/120',
    ], '2012-10-01 0:00', '2012-10-02 0:00', [
        [ '2012-10-01 07:22', '2012-10-01 07:23' ],
        [ '2012-10-01 09:22', '2012-10-01 09:23' ],
        [ '2012-10-01 11:22', '2012-10-01 11:23' ],
        [ '2012-10-01 13:22', '2012-10-01 13:23' ],
        [ '2012-10-01 15:22', '2012-10-01 15:23' ],
    ], 1000 * 60 * 5, 0, false, nominatim_default, 'not last test', 1);

// FIXME
test.addTest('Points in time, period times (real world example)', [
        'Sa 08:00,09:00,10:00,11:00,12:00,13:00,14:00, Mo-Fr 15:00,16:00,17:00,18:00,19:00,20:00',
        'Mo-Fr 15:00-20:00/60; Sa 08:00-14:00/60', // Preferred because shorter and easier to read and maintain.
    ], '2013-12-06 0:00', '2013-12-08 0:00', [
        [ '2013-12-06 15:00', '2013-12-06 15:01' ],
        [ '2013-12-06 16:00', '2013-12-06 16:01' ],
        [ '2013-12-06 17:00', '2013-12-06 17:01' ],
        [ '2013-12-06 18:00', '2013-12-06 18:01' ],
        [ '2013-12-06 19:00', '2013-12-06 19:01' ],
        [ '2013-12-06 20:00', '2013-12-06 20:01' ],
        [ '2013-12-07 08:00', '2013-12-07 08:01' ],
        [ '2013-12-07 09:00', '2013-12-07 09:01' ],
        [ '2013-12-07 10:00', '2013-12-07 10:01' ],
        [ '2013-12-07 11:00', '2013-12-07 11:01' ],
        [ '2013-12-07 12:00', '2013-12-07 12:01' ],
        [ '2013-12-07 13:00', '2013-12-07 13:01' ],
        [ '2013-12-07 14:00', '2013-12-07 14:01' ],
    ], 1000 * 60 * 13, 0, true, {}, 'not last test', 1);
// }}}
// }}}

// currently not implemented {{{

// proposed by Netzwolf: https://wiki.openstreetmap.org/wiki/Key:opening_hours:specification#rule9
// Currently not handled correctly. Could be interpreted as fallback rule.
test.addTest('Additional comments for unknown', [
        ignored('Mo open "comment"; "I don’t know how to express easter": off'),
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
    ], 0, 1000 * 60 * 60 * 2, true, {}, 'not only test');

// The hard stuff. Proposed by Netzwolf. Was only implemented by his implementation. Might follow in opening_hours.js.
// Currently used around 6 times: /\d\s*-\s*(mo|tu|we|th|fr|sa|su)\b/
test.addTest('Calculations based on month range', [
        ignored('Mar Su[-1] - Dec 25-Su-28 days: 12:00-13:00'),
        ignored('Mo-Fr 09:00-12:30; Sa 09:00-13:00; Dec 25-Su-28 days - Dec 24: Mo-Fr 09:00-16:00,Sa 09:00-16:00'),
        // https://www.openstreetmap.org/node/542882513
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
    ], 1000 * 60 * 60 * 24 * 13, 0, false, nominatim_default, 'not only test');

// https://www.openstreetmap.org/node/844696052/history
test.addTest('Calculations based on month range', [
        ignored('Mo-Su 10:00-01:00; Sep 15+Sa-Oct Su[1],Oct 01-3: Mo-Su 07:30-03:00'),
    ], '2012-01-01 0:00', '2012-10-08 0:00', [
    ], 1000 * 60 * 60 * 24 * 13, 0, false, nominatim_default, 'not only test');
// }}}

// error tolerance {{{
test.addTest('Error tolerance: case and whitespace', [
        'Mo,Tu,We,Th 12:00-20:00; 14:00-16:00 off', // reference value for prettify
        '   monday,    Tu, wE,   TH    12:00 - 20:00  ; 14:00-16:00	Off  ',
        '   monday,    Tu, wE,   TH    12:00 - 20:00  ; Off 14:00-16:00	', // Warnings point to the wrong position for selector reorder.
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 14:00' ],
        [ '2012-10-01 16:00', '2012-10-01 20:00' ],
        [ '2012-10-02 12:00', '2012-10-02 14:00' ],
        [ '2012-10-02 16:00', '2012-10-02 20:00' ],
        [ '2012-10-03 12:00', '2012-10-03 14:00' ],
        [ '2012-10-03 16:00', '2012-10-03 20:00' ],
        [ '2012-10-04 12:00', '2012-10-04 14:00' ],
        [ '2012-10-04 16:00', '2012-10-04 20:00' ],
    ], 1000 * 60 * 60 * 6 * 4, 0, true, {}, 'not last test');

test.addTest('Error tolerance: weekdays, months in different languages', [
        'Mo,Tu,We,Th 12:00-20:00; 14:00-16:00 off', // reference value for prettify
        'mon, Dienstag, Mi, donnerstag 12:00-20:00; 14:00-16:00 off',
        'mon, Tuesday, wed, Thursday 12:00-20:00; 14:00-16:00 off',
        'mon., Tuesday, wed., Thursday. 12:00-20:00; 14:00-16:00 off',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 14:00' ],
        [ '2012-10-01 16:00', '2012-10-01 20:00' ],
        [ '2012-10-02 12:00', '2012-10-02 14:00' ],
        [ '2012-10-02 16:00', '2012-10-02 20:00' ],
        [ '2012-10-03 12:00', '2012-10-03 14:00' ],
        [ '2012-10-03 16:00', '2012-10-03 20:00' ],
        [ '2012-10-04 12:00', '2012-10-04 14:00' ],
        [ '2012-10-04 16:00', '2012-10-04 20:00' ],
    ], 1000 * 60 * 60 * 6 * 4, 0, true, {}, 'not last test');

test.addTest('Error tolerance: Full range', [
        'Mo-Su',       // reference value for prettify
        'Montag-Sonntag',
        'Montags bis sonntags',       // Do not use. Returns warning.
        'Montag-Sonntags',
        'monday-sunday',
        'daily',
        'everyday',
        'every day',
        'all days',
        'every day',
        '7days',
        '7j/7',
        '7/7',
        '7 days',
        '7 days a week',
        '7 days/week',
        'täglich',
        'week 01-53',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 0:00', '2012-10-08 0:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, true, nominatim_default, 'not only test');

test.addTest('Error tolerance: Full range', [
        '24/7',       // reference value for prettify
        'always',
        'always open',
        'nonstop',
        'nonstop geöffnet',
        'opening_hours=nonstop geöffnet',
        'opening_hours =nonstop geöffnet',
        'opening_hours 	 =nonstop geöffnet',
        'opening_hours = nonstop geöffnet',
        'Öffnungszeit nonstop geöffnet',
        'Öffnungszeit: nonstop geöffnet',
        'Öffnungszeiten nonstop geöffnet',
        'Öffnungszeiten: nonstop geöffnet',
        '24x7',
        'anytime',
        'all day',
        '24 hours 7 days a week',
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 0:00', '2012-10-08 0:00' ],
    ], 1000 * 60 * 60 * 24 * 7, 0, true, nominatim_default, 'not only test', { 'warnings_severity': 5 } );

// TODO: Needs code refactor to support this.
// test.addTest('Error tolerance: Split rule into two rules', [
//         'Mo-Su; Su off',
//         'Täglich außer sonntags',
//     ], '2014-01-01 0:00', '2014-01-10 0:00', [
//         [ '2014-01-01 00:00', '2014-01-05 00:00' ],
//         [ '2014-01-06 00:00', '2014-01-10 00:00' ],
//     ], 1000 * 60 * 60 * 24 * 8, 0, true, {}, 'not only test');
// }}}

// values which should return a warning {{{
test.addTest('Extensions: missing time range separators', [
        'Mo 12:00-14:00 16:00-18:00 20:00-22:00', // returns a warning
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 12:00', '2012-10-01 14:00' ],
        [ '2012-10-01 16:00', '2012-10-01 18:00' ],
        [ '2012-10-01 20:00', '2012-10-01 22:00' ],
    ], 1000 * 60 * 60 * 6, 0, true);

test.addTest('Time intervals (not specified/documented use of colon, please avoid this)', [
        '00:00-24:00; Mo 15:00-16:00 off',  // prettified value
        '00:00-24:00; Mo: 15:00-16:00 off', // The colon between weekday and time range is ignored. This is used in OSM.
    ], '2012-10-01 0:00', '2012-10-08 0:00', [
        [ '2012-10-01 00:00', '2012-10-01 15:00' ],
        [ '2012-10-01 16:00', '2012-10-08 00:00' ],
    ], 1000 * 60 * 60 * (24 * 6 + 23), 0, true, {}, 'not last test');

test.addShouldWarn('Value not ideal (probably wrong). Should throw a warning.', [
        // 'Mo[2] - 6 days', // considered as "correct"
        'Mo[2] - 0 days' + value_suffix, // pointless, use "Mo[2]" instead
        'Mo&Th' + value_suffix,
        'Mon' + value_suffix,
        '8-18' + value_suffix,
        '12.00-14:00' + value_suffix,
        '24/7; 12:00-14:00 off' + value_suffix, // see README
        '2013-2015/1' + value_suffix,
        '2013,2015,2050-2053,2055/2,2020-2029/3,2060-2065/1 Jan 01' + value_suffix,
        'Mo: 15:00-16:00 off' + value_suffix, // The colon between weekday and time range is ignored. This is used in OSM.
        'Mo-Do 8:30-20:00 Fr 8:29-18:00' + value_suffix,
        'Mo 12:00-14:00 16:00-18:00 20:00-22:00' + value_suffix,
        'Mo-So 08:00-22:00' + value_suffix,
        'Mo Tu Fr' + value_suffix,
        // Same selector used more than one time {{{
        ignored('Mo,Mo' + value_suffix_to_disable_time_not_used),
        ignored('Mo,Sa,Mo' + value_suffix_to_disable_time_not_used),
        ignored('Jan,Jan' + value_suffix_to_disable_time_not_used),
        ignored('Jan,Sep,Jan' + value_suffix_to_disable_time_not_used),
        // }}}
        'Jan Dec' + value_suffix,
        'Jan 01-22/1' + value_suffix, // period
        // https://en.wikipedia.org/wiki/International_variation_in_quotation_marks
        '"testing" "second comment"' + value_suffix, // ": valid in opening_hours syntax
        '\'testing\'' + value_suffix,
        '„testing"' + value_suffix,   // Testing for development
        '„testing“' + value_suffix,   // valid German quote
        '“testing”' + value_suffix,   // valid English (and others) quote
        '«testing»' + value_suffix,   // https://en.wikipedia.org/wiki/Guillemet
        '「testing」' + value_suffix, // valid Japanese quote
        '『testing』' + value_suffix, // valid Japanese quote
        '‚testing‘' + value_suffix,
        '‘testing‘' + value_suffix,
        '’testing’' + value_suffix,
        // '（testing）' + value_suffix, // Implemented but not enabled because this replacement goes a bit to far.
        'Jan 12:00-13:00 Mo 15:00-16:00' + value_suffix,
        'sunrise-(sunset-00:00)' + value_suffix,
        // 'easter + 353 days' + value_suffix, // Does throw an error, but at runtime when the problem occurs respectively with the call of getWarnings().
        'Jun 02-20/1' + value_suffix,  // period is one
        '2014-2020/1' + value_suffix, // period is one
        '2014/1' + value_suffix,      // period is one
        'Mo-Sa 11:00-21:00 Su off' + value_suffix, // https://www.openstreetmap.org/way/228339826
        // 'Mo-Sa 11:00-21:00 Su,PH off' + value_suffix, // https://www.openstreetmap.org/way/228339826
        '10:00am-12:00am,1:00pm-8:00pm' + value_suffix,
        '12:00-14:00 оff' + value_suffix, // Russian o
        'Sa 2200' + value_suffix, // Year (currently very unlikely but following the syntax specification it is a year) or wrong time?
        // Values are the test cases from 'selector order' tests. {{{
        'Feb week 06',
        '00:00-24:00 week 06 Feb',
        'week 06 00:00-24:00 Feb',
        'Mo-Su week 06 Feb 00:00-24:00',
        '00:00-24:00 Mo-Su week 06 Feb',
        '00:00-24:00 week 06 Mo-Su Feb',
        'Mo-Su 00:00-24:00 week 06 Feb',
        '2012 00:00-24:00 week 06 Feb',
        '00:00-24:00 2012 week 06 Feb',
        'week 06 Feb 2012-2014',
        // }}}
        /* No time selector used. {{{ */
        /* This test is currently only made for rules which evaluate to open.
         */
        '2012 Jan-Feb' + value_suffix,
        '2012 Jan-Feb open' + value_suffix,
        /* }}} */
        '12:00-14:00 ""' + value_suffix, // Empty comment.
        ' ; open' + value_suffix,
        '; open' + value_suffix,
        ';;; open' + value_suffix,
        'open' + value_suffix + ';',
        'open' + value_suffix + ' ||',
        // 'open' + value_suffix + ',', // Might be possible that there is
        // something missing. "," is not only used as
        // <additional_rule_separator>  …
        // 'Mo 12:00-14:00 und nach Vereinbarung' // Not easily correctable
        // because of the way error tolerance is implemented.
        'We 12:00-18:00,',
        'Fr 22:00-04:00; Sa 21:00-04:00',
        'Su 22:00-04:00; Mo 21:00-04:00',
        'Th 22:00-04:00, Fr 22:00-04:00; Sa 21:00-04:00',
        'We 22:00-04:00, Fr 22:00-04:00; Sa 21:00-04:00, Mo 21:00-04:00',
        'Mo-Su 09:00-01:00; PH 08:00-02:00',
        '2015 Mo-Su 09:00-01:00; PH 08:00-02:00',
        '2015 Mo 09:00-01:00; PH Tu 08:00-02:00',
        'Mo-Su 09:00-01:00; 2014 PH 08:00-02:00',
        'Mo-Fr 10:00-20:00, We off',
        '11:30-14:30;17:30-23:00'
    ], nominatim_default, 'not only test');

test.addShouldWarn('Value not ideal (probably wrong). Should throw a warning. warnings_severity: 5', [
        'Mo-Fr 08:00-16:00',
    ], nominatim_default, 'not only test', { 'warnings_severity': 5 });

test.addShouldWarn('Value not ideal (probably wrong). Should throw a warning. warnings_severity: 5, "tag_key": "opening_hours"', [
        'Mo-Fr 08:00-16:00',
    ], nominatim_default, 'not only test', { 'warnings_severity': 5, 'tag_key': 'opening_hours' });
// }}}

// values which should fail during parsing {{{
test.addShouldFail('Incorrect syntax which should throw an error', [
        // stupid tests {{{
        'sdasdlasdj a3reaw', // Test for the test framework. This test should pass :) (passes when the value can not be parsed)
        '', // empty string
        ' ', // empty string
        "\n", // newline
        ';', // only rule delimiter
        '||', // only rule delimiter
        // '12:00-14:00 ||',
        // }}}
        'Mo[2] - 7 days' + value_suffix,
        ':week 02-54 00:00-24:00' + value_suffix,
        ':::week 02-54 00:00-24:00' + value_suffix,
        'week :2-54 00:00-24:00' + value_suffix,
        'week week',
        'week week 05',
        'week 00',
        'week 54',
        'week 01-54',
        'week 00-54',
        'week 40-30',
        'week 30-40/1',
        'week 30-40/27',
        'week week 00:00-24:00' + value_suffix,
        'week 02-53 00:00-24:00:' + value_suffix,
        'week 02-53 00:00-24:00:::' + value_suffix,
        'week 02-53 00::00-24:00' + value_suffix,
        'week 02-52/2 We, week 01-53/2 Sa 0:00-24:00' + value_suffix, // See definition of fallback rules in the README.md: *additional rules*
        '(sunrise+01:00-sunset' + value_suffix,
        '(sunrise+01::)-sunset' + value_suffix,
        '(sunrise)-sunset' + value_suffix,
        '(' + value_suffix,
        'sunrise-(' + value_suffix,
        'sunrise-sunset,(' + value_suffix,
        'dusk;dawn' + value_suffix,
        'dusk' + value_suffix,
        '27:00-29:00' + value_suffix,
        '14:/' + value_suffix,
        '14:00/' + value_suffix,
        '14:00-/' + value_suffix,
        '14:00-16:00,.' + value_suffix,
        '11' + value_suffix,
        '11am' + value_suffix,
        '14:00-16:00,11:00' + value_suffix,
        // '14:00-16:00,', // is ok
        '21:00-22:60' + value_suffix,
        '21:60-22:59' + value_suffix,
        'Sa[1.' + value_suffix,
        'Sa[1,0,3]' + value_suffix,
        'Sa[1,3-6]' + value_suffix,
        'Sa[1,3-.]' + value_suffix,
        'Sa[1,3,.]' + value_suffix,
        'PH + 2 day' + value_suffix, // Normally moving PH one day is everything you will need. Handling more than one move day would be harder to implement correctly.
        'Su-PH' + value_suffix,      // not accepted syntax
        '2012, Jan' + value_suffix,
        'easter + 370 days' + value_suffix,
        'easter - 2 days - 2012 easter + 2 days: open "Easter Monday"' + value_suffix,
        '2012 easter - 2 days - easter + 2 days: open "Easter Monday"' + value_suffix,
        // 'easter + 198 days', // Does throw an error, but at runtime when the problem occurs.
        'Jan,,,Dec' + value_suffix,
        'Mo,,Th' + value_suffix,
        '12:00-15:00/60' + value_suffix,
        '12:00-15:00/1:00' + value_suffix,
        '12:00-15:00/1:' + value_suffix,
        'Jun 00-Aug 23' + value_suffix, // out of range
        'Feb 30-Aug 02' + value_suffix, // out of range
        'Jun 02-Aug 42' + value_suffix, // out of range
        'Jun 02-Aug 32' + value_suffix, // out of range
        'Jun 02-32' + value_suffix,     // out of range
        'Jun 32-34' + value_suffix,    // out of range
        'Jun 02-32/2' + value_suffix,   // out of range
        'Jun 32' + value_suffix,       // out of range
        'Jun 30-24' + value_suffix,    // reverse
        'Jun 02-20/0' + value_suffix,   // period is zero
        '2014-2020/0' + value_suffix,  // period is zero
        '2014/0' + value_suffix,       // period is zero
        '2014-' + value_suffix,
        '2014-2014' + value_suffix,
        '2014-2012' + value_suffix,
        '26:00-27:00' + value_suffix,
        '23:00-55:00' + value_suffix,
        '23:59-48:01' + value_suffix,
        '25am-26pm' + value_suffix,
        '24am-26pm' + value_suffix,
        '23am-49pm' + value_suffix,
        '10:am - 8:pm' + value_suffix,
        '25pm-26am' + value_suffix,
        'Tu 23:59-48:00+' + value_suffix, // Does not make much sense. Should be written in another way.
        '12:00' + value_suffix,
        '„testing„' + value_suffix,   // Garbage, no valid quotes what so ever.
        '‚testing‚' + value_suffix,   // Garbage, no valid quotes what so ever.
        '»testing«' + value_suffix,   // Garbage, no valid quotes what so ever.
        '」testing「' + value_suffix, // Garbage, no valid quotes what so ever.
        '』testing『' + value_suffix, // Garbage, no valid quotes what so ever.
        '』testing「' + value_suffix, // Garbage, no valid quotes what so ever.
        '』testing«' + value_suffix,  // Garbage, no valid quotes what so ever.
        '』testing"' + value_suffix,  // Garbage, no valid quotes what so ever. There is a second comment in value_suffix so they get combined.
        '"testing«' + value_suffix,   // Garbage, no valid quotes what so ever.
        ' || open' + value_suffix,
        '|| open' + value_suffix,
        'PH, Aug-Sep 00:00-24:00' + value_suffix,
        'We off, Mo,Tu,Th-Su,PH, Jun-Aug We 11:00-14:00,17:00+' + value_suffix,
        'We, Aug Mo' + value_suffix,
        '2014, Aug Mo' + value_suffix,
        'week 05, Aug Mo' + value_suffix,
        'Jun 02-5, week 05 00:00-24:00' + value_suffix,
        'Jan 00' + value_suffix,
        'Jan 32' + value_suffix,
        'Feb 30' + value_suffix,
        'Mar 32' + value_suffix,
        'Apr 31' + value_suffix,
        'Mai 32' + value_suffix,
        'Jun 31' + value_suffix,
        'Jul 32' + value_suffix,
        'Aug 32' + value_suffix,
        'Sep 31' + value_suffix,
        'Oct 32' + value_suffix,
        'Nov 31' + value_suffix,
        'Dec 32' + value_suffix,
        'We 12:00-18:00,,,,,,' + value_suffix,
    ], nominatim_default, 'not last test');

test.addShouldFail('Missing information (e.g. country or holidays not known to opening_hours.js)', [
        'PH', // country is not specified
        'SH', // country is not specified
    ]);

test.addShouldFail('opening_hours.js is in the wrong mode.', [
        'Mo sunrise,sunset', // only in mode 1 or 2, default is 0
        'Mo sunrise-(sunrise+01:00)/60', // only in mode 1 or 2, default is 0
    ], nominatim_default, 'not last test');

test.addShouldFail('opening_hours.js is in the wrong mode.', [
        'Mo 12:00-14:00', // only in mode 0 or 2
    ], nominatim_default, 'not last test', 1);

test.addShouldFail('Time range starts outside of the current day for mode === 1.', [
        'Mo-Fr 13:00,15:00,17:45,19:00,24:00; Sa 13:00,24:00; Su 10:00,18:00',
        'Mo-Fr 15:00,117:00; Sa 11:00',
        'Mo-Fr 08:00,24:00',
        'Mo-Fr 07:00,15:00,24.00; Sa-Su 24:00',
        'Mo-Fr 07:00,24.00,15:00; Sa-Su 24:00',
    ], nominatim_default, 'not last test', 1);

test.addShouldFail('Time range does not continue as expected for mode === 1.', [
        '7.00-',
        ' mar-nov 12:30-',
        ' mar-nov 12:30-' + value_suffix,
    ], nominatim_default, 'not last test', 1);

test.addShouldFail('Time range does not continue as expected for mode === 2.', [
        '7.00-',
        '11:30:14:00',
        ' mar-nov 12:30-',
        ' mar-nov 12:30-' + value_suffix,
        '(' + value_suffix,
        'sunrise-(' + value_suffix,
        'sunrise-sunset,(' + value_suffix,
    ], nominatim_default, 'not last test', 2);

test.addShouldFail('PH with non-existing address.', [
        'Mo-Fr 10:00-20:00; PH off',
    ], nominatim_no_valid_address, 'not only test');

test.addShouldFail('SH with non-existing address.', [
        'Mo-Fr 10:00-20:00; SH off',
    ], nominatim_no_valid_address, 'not only test');

// Appeared in real_test … {{{
for (var mode = 0; mode <= 2; mode++) {
    test.addShouldFail('Trying to trigger "Missing minutes in time range after" for mode === ' + mode + '.', [
        'Mon-Sun 14-',
        '8:am',
        '8:am; open',
    ], nominatim_default, 'not last test', mode);
}

for (var mode = 0; mode <= 2; mode++) {
    test.addShouldFail('Trying to trigger "Missing time separator in time range after" for mode === ' + mode + '.', [
        'Su 7:30,10;00,22:00',
        'Su 7:30,10?00,22:00', // '?' gets replaced. Not fully supported … FIXME
        'Su 7:30,10i00,22:00',
    ], nominatim_default, 'not last test', mode);
}
// }}}

// }}}

/* Wrong constructor call, e.g bad parameters {{{ */

test.addShouldFail('Wrong constructor call should throw an error: nominatim_data: string', [
        1,
    ], {}, 'not only test');

test.addShouldFail('Wrong constructor call should throw an error: nominatim_data: string', [
        'Mo-Fr 08:00-16:00',
    ], "I am string!", 'not only test');

test.addShouldFail('Wrong constructor call should throw an error: "string"', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', 'test for failure');

test.addShouldFail('Wrong constructor call should throw an error: warnings_severity: [ 4 ]', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'warnings_severity': [ 4 ] });

test.addShouldFail('Wrong constructor call should throw an error: warnings_severity: -1', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'warnings_severity': -1 });

test.addShouldFail('Wrong constructor call should throw an error: warnings_severity: 4.5', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'warnings_severity': 4.5 });

test.addShouldFail('Wrong constructor call should throw an error: warnings_severity: 8', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'warnings_severity': 8 });

test.addShouldFail('Wrong constructor call should throw an error: mode: [ 1 ]', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'mode': [ 1 ] });

test.addShouldFail('Wrong constructor call should throw an error: mode: -1', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'mode': -1 });

test.addShouldFail('Wrong constructor call should throw an error: mode: 1.5', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'mode': 1.5 });

test.addShouldFail('Wrong constructor call should throw an error: mode: 4', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'mode': 4 });

test.addShouldFail('Wrong constructor call should throw an error: tag_key: [ "lit" ]', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'tag_key': [ 'lit' ] });

test.addShouldFail('Wrong constructor call should throw an error: map_value: [ "lit" ]', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'map_value': [ 'lit' ] });

test.addShouldFail('Wrong constructor call should throw an error: map_value, no tag_key', [
        value_perfectly_valid[0],
    ], nominatim_default, 'not only test', { 'map_value': true, });

/* }}} */

// check if matching rule was evaluated correctly {{{
test.addCompMatchingRule('Compare result from getMatchingRule()', [
        '10:00-16:00',
        '10:00-16:00;',
        '08:00-10:00; 10:00-16:00;',
        '"testing"; 08:00-10:00 open, 10:00-16:00; Mo 10:00-16:00',
    ], '2012-01-01 13:00',
    '10:00-16:00', {}, 'not only test');

test.addCompMatchingRule('Compare result from getMatchingRule()', [
        'Mo 11:00-14:30 "specific unknown for this time" || "general unknown"',
        'Mo 11:00-14:30 "specific unknown for this time"|| "general unknown"',
    ], '2013-10-07 13:00',
    'Mo 11:00-14:30 "specific unknown for this time"', {}, 'n only test');

test.addCompMatchingRule('Compare result from getMatchingRule()', [
        'Mo 11:00-14:30 "specific unknown for this time" || "general unknown"',
        'Mo 11:00-14:30 "specific unknown for this time" ||"general unknown" ',
    ], '2012-01-01 09:00',
    '"general unknown"', {}, 'n last test');

test.addCompMatchingRule('Compare result from getMatchingRule()', [
        'Fr 08:00-12:00, Fr 12:00-16:00 open "Notfallsprechstunde"',
        'Fr 08:00-12:00 || Fr 12:00-16:00 open "Notfallsprechstunde"', // should mean the same
    ], '2013-12-20 09:00',
    'Fr 08:00-12:00', {}, 'n last test');

test.addCompMatchingRule('Compare result from getMatchingRule()', [
        'Fr 08:00-12:00, Fr 12:00-16:00 open "Notfallsprechstunde"',
        'Fr 08:00-12:00 || Fr 12:00-16:00 open "Notfallsprechstunde"', // should mean the same
    ], '2013-12-20 13:00',
    'Fr 12:00-16:00 open "Notfallsprechstunde"', {}, 'n last test');
// }}}

/* PrettifyValue {{{ */
test.addPrettifyValue('Compare prettifyValue', [
        'Mo',
        'Mon',
        'Montag',
    ], 'all', 'Mo', 'not last test');

test.addPrettifyValue('Compare prettifyValue', [
        'Tu',
        'Tue',
        'Dienstag',
    ], 'de', 'Di');

test.addPrettifyValue('Compare prettifyValue', [
        'PH',
    ], 'de', 'Feiertags');

test.addPrettifyValue('Compare prettifyValue', [
        'märz',
        'mär',
    ], 'de', 'Mär');

test.addPrettifyValue('Compare prettifyValue', [
        'SH',
    ], 'de', 'Schulferien');

test.addPrettifyValue('Compare prettifyValue', [
        'We 12:00-18:00;',
        'We 12:00-18:00; ',
    ], 'all', 'We 12:00-18:00', 'not only test');

test.addPrettifyValue('Compare prettifyValue', [
        'We 12:00-18:00,',
    ], 'all', 'We 12:00-18:00', 'not last test');

test.addPrettifyValue('Compare prettifyValue', [
        'Mo: 7-18; ',
    ], 'all', 'Mo 07:00-18:00', 'not last test');
/* }}} */

/* isEqualTo {{{ */
test.addEqualTo('Test isEqualTo function: Full range', [
        'open',
        '24/7',
        '2000-2100',
        'Mo-Su',
        '02:00-26:00',
        '02:00-02:00',
    ], '24/7', [ true ]);

test.addEqualTo('Test isEqualTo function', [
        'Mo 10:00-20:00; We-Fr 10:00-20:00',
        'We-Fr 10:00-20:00; Mo 10:00-20:00',
        'closed; Mo 10:00-20:00; We-Fr 10:00-20:00',
        'open; closed; Mo 10:00-20:00; We-Fr 10:00-20:00',
        'Jan 01: open; closed; Mo 10:00-20:00; We-Fr 10:00-20:00',
    ], 'Mo-Fr 10:00-20:00; Tu off', [ true ]);

test.addEqualTo('Test isEqualTo function', [
        'Mo',
    ], 'Su', [ false,
        {
            "matching_rule": 0,
            "matching_rule_other": 0,
            "deviation_for_time": {
                "1445205600000": [
                    "getDate",
                ],
            },
        }
    ]);

test.addEqualTo('Test isEqualTo function', [
        'Mo 10:00-20:00; We-Fr 10:00-20:01',
    ], 'Mo-Fr 10:00-20:00; Tu off', [ false,
        {
            "deviation_for_time": {
                "1445450460000": [
                    "getDate",
                ],
            },
        }
    ]);

test.addEqualTo('Test isEqualTo function', [
        'Mo 10:00-20:00; We-Fr 10:00-19:59',
    ], 'Mo-Fr 10:00-20:00; Tu off', [ false,
        {
            "deviation_for_time": {
                "1445450340000": [
                    "getDate",
                ],
            },
        }
    ]);

test.addEqualTo('Test isEqualTo function', [
        'closed; Sa unknown "comment"',
    ], 'Sa open', [ false,
        {
            "matching_rule": 1,
            "matching_rule_other": 0,
            "deviation_for_time": {
                "1445637600000": [
                    "getState",
                    "getUnknown",
                    "getComment",
                ],
            },
        }
    ]);
/* }}} */

process.exit(test.run() ? 0 : 1);

//======================================================================
// Test framework {{{
//======================================================================
function opening_hours_test() {
    this.show_passing_tests = true;
    // False: Can also be achieved by running make test 1>/dev/null which redirects stdout to /dev/null.
    // Note that these two variants are not quite the same.
    this.show_error_warnings = true; // Enable this if you want to see what errors and warnings the library reports.
    // By default enabled to see changes in the warning message. Now that the
    // log is version controlled it is easy to keep track of changes.
    this.tests = [];
    this.tests_should_fail = [];
    this.tests_should_warn = [];
    this.tests_comp_matching_rule = [];
    this.tests_prettify_value = [];
    this.tests_equal_to = [];

    this.extensive_testing = false;
    // If set to true, to run extensive tests.
    // This mainly finds bugs in selector code but is slow.

    this.last = false; // If set to true, no more tests are added to the testing queue.
    // This might be useful for testing to avoid to comment tests out and something like that …

    this.runSingleTestShouldFail = function(test_data_object) { /* {{{ */
        var name           = test_data_object[0],
            value          = test_data_object[1],
            nominatim_data = test_data_object[2],
            oh_mode        = test_data_object[3];
        try {
            // Since they should fail anyway we can give them the nominatim_default.
            oh = new opening_hours(value, nominatim_data, oh_mode);

            crashed = false;
        } catch (err) {
            crashed = err;
        }

        var passed = false;
        var str = '"' + name + '" for "'
            + (typeof value === 'string'
                ? value.replace('\n', '*newline*')
                : value
            )
            + '": ';
        if (crashed) {
            str += 'PASSED'.passed;
            passed = true;

            if (this.show_passing_tests) {
                console.log(str);
                if (this.show_error_warnings)
                    console.info(crashed + '\n');
            }
        } else {
            str += 'FAILED'.failed;
            console.warn(str);
        }

        return crashed;
    }; /* }}} */

    this.runSingleTestShouldThrowWarning = function(test_data_object) { /* {{{ */
        var name           = test_data_object[0],
            value          = test_data_object[1],
            nominatim_data = test_data_object[2],
            oh_mode        = test_data_object[3];
        var ignored = typeof value !== 'string';
        if (ignored) {
            this.ignored.push(value);
            ignored = value[1];
            value   = value[0];
        }

        var warnings, oh;
        try {
            oh = new opening_hours(value, nominatim_data, oh_mode);

            warnings = oh.getWarnings();
            crashed = false;
        } catch (err) {
            crashed = err;
        }

        var passed = false;
        var str = '"' + name + '" for "'
            + (typeof value === 'string'
                ? value.replace('\n', '*newline*')
                : value
            )
            + '": ';
        if (!crashed && warnings.length > 0) {
            str += 'PASSED'.passed;
            passed = true;
            if (this.show_passing_tests) {
                console.log(str);
                this.print_warnings(warnings);
            }
            passed = true;
        } else if (ignored) {
            str += 'IGNORED'.ignored + ', reason: ' + ignored;
            passed = true;
            console.log(str);
            this.print_warnings(warnings);
        } else {
            str += 'FAILED'.failed;
            console.warn(str);
            this.print_warnings(warnings);
            if (this.show_error_warnings)
                console.error(crashed + '\n');
        }
        return passed;
    }; /* }}} */

    this.runSingleTest = function(test_data_object) { /* {{{ */
        var name                = test_data_object[0],
            value               = test_data_object[1],
            first_value         = test_data_object[2],
            from                = test_data_object[3],
            to                  = test_data_object[4],
            expected_intervals  = test_data_object[5],
            expected_durations  = test_data_object[6],
            expected_weekstable = test_data_object[7],
            nominatim_data      = test_data_object[8],
            oh_mode             = test_data_object[9];

        // fix from and to dates
        if (!(from instanceof Date)) {
            from = new Date(from);
        }
        if (!(to instanceof Date)) {
            to = new Date(to);
        }

        var ignored = typeof value !== 'string';
        if (ignored) {
            this.ignored.push(value);
            ignored = value[1];
            value   = value[0];
        }

        var oh, intervals, durations, weekstable, prettified, intervals_ok, duration_ok, weekstable_ok, prettify_ok, crashed = true;

        var warnings;
        try {
            oh = new opening_hours(value, nominatim_data, oh_mode);

            warnings = oh.getWarnings();

            intervals = oh.getOpenIntervals(from, to);
            durations = oh.getOpenDuration(from, to);
            weekstable = oh.isWeekStable();

            var prettifyValue_argument_hash = {};
            prettified = oh.prettifyValue(prettifyValue_argument_hash);

            intervals_ok  = typeof expected_intervals  === 'undefined' || intervals.length === expected_intervals.length;
            duration_ok   = (typeof expected_durations[0] === 'undefined' || durations[0] === expected_durations[0])
                && (typeof expected_durations[1] === 'undefined' || durations[1] === expected_durations[1]);
            weekstable_ok = typeof expected_weekstable === 'undefined' || weekstable === expected_weekstable;
            prettify_ok   = typeof prettified === 'undefined' || prettified === value || prettified === first_value;

            crashed = false;
        } catch (err) {
            crashed = err;
        }

        for (var interval = 0; interval < expected_intervals.length; interval++) {

            var expected_from = new Date(expected_intervals[interval][0]);
            var expected_to   = new Date(expected_intervals[interval][1]);

            if (intervals_ok) {
                if (   intervals[interval][0].getTime() !== expected_from.getTime()
                    || intervals[interval][1].getTime() !== expected_to.getTime()
                    || (typeof expected_intervals[interval][2] !== 'boolean' // unknown state boolean
                        && intervals[interval][2] !== expected_intervals[interval][2])
                    || (typeof intervals[interval][3] === 'string'
                        && intervals[interval][3] !== expected_intervals[interval][3])
                    ) {

                    intervals_ok = false;
                }
            }

            if (this.extensive_testing && !crashed) {

                var oh = new opening_hours(value, nominatim_data, oh_mode);

                for (var move_date = expected_from; move_date.getTime() < expected_to.getTime(); move_date.setHours(move_date.getHours() + 1)) {
                    var is_open = oh.getState(move_date);
                    var unknown = oh.getUnknown(move_date);

                    if (!is_open ||
                            (
                            typeof expected_intervals[interval][2] === 'boolean' // unknown state boolean
                            && unknown !== expected_intervals[interval][2]
                            )
                        ) {

                        console.error("Error for '" + value + "' at " + move_date + ".");

                    }
                }
            }

        }

        var passed = false;
        var str = '"' + name + '" for "' + value + '": ';
        var failed = false;
        if (intervals_ok
                && duration_ok
                && (prettify_ok   || ignored === 'prettifyValue')
                && (weekstable_ok || ignored === 'check for week stable not implemented')) { // replace 'check for week stable not implemented'.
            str += 'PASSED'.passed;
            if (ignored) {
                if (ignored === 'check for week stable not implemented') {
                    str += ', ' + 'except'.ignored + ' weekstable which is ignored for now';
                } else if (ignored === 'prettifyValue'){
                    str += ', ' + 'except'.ignored + ' prettifyValue';
                    if (prettify_ok)
                        str += ' Ignored but passes!';
                } else {
                    str += ', ' + 'also ignored, please unignore since the test passes!'.ignored;
                    if (weekstable_ok)
                        str += ' Ignored but passes!';
                }
            }
            passed = true;
            // if (this.show_passing_tests) {
                console.log(str);
            // }
            this.print_warnings(warnings);
        } else if (ignored && (
                    ignored !== 'prettifyValue'
                ||  ignored === 'check for week stable not implemented'
                )
            ) {

            str += 'IGNORED'.ignored + ', reason: ' + ignored;
            console.warn(str);
            passed = true;
        } else if (crashed) {
            str += 'CRASHED'.crashed + ', reason: ' + crashed;
            console.error(str);
        } else {
            str += 'FAILED'.failed;
            if (!duration_ok)
                str += ', bad duration(s): ' + durations + ', expected ' + expected_durations;
            if (!intervals_ok)
                str += ', bad intervals: \n' + intervalsToString(intervals) + '\nexpected:\n' + intervalsToString(expected_intervals);
            if (!weekstable_ok)
                str += ', bad weekstable flag: ' + weekstable + ', expected ' + expected_weekstable;
            if (!prettify_ok)
                str += ', bad prettified value: "' + prettified + '", expected either value or "' + first_value + '"';
            failed = true;

            console.warn(str);
            this.print_warnings(warnings);
        }

        return passed;
    }; /* }}} */

    this.runSingleTestCompMatchingRule = function(test_data_object) { /* {{{ */
        var name           = test_data_object[0],
            value          = test_data_object[1],
            point_in_time  = test_data_object[2],
            expected_matching_rule  = test_data_object[3],
            nominatim_data = test_data_object[4];
        var matching_rule, matching_rule_ok;
        try {
            // since they should fail anyway we can give them the nominatim_default
            oh = new opening_hours(value, nominatim_data);
            it = oh.getIterator(new Date(point_in_time));

            matching_rule = oh.prettifyValue({ rule_index: it.getMatchingRule() });
            matching_rule_ok = matching_rule === expected_matching_rule;

        var passed = false;

            crashed = false;
        } catch (err) {
            crashed = err;
        }

        var str = '"' + name + '" for "' + value.replace('\n', '*newline*') + '": ';
        if (!crashed && matching_rule_ok) {
            str += 'PASSED'.passed;
            passed = true;

            if (this.show_passing_tests)
                console.log(str);
        } else if (crashed) {
            str += 'CRASHED'.crashed + ', reason: ' + crashed;
            console.error(str);
        } else {
            str += 'FAILED'.failed + ' for time ' + new Date(point_in_time);
            str += ', bad matching rule: "' + matching_rule + '", expected "' + expected_matching_rule + '"';
            console.warn(str);
        }

        return passed;
    }; /* }}} */

    this.runSingleTestPrettifyValue = function(test_data_object) { /* {{{ */
        var name = test_data_object[0],
            value = test_data_object[1],
            prettify_locale = test_data_object[2],
            expected_prettified_value = test_data_object[3];
        var prettify_value_ok;
        try {
            oh = new opening_hours(value, nominatim_default);

            prettified_value = oh.prettifyValue({ 'conf': { 'locale': prettify_locale } });
            prettify_value_ok = prettified_value === expected_prettified_value;

            var passed = false;

            crashed = false;
        } catch (err) {
            crashed = err;
        }

        var str = '"' + name + '" for "' + value.replace('\n', '*newline*') + '": ';
        if (!crashed && prettify_value_ok) {
            str += 'PASSED'.passed;
            passed = true;

            if (this.show_passing_tests)
                console.log(str);
        } else if (crashed) {
            str += 'CRASHED'.crashed + ', reason: ' + crashed;
            console.error(str);
        } else {
            str += 'FAILED'.failed + ', prettify value: "' + prettified_value + '", expected "' + expected_prettified_value + '"';
            console.warn(str);
        }

        return passed;
    }; /* }}} */

    this.runSingleTestEqualTo = function(test_data_object) { /* {{{ */
        var name = test_data_object[0],
            first_value = test_data_object[1],
            second_value = test_data_object[2],
            expected_result = test_data_object[3];

        var passed = false;
        var crashed = true;
        var actual_result;
        try {
            first_oh = new opening_hours(first_value, nominatim_default);
            second_oh = new opening_hours(second_value, nominatim_default);

            actual_result = first_oh.isEqualTo(second_oh, new Date('Sat Oct 17 2015 18:20:29 GMT+0200 (CEST)'));

            crashed = false;
        } catch (err) {
            crashed = err;
        }
        // console.log(JSON.stringify(actual_result, null, '    '));

        var str = '"' + name + '" for "' + first_value.replace('\n', '*newline*') + '": ';
        if (!crashed && JSON.stringify(expected_result) === JSON.stringify(actual_result)) {
            str += 'PASSED'.passed;
            passed = true;

            if (this.show_passing_tests)
                console.log(str);
        } else if (crashed) {
            str += 'CRASHED'.crashed + ', reason: ' + crashed;
            console.error(str);
        } else {
            str += 'FAILED'.failed + ', result: "' + JSON.stringify(actual_result, null, '    ') + '", expected "' + expected_result + '"';
            console.warn(str);
        }

        return passed;
    }; /* }}} */

    // }}}

    // run all tests (public function) {{{
    this.run = function() {
        var tests_length = this.tests.length +
            this.tests_should_fail.length +
            this.tests_should_warn.length +
            this.tests_comp_matching_rule.length +
            this.tests_prettify_value.length +
            this.tests_equal_to.length;
        var success   = 0;
        this.ignored  = [];
        for (var test = 0; test < this.tests.length; test++) {
            if (this.runSingleTest(this.tests[test]))
                success++;
        }
        for (var test = 0; test < this.tests_should_warn.length; test++) {
            if (this.runSingleTestShouldThrowWarning(this.tests_should_warn[test]))
                success++;
        }
        for (var test = 0; test < this.tests_should_fail.length; test++) {
            if (this.runSingleTestShouldFail(this.tests_should_fail[test]))
                success++;
        }
        for (var test = 0; test < this.tests_comp_matching_rule.length; test++) {
            if (this.runSingleTestCompMatchingRule(this.tests_comp_matching_rule[test]))
                success++;
        }
        for (var test = 0; test < this.tests_prettify_value.length; test++) {
            if (this.runSingleTestPrettifyValue(this.tests_prettify_value[test]))
                success++;
        }
        for (var test = 0; test < this.tests_equal_to.length; test++) {
            if (this.runSingleTestEqualTo(this.tests_equal_to[test]))
                success++;
        }

        console.warn(success + '/' + tests_length + ' tests passed. ' + (tests_length - success) + " did not pass.");
        if (this.ignored.length) {
            console.warn(this.ignored.length + ' test' + (this.ignored.length === 1 ? ' was' : 's where') + ' (partly) ignored, sorted by commonness:');
            var ignored_categories = [];
            for (var i = 0; i < this.ignored.length; i++) {
                var value   = this.ignored[i][0];
                var reason  = this.ignored[i][1];
                if (typeof ignored_categories[reason] !== 'number') {
                    ignored_categories[reason] = 1;
                } else {
                    ignored_categories[reason]++;
                }
            }

            var sorted_ignores = [];
            for (var key in ignored_categories)
                sorted_ignores.push([key, ignored_categories[key]]);

            sorted_ignores.sort(function(a, b) {
                return a[1] > b[1] ? -1 : (a[1] < b[1] ? 1 : 0);
            });
            for (var i = 0; i < sorted_ignores.length; i++) {
                var reason = sorted_ignores[i][0];
                var count  = sorted_ignores[i][1];
                switch (reason) {
                    case 'prettifyValue':
                        reason += " (most of the cases this is used to test if values with selectors in wrong order or wrong symbols (error tolerance) are evaluated correctly)";
                        break;
                }
                console.warn(sprintf('* %2s: %s', count, reason));
            }
        }

        return success === tests_length;
    };
    // }}}

    // add normal test queue {{{
    this.addTest = function(name, values, from, to, expected_intervals, expected_duration, expected_unknown_duration, expected_weekstable, nominatim_data, last, oh_mode) {

        if (this.last === true) return;
        this.handle_only_test(last);

        oh_mode = get_oh_mode_parameter(oh_mode);

        for (var expected_interval = 0; expected_interval < expected_intervals.length; expected_interval++) {
            // Set default of unknown to false. If you expect something else you
            // will have to specify it.
            if (typeof expected_intervals[expected_interval][2] === 'undefined')
                expected_intervals[expected_interval][2] = false;
        }
        if (typeof values === 'string')
            tests.push([name, values, values, from, to, expected_intervals,
                [ expected_duration, expected_unknown_duration ], expected_weekstable, nominatim_data, oh_mode]);
        else
            for (var value_ind = 0; value_ind < values.length; value_ind++)
                this.tests.push([name, values[value_ind], values[0], from, to, expected_intervals,
                    [ expected_duration, expected_unknown_duration ], expected_weekstable, nominatim_data, oh_mode]);
    };
    // }}}

    // add test which should fail {{{
    this.addShouldFail = function(name, values, nominatim_data, last, oh_mode) {
        if (this.last === true)  {
            return;
        }
        this.handle_only_test(last);

        oh_mode = get_oh_mode_parameter(oh_mode);

        if (typeof values === 'string')
            this.tests_should_fail.push([name, values, nominatim_data, oh_mode]);
        else
            for (var value_ind = 0; value_ind < values.length; value_ind++)
                this.tests_should_fail.push([name, values[value_ind], nominatim_data, oh_mode]);
    };
    // }}}

    // add test which should give a warning {{{
    this.addShouldWarn = function(name, values, nominatim_data, last, oh_mode) {
        if (this.last === true)  {
            return;
        }
        this.handle_only_test(last);

        oh_mode = get_oh_mode_parameter(oh_mode);

        if (typeof values === 'string')
            this.tests_should_warn.push([name, values, nominatim_data, oh_mode]);
        else
            for (var value_ind = 0; value_ind < values.length; value_ind++)
                this.tests_should_warn.push([name, values[value_ind], nominatim_data, oh_mode]);
    };
    // }}}

    // add test to check if the matching rule is evaluated correctly {{{
    this.addCompMatchingRule = function(name, values, date, matching_rule, nominatim_data, last) {
        if (this.last === true)  {
            return;
        }
        this.handle_only_test(last);

        if (typeof values === 'string')
            this.tests_comp_matching_rule.push([name, values, date, matching_rule, nominatim_data]);
        else
            for (var value_ind = 0; value_ind < values.length; value_ind++)
                this.tests_comp_matching_rule.push([name, values[value_ind], date, matching_rule, nominatim_data]);
    };
    // }}}

    // add test to check if prettifyValue feature works {{{
    this.addPrettifyValue = function(name, values, only_test_for_locale, expected_prettified_value, last) {
        if (this.last === true)  {
            return;
        }
        this.handle_only_test(last);

        if (
                typeof only_test_for_locale === 'string'
                && (argv.locale === only_test_for_locale || only_test_for_locale === 'all')
           ) {

            if (typeof values === 'string') {
                this.tests_prettify_value.push([name, values, only_test_for_locale, expected_prettified_value]);
            } else {
                for (var value_ind = 0; value_ind < values.length; value_ind++)
                    this.tests_prettify_value.push([name, values[value_ind], only_test_for_locale, expected_prettified_value]);
            }
        }
    };
    // }}}

    // add test to check if two oh values are equal {{{
    this.addEqualTo = function(name, first_values, second_value, expected_result, last) {
        if (this.last === true)  {
            return;
        }
        this.handle_only_test(last);

        if (typeof first_values === 'string') {
            this.tests_equal_to.push([name, first_values, second_value, expected_result]);
        } else if (typeof first_values === 'object'){
            for (var value_ind = 0; value_ind < first_values.length; value_ind++)
                this.tests_equal_to.push([name, first_values[value_ind], second_value, expected_result]);
        } else {
            throw "first_values must be either a string or a object!";
        }
    };
    // }}}

    // helpers {{{
    function intervalsToString(intervals) { /* {{{ */
        var res = '';

        if (intervals.length === 0)
            return '(none)';

        for (var interval = 0; interval < intervals.length; interval++) {
            var item = intervals[interval];
            var from = formatDate(item[0]);
            var to   = formatDate(item[1]);
            var comment = typeof item[3] !== 'undefined' ? '\'' + item[3] + '\'' : item[3];

            if (interval !== 0)
                res += '\n';

            res += '[ \'' + from + '\', \'' + to + '\', ' + item[2] + ', ' + comment + ' ],';
        }

        return res;
    }
    // }}}

    function get_oh_mode_parameter(oh_mode) {
        if (typeof oh_mode === 'number') {
            oh_mode = {
                'mode': oh_mode,
                'locale': argv.locale,
            };
        } else if (oh_mode === 'test for failure') {
            // Do nothing.
        } else if (typeof oh_mode !== 'object') {
            oh_mode = {
                'locale': argv.locale,
            };
        } else if (typeof oh_mode['locale'] !== 'string'){
            oh_mode['locale'] = argv.locale;
        }
        return oh_mode;
    }
    function formatDate(date) { /* {{{ */
        if (typeof date === 'string')
            return date;

        var res = '';
        res += date.getFullYear() + '-';
        res += ('0' + (date.getMonth() + 1)).substr(-2, 2) + '-';
        res += ('0' + date.getDate()).substr(-2, 2) + ' ';
        res += ('0' + date.getHours()).substr(-2, 2) + ':';
        res += ('0' + date.getMinutes()).substr(-2, 2);
        return res;
    }
    // }}}

    this.handle_only_test = function(last) { /* {{{ */
        if (last === 'only test') {
            this.tests = [];
            this.tests_should_fail = [];
            this.tests_should_warn = [];
            this.tests_comp_matching_rule = [];
            this.tests_prettify_value = [];
        }
        if (last === 'only test' || last === 'last test') this.last = true;
    };
    // }}}

    this.print_warnings = function(warnings) { /* {{{ */
        if (this.show_error_warnings && typeof warnings === 'object' && warnings.length > 0) {
            console.info('With ' + 'warnings'.warn + ':\n\t*' + warnings.join('\n\t*'));
        }
    };
    // }}}
}
// }}}

// Public helper functions. {{{
function ignored(value, reason) {
    if (typeof reason === 'undefined')
        reason = 'not implemented yet';
    return [ value, reason ];
}
// }}}
// vim: set ts=4 sw=4 tw=78 et :
