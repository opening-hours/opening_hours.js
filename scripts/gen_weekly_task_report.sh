#!/bin/bash
## @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
## @author Copyright (C) 2015-2025 Robin Schneider <ypid@riseup.net>
##
## This program is free software: you can redistribute it and/or modify
## it under the terms of the GNU Affero General Public License as
## published by the Free Software Foundation, version 3 of the
## License.
##
## This program is distributed in the hope that it will be useful,
## but WITHOUT ANY WARRANTY; without even the implied warranty of
## MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
## GNU Affero General Public License for more details.
##
## You should have received a copy of the GNU Affero General Public License
## along with this program.  If not, see <https://www.gnu.org/licenses/>.

## Sorry for writing this in bash … ;)

first_row=1

for file in export♡opening_hours♡* real_test.opening_hours.stats.csv; do
    if [[ "$file" == 'real_test.opening_hours.stats.csv' ]]; then
        first_pattern='2015-04-19'
        last_pattern='2015-05-03'
        name="Weltweit"
    else
        first_pattern='2015-04-19T15:00:00'
        last_pattern='2015-05-03T00:00:00'
        name="$file"
        name=${name%♡stats.csv}
        if echo "$name" | grep -q 'export♡opening_hours♡int_name♡'; then
            name=${name#export♡opening_hours♡int_name♡}
        else
            name=${name#export♡opening_hours♡ISO3166-2♡DE-}
            name="`grep "ISO3166-2=.*$name" ../ohs/js/own.stats.js | sed "s/[^:]\+: 'DE: \([^']\+\).*/\1, Deutschland/"`"
        fi
    fi

    egrep "($first_pattern|$last_pattern)" "$file" | while read line; do
        total_number="`echo $line | cut '-d,' -f 2 | sed 's/,//;s/\s//g;'`"
        parsed_number="`echo $line | cut '-d,' -f 4 | sed 's/,//;s/\s//g;'`"
        if [[ "$first_row" == "0" ]]; then
            total_number_diff=$(( $total_number - $last_total_number ))
            parsed_number_diff=$(( $parsed_number - $last_parsed_number ))
            parsed_percentage="`echo "scale=4; ($parsed_number / $total_number * 100) - ($last_parsed_number / $last_total_number * 100)" | bc | sed 's/^\(-\?\)\./\10./;s/\([^.]*\)\.\([0-9]\{2\}\).*/\1,\2/;s/^\([^-]\)/+\1/'`"
            first_row=2
            echo "$name | +$total_number_diff ($last_total_number → $total_number) | +$parsed_number_diff, $parsed_percentage % ($last_parsed_number → $parsed_number)"
        else
            first_row=0
        fi
        last_total_number="$total_number"
        last_parsed_number="$parsed_number"
    done
done
