#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const fs = require('node:fs');
const readline = require('node:readline');
const { styleText } = require('node:util');

const page_width = 20;

const args = process.argv.splice(2);
let json_file = args[0];
if (typeof json_file === 'undefined') {
    json_file = 'export.opening_hours:kitchen.json';
    console.info(styleText('blue', `No JSON file specified; using default: ${json_file}`));
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

        /** @type {RegExp | false} */
        let user_re = false;
        try {
            user_re = new RegExp('^(.*?)(' + line + ')(.*)$', 'i');
        } catch (err) {
            console.log('Your regular expression did not compile: ' + err);
        }

        if (user_re !== false) {
            /** @type {[string, number, string[]][]} */
            let matched = [];
            for (let i = 0; i < parsedJson.data.length; i++) {
                const res = parsedJson.data[i].value.match(user_re);
                if (res)
                    matched.push([parsedJson.data[i].value, parsedJson.data[i].count, res]);
            }

            if (matched.length === 0) {
                console.log('Did not match any value with regular expression: ' + line)
            } else {
                matched = matched.sort(Comparator);
                let total_in_use = 0;
                for (let i = 0; i < matched.length; i++) {
                    total_in_use += matched[i][1];
                }

                console.log(styleText('green', 'Matched ') + matched.length + ' different value' + (matched.length === 1 ? '' : 's')
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

/**
 * Print the matched tag values.
 * @param {[string, number, string[]][]} matched - Values, usage counts, and regex matches.
 */
function print_values(matched) {
    for (let i = 0; i < matched.length; i++) {
        const count = matched[i][1];
        const res   = matched[i][2];
        console.log('Matched (count: '+ count +'): ' + res[1] + styleText('blue', res[2]) + res[3]);
    }
}

/**
 * Sort matches by usage count in descending order.
 * @param {[string, number, string[]]} left - First match to compare.
 * @param {[string, number, string[]]} right - Second match to compare.
 * @returns {number} Sort order for the two matches.
 */
function Comparator(left, right) {
    if (left[1] > right[1]) return -1;
    if (left[1] < right[1]) return 1;
    return 0;
}
