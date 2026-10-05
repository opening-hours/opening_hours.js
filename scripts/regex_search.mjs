#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2015 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import fs from 'node:fs';
import readline from 'node:readline';
import { styleText } from 'node:util';

/**
 * @typedef {object} Match
 * @property {number} count - Usage count of the value.
 * @property {string[]} matchResult - Regex groups: before, match, after.
 */

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
            /** @type {Match[]} */
            let matches = [];
            for (const entry of tagInfoExport.data) {
                const matchResult = entry.value.match(userRegex);
                if (matchResult)
                    matches.push({ count: entry.count, matchResult });
            }

            if (matches.length === 0) {
                console.log('Did not match any value with regular expression: ' + regexInput)
            } else {
                matches = matches.sort(compareByUsageCount);
                let totalInUse = 0;
                for (const match of matches) {
                    totalInUse += match.count;
                }

                console.log(styleText('green', 'Matched ') + matches.length + ' different value' + (matches.length === 1 ? '' : 's')
                    + (matches.length !== 1 ? ', total in use ' + totalInUse : '') + '.');
                if (matches.length < pageWidth) {
                    printMatches(matches);
                } else {
                    rl.question('Print values? ', function(answer) {
                        if (answer.match(/^y/i))
                            printMatches(matches);
                        console.log();
                        rl.prompt();
                    });
                    return;
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
 * @param {Match[]} matches - Matches to print.
 */
function printMatches(matches) {
    for (const { count, matchResult } of matches) {
        console.log('Matched (count: '+ count +'): ' + matchResult[1] + styleText('blue', matchResult[2]) + matchResult[3]);
    }
}

/**
 * Sort matches by usage count in descending order.
 * @param {Match} left - First match to compare.
 * @param {Match} right - Second match to compare.
 * @returns {number} Sort order for the two matches.
 */
function compareByUsageCount(left, right) {
    return right.count - left.count;
}
