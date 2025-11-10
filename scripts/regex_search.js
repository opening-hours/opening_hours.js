#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const fs = require('node:fs');
const readline = require('node:readline');

const page_width = 20;

const args = process.argv.splice(2);
let json_file = args[0];
if (typeof json_file === 'undefined') {
    // json_file = 'export.opening_hours.json';
    json_file = 'export.opening_hours:kitchen.json';
    // console.log('Please specify the exported JSON file form taginfo as parameter.');
    // return;
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

fs.readFile(json_file, 'utf8', function (err, json) {
    if (err) {
        console.log('Error: ' + err);
        return;
    }
    const parsedJson = JSON.parse(json);

    rl.setPrompt('regex search> ');
    rl.prompt();

    rl.on('line', function(line) {
        if (line.match(/^\s*$/)) {
            process.exit(0);
        }

        let user_re = false;
        try {
            user_re = new RegExp('^(.*?)(' + line + ')(.*)$', 'i');
        } catch (err) {
            console.log('Your regular expression did not compile: ' + err);
        }

        if (user_re !== false) {
            let matched = [];
            for (let i = 0; i < parsedJson.data.length; i++) {
                const res = parsedJson.data[i].value.match(user_re);
                if (res)
                    matched.push([parsedJson.data[i].value, parsedJson.data[i].count, res]);
            }

            if (matched === 0) {
                console.log('Did not match any value with regular expression: ' + line)
            } else {
                matched = matched.sort(Comparator);
                let total_in_use = 0;
                for (let i = 0; i < matched.length; i++) {
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
    for (let i = 0; i < matched.length; i++) {
        const count = matched[i][1];
        const res   = matched[i][2];
        console.log('Matched (count: '+ count +'): ' + res[1] + res[2].blue + res[3]);
    }
}

// helper functions
function Comparator(a,b){
    if (a[1] > b[1]) return -1;
    if (a[1] < b[1]) return 1;
    return 0;
}
