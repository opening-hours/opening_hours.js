#!/usr/bin/env node
/* Info, license and author {{{
 * @license AGPLv3 <https://www.gnu.org/licenses/agpl-3.0.html>
 * @author Copyright (C) 2015 Robin Schneider <ypid@riseup.net>
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
 *
 * }}} */

const moment = require('moment');
const CountryLanguage = require('country-language');
const fs = require('node:fs');

/* https://stackoverflow.com/a/1961068/2239985 */
Array.prototype.getUnique = function(){
   const u = {}, a = [];
   for(let i = 0, l = this.length; i < l; ++i){
      if(Object.prototype.hasOwnProperty.call(u, this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}

function parseWeekdays(weekday_list_list, locale) {
    const correction_mapping = {};
    const list_of_used_correction_keys_for_this_locale = [];
    let weekday_list;

    for (let weekday_type_ind = 0, weekday_type_len = weekday_list_list.length; weekday_type_ind < weekday_type_len; weekday_type_ind++) {
        weekday_list = weekday_list_list[weekday_type_ind].map(function (value) { return value.toLowerCase() });

        for (let weekday_ind = 0, weekday_len = weekday_list.length; weekday_ind < weekday_len; weekday_ind++) {
            const weekday_name = weekday_list[weekday_ind].toLowerCase().replace(/\.$/, '');

            let list_of_keys = [ weekday_name ];

            switch (weekday_type_ind) {
               case 0: /* Long */
                  switch (locale) {
                     case 'de':
                     case 'en':
                        list_of_keys = [ weekday_name + 's?' ];
                        break;
                  }
                  break;
               case 1: /* Short */
                  switch (locale) {
                     case 'en':
                        list_of_keys = [ weekday_name + 's?' ];
                        break;
                  }
                  break;
               case 2: /* Min */
                  switch (locale) {
                     case 'en': /* Defined in default. */
                        list_of_keys = [];
                        break;
                  }
            }

            for (let key_ind = 0, key_list_len = list_of_keys.length; key_ind < key_list_len; key_ind++) {
               if (list_of_used_correction_keys.indexOf(list_of_keys[key_ind]) === -1) {

                  if (! locale.match(/^(?:de|en).*$/)) {
                     /* Reasons for excluding:
                      * - de, en: Defined manually.
                      */

                     correction_mapping[list_of_keys[key_ind]] = weekday_ind;
                  }
                  list_of_used_correction_keys.push(list_of_keys[key_ind]);
                  list_of_used_correction_keys_for_this_locale.push(list_of_keys[key_ind]);
               } else if (list_of_used_correction_keys_for_this_locale.indexOf(list_of_keys[key_ind]) === -1){
                  console.warn('Avoiding duplicate "' + list_of_keys[key_ind] + '" for language ' + getNativeLang(moment.locale()) + '.');
               }
            }
        }

    }
    if (Object.keys(correction_mapping).length) {
       const message = 'Please use the abbreviation "<ok>" for "<ko>" which is for example used in ' + getNativeLang(moment.locale());
       word_error_correction['weekday'][message] = correction_mapping;

       list_of_all_used_glyphs.push(weekday_list);
       // console.log(list_of_used_correction_keys_for_this_locale);
    }
}

// eslint-disable-next-line no-unused-vars
function getCharArray(list) {
    return list.join('').split('').getUnique().filter(function (value) {
      return ! value.match(/^[a-z]$/);
    });
}

function getNativeLang(lang_code) {
   const cl_object = CountryLanguage.getLanguage(lang_code.replace(/-.*/, ''));
   if (typeof cl_object === 'object') {
      return cl_object.nativeName[0] + ' (' + lang_code + ', ' + cl_object.name[0] + ')';
   } else {
      return lang_code;
   }
}

const locales_priority = [ 'en', 'en-au', 'en-ca', 'en-gb', 'de', 'de-at' ].reverse();
const list_of_used_correction_keys = [];
const list_of_all_used_glyphs = [ 'äößàáéøčěíúýřПнВсо' ];
const word_error_correction = { month: {}, weekday: {} };
const moment_locales = fs.readdirSync('./node_modules/moment/locale/').map(function (locale_file) { return locale_file.replace(/\.js$/, '') });
// let moment_locales = [ 'de', 'en', 'en-ca', 'en-gb', 'en-au' ];
// let moment_locales = [ 'me' ];

moment_locales.sort().sort(
   function (a, b) {
      return locales_priority.indexOf(b) - locales_priority.indexOf(a);
   }
);

for (let locale_ind = 0, len = moment_locales.length; locale_ind < len; locale_ind++) {
    const locale = moment_locales[locale_ind];

    console.log(locale);
    moment.locale(locale);
    parseWeekdays([ moment.weekdays(), moment.weekdaysShort(), moment.weekdaysMin() ], locale);

}


console.log(JSON.stringify(word_error_correction, null, '    '));
// console.log(getCharArray(list_of_all_used_glyphs));
// console.log(list_of_used_correction_keys);

// console.log(moment_locales)
