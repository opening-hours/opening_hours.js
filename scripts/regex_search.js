#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

var opening_hours = require('../build/opening_hours.js');
var fs = require('node:fs');
var readline = require('node:readline');
var colors = require('colors');

var page_width = 20;

var args = process.argv.splice(2);
var json_file = args[0];
if (typeof json_file === 'undefined') {
    // json_file = 'export.opening_hours.json';
    json_file = 'export.opening_hours:kitchen.json';
    // console.log('Please specify the exported JSON file form taginfo as parameter.');
    // return;
}

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

fs.readFile(json_file, 'utf8', function (err, json) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }
    var json = JSON.parse(json);

    rl.setPrompt('regex search> ');
    rl.prompt();

    rl.on('line', function(line) {
        if (line.match(/^\s*$/)) {
            process.exit(0);
        }

        var user_re_ok = false;
        try {
            var user_re = new RegExp('^(.*?)(' + line + ')(.*)$', 'i');
            user_re_ok = true;
        } catch (err) {
            console.log('Your regular expression did not compile: ' + err);
        }

        if (user_re_ok) {
            matched = [];
            for (var i = 0; i < json.data.length; i++) {
                var res = json.data[i].value.match(user_re);
                if (res)
                    matched.push([json.data[i].value, json.data[i].count, res]);
            }

            if (matched === 0) {
                console.log('Did not match any value with regular expression: ' + line)
            } else {
                matched = matched.sort(Comparator);
                var total_in_use = 0;
                for (var i = 0; i < matched.length; i++) {
                    total_in_use += matched[i][1];
                }

                console.log('Matched '.green + matched.length + ' different value' + (matched.length === 1 ? '' : 's')
                    + (matched.length !== 1 ? ', total in use ' + total_in_use : '') + '.');
                if (matched.length < page_width) {
                    print_values(matched);
                } else {
                    rl.question('Print values? ', function(answer) {
                        if (answer.match(/^y/i))
                            print_values(matched);
                        else
                            rl.prompt();
                    });
                }
            }
        }
        console.log();
        rl.prompt();
    }).on('close', function() {
        console.log('\n\nBye');
        process.exit(0);
    });
});

function print_values(matched) {
    for (var i = 0; i < matched.length; i++) {
        if (i !== 0 && i % page_width === 0) {
        }
        var value = matched[i][0];
        var count = matched[i][1];
        var res   = matched[i][2];
        console.log('Matched (count: '+ count +'): ' + res[1] + res[2].blue + res[3])
    }
}

// helper functions
function Comparator(a,b){
    if (a[1] > b[1]) return -1;
    if (a[1] < b[1]) return 1;
    return 0;
}
