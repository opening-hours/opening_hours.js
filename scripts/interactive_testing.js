#!/usr/bin/env node

// SPDX-FileCopyrightText: © 2013 Robin Schneider <ypid@riseup.net>
//
// SPDX-License-Identifier: LGPL-3.0-only

var optimist = require('optimist')
    .usage('Usage: $0 [optional parameters] [server_listening_ports]')
    .describe('h', 'Display the usage')
    // .describe('v', 'Verbose output')
    .describe('f', 'File path to the opening_hours.js library file to run the tests against.')
    .describe('l', 'Locale for error/warning messages and prettified values.')
    .describe('L', 'Locale used for prettifyValue')
    .describe('V', 'opening_hours value. If present, interactive mode will be skipped.')
    .alias('h', 'help')
    // .alias('v', 'verbose')
    .alias('f', 'library-file')
    .alias('l', 'locale')
    .alias('L', 'prettify-locale')
    .alias('V', 'value')
    .default('f', '../build/opening_hours.js')
    .default('l', 'en')
    .default('L', 'en');

var argv = optimist.argv;

if (argv.help) {
    optimist.showHelp();
    process.exit(0);
}

var opening_hours = require('./' + argv['library-file']);
var readline      = require('node:readline');
var net           = require('node:net');

// used for sunrise, sunset and PH,SH
// https://nominatim.openstreetmap.org/reverse?format=json&lat=49.5487429714954&lon=9.81602098644987&zoom=18&addressdetails=1
var nominatimTestJSON = {"place_id":"44651229","licence":"Data \u00a9 OpenStreetMap contributors, ODbL 1.0. https:\/\/www.openstreetmap.org\/copyright","osm_type":"way","osm_id":"36248375","lat":"49.5400039","lon":"9.7937133","display_name":"K 2847, Lauda-K\u00f6nigshofen, Main-Tauber-Kreis, Regierungsbezirk Stuttgart, Baden-W\u00fcrttemberg, Germany, European Union","address":{"road":"K 2847","city":"Lauda-K\u00f6nigshofen","county":"Main-Tauber-Kreis","state_district":"Regierungsbezirk Stuttgart","state":"Baden-W\u00fcrttemberg","country":"Germany","country_code":"de","continent":"European Union"}};

function opening_hours_object(value) {
    var oh;
    var crashed = true;
    var needed_nominatim_json = false;
    var warnings = [];
    try {
        oh = new opening_hours(value, {}, { 'locale': argv.locale } );
        warnings = oh.getWarnings();
        if (typeof warnings !== 'object')
            console.error(warnings);
        // prettified = oh.prettifyValue();
        crashed = false;
    } catch (err) {
        try {
            oh = new opening_hours(value, nominatimTestJSON, { 'locale': argv.locale });
            crashed = false;
            needed_nominatim_json = true;
        } catch (err) {
            crashed = err;
        }
    }

    var result = { 'needed_nominatim_json': needed_nominatim_json };
    if (crashed) {
        result.error      = true;
        result.eval_notes = crashed;
    } else {
        result.error         = false;
        result.eval_notes    = warnings;
        result.comment       = oh.getComment();
        result.state         = oh.getState();
        result.unknown       = oh.getUnknown();
        result.state_string  = oh.getStateString();
        try {
            result.next_change   = oh.getNextChange();
        } catch (err) {
            // This might throw an exception if there is no change.
        }
        result.rule_index    = oh.getMatchingRule();
        result.matching_rule = typeof result.rule_index === 'undefined'
            ? undefined
            : oh.prettifyValue({ 'rule_index': result.rule_index, conf: { 'locale': argv['prettify-locale'] } });
        result.prettified    = oh.prettifyValue({ conf: { 'locale': argv['prettify-locale'] } });
        result.week_stable   = oh.isWeekStable();
    }
    return result;
}

var servers = [];
for (var i = 0; i < argv._.length; i++) {
    console.log('Starting to listen on "%s"', argv._[i]);
    servers[i] = net.createServer(function(socket) {
        console.log("connected");

        socket.on('data', function (data) {
            value = data.toString();
            console.log(value);
            result = opening_hours_object(value);
            socket.write(JSON.stringify(result, null, '\t'));
        });
    }).listen(argv._[i]);
}

if (typeof argv.value === 'string') {
    result = opening_hours_object(argv.value);
    console.log(JSON.stringify(result, null, '\t') + '\n');
} else {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on('line', function (value) {
        result = opening_hours_object(value);
        console.log(JSON.stringify(result, null, '\t') + '\n');

    }).on('close', function() {
        for (var i = 0; i < servers.length; i++) {
            servers[i].close();
        }
        console.log('\nBye');
        process.exit(0);
    });

    console.info('You can enter your opening_hours like value and hit enter to evaluate. The result handed to you is represented in JSON.');
    console.info('If you want to create a binding for another programing language you should use the unix socket interface which gives you full access to the API or use a native binding to NodeJS/JavaScript if one does exist.');
    // Also the stdin method breaks for certain values (e.g. newlines in values).
}
