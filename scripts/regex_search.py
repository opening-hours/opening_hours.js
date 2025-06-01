#!/usr/bin/env python

# SPDX-FileCopyrightText: © 2014 Robin Schneider <ypid@riseup.net>
#
# SPDX-License-Identifier: LGPL-3.0-only

"""Search over OSM opening_hours like values and see if they can be parsed."""

# modules {{{
import logging
import sys
import json
import re
import codecs
from termcolor import colored
import urllib
import readline
import pyopening_hours
# }}}

class OpeningHoursRegexSearch: # {{{
    def __init__(self):
        self._page_width = 20
        self.setOSMTagKey('opening_hours') # default

    def setOSMTagKey(self, key):
        """Set the OSM key. This is important for the URL generation.

        :param key: OSM key e.g. "opening_hours"
        :returns: None
        """

        self.overpass_turbo_url = 'https://overpass-turbo.eu/' \
                + '?template=key-value&key=%s&value=' % key
        self.taginfo_url = 'https://taginfo.openstreetmap.org/tags/%s=' % key
        self.josm_remote_url = 'http://localhost:8111/import?url=%s' % (
                self._url_encode(u'https://overpass-api.de/api/xapi_meta?*[%s=' % key)
            )

    # helper functions for the user of the package {{{
    def load_json_file(self, json_file): # {{{
        """Load JSON file and return it as python dictionary.

        :param json_file: Path to Taginfo JSON file.
        :returns: Python object of JSON data.
        """

        try:
            json_data = codecs.open(json_file, 'r', 'UTF-8')
        except IOError as detail:
            raise SystemExit('File %s is not readable: %s' %
                    (json_file, detail[1]))

        decoded_json = json.load(json_data)
        json_data.close()
        return decoded_json
    # }}}
    # }}}

    # helper functions {{{
    def _url_encode(self, url): # {{{
        """Encode URL to make it save for usage in HTTP get requests.

        :param url: URL to encode.
        :returns: Encoded URL.
        """
        return urllib.quote(url.encode('utf-8'), safe='~()*!.\'')
    # }}}
    # }}}

    def run_interpreter(self, taginfo_tag_export, do_not_load_values_again): # {{{
        """Start the interactive shell for the user."""

        page_width = self._page_width

        while True:
            # get user regular expression {{{
            user_regex = raw_input('regex search> ')
            if re.match(r'\s*\Z', user_regex):
                logging.info('Send SIGINT signal if you want to exit.')
                continue

            try:
                user_reg = re.compile('(?P<pre>.*?)(?P<match>'+user_regex+')(?P<post>.*)',
                        re.IGNORECASE)
            except re.error, err:
                logging.error('Your regular expression did not compile: %s', err)
                continue
            # }}}

            matched = []
            for taginfo_hash in taginfo_tag_export['data']:
                res = user_reg.match(taginfo_hash['value'])
                if res:
                    matched.append([taginfo_hash, res])

            if len(matched) == 0:
                logging.info('Did not match any value with regular expression: %s', user_regex)
            else:
                matched = sorted(matched, key=lambda k: k[0]['count'], reverse=True) # show the values which appear often first
                do_parse_all_values_before = True
                if (len(matched) > 10000
                        and not re.match(r'^y', raw_input('Try to parse each value (probably takes a second)? '), re.I)):
                    do_parse_all_values_before = False
                total_in_use = 0
                passed_diff_values = 0
                total_passed = 0
                for taginfo_hash, res in matched:
                    total_in_use += taginfo_hash['count']
                    if do_parse_all_values_before:
                        try:
                            oh_result = pyopening_hours.OpeningHours(taginfo_hash['value'])
                        except ImportError as e:
                            raise e
                        except pyopening_hours.ParseException:
                            continue
                        passed_diff_values += 1
                        total_passed += taginfo_hash['count']

                if do_parse_all_values_before:
                    passed_diff_values = ' (%d passed)' % passed_diff_values
                    total_passed       = ' (%d passed)' % total_passed
                logging.info('Matched %d%s different values%s%s' % (
                            len(matched), passed_diff_values,
                            ('' if len(matched) == 1 else 's'),
                            (', total in use: %d%s' % (total_in_use, total_passed) if len(matched) != 1 else '')
                        )
                    )
                print_values = 'y'
                # if len(matched) > page_width:
                ## you may want to use the "taginfo" flag
                print_values = raw_input('Print values'
                        ' (passable answers: "yes" for all values, "passed"'
                        ' or "failed", additionally "overpass", "taginfo", "err", "josm", "no_repeat")? ')

                if re.match(r'(y|p|f)', print_values, re.I):
                    printed_values = 1
                    print_all    = re.match(r'\s*y',      print_values, re.I)
                    print_passed = re.match(r'\s*p',      print_values, re.I)
                    show_error_m = re.search(r'\berr',    print_values, re.I)
                    josm_load    = re.search(r'\bjosm\b', print_values, re.I)
                    josm_load_not_repeat = re.search(r'\bno_repeat\b', print_values, re.I)
                    if show_error_m:
                        page_width /= 2
                    for taginfo_hash, res in matched:
                        if printed_values % page_width == 0:
                            printed_values += 1
                            # If nothing is printed in this iteration, the
                            # question would pop up again. The variable
                            # "printed_values" does already not match the real
                            # printed lines so who cares …
                            if not re.match(r'^(y.*|)$', raw_input('Continue? '), re.I):
                                break

                        oh_ok = True
                        try:
                            oh_result = pyopening_hours.OpeningHours(taginfo_hash['value'])
                        except ImportError as e:
                            raise e
                        except pyopening_hours.ParseException as e:
                            oh_ok = False

                        if oh_ok:
                            oh_loc_needed = ', loc needed' if oh_result._neededNominatiomJson() else ''
                            oh_warnings   = ', warnings'   if oh_result.getWarnings() else ''
                            passed_failed = {
                                    'open'    : colored('Passed', 'green'),
                                    'unknown' : colored('Passed', 'magenta'),
                                    'close'   : colored('Passed', 'blue'),
                                }[oh_result.getStateString()]
                        else:
                            passed_failed = colored('Failed', 'red')
                            oh_loc_needed = ''
                            oh_warnings   = ''
                        if print_all or (print_passed != None) == oh_ok:
                            overpass_url = ''
                            tag_url  = ''
                            if re.search(r'\bover(pass)?\b', print_values, re.I):
                                overpass_url = 'overpass: %s%s' % (
                                        self.overpass_turbo_url,
                                        self._url_encode(taginfo_hash['value'])
                                    )
                            if re.search(r'tag', print_values, re.I):
                                tag_url = 'taginfo: %s%s' % (
                                        self.taginfo_url,
                                        self._url_encode(taginfo_hash['value'])
                                    )
                            logging.info('Matched (count: %d, status: %s%s%s): %s%s%s' % (
                                    taginfo_hash['count'],
                                    passed_failed, oh_loc_needed, oh_warnings,
                                    res.group('pre'),
                                    colored(res.group('match'), 'blue'),
                                    res.group('post')
                                )
                            )
                            if show_error_m and not oh_ok:
                                for warning in oh_result.getWarnings():
                                    logging.info('  * %s' % warning)
                            if overpass_url and tag_url:
                                logging.info(', '.join([overpass_url, tag_url]))
                            elif overpass_url:
                                logging.info(overpass_url)
                            elif tag_url:
                                logging.info(tag_url)
                            if josm_load:
                                if (josm_load_not_repeat and taginfo_hash['value'] not in do_not_load_values_again) or josm_load_not_repeat != True:
                                    if josm_load_not_repeat:
                                        do_not_load_values_again.append(taginfo_hash['value'])
                                    josm_remote_url_for_value = '%s%s' % (self.josm_remote_url, self._url_encode('%s%s' % (taginfo_hash['value'], u']')))
                                    try:
                                        josm_return = urllib.urlopen(josm_remote_url_for_value)
                                        if josm_return.getcode() != 200:
                                            logging.error('JOSM Remote HTTP request resulted in status code %d', josm_return.getcode())
                                    except:
                                        logging.error('Connection to JOSM could not be established.'
                                                + ' Please start JOSM and enable remote control.')
                            printed_values += 1
    # }}}
# }}}

# main {{{
def main():
    """Run as command line program."""

    # Only load these modules if is called as script {{{
    import signal
    # }}}

    # logging {{{
    logging.basicConfig(
        format='%(levelname)s: %(message)s',
        level=logging.DEBUG,
        # level=logging.INFO,
        )
    # }}}

    # signal handler {{{
    def signal_handler(signal, frame):
        """Called on SIGINT to exit gracefully."""

        print ''
        logging.info(u'Bye')
        sys.exit(0)
    signal.signal(signal.SIGINT, signal_handler)
    # }}}

    # interpreter input history and predefined regular expressions {{{
    HISTFILE = '/tmp/opening_hours.regex.history'
    try:
        readline.read_history_file(HISTFILE)
    except IOError:
        pass
    import atexit
    atexit.register(readline.write_history_file, HISTFILE)

    class Completer:
        """Completer for tab completion."""
        def __init__(self, words):
            self.words = words
            self.prefix = None
        def complete(self, prefix, index):
            if prefix != self.prefix:
                # we have a new prefix!
                # find all words that start with this prefix
                self.matching_words = [
                    w for w in self.words if w.startswith(prefix)
                    ]
                self.prefix = prefix
            try:
                return self.matching_words[index]
            except IndexError:
                return None

    # a set of more or less interesting words {{{
    STD_REGEX = ('PH', 'SH', '.',
        r'\((?:dusk|sun|dawn)[^)]*(?:-|\+)[^)]*\)',
        r'(?:dusk|sun|dawn).*hours',
        r'(?:dusk|sun|dawn|\d{1,2}[.:]\d{2})\+',
        r'\d\s*-\s*(mo|tu|we|th|fr|sa|su)\\b',
        r'-\s*\d{1,2}[:.]\d{2}\s*?\+',
        r'[^0-9a-z ?.]\s*?-\s*?\d{1,2}:\d{2}\s*?[^+]',
        # Start time not specified (not in the syntax specification).
        # Opposite to open end.
        # https://wiki.openstreetmap.org/wiki/Proposed_features/opening_hours_open_until#Notes
        #
        r'\d{1,2}:\d{2}\s*?-\s*?\d{1,2}:\d{2}\s*?\+', # 12:00-14:00+
        # https://wiki.openstreetmap.org/wiki/Proposed_features/opening_hours_open_end_fixed_time_extension#Summary
        #
        r'^(?:(?:[0-1][0-9]|2[0-4])(?:[1-5][0-9]|0[0-9])\s*-?\s*){2}$', # match 1700-2300
        )
    # }}}

    readline.parse_and_bind("tab: complete")
    readline.set_completer(Completer(STD_REGEX).complete)
    # }}}

    regex_search = OpeningHoursRegexSearch()

    # open Taginfo JSON file {{{
    json_file = 'export.opening_hours.json'
    if len(sys.argv) > 1:
        json_file = sys.argv[1]
    taginfo_tag_export = regex_search.load_json_file(json_file)
    logging.info(u'Loaded %s.' % json_file)
    # }}}

    key = ''
    try:
        key = re.match(r'\Aexport\.(.*)\.json', json_file).group(1)
    except:
        sys.stderr.write('Did not match the key, URL will not work')

    regex_search.setOSMTagKey(key)

    with open('testing', 'r') as f:
        do_not_load_values_again = [line.rstrip('\n').decode('utf-8') for line in f]

    regex_search.run_interpreter(taginfo_tag_export, do_not_load_values_again)

    with open('testing', 'w') as f:
        for s in do_not_load_values_again:
            f.write(s.decode('utf-8') + '\n')

if __name__ == '__main__':
    main()
# }}}

# vim: set ts=8 sw=4 tw=0 foldlevel=0 foldmethod=marker et :
