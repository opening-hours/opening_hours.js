#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import readline from 'node:readline';
import { styleText } from 'node:util';

const pageWidth = 20;

const args = process.argv.splice(2);
let jsonFile = args[0];
if (typeof jsonFile === 'undefined') {
    jsonFile = 'export.opening_hours:kitchen.json';
    console.info(styleText('blue', `No JSON file specified; using default: ${jsonFile}`));
}

if (!fs.existsSync(jsonFile)) {
    console.error(styleText('red', `JSON file not found: ${jsonFile}`));
    process.exit(1);
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

fs.readFile(jsonFile, 'utf8', function (error, jsonText) {
    if (error) {
        console.log('Error: ' + error);
        return;
    }
    const tagInfoExport = JSON.parse(jsonText);

    rl.setPrompt('regex search> ');
    rl.prompt();

    rl.on('line', function(regexInput) {
        if (regexInput.match(/^\s*$/)) {
            process.exit(0);
        }

        /** @type {RegExp | false} */
        let userRegex = false;
        try {
            userRegex = new RegExp('^(.*?)(' + regexInput + ')(.*)$', 'i');
        } catch (error) {
            console.log('Your regular expression did not compile: ' + error);
        }

        if (userRegex !== false) {
            /** @type {[string, number, string[]][]} */
            let matches = [];
            for (let index = 0; index < tagInfoExport.data.length; index++) {
                const matchResult = tagInfoExport.data[index].value.match(userRegex);
                if (matchResult)
                    matches.push([tagInfoExport.data[index].value, tagInfoExport.data[index].count, matchResult]);
            }

            if (matches.length === 0) {
                console.log('Did not match any value with regular expression: ' + regexInput)
            } else {
                matches = matches.sort(compareByUsageCount);
                let totalInUse = 0;
                for (let index = 0; index < matches.length; index++) {
                    totalInUse += matches[index][1];
                }

                console.log(styleText('green', 'Matched ') + matches.length + ' different value' + (matches.length === 1 ? '' : 's')
                    + (matches.length !== 1 ? ', total in use ' + totalInUse : '') + '.');
                if (matches.length < pageWidth) {
                    printMatches(matches);
                } else {
                    rl.question('Print values? ', function(answer) {
                        if (answer.match(/^y/i))
                            printMatches(matches);
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
 * @param {[string, number, string[]][]} matches - Values, usage counts, and regex matches.
 */
function printMatches(matches) {
    for (let index = 0; index < matches.length; index++) {
        const count = matches[index][1];
        const matchResult = matches[index][2];
        console.log('Matched (count: '+ count +'): ' + matchResult[1] + styleText('blue', matchResult[2]) + matchResult[3]);
    }
}

/**
 * Sort matches by usage count in descending order.
 * @param {[string, number, string[]]} left - First match to compare.
 * @param {[string, number, string[]]} right - Second match to compare.
 * @returns {number} Sort order for the two matches.
 */
function compareByUsageCount(left, right) {
    if (left[1] > right[1]) return -1;
    if (left[1] < right[1]) return 1;
    return 0;
}
