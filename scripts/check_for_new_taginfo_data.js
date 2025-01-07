#!/usr/bin/env node

/* Constant variables {{{ */
var taginfo_api_base_url = 'https://taginfo.openstreetmap.org/api/4/';
var exit_code_new = 0;
var exit_code_not_new = 1;

/* Parameter handling {{{ */
var optimist = require('optimist')
    .usage('Usage: $0')
    .describe('h', 'Display the usage')
    .describe('E', 'Specify the exit code in case there is no new data. The default value is ' + exit_code_not_new + '.')
    .alias('h', 'help')
    .alias('E', 'exit-code-not-new');

var argv = optimist.argv;
if (argv.help) {
    optimist.showHelp();
    process.exit(0);
}

if (typeof argv.E === 'number') {
    exit_code_not_new = argv.E;
} else if (typeof argv.E !== 'undefined') {
    optimist.showHelp();
    process.exit(0);
}
/* }}} */

/* }}} */

/* Required modules {{{ */
var https = require('node:https');
var fs   = require('node:fs');
/* }}} */

/* Helper functions {{{ */
function get_dump_creation_time_from_file(file) {
    try {
        var data = JSON.parse(fs.readFileSync(file, 'utf8'));
        for (var i = 0; i < data.length; i++) {
            if (data[i].name === 'Database') {
                return new Date(data[i].data_until);
            }
        }
    } catch (err) {
        return;
    }
}
/* }}} */

var local_dump_creation_time = get_dump_creation_time_from_file('taginfo_sources.json');

/* Download source file and compare {{{ */
var taginfo_api_url_source = taginfo_api_base_url + 'site/sources';
console.log('Loading file ' + taginfo_api_url_source + ' to check if new data is available.');
var file = fs.createWriteStream('taginfo_sources.json');
var request = https.get(taginfo_api_url_source, function(response) {
    response.pipe(file);

    response.on('error', function(err) {
        throw("Got error: " + err.message);
    });

    response.on('end', function() {
        var upstream_dump_creation_time = get_dump_creation_time_from_file('taginfo_sources.json');

        if (typeof local_dump_creation_time === 'object')
            console.log("Local taginfo data was generated on: " + local_dump_creation_time);

        if (typeof local_dump_creation_time === 'object'
                && local_dump_creation_time.getTime() === upstream_dump_creation_time.getTime()) {

                console.log("Not newer then local data.");
                process.exit(exit_code_not_new);
            } else {
                console.log("New data available …");
                console.log("Taginfo data was generated on: " + upstream_dump_creation_time.toISOString());
                process.exit(exit_code_new);
            }
    });
});
/* }}} */
