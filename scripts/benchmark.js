#!/usr/bin/env node

/*
 * SPDX-FileCopyrightText: © 2012 Dmitry Marakasov
 * SPDX-FileCopyrightText: © 2014 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 *
 * This file is based on work under the following copyright and permission
 * notice:
 *
 *     Copyright (c) 2012 Dmitry Marakasov
 *     All rights reserved.
 *
 *     Redistribution and use in source and binary forms, with or without
 *     modification, are permitted provided that the following conditions are met:
 *
 *     1. Redistributions of source code must retain the above copyright notice, this
 *     list of conditions and the following disclaimer.
 *
 *     2. Redistributions in binary form must reproduce the above copyright notice,
 *     this list of conditions and the following disclaimer in the documentation
 *     and/or other materials provided with the distribution.
 *
 *     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *     ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *     WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *     DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 *     FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 *     DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 *     SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 *     CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 *     OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 *     OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* Required modules {{{ */
var opening_hours_lib = process.argv[2];
if (typeof opening_hours_lib !== 'string') {
    opening_hours_lib = '../build/opening_hours.js';
}
var opening_hours = require(opening_hours_lib);
/* }}} */

var tests = 3;
var iterations = 2000;

// Pinned to this value:
// Does differ from the optimal value. See test.js: value_perfectly_valid
var test_value = 'Mo,Tu,Th,Fr 12:00-18:00; Sa 12:00-17:00; Th[3] off; Th[-1] off';

console.log('Construction:');
for (var t = 0; t < tests; t++) {
    var before = new Date();
    for (var i = 0; i < iterations; i++) {
        var oh = new opening_hours(test_value);
    }
    var delta = (new Date()).getTime() - before.getTime();

    console.log(iterations + ' iterations done in ' + delta + ' ms (' + (iterations/delta*1000).toFixed(2) + ' n/sec)');
}

iterations = 2000;

console.log('Checking:');
for (var t = 0; t < tests; t++) {
    var oh = new opening_hours(test_value);
    var before = new Date();
    for (var i = 0; i < iterations; i++) {
        oh.getOpenIntervals(new Date('2012-01-01 00:00'), new Date('2012-01-07 00:00'));
    }
    var delta = (new Date()).getTime() - before.getTime();

    console.log(iterations + ' iterations done in ' + delta + ' ms (' + (iterations/delta*1000).toFixed(2) + ' n/sec)');
}
