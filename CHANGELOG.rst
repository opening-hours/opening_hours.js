Changelog
=========

All notable changes to opening_hours.js will be documented in this file.

This project adheres to `Semantic Versioning <http://semver.org/spec/v2.0.0.html>`__
and `human-readable changelog <http://keepachangelog.com/en/0.3.0/>`__.

Note that most of the v2.X.Z releases have not been added to the changelog yet.

Authors
-------

* [AMDmi3_] - Dmitry Marakasov (original author)
* [ypid_] - Robin Schneider (author, maintainer)

.. _AMDmi3: https://github.com/AMDmi3
.. _ypid: https://me.ypid.de/

Contributors
------------

* [putnik_] - Sergey Leschina
* [Cactusbone_] - Charly Koza
* [don-vip_] - Vincent Privat
* [sesam_] - Simon B.
* [NonnEmilia_]
* [damjang_]
* [jgpacker_] - João G. Packer
* [openfirmware_] - James Badger
* [burrbull_] - Zgarbul Andrey
* [blorger_] - Blaž Lorger
* [dmromanov_] - Dmitrii Romanov
* [maxerickson_]
* [amenk_] - Alexander Menk
* [edqd_]
* [simon04_] - Simon Legner
* [MKnight_] - Michael Knight
* [elgaard_] - Niels Elgaard Larsen
* [afita_] - Adrian Fita
* [sanderd17_]
* [marcgemis_]
* [drMerry_]
* [endro_]
* [rmikke_] - Ryszard Mikke
* [VorpalBlade_] - Arvid Norlander
* [mmn_] - Mikael Nordfeldth
* [adrianojbr_]
* [AndreasTUHU_]
* [mkyral_] - Marián Kyral
* [pke_] - Philipp Kursawe
* [spawn-guy_] - Paul Rysiavets
* [bugvillage_]
* [ItsNotYou_]
* [chiak597_]
* [skifans_] - Alex
* [shouze_] - Sébastien HOUZÉ
* [Gazer75_]
* [yourock17_]
* [urbalazs_] - Balázs Úr
* [HolgerJeromin_] - Holger Jeromin
* [Gerw88_]
* [sommerluk_] - Lukas Sommer
* [Discostu36_] - Michael
* [debyos_] - Gábor Babos
* [StephanGeorg_] - Stephan Georg
* [hariskar_] - Haris K
* [Virtakuono_] - Juho Häppölä
* [blef00fr_]


Thanks very much to all contributors!

.. _putnik: https://github.com/putnik
.. _Cactusbone: https://github.com/Cactusbone
.. _don-vip: https://github.com/don-vip
.. _sesam: https://github.com/sesam
.. _NonnEmilia: https://github.com/NonnEmilia
.. _damjang: https://github.com/damjang
.. _jgpacker: https://github.com/jgpacker
.. _openfirmware: https://github.com/openfirmware
.. _burrbull: https://github.com/burrbull
.. _blorger: https://github.com/blorger
.. _dmromanov: https://github.com/dmromanov
.. _maxerickson: https://github.com/maxerickson
.. _amenk: https://github.com/amenk
.. _edqd: https://github.com/edqd
.. _simon04: https://github.com/simon04
.. _MKnight: https://github.com/dex2000
.. _elgaard: https://github.com/elgaard
.. _afita: https://github.com/afita
.. _sanderd17: https://github.com/sanderd17
.. _marcgemis: https://github.com/marcgemis
.. _drMerry: https://github.com/drMerry
.. _endro: https://github.com/endro
.. _rmikke: https://github.com/rmikke
.. _VorpalBlade: https://github.com/VorpalBlade
.. _mmn: https://blog.mmn-o.se/
.. _adrianojbr: https://github.com/adrianojbr
.. _AndreasTUHU: https://github.com/AndreasTUHU
.. _mkyral: https://github.com/mkyral
.. _pke: https://github.com/pke
.. _bugvillage: https://github.com/bugvillage
.. _ItsNotYou: https://github.com/ItsNotYou
.. _spawn-guy: https://github.com/spawn-guy
.. _chiak597: https://github.com/chiak597
.. _skifans: https://github.com/skifans
.. _shouze: https://github.com/shouze
.. _Gazer75: https://github.com/Gazer75
.. _yourock17: https://github.com/yourock17
.. _urbalazs: https://github.com/urbalazs
.. _HolgerJeromin: https://github.com/HolgerJeromin
.. _Gerw88: https://github.com/Gerw88
.. _sommerluk: https://github.com/sommerluk
.. _Discostu36: https://github.com/Discostu36
.. _debyos: https://github.com/debyos
.. _StephanGeorg: https://github.com/StephanGeorg
.. _hariskar: https://github.com/hariskar
.. _Virtakuono: https://github.com/Virtakuono
.. _blef00fr: https://github.com/blef00fr

Supporters
~~~~~~~~~~

* `iMi digital`_
* AddisMap_

Thanks for helping by allowing employees to work on the project during work hours!

.. _iMi digital: http://www.imi-digital.de/
.. _AddisMap: https://www.addismap.com/

master_ - unreleased
--------------------

.. _master: https://github.com/opening-hours/opening_hours.js/compare/v3.5.0...master

`v3.6.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.6.0+is%3Aclosed>`__

Added
~~~~~

* Public holiday definitions added:

  * Australia [yourock17_, ypid_]
  * England and Wales [skifans_, simon04_]
  * Finland [Virtakuono_]
  * Greece [hariskar_]
  * Ireland [Gerw88_, ypid_]
  * Ivory Coast [sommerluk_, ypid_]
  * Norway [Gazer75_]

* Added Easter Sunday to Slovak holidays. [chiak597_]
* Localizations added: Hungarian [urbalazs_, debyos_]

* School holiday definitions added:

  * Austria [simon04_]
  * France [blef00fr_, ypid_]
  * Germany 2017 until 2024 [ypid_]
  * Greece [hariskar_, ypid_]

* Translate error tolerance warnings into German. [ypid_]
* Add additional warnings:

  * Misused ``.`` character. Example: ``Jan 01,Dec 24.-25.``. [ypid_]
  * Trailing ``,`` after time selector. Example: ``We 12:00-18:00,``. [ypid_]
  * Additional rule which evaluates to closed. Example: ``Mo-Fr 10:00-20:00, We off``. [ypid_]
  * Value consists of multiple rules each only using a time selector. Example: ``11:30-14:30;17:30-23:00``. [ypid]
  * Potentially missing use of ``<additional_rule_separator>`` if the previous
    rule has a time range which wraps over midnight and the current rule
    matches one of the following days of the previous rule.
    One that the warning is not emitted in case wide range selectors are used
    in both involved rules to avoid a false positive warning where the two
    rules would never match days directly following each other.
    Nevertheless this check has false positives and which can be ignored in cases mentioned in the warning.
    Example: ``Fr 22:00-04:00; Sa 21:00-04:00`` [ypid_]

* Extend error tolerance:

  * Handle super/subscript digits properly. Example: ``Mo 00³°-¹⁴:⁰⁹``. [ypid_]
  * Handle misused ``.`` character following a number. Example: ``Jan 01,Dec 24.-25.``. [ypid_]


Changed
~~~~~~~

* Public holiday definitions updated:

  * Germany [StephanGeorg_]

* Migrated to use `ES2015 modules`_ and rollup_ for module bundling. [simon04_]
* Increased NodeJS version requirement to ``6.0.0``. Technically, the code should still work with ``4.0.0`` but support has been dropped because ``npm-install-peers`` depends on ``6.0.0``. [ypid_]
* Update to holiday definition format 2.2.0. Holidays are now maintained in
  YAML files, one for each country. [ypid_]
* Update to holiday definition format 3.0.0. Use nested key-value pairs
  instead of arrays with a known structure. [ypid_]
* Rework the way Nominatim responses are handled (used for testing). [ypid_]
* Allow "gaps" in school holiday definitions. This became necessary because
  countries/states might add/remove holidays like winter holidays from one year
  to another. [ypid_]

* Error tolerance: For a value such as ``Mo-Fr 08:00-12:00 by_appointment`` the
  tool did previously suggest to use ``Mo-Fr 08:00-12:00 "on appointment"`` but
  as whether to use ``by appointment`` or ``on appointment`` is not defined the
  tool now just uses the already given variant (``Mo-Fr 08:00-12:00 "by
  appointment"`` in this case). [ypid_]

* Error tolerance: Interpret the German :regexp:`werktags?` as ``Mo-Sa`` instead of ``Mo-Fr``.
  Ref: `§ 3 Bundesurlaubsgesetz (BUrlG) <https://www.gesetze-im-internet.de/burlg/__3.html>`_. [ypid_]

* Make error tolerance warnings translatable. [ypid_]

* Improved performance of common constructor calls by factor 6! [ypid_]
* Improve number input in the evaluation tool and other HTML and CSS improvements. Useful for example on mobile devices. [HolgerJeromin_, ypid_]

* Merge country into state holidays. This avoids repeating country-wide holidays.
  [simon04_]

.. _ES2015 modules: http://exploringjs.com/es6/ch_modules.html
.. _rollup: http://rollupjs.org/

Fixed
~~~~~

* Fix German public holiday definitions. Since 2018, Reformationstag is also a public holiday in Bremen, Schleswig-Holstein, Niedersachsen and Hamburg. [Discostu36_, ypid_]
* Fix Russian public holiday definitions. Regions where not in local language and thus not matched properly. [ypid_]
* Fix school holiday selector code which caused the main selector traversal
  function to not advance any further (returning closed for all following dates) after the
  school holiday selector code hit a holiday definition ending on the last
  day of the year. [ypid_]
* Fix ``check-diff-%.js`` Makefile target. :command:`git diff` might not have
  shown changes or failed to return with an error before. [ypid_]
* Fix support for legacy browsers (IE) with using proper for...in loops. [shouze_]
* Error tolerance: Fix mapping of Spanish weekdays. [maxerickson_]


v3.5.0_ - 2017-02-17
--------------------

.. _v3.5.0: https://github.com/opening-hours/opening_hours.js/compare/v3.4.0...v3.5.0

`v3.5.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.5.0+is%3Aclosed>`__

Added
~~~~~

* Public holiday definitions added:

  * Brazil [adrianojbr_]
  * Sweden [VorpalBlade_, mmn_, ypid_]
  * Poland [endro_, rmikke_]
  * Czech [mkyral_]
  * Hungary [AndreasTUHU_]
  * Slovakia [chiak597_]

* School holiday definitions added: Hungary [AndreasTUHU_]
* Changelog file. [ypid_]
* Holidays definition documentation 2.1.0. [ypid_]
* AMD with RequireJS. [ItsNotYou_]
* Test the package on Travis CI against a version matrix (refer to
  ``.travis.yml`` for details). [ypid_]

Changed
~~~~~~~

* Make the evaluation tool prettier. [MKnight_]
* Use ``peerDependencies`` to allow dependency reuse by other npm packages. [pke_, ypid_]
* Use caret ranges for all npm dependencies. [ypid_, pke_]
* Increased NodeJS version requirement to `0.12.3` which fixes one test case. [ypid_]

Fixed
~~~~~

* Public holiday definitions fixed:

  * Germany, Saxony: Add missing "Buß- und Bettag" to the public holiday definition of  [bugvillage_, ypid_]
  * Fix the `getDateOfWeekdayInDateRange` helper function used to calculate PH of
    Sweden and Germany Saxony. PH definitions using this functions might have
    been wrong before. [ypid_]

* Fix timezone problem in ``PH_SH_exporter.js`` (local time was interpreted as UTC). [ypid_]
* Fix handling of legacy 12-hour clock format. ``12:xxAM`` and ``12:xxPM`` was handled incorrectly! [ypid_]
* Fix timezone issue for `PH_SH_exporter.js` unless the ``--omit-date-hyphens`` option was given.
  Exported dates which are in DST might be wrong when your system is in a
  timezone with DST and DST was not active when you run the script. [ypid_]
* Fix current week number calculation which was caused by incorrect use of
  ``new Date()`` which is a "Reactive" variable. [spawn-guy_]


v3.4.0_ - 2016-01-02
--------------------

.. _v3.4.0: https://github.com/opening-hours/opening_hours.js/compare/v3.3.0...v3.4.0

`v3.4.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.4.0+is%3Aclosed>`__

Added
~~~~~

* Public holiday definitions added:

  * Danish [elgaard_]
  * Denmark [elgaard_]
  * Belgium [sanderd17_, marcgemis_]
  * Romania [afita_]
  * Netherlands [drMerry_]

* School holiday definitions added: Romania [afita_]
* Localizations added: Dutch [marcgemis_]
* Added simple HTML usage example for using the library in a website. [ypid_]
* Browserified the library. [simon04_]
* ``oh.isEqualTo``: Implemented check if two oh objects have the same meaning (are equal). [ypid_]
* Expose ``oh.isEqualTo`` in the evaluation tool. [ypid_]

Changed
~~~~~~~

* Changed license to LGPL-3.0. [ypid_]
* Refer to YoHours in the evaluation tool. [ypid_]

* Use HTTPS everywhere (in the documentation and in code comments). [ypid_]

Fixed
~~~~~

* Lots of small bugs and typos fixes. [ypid_]
* No global locale change. [ypid_]


v3.3.0_ - 2015-08-02
--------------------

.. _v3.3.0: https://github.com/opening-hours/opening_hours.js/compare/v3.2.0...v3.3.0

`v3.3.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.3.0+is%3Aclosed>`_

Added
~~~~~

* Public holiday definitions added: Czech Republic [edqd_]
* Support for localized error and warning messages. [amenk_ funded by `iMi digital`_ and AddisMap_]
* Support to localize oh.prettifyValue opening_hours value. [amenk_ funded by `iMi digital`_ and AddisMap_]
* Wrote SH_batch_exporter.sh and added support to write (SH) definitions for all states in Germany. [ypid_]
* Added more tests to the test framework. [ypid_]

Changed
~~~~~~~

* Updated translation modules to latest versions.

Fixed
~~~~~

* Fixed false positive warning for missing PH for value 'PH'.
* Fixed evaluation of SH after year wrap (of by one).


v3.2.0_ - 2015-05-16
--------------------

.. _v3.2.0: https://github.com/opening-hours/opening_hours.js/compare/v3.1.1...v3.2

`v3.2.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.2+is%3Aclosed>`_

Added
~~~~~

* Show warning for missing PH. Required API extension (fully backwards compatible, upgrade recommended).
* Show warning for year in past, not year range.
* Added more error checking and tests for: Wrong constructor call, e.g bad parameters.
* Added more tests to the test framework.

Changed
~~~~~~~

* Improved input/error tolerance.
* Refactored source code.
* Updated examples in evaluation tool.

* Statistics: Optimized Overpass import.
* Statistics: Fixed wrong stats for 'not prettified'.
* Statistics: real_test.js: Implemented punchcard weekly report generation.
  See `blog post <https://www.openstreetmap.org/user/ypid/diary/34881>`_.
* Statistics: Wrote ``gen_weekly_task_report``.


v3.1.1_ - 2015-04-12
--------------------

.. _v3.1.1: https://github.com/opening-hours/opening_hours.js/compare/v3.1.0...v3.1.1

`v3.1.1 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.1+is%3Aclosed>`_

Added
~~~~~

* Public holiday definitions added: Italian [damjang_, ypid_]
* Added support to use data from the Overpass API to generate statistics.

Changed
~~~~~~~

* Give better error message for wrong usage of ``<additional_rule_separator>``.
* Always use strict ``===`` comparison in JavaScript.


v3.1.0_ - 2015-02-15
--------------------

.. _v3.1.0: https://github.com/opening-hours/opening_hours.js/compare/v3.0.2...v3.1.0

`v3.1.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.1.0+is%3Aclosed>`_

Added
~~~~~

* Public holiday definitions added:

  * USA and python script for testing the holiday JSON (ref: `us_holidays <https://github.com/maxerickson/us_holidays>`_) [maxerickson_]

Fixed
~~~~~

* Public holiday definitions fixed: France


v3.0.2_ - 2015-01-24
--------------------

.. _v3.0.2: https://github.com/opening-hours/opening_hours.js/compare/v3.0.1...v3.0.2

Added
~~~~~

* Added ``make release`` target.

Changed
~~~~~~~

* package.json: Narrowed down version of dependencies.
* Enhanced Makefile.
* Updated README.md


v3.0.1_ - 2015-01-24
--------------------

.. _v3.0.1: https://github.com/opening-hours/opening_hours.js/compare/v3.0.0...v3.0.1

`v3.0.1 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.1+is%3Aclosed>`_

Added
~~~~~

* Public holiday definitions added: Russian [dmromanov_]
* Improved error tolerance for values ``bis open end`` and ``Sonn- und Feiertags``.
* real_test.js: Added the following OSM tags to the evaluation:

  * Key:happy_hours
  * Key:delivery_hours
  * Key:opening_hours:delivery

* Evaluation tool: Added ``noscript`` tag to give a hint to the user to enable JavaScript.

Fixed
~~~~~

* Fixed up README.md.
* Fixed error when parsing input value ``SH off; Mo-Sa 18:00+``.
* Require 2.7.x of the moment library because of API change in recent versions.


v3.0.0_ - 2014-09-08
--------------------

.. _v3.0.0: https://github.com/opening-hours/opening_hours.js/compare/v2.1.9...v3.0.0

`v3.0.0 milestone <https://github.com/opening-hours/opening_hours.js/issues?q=milestone%3Av3.0.0+is%3Aclosed>`_

Added
~~~~~

* Release notes.
* ``oh.prettifyValue``: Implemented selector reordering.
* ``oh.prettifyValue``: Changed API for optional parameters. API is backwards compatible in case you are not using any of the optional parameters.
* Evaluation tool: Highlight selectors and other tokens and give more information.
* real_test.js: Write verbose log file for all values and states.
* real_test.js: Added tag filter command line parameter and csv stats output.
* Created favicon.
* Bundle (and test) minified version as ``opening_hours.min.js``.
* More unit tests:

  * Rule has no time selector.
  * Changed default state not first rule like ``Mo 12:00-14:00; closed``.
  * Valid use of ``<separator_for_readability>``.
  * And more.

Changed
~~~~~~~

* ``oh.getMatchingRule``: Changed API. Not backwards compatible.
* Week selector rework. Using ISO 8601 week dates.
* Made second rule of '07:00+,12:00-16:00; 16:00-24:00 closed "needed because of open end"' obsolete.
* Improved error tolerance.
* real_test.js: Enhanced implementation.

Fixed
~~~~~

* Fixed evaluation for some (not to often used) values.
* Optimized source code with JSHint. Some internal variables where defined in global scope.
* Removed duplicate warnings for ``test.addShouldWarn`` in test framework.


v2.1.9_ - 2014-08-17
--------------------

.. _v2.1.9: https://github.com/opening-hours/opening_hours.js/compare/v2.1.8...v2.1.9

Added
~~~~~

* Many more unit tests.
* Internal tokens array documentation.
* Using moment.js for date localization.

Changed
~~~~~~~

* Many improve error tolerance: comments, am/pm time format, …
* Updated examples in the evaluation tool.
* Internal refactoring and enhancements.

Fixed
~~~~~

* Fixed problems reported by ``real_test``
* Fixed bug in test framework.


v2.1.8_ - 2014-04-26
--------------------

.. _v2.1.8: https://github.com/opening-hours/opening_hours.js/compare/v2.1.7...v2.1.8

Added
~~~~~

* Public holiday definitions added: Canadian [openfirmware_], Ukraine [burrbull_], Slovenian [blorger_]
* Localizations added: Ukrainian [burrbull_]

Fixed
~~~~~

* Localizations fixed: Russian [openfirmware_]


v2.1.0_ - 2014-03-03
--------------------

.. _v2.1.0: https://github.com/opening-hours/opening_hours.js/compare/v2.0.0...v2.1.0

Added
~~~~~

* Public holiday definitions added: French [don-vip_]
* Localizations added: French [don-vip_], Ukrainian [jgpacker_], Italian [NonnEmilia_]

Fixed
~~~~~

* Docs: Improved understandability of overlapping rules in README.md. [sesam_]


v2.0.0_ - 2013-10-27
--------------------

.. _v2.0.0: https://github.com/opening-hours/opening_hours.js/compare/v1.0.0...v2.0.0

Added
~~~~~

* ``package.json`` file. [Cactusbone_]


v1.0.0 - 2013-01-12
-------------------

Added
~~~~~

* Initial coding and design. [AMDmi3_]

Changed
~~~~~~~

* demo page (now called evaluation tool) improvements. [putnik_]
