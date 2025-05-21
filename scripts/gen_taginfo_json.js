#!/usr/bin/env node
/* Info, license and author {{{
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015 Robin Schneider <ypid@riseup.net>
 *
 * Written for: https://wiki.openstreetmap.org/wiki/Taginfo/Projects
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
var fs = require('node:fs');
/* }}} */

/* Parameter handling {{{ */
var optimist = require('optimist')
    .usage('Usage: $0 -')
    .describe('h', 'Display the usage')
    .describe('k', 'File containing the list of supported keys')
    .demand('k')
    .describe('i', 'Template taginfo.json which is used to merge with the list of keys')
    .alias('h', 'help')
    .alias('k', 'key-file')
    .alias('i', 'template-file');

var argv = optimist.argv;

if (argv.help) {
    optimist.showHelp();
    process.exit(0);
}
/* }}} */

keys = [];
fs.readFileSync(argv['key-file'], 'utf8').split('\n').forEach(function (osm_tag_key) {
    if (osm_tag_key.match(new RegExp('^[^#]'))) {
        keys.push(osm_tag_key)
    }
});

if (typeof argv['template-file'] === 'string') {
    var template_file = JSON.parse(fs.readFileSync(argv['template-file'], 'utf8'));
    var key_description;
    if (typeof template_file.tags === 'object' && typeof template_file.tags[0] === 'string') {
        key_description = template_file.tags[0];
        template_file.tags = [];
    }
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var key_entry = {
            'key': key,
        };
        if (typeof key_description === 'string') {
            key_entry['description'] = key_description;
        }
        template_file.tags.push(key_entry);
    }
    console.log(JSON.stringify(template_file, null, '    '));
} else {
    console.log(keys);
}
