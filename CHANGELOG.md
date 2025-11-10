<!--
SPDX-FileCopyrightText: © 2016 Robin Schneider <ypid@riseup.net>

SPDX-License-Identifier: LGPL-3.0-only
-->

# Changelog

All notable changes to opening_hours.js will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and [human-readable changelog](https://keepachangelog.com/en/0.3.0/).

Note that most of the v2.X.Z releases have not been added to the changelog yet.

## Authors

- [AMDmi3] - Dmitry Marakasov (original author)
- [ypid] - Robin Schneider (author, maintainer)

## Contributors

- [putnik] - Sergey Leschina
- [Cactusbone] - Charly Koza
- [don-vip] - Vincent Privat
- [sesam] - Simon B.
- [NonnEmilia]
- [damjang]
- [jgpacker] - João G. Packer
- [openfirmware] - James Badger
- [burrbull] - Zgarbul Andrey
- [blorger] - Blaž Lorger
- [dmromanov] - Dmitrii Romanov
- [maxerickson]
- [amenk] - Alexander Menk
- [edqd]
- [simon04] - Simon Legner
- [MKnight] - Michael Knight
- [elgaard] - Niels Elgaard Larsen
- [afita] - Adrian Fita
- [sanderd17]
- [marcgemis]
- [drMerry]
- [endro]
- [rmikke] - Ryszard Mikke
- [VorpalBlade] - Arvid Norlander
- [mmn] - Mikael Nordfeldth
- [adrianojbr]
- [AndreasTUHU]
- [mkyral] - Marián Kyral
- [pke] - Philipp Kursawe
- [spawn-guy] - Paul Rysiavets
- [bugvillage]
- [ItsNotYou]
- [chiak597]
- [skifans] - Alex
- [shouze] - Sébastien HOUZÉ
- [Gazer75]
- [yourock17]
- [urbalazs] - Balázs Úr
- [HolgerJeromin] - Holger Jeromin
- [Gerw88]
- [sommerluk] - Lukas Sommer
- [Discostu36] - Michael
- [debyos] - Gábor Babos
- [StephanGeorg] - Stephan Georg
- [hariskar] - Haris K
- [Virtakuono] - Juho Häppölä
- [blef00fr]
- [mstock] - Manfred Stock
- [emilsivro]
- [simonpoole] - Simon Poole
- [jmontane] - Joan Montané
- [Mortein] - Kiel Hurley
- [stefanct] - Stefan Tauner
- [KristjanESPERANTO] - Kristjan
- [Robot8A] - Héctor Ochoa Ortiz
- [pietervdvn] - Pieter Vander Vennet
- [napei] - Nathaniel Peiffer
- [fodor0205]
- [goodudetheboy] - Vuong Ho
- [MerlinPerrotLegler] - Merlin Perrot

Thanks very much to all contributors!

### Supporters

- [iMi digital]
- [AddisMap]

Thanks for helping by allowing employees to work on the project during
work hours!

## [main](https://github.com/opening-hours/opening_hours.js/compare/v3.9.0...main) - unreleased

### Added

- chore: introduce commitlint ([#498](https://github.com/opening-hours/opening_hours.js/pull/498))
- feat: prettified value support long day/month name ([#473](https://github.com/opening-hours/opening_hours.js/pull/473))
- feat: script to update German school holidays [scripts/update_german_sh.mjs](scripts/update_german_sh.mjs) ([#492](https://github.com/opening-hours/opening_hours.js/pull/475))

- Public holiday definitions added:
  - Scotland and Northern Ireland ([#415](https://github.com/opening-hours/opening_hours.js/pull/415))
- School holiday definitions added:
  - Belgium ([#507](https://github.com/opening-hours/opening_hours.js/pull/507))

### Changed

- chore: change default git branch from `master` to `main` ([#495](https://github.com/opening-hours/opening_hours.js/pull/495))
- chore: REUSE compliants, cleanup, part 1 ([#487](https://github.com/opening-hours/opening_hours.js/pull/487))
- chore: update dependencies ([#500](https://github.com/opening-hours/opening_hours.js/pull/500), [#501](https://github.com/opening-hours/opening_hours.js/pull/501), [#517](https://github.com/opening-hours/opening_hours.js/pull/517))
- docs: move Contributing section from README to CONTRIBUTING file and add "Branching Model" section ([#497](https://github.com/opening-hours/opening_hours.js/pull/497))
- docs: switch CHANGELOG file from reStructuredText to Markdown ([#509](https://github.com/opening-hours/opening_hours.js/pull/509))
- refactor: fix existing ESLint issues, add markdown linting, and enable new rules ([#506](https://github.com/opening-hours/opening_hours.js/pull/506))
- refactor: optimize simple_index.html ([#502](https://github.com/opening-hours/opening_hours.js/pull/502))
- refactor: overload getStateString for better return type ([#504](https://github.com/opening-hours/opening_hours.js/pull/504))
- refactor: replace deprecated `optimist` with `yargs` for command line argument parsing ([#515](https://github.com/opening-hours/opening_hours.js/pull/515))
- refactor: improve week range test descriptions for clarity ([#518](https://github.com/opening-hours/opening_hours.js/pull/518))
- refactor: rework and enable week range tests with various Date object types ([#518](https://github.com/opening-hours/opening_hours.js/pull/518))

- Public holiday definitions updated:
  - France ([#470](https://github.com/opening-hours/opening_hours.js/pull/470))
  - Germany
    - "Frauentag" is a public holiday in Mecklenburg-Vorpommern since 2023 ([#511](https://github.com/opening-hours/opening_hours.js/pull/511))
- School holiday definitions updated:
  - Hungary ([#450](https://github.com/opening-hours/opening_hours.js/pull/450))

### Fixed

- fix: add missing `country_code` to `xa.yaml` ([#499](https://github.com/opening-hours/opening_hours.js/pull/499))
- fix: use full date comparison for constrained weekday matching ([#514](https://github.com/opening-hours/opening_hours.js/pull/514))
- fix(test): localize expected test strings for German locale ([#512](https://github.com/opening-hours/opening_hours.js/pull/512))
- fix(test): correct two `sunrise` test expectations to match SunCalc output ([#513](https://github.com/opening-hours/opening_hours.js/pull/513))
- fix: update script paths and use python for regex search execution ([#516](https://github.com/opening-hours/opening_hours.js/pull/516))
- fix: update syntax in `regex_search.py` ([#516](https://github.com/opening-hours/opening_hours.js/pull/516))

### Removed

- chore: remove `bower.json` ([#496](https://github.com/opening-hours/opening_hours.js/pull/496))
- chore: remove old Perl script for holiday definition upgrade ([#503](https://github.com/opening-hours/opening_hours.js/pull/503))
- refactor: remove deprecated tag `opening_hours:covid19` ([#505](https://github.com/opening-hours/opening_hours.js/pull/505))

## [v3.9.0](https://github.com/opening-hours/opening_hours.js/compare/v3.8.0...v3.9.0) - 2025-05-31

[v3.9.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.9.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Chinese (#406)
  - Croatian
  - Luxembourg (#460)
  - Namibian (#452)
- School holiday definitions added:
  - Croatian
  - France
  - Luxembourg (#460)

### Changed

- Public holiday definitions updated:
  - Argentina (#456)
  - Swedish and Finnish (#465)
- School holiday definitions updated:
  - Belgium (#457)
  - German (#468)
  - Hungarian (#466)
- Evaluation tool: Optimize "Error and warning messages" layout
- chore: Update CI in `ci.yml` (#468)
  - Replace deprecated `set-output`
  - Test with maintained node versions
  - Update actions
- chore: Upgrade `colors`, `husky` and `eslint` (#468)
- chore: Update dependencies (#468)
- chore: Move minification into rollup and remove `esbuild` (#468)
- chore: Also build sourcemap to minified files (#468)
- chore: Add code-style-check to CI (#468)
- chore: Change benchmark script to esm (#468)
- ci: switch to LTS Node.js version for code style check in workflow (#488)
- ci: update supported Node.js versions in CI workflow (#488)

### Fixed

- JOSM remote control was not working because it was trying to be accessed as <https://localhost:8111/>. Switch to HTTP.
- Evaluation tool: Fix timebar wrap on certain zoom levels in Firefox (issue \#419)
- Evaluation tool: Fix Russian and Ukrainian pluralization by updating `i18next` and using API version V4 (#468)
- chore: Drop `yamlToJson.mjs` (#468) - There are better tools like <https://mikefarah.gitbook.io/yq> that do this. No need to maintain our own.
- chore: Fix `make list` (#468)

## [v3.8.0](https://github.com/opening-hours/opening_hours.js/compare/v3.7.0...v3.8.0) - 2022-05-18

### Added

- Public holiday definitions added:
  - Argentina - Japanese
- Localizations added:
  - Vietnamese
  - Japanese

### Changed

- School holiday definitions updated:
  - Romania
  - France

### Fixed

- Typing for typescript

## [v3.7.0](https://github.com/opening-hours/opening_hours.js/compare/v3.6.0...v3.7.0) - 2021-07-24

[v3.7.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.7.0+is%3Aclosed)

### Added

- Typing for typescript \[[MerlinPerrotLegler]]

## [v3.6.0](https://github.com/opening-hours/opening_hours.js/compare/v3.5.0...v3.6.0) - 2021-04-24

[v3.6.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.6.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Australia \[[yourock17], [ypid]]
  - England and Wales \[[skifans], [simon04]]
  - Finland \[[Virtakuono]]
  - Greece \[[hariskar]]
  - Ireland \[[Gerw88], [ypid]]
  - Ivory Coast \[[sommerluk], [ypid]]
  - New Zealand \[[Mortein]]
  - Norway \[[Gazer75]]
  - Spain \[[jmontane]]
  - Switzerland \[[mstock], [emilsivro], [simonpoole], [ypid]]
  - Vietnam \[[goodudetheboy]]
- School holiday definitions added:
  - Austria \[[simon04]]
  - Belgium \[[pietervdvn]]
  - France \[[blef00fr], [ypid]]
  - Germany 2017 until 2024 \[[ypid], [KristjanESPERANTO]]
  - Greece \[[hariskar], [ypid]]
- Added Easter Sunday to Slovak holidays. \[[chiak597]]
- Localizations added:
  - Hungarian \[[urbalazs], [debyos]]
  - Spanish \[[Robot8A], [ypid]]
- Translate error tolerance warnings into German. \[[ypid]]
- Add +/-1 week button to evaluation tool. \[[stefanct]]
- Add additional warnings:
  - Misused `.` character. Example: `Jan 01,Dec 24.-25.`. \[[ypid]]
  - Trailing `,` after time selector. Example: `We 12:00-18:00,`. \[[ypid]]
  - Additional rule which evaluates to closed. Example: `Mo-Fr 10:00-20:00, We off`. \[[ypid]]
  - Value consists of multiple rules each only using a time selector. Example: `11:30-14:30;17:30-23:00`. \[[ypid]]
  - Potentially missing use of `<additional_rule_separator>` if the previous rule has a time range which wraps over midnight and the current rule matches one of the following days of the previous rule. One that the warning is not emitted in case wide range selectors are used in both involved rules to avoid a false positive warning where the two rules would never match days directly following each other. Nevertheless this check has false positives and which can be ignored in cases mentioned in the warning. Example: `Fr 22:00-04:00; Sa 21:00-04:00` \[[ypid]]
- Extend error tolerance:
  - Handle super/subscript digits properly. Example: `Mo 00³°-¹⁴:⁰⁹`. \[[ypid]]
  - Handle misused `.` character following a number. Example: `Jan 01,Dec 24.-25.`. \[[ypid]]

### Changed

- Public holiday definitions updated:
  - Germany \[[StephanGeorg]]
- Migrated to use [ES2015 modules](https://exploringjs.com/es6/ch_modules.html) and [rollup](https://rollupjs.org/) for module bundling. \[[simon04]]
- Increased NodeJS version requirement to `10.0.0`. \[[ypid]]
- Update to holiday definition format 2.2.0. Holidays are now maintained in YAML files, one for each country. \[[ypid]]
- Update to holiday definition format 3.0.0. Use nested key-value pairs instead of arrays with a known structure. \[[ypid]]
- Rework the way Nominatim responses are handled (used for testing). \[[ypid]]
- Allow "gaps" in school holiday definitions. This became necessary because countries/states might add/remove holidays like winter holidays from one year to another. \[[ypid]]
- Error tolerance: For a value such as `Mo-Fr 08:00-12:00 by_appointment` the tool did previously suggest to use `Mo-Fr 08:00-12:00 "on appointment"` but as whether to use `by appointment` or `on appointment` is not defined the tool now just uses the already given variant (`Mo-Fr 08:00-12:00 "by appointment"` in this case). \[[ypid]]
- Error tolerance: Interpret the German `werktags?` as `Mo-Sa` instead of `Mo-Fr`. Ref: [§ 3 Bundesurlaubsgesetz (BUrlG)](https://www.gesetze-im-internet.de/burlg/__3.html). \[[ypid]]
- Make error tolerance warnings translatable. \[[ypid]]
- Improved performance of common constructor calls by factor 6! \[[ypid]]
- Improve number input in the evaluation tool and other HTML and CSS improvements. Useful for example on mobile devices. \[[HolgerJeromin], [ypid]]
- Change from localized dates to ISO 8601 in evaluation tool. The syntax has no support for legacy stuff like AM/PM or weirdly written dates anyway. Commit to ISO 8601 all the way regardless of local quirks. \[[ypid]]
- Merge country into state holidays. This avoids repeating country-wide holidays. \[[simon04]]
- Update simple HTML usage example for using the library in a website. [[KristjanESPERANTO], [ypid]\]
- Replaced moment.js with Date.toLocaleString \[[simon04]]
- Change directory layout of the project. \[[napei], [ypid]]
- Switch from i18next-client to i18next dependency (no longer as peer dependency). \[[fodor0205], [ypid]]

### Fixed

- Fix German public holiday definitions. Since 2018, Reformationstag is also a public holiday in Bremen, Schleswig-Holstein, Niedersachsen and Hamburg. \[[Discostu36], [ypid]]
- Fix Russian public holiday definitions. Regions where not in local language and thus not matched properly. \[[ypid]]
- Fix school holiday selector code which caused the main selector traversal function to not advance any further (returning closed for all following dates) after the school holiday selector code hit a holiday definition ending on the last day of the year. \[[ypid]]
- Fix `check-diff-%.js` Makefile target. `git diff` might not have shown changes or failed to return with an error before. \[[ypid]]
- Fix support for legacy browsers (IE) with using proper for...in loops. \[[shouze]]
- Error tolerance: Fix mapping of Spanish weekdays. \[[maxerickson]]
- Do not zero pad `positive_number` symbols by default in `oh.prettifyValue`. \[[ypid]]

## [v3.5.0](https://github.com/opening-hours/opening_hours.js/compare/v3.4.0...v3.5.0) - 2017-02-17

[v3.5.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.5.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Brazil \[[adrianojbr]]
  - Sweden \[[VorpalBlade], [mmn], [ypid]]
  - Poland \[[endro], [rmikke]]
  - Czech \[[mkyral]]
  - Hungary \[[AndreasTUHU]]
  - Slovakia \[[chiak597]]
- School holiday definitions added: Hungary \[[AndreasTUHU]]
- Changelog file. \[[ypid]]
- Holidays definition documentation 2.1.0. \[[ypid]]
- AMD with RequireJS. \[[ItsNotYou]]
- Test the package on Travis CI against a version matrix (refer to `.travis.yml` for details). \[[ypid]]

### Changed

- Make the evaluation tool prettier. \[[MKnight]]
- Use `peerDependencies` to allow dependency reuse by other npm packages. \[[pke], [ypid]]
- Use caret ranges for all npm dependencies. \[[ypid], [pke]]
- Increased NodeJS version requirement to `0.12.3` which fixes one test case. \[[ypid]]

### Fixed

- Public holiday definitions fixed:
  - Germany, Saxony: Add missing "Buß- und Bettag" to the public holiday definition of \[[bugvillage], [ypid]]
  - Fix the `getDateOfWeekdayInDateRange` helper function used to calculate PH of Sweden and Germany Saxony. PH definitions using this functions might have been wrong before. \[[ypid]]
- Fix timezone problem in `PH_SH_exporter.js` (local time was interpreted as UTC). \[[ypid]]
- Fix handling of legacy 12-hour clock format. `12:xxAM` and `12:xxPM` was handled incorrectly! \[[ypid]]
- Fix timezone issue for `PH_SH_exporter.js` unless the `--omit-date-hyphens` option was given. Exported dates which are in DST might be wrong when your system is in a timezone with DST and DST was not active when you run the script. \[[ypid]]
- Fix current week number calculation which was caused by incorrect use of `new Date()` which is a "Reactive" variable. \[[spawn-guy]]

## [v3.4.0](https://github.com/opening-hours/opening_hours.js/compare/v3.3.0...v3.4.0) - 2016-01-02

[v3.4.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.4.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - Danish \[[elgaard]]
  - Denmark \[[elgaard]]
  - Belgium \[[sanderd17], [marcgemis]]
  - Romania \[[afita]]
  - Netherlands \[[drMerry]]
- School holiday definitions added: Romania \[[afita]]
- Localizations added: Dutch \[[marcgemis]]
- Added simple HTML usage example for using the library in a website. \[[ypid]]
- Browserified the library. \[[simon04]]
- `oh.isEqualTo`: Implemented check if two oh objects have the same meaning (are equal). \[[ypid]]
- Expose `oh.isEqualTo` in the evaluation tool. \[[ypid]]

### Changed

- Changed license to LGPL-3.0-only. \[[ypid]]
- Refer to YoHours in the evaluation tool. \[[ypid]]
- Use HTTPS everywhere (in the documentation and in code comments). \[[ypid]]

### Fixed

- Lots of small bugs and typos fixes. \[[ypid]]
- No global locale change. \[[ypid]]

## [v3.3.0](https://github.com/opening-hours/opening_hours.js/compare/v3.2.0...v3.3.0) - 2015-08-02

[v3.3.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.3.0+is%3Aclosed)

### Added

- Public holiday definitions added: Czech Republic \[[edqd]]
- Support for localized error and warning messages. \[[amenk] funded by [iMi digital] and [AddisMap]]
- Support to localize oh.prettifyValue opening_hours value. \[[amenk] funded by [iMi digital] and [AddisMap]]
- Wrote SH_batch_exporter.sh and added support to write (SH) definitions for all states in Germany. \[[ypid]]
- Added more tests to the test framework. \[[ypid]]

### Changed

- Updated translation modules to latest versions.

### Fixed

- Fixed false positive warning for missing PH for value 'PH'.
- Fixed evaluation of SH after year wrap (of by one).

## [v3.2.0](https://github.com/opening-hours/opening_hours.js/compare/v3.1.1...v3.2) - 2015-05-16

[v3.2.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.2+is%3Aclosed)

### Added

- Show warning for missing PH. Required API extension (fully backwards compatible, upgrade recommended).
- Show warning for year in past, not year range.
- Added more error checking and tests for: Wrong constructor call, e.g bad parameters.
- Added more tests to the test framework.

### Changed

- Improved input/error tolerance.
- Refactored source code.
- Updated examples in evaluation tool.
- Statistics: Optimized Overpass import.
- Statistics: Fixed wrong stats for 'not prettified'.
- Statistics: real_test.js: Implemented punchcard weekly report generation. See [blog post](https://www.openstreetmap.org/user/ypid/diary/34881).
- Statistics: Wrote `gen_weekly_task_report`.

## [v3.1.1](https://github.com/opening-hours/opening_hours.js/compare/v3.1.0...v3.1.1) - 2015-04-12

[v3.1.1 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.1+is%3Aclosed)

### Added

- Public holiday definitions added: Italian \[[damjang], [ypid]]
- Added support to use data from the Overpass API to generate statistics.

### Changed

- Give better error message for wrong usage of `<additional_rule_separator>`.
- Always use strict `===` comparison in JavaScript.

## [v3.1.0](https://github.com/opening-hours/opening_hours.js/compare/v3.0.2...v3.1.0) - 2015-02-15

[v3.1.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.0+is%3Aclosed)

### Added

- Public holiday definitions added:
  - USA and python script for testing the holiday JSON (ref: [us_holidays](https://github.com/maxerickson/us_holidays)) \[[maxerickson]]

### Fixed

- Public holiday definitions fixed: France

## [v3.0.2](https://github.com/opening-hours/opening_hours.js/compare/v3.0.1...v3.0.2) - 2015-01-24

### Added

- Added `make release` target.

### Changed

- package.json: Narrowed down version of dependencies.
- Enhanced Makefile.
- Updated README.md

## [v3.0.1](https://github.com/opening-hours/opening_hours.js/compare/v3.0.0...v3.0.1) - 2015-01-24

[v3.0.1 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.1+is%3Aclosed)

### Added

- Public holiday definitions added: Russian \[[dmromanov]]
- Improved error tolerance for values `bis open end` and `Sonn- und Feiertags`.
- real_test.js: Added the following OSM tags to the evaluation: - Key:happy_hours - Key:delivery_hours - Key:opening_hours:delivery
- Evaluation tool: Added `noscript` tag to give a hint to the user to enable JavaScript.

### Fixed

- Fixed up README.md.
- Fixed error when parsing input value `SH off; Mo-Sa 18:00+`.
- Require 2.7.x of the moment library because of API change in recent versions.

## [v3.0.0](https://github.com/opening-hours/opening_hours.js/compare/v2.1.9...v3.0.0) - 2014-09-08

[v3.0.0 milestone](https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.0+is%3Aclosed)

### Added

- Release notes.
- `oh.prettifyValue`: Implemented selector reordering.
- `oh.prettifyValue`: Changed API for optional parameters. API is backwards compatible in case you are not using any of the optional parameters.
- Evaluation tool: Highlight selectors and other tokens and give more information.
- real_test.js: Write verbose log file for all values and states.
- real_test.js: Added tag filter command line parameter and csv stats output.
- Created favicon.
- Bundle (and test) minified version as `opening_hours.min.js`.
- More unit tests:
  - Rule has no time selector.
  - Changed default state not first rule like `Mo 12:00-14:00; closed`.
  - Valid use of `<separator_for_readability>`.
  - And more.

### Changed

- `oh.getMatchingRule`: Changed API. Not backwards compatible.
- Week selector rework. Using ISO 8601 week dates.
- Made second rule of '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"' obsolete.
- Improved error tolerance.
- real_test.js: Enhanced implementation.

### Fixed

- Fixed evaluation for some (not to often used) values.
- Optimized source code with JSHint. Some internal variables where defined in global scope.
- Removed duplicate warnings for `test.addShouldWarn` in test framework.

## [v2.1.9](https://github.com/opening-hours/opening_hours.js/compare/v2.1.8...v2.1.9) - 2014-08-17

### Added

- Many more unit tests.
- Internal tokens array documentation.
- Using moment.js for date localization.

### Changed

- Many improve error tolerance: comments, am/pm time format, …
- Updated examples in the evaluation tool.
- Internal refactoring and enhancements.

### Fixed

- Fixed problems reported by `real_test`
- Fixed bug in test framework.

## [v2.1.8](https://github.com/opening-hours/opening_hours.js/compare/v2.1.7...v2.1.8) - 2014-04-26

### Added

- Public holiday definitions added: Canadian \[[openfirmware]], Ukraine \[[burrbull]], Slovenian \[[blorger]]
- Localizations added: Ukrainian \[[burrbull]]

### Fixed

- Localizations fixed: Russian \[[openfirmware]]

## [v2.1.0](https://github.com/opening-hours/opening_hours.js/compare/v2.0.0...v2.1.0) - 2014-03-03

### Added

- Public holiday definitions added: French \[[don-vip]]
- Localizations added: French \[[don-vip]], Ukrainian \[[jgpacker]], Italian \[[NonnEmilia]]

### Fixed

- Docs: Improved understandability of overlapping rules in README.md. \[[sesam]]

## [v2.0.0](https://github.com/opening-hours/opening_hours.js/compare/v1.0.0...v2.0.0) - 2013-10-27

### Added

- `package.json` file. \[[Cactusbone]]

## v1.0.0 - 2013-01-12

### Added

- Initial coding and design. \[[AMDmi3]]

### Changed

- demo page (now called evaluation tool) improvements. \[[putnik]]

[AMDmi3]: https://github.com/AMDmi3
[ypid]: https://me.ypid.de/
[putnik]: https://github.com/putnik
[Cactusbone]: https://github.com/Cactusbone
[don-vip]: https://github.com/don-vip
[sesam]: https://github.com/sesam
[NonnEmilia]: https://github.com/NonnEmilia
[damjang]: https://github.com/damjang
[jgpacker]: https://github.com/jgpacker
[openfirmware]: https://github.com/openfirmware
[burrbull]: https://github.com/burrbull
[blorger]: https://github.com/blorger
[dmromanov]: https://github.com/dmromanov
[maxerickson]: https://github.com/maxerickson
[amenk]: https://github.com/amenk
[edqd]: https://github.com/edqd
[simon04]: https://github.com/simon04
[MKnight]: https://github.com/dex2000
[elgaard]: https://github.com/elgaard
[afita]: https://github.com/afita
[sanderd17]: https://github.com/sanderd17
[marcgemis]: https://github.com/marcgemis
[drMerry]: https://github.com/drMerry
[endro]: https://github.com/endro
[rmikke]: https://github.com/rmikke
[VorpalBlade]: https://github.com/VorpalBlade
[mmn]: https://blog.mmn-o.se/
[adrianojbr]: https://github.com/adrianojbr
[AndreasTUHU]: https://github.com/AndreasTUHU
[mkyral]: https://github.com/mkyral
[pke]: https://github.com/pke
[spawn-guy]: https://github.com/spawn-guy
[bugvillage]: https://github.com/bugvillage
[ItsNotYou]: https://github.com/ItsNotYou
[chiak597]: https://github.com/chiak597
[skifans]: https://github.com/skifans
[shouze]: https://github.com/shouze
[Gazer75]: https://github.com/Gazer75
[yourock17]: https://github.com/yourock17
[urbalazs]: https://github.com/urbalazs
[HolgerJeromin]: https://github.com/HolgerJeromin
[Gerw88]: https://github.com/Gerw88
[sommerluk]: https://github.com/sommerluk
[Discostu36]: https://github.com/Discostu36
[debyos]: https://github.com/debyos
[StephanGeorg]: https://github.com/StephanGeorg
[hariskar]: https://github.com/hariskar
[Virtakuono]: https://github.com/Virtakuono
[blef00fr]: https://github.com/blef00fr
[mstock]: https://github.com/mstock
[emilsivro]: https://github.com/emilsivro
[simonpoole]: https://github.com/simonpoole
[jmontane]: https://github.com/jmontane
[Mortein]: https://github.com/Mortein
[stefanct]: https://github.com/stefanct
[KristjanESPERANTO]: https://github.com/KristjanESPERANTO
[Robot8A]: https://www.openstreetmap.org/user/Robot8A
[pietervdvn]: https://github.com/pietervdvn
[napei]: https://nathaniel.peiffer.com.au/
[fodor0205]: https://github.com/fodor0205
[goodudetheboy]: https://github.com/goodudetheboy
[MerlinPerrotLegler]: https://github.com/MerlinPerrotLegler
[iMi digital]: https://www.imi-digital.de/
[AddisMap]: https://www.addismap.com/
