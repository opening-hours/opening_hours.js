<!--
SPDX-FileCopyrightText: © 2013 Robin Schneider <ypid@riseup.net>

SPDX-License-Identifier: LGPL-3.0-only

This file is based on work under the following copyright and BSD-2-Clause
permission notice:

    SPDX-FileCopyrightText: © 2012 Dmitry Marakasov <amdmi3@amdmi3.ru>
    All rights reserved.

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are met:

    1. Redistributions of source code must retain the above copyright notice, this
    list of conditions and the following disclaimer.

    2. Redistributions in binary form must reproduce the above copyright notice,
    this list of conditions and the following disclaimer in the documentation
    and/or other materials provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
    ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
    WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
    FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
    DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
    SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
    CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
    OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
-->

# opening_hours

[![GitHub CI]](https://github.com/opening-hours/opening_hours.js/actions?query=workflow%3A%22Continuous+Integration%22)
[![license NPM](https://img.shields.io/npm/l/opening_hours.svg)][ohlib.github]
[![required Node.js version](https://img.shields.io/node/v/opening_hours.svg)][ohlib.github]
[![version NPM](https://img.shields.io/npm/v/opening_hours.svg)][ohlib.npmjs]
[![monthly downloads via NPM](https://img.shields.io/npm/dm/opening_hours.svg)][ohlib.npmjs]
[![total downloads via NPM](https://img.shields.io/npm/dt/opening_hours.svg)][ohlib.npmjs]

[github ci]: https://github.com/opening-hours/opening_hours.js/workflows/Continuous%20Integration/badge.svg

<!-- https://img.shields.io/github/license/opening-hours/opening_hours.js.svg -->
<!-- https://img.shields.io/github/downloads/opening-hours/opening_hours.js/total.svg -->

## Summary

The [opening_hours][key:opening_hours] tag is used in [OpenStreetMap](https://openstreetmap.org) to describe time ranges when a facility (for example, a café) is open. This library exists to easily extract useful information (e.g. whether a facility is open at a specific time, next time it's going to open/close, or a readable set of working hours) from the [complex syntax][oh:specification].

Examples of some complex opening_hours values:

```text
Mo,Tu,Th,Fr 12:00-18:00; Sa,PH 12:00-17:00; Th[3],Th[-1] off
Mo-Fr 12:00-18:00; We off; Sa,PH 12:00-17:00; Th[3],Th[-1] off
```

A library which is open from 12:00 to 18:00 on workdays (Mo-Fr) except Wednesday, and from 12:00 to 17:00 on Saturday and public holidays. It also has breaks on the third and last Thursday of each month.

```text
open; Tu-Su 08:30-09:00 off; Tu-Su,PH 14:00-14:30 off; Mo 08:00-13:00 off
```

An around-the-clock shop with some breaks.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Evaluation tool](#evaluation-tool)
- [Installation](#installation)
  - [For Developer](#for-developer)
  - [Web developer](#web-developer)
  - [NodeJS developer](#nodejs-developer)
- [Versions](#versions)
- [Synopsis](#synopsis)
- [Library API](#library-api)
  - [Simple API](#simple-api)
  - [High-level API](#high-level-api)
  - [Iterator API](#iterator-api)
- [Features](#features)
  - [Time ranges](#time-ranges)
  - [Points in time](#points-in-time)
  - [Weekday ranges](#weekday-ranges)
  - [Holidays](#holidays)
  - [Month ranges](#month-ranges)
  - [Monthday ranges](#monthday-ranges)
  - [Week ranges](#week-ranges)
  - [Year ranges](#year-ranges)
  - [States](#states)
  - [Comments](#comments)
- [Testing](#testing)
  - [Regression testing](#regression-testing)
  - [Testing with real data](#testing-with-real-data)
    - [Large scale](#large-scale)
    - [Small scale](#small-scale)
  - [Test it yourself (the geeky way)](#test-it-yourself-the-geeky-way)
- [Performance](#performance)
- [Used by other projects](#used-by-other-projects)
- [Projects that previously used the library](#projects-that-previously-used-the-library)
  - [YoHours](#yohours)
- [Bindings and ports](#bindings-and-ports)
- [Other implementations](#other-implementations)
- [Related links](#related-links)
- [ToDo](#todo)
- [How to contribute](#how-to-contribute)
- [Maintainers](#maintainers)
- [Contributors](#contributors)
- [Credits](#credits)
- [Stats](#stats)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Evaluation tool

Please have a look at the [evaluation tool] which can give you an impression of how this library can be used and what it is capable of.

A mirror is set up at <https://openingh.ypid.de/evaluation_tool/>

## Installation

### For Developer

Just clone the repository:

```sh
git clone --recursive https://github.com/opening-hours/opening_hours.js.git
```

and install the required dependencies:

```sh
npm install
pip install -r requirements.txt
```

and build the library:

```sh
npm run build
```

See the [Testing](#testing) section for details around writing and running tests

### Web developer

If you are a web developer and want to use this library you can do so by including the current version from here:

<https://openingh.openstreetmap.de/opening_hours.js/opening_hours+deps.min.js>

To get started checkout the [simple_index.html](/examples/simple_index.html) file.

### NodeJS developer

Install using npm/yarn.

```sh
npm install opening_hours
```

or

```sh
yarn add opening_hours
```

## Versions

The version number consists of a major release, minor release and patch level (separated by a dot).

For version 2.2.0 and all later, [Semantic Versioning](https://semver.org/spec/v2.0.0.html) is used:

- The major release is only increased if the release breaks backward compatibility.
- The minor release is increased if new features are added.
- The patch level is increased to bundle a bunch of commits (minor changes like bug fixes and improvements) into a new tested version.

Check [releases on GitHub] for a list of the releases and their Changelog.

## Synopsis

```js
const opening_hours = require("opening_hours");
let oh = new opening_hours("We 12:00-14:00");

let from = new Date("01 Jan 2012");
let to = new Date("01 Feb 2012");

// high-level API
{
  let intervals = oh.getOpenIntervals(from, to);
  for (let i in intervals)
    console.log(
      "We are " +
        (intervals[i][2] ? "maybe " : "") +
        "open from " +
        (intervals[i][3] ? '("' + intervals[i][3] + '") ' : "") +
        intervals[i][0] +
        " till " +
        intervals[i][1] +
        "."
    );

  let duration_hours = oh.getOpenDuration(from, to).map(function (x) {
    return x / 1000 / 60 / 60;
  });
  if (duration_hours[0])
    console.log(
      "For the given range, we are open for " + duration_hours[0] + " hours"
    );
  if (duration_hours[1])
    console.log(
      "For the given range, we are maybe open for " +
        duration_hours[1] +
        " hours"
    );
}

// helper function
function getReadableState(startString, endString, oh, past) {
  if (past === true) past = "d";
  else past = "";

  let output = "";
  if (oh.getUnknown()) {
    output +=
      " maybe open" +
      (oh.getComment()
        ? ' but that depends on: "' + oh.getComment() + '"'
        : "");
  } else {
    output +=
      " " +
      (oh.getState() ? "open" : "close" + past) +
      (oh.getComment() ? ', comment "' + oh.getComment() + '"' : "");
  }
  return startString + output + endString + ".";
}

// simple API
{
  let state = oh.getState(); // we use current date
  let unknown = oh.getUnknown();
  let comment = oh.getComment();
  let nextchange = oh.getNextChange();

  console.log(getReadableState("We're", "", oh, true));

  if (typeof nextchange === "undefined")
    console.log("And we will never " + (state ? "close" : "open"));
  else
    console.log(
      "And we will " +
        (oh.getUnknown(nextchange) ? "maybe " : "") +
        (state ? "close" : "open") +
        " on " +
        nextchange
    );
}

// iterator API
{
  let iterator = oh.getIterator(from);

  console.log(getReadableState("Initially, we're", "", iterator, true));

  while (iterator.advance(to)) {
    console.log(
      getReadableState("Then we", " at " + iterator.getDate(), iterator)
    );
  }

  console.log(getReadableState("And till the end we're", "", iterator, true));
}
```

## Library API

- `let oh = new opening_hours('We 12:00-14:00', nominatim_object, mode);`

  - `value (mandatory, type: string)`: Constructs opening_hours object, given the opening_hours tag value. Throws an error string if the expression is malformed or unsupported.

  - `nominatim_object (optional, type: object or null)`: Used in order to calculate the correct times for holidays and variable times (e.g. sunrise, dusk, see under [Time ranges][ohlib.time-ranges]).

    The nominatim-object should contain the fields `{lat, lon, address: {country_code, state}}`. The location (`lat` and `lon`) is used to calculate the correct values for sunrise and sunset.

    The country code and the state is needed to calculate the correct public holidays (PH) and school holidays (SH).

    Based on the coordinates or the OSM id of the facility, the other parameters can be queried using [reverse geocoding with Nominatim][nominatim].
    The JSON obtained from this online service can be passed in as the second argument of the constructor.
    The data returned by Nominatim should be in the local language (the language of the country for which the opening hours apply). If not, *accept-language* can be used as parameter in the request URL.
    To get started, see [this example query](https://nominatim.openstreetmap.org/reverse?format=json&lat=49.5487429714954&lon=9.81602098644987&zoom=5&addressdetails=1) or [have a look in the API-reference](https://nominatim.org/release-docs/develop/api/Overview/)

    The `nominatim_object` can also be `null` in which case a default location will be used.
    This can be used if you don’t care about correct opening hours for more complex opening_hours values.

  - `optional_conf_param (optional, either of type number or object)`:

    If this parameter is of the type number then it is interpreted as 'mode' (see below). Alternatively it can be an object with any of the following keys:

    - `mode (type: (integer) number, default: 0)`: In OSM, the syntax originally designed to describe opening hours, is now used to describe a few other things as well. Some of those other tags work with points in time instead of time ranges. To support this the mode can be specified. \_Note that it is recommended to use the tag_key parameter instead, which automatically sets the appropriate mode.\_If there is no mode specified, opening_hours.js will only operate with time ranges and will throw an error when the value contains points in times.

      - 0: time ranges (opening_hours, lit, …) default
      - 1: points in time
      - 2: both (time ranges and points in time, used by collection_times, service_times, …)

    - `tag_key (type: string, default: undefined)`: The name of the key (Tag key). For example 'opening_hours' or 'lit'. Please always specify this parameter. If you do, the mode will be derived from the 'tag_key' parameter. Default is undefined e.g. no default value.

    - `map_value (type: boolean, default: false)`: Map certain values to different (valid) oh values. For example for the lit tag the value 'yes' is valid but not for opening_hours.js. If this parameter 'yes' is mapped to `sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"`.

    - `warnings_severity (type: number, default: 4)`: Can be one of the following numbers. The severity levels (including the codes) match the syslog specification. The default is level 4 to not break backwards compatibility. Lower levels e.g. 5 include higher levels e.g. 4.

    ```text
    4: warning
    5: notice
    6: info
    7: debug
    ```

    - `locale (type: string, default: 'en')`: Defines the locale for errors and warnings. Currently, only 'en' (English) and 'de' (German) are supported.

    - additional_rule_separator (type boolean, default true)`: Allows to disable the "additional_rule_separator not used after time wrapping midnight" check giving rise to the warning "This rule overwrites parts of the previous rule. This happens because normal rules apply to the whole day and overwrite any definition made by previous rules. You can make this rule an additional rule by using a "," instead of the normal ";" to separate the rules. Note that the overwriting can also be desirable in which case you can ignore this warning."

- `let warnings = oh.getWarnings();`

  Get warnings which appeared during parsing as human readable string array with one element per violation. Almost all warnings can be auto-corrected and are probably interpreted as intended by the mapper. However, this is not a granite of course.

  This function performs some additional testing and can thus also theoretically throw an error like all other functions which parse the time.

- `let prettified = oh.prettifyValue(argument_hash);`

  Return a prettified version of the opening_hours value. The value is generated by putting the tokens back together to a string.

  The function accepts an optional hash.

  The key 'conf' can hold another hash with configuration options. One example:

  ```js
  {
      rule_sep_string: '\n',
      print_semicolon: false
  }
  ```

  Look in the source code if you need more.

  If the key 'rule_index' is a number then only the corresponding rule will be prettified.

  If the key 'get_internals' is true then an object containing internal stuff will be returned instead. The format of this internal object may change in minor release.

- `let every_week_is_same = oh.isWeekStable();`

  Checks whether open intervals are same for every week. Useful for giving a user hint whether time table may change for another week.

- `let is_equal_to = oh.isEqualTo(new opening_hours('We 12:00-16:00'), start_date);`

  Check if this opening_hours object has the same meaning as the given
  opening_hours object (evaluates to the same state for every given time).

  The optional parameter `start_date` (Date object) specifies the start date at which the comparison will begin.

  `is_equal_to` is a list:

  1. Boolean which is true if both opening_hours objects have the same
     meaning, otherwise false.

  2. Object hash containing more information when the given objects differ in meaning. Example:

     ```js
     {
       "matching_rule": 1,
       "matching_rule_other": 0,
       "deviation_for_time": {
         "1445637600000": [
           "getState",
           "getUnknown",
           "getComment",
         ],
       },
     }
     ```

### Simple API

This API is useful for one-shot checks, but for iteration over intervals you should use the more efficient [iterator API][ohlib.iterator-api].

- `let is_open = oh.getState(date);`

  Checks whether the facility is open at the given *date*. You may omit *date* to use current date.

- `let unknown = oh.getUnknown(date);`

  Checks whether the opening state is conditional or unknown at the given *date*. You may omit *date* to use current date.
  Conditions can be expressed in comments.
  If unknown is true then is_open will be false since it is not sure if it is open.

- `let state_string = oh.getStateString(date, past);`

  Return state string at given *date*. Either 'open', 'unknown' or 'closed?'. You may omit *date* to use current date.

  If the boolean parameter `past` is true you will get 'closed' else you will get 'close'.

- `let comment = oh.getComment(date);`

  Returns the comment (if one is specified) for the facility at the given *date*. You may omit *date* to use current date.
  Comments can be specified for any state.

  If no comment is specified this function will return undefined.

- `let next_change = oh.getNextChange(date, limit);`

  Returns date of next state change. You may omit *date* to use current date.

  Returns undefined if the next change cannot be found. This may happen if the state won't ever change (e.g. `24/7`) or if search goes beyond *limit* (which is *date* + ~5 years if omitted).

- `let rule_index = oh.getMatchingRule(date);`

  Returns the internal rule number of the matching rule. You may omit *date* to use current date.
  A opening_hours string can consist of multiple rules from which one of them is used to evaluate the state for a given point in time. If no rule applies, the state will be closed and this function returns undefined.

  To prettify this rule, you can specify `rule_index` as parameter for `oh.prettifyValue` like this:

  ```js
  let matching_rule = oh.prettifyValue({ rule_index: rule_index });
  ```

### High-level API

Here and below, unless noted otherwise, all arguments are expected to be and all output will be in the form of Date objects.

- `let intervals = oh.getOpenIntervals(from, to);`

  Returns array of open intervals in a given range, in a form of

  ```JavaScript
  [ [ from1, to1, unknown1, comment1 ], [ from2, to2, unknown2, comment2 ] ]
  ```

  Intervals are cropped with the input range.

- `let duration = oh.getOpenDuration(from, to);`

  Returns an array with two durations for a given date range, in milliseconds. The first element is the duration for which the facility is open and the second is the duration for which the facility is maybe open (unknown is used).

### Iterator API

- `let iterator = oh.getIterator(date);`

  Constructs an iterator which can go through open/close points, starting at *date*. You may omit *date* to use current date.

- `let current_date = iterator.getDate();`

  Returns current iterator position.

- `iterator.setDate(date);`

  Set iterator position to date.

- `let is_open = iterator.getState();`

  Returns whether the facility is open at the current iterator position.

- `let unknown = iterator.getUnknown();`

  Checks whether the opening state is conditional or unknown at the current iterator position.

- `let state_string = iterator.getStateString(past);`

  Return state string. Either 'open', 'unknown' or 'closed?'.

  If the boolean parameter `past` is true you will get 'closed' else you will get 'close'.

- `let comment = iterator.getComment();`

  Returns the comment (if one is specified) for the facility at the current iterator position in time.

  If no comment is specified this function will return undefined.

- `let matching_rule = iterator.getMatchingRule();`

  Returns the index of the matching rule starting with zero.

- `let had_advanced = iterator.advance(limit);`

  Advances an iterator to the next position, but not further than *limit* (which is current position + ~5 years if omitted and is used to prevent infinite loop on non-periodic opening_hours, e.g. `24/7`), returns whether the iterator was moved.

  For instance, returns false if the iterator would go beyond *limit* or if there's no next position (`24/7` case).

## Features

Almost everything from opening_hours definition is supported, as well as some extensions (indicated as **EXT** below).

**WARN** indicates that the syntax element is evaluated correctly, but there is a better way to express this. A warning will be shown.

- See the [formal specification][oh:specification] as of version `0.6.0`.

- Opening hours consist of multiple rules separated by semicolon (`Mo 10:00-20:00; Tu 12:00-18:00`) or by other separators as follows.

- Supports [fallback rules][oh:specification:fallback rule] (`We-Fr 10:00-24:00 open "it is open" || "please call"`).

  Note that only the rule which starts with `||` is a fallback rule. Other rules which might follow are considered as normal rules.

- Supports [additional rules][oh:specification:additional rule] or cooperative values (`Mo-Fr 08:00-12:00, We 14:00-18:00`). A additional rule is treated exactly the same as a normal rule, except that a additional rule does not overwrite the day for which it applies. Note that a additional rule does not use any data from previous or from following rules.

  A rule does only count as additional rule if the previous rule ends with a time range (`12:00-14:00, We 16:00-18:00`, but does not continue with a time range of course), a comment (`12:00-14:00 "call us", We 16:00-18:00`) or the keywords 'open', 'unknown' or 'closed' (`12:00-14:00 unknown, We 16:00-18:00`)

- Rule may use `off` keyword to indicate that the facility is closed at that time (`Mo-Fr 10:00-20:00; 12:00-14:00 off`). `closed` can be used instead if you like. They mean exactly the same.

- Rule consists of multiple date (`Mo-Fr`, `Jan-Feb`, `week 2-10`, `Jan 10-Feb 10`) and time (`12:00-16:00`, `12:00-14:00,16:00-18:00`) conditions

- If a rule's date condition overlap with previous rule, it overrides (as opposed to extends) the previous rule. E.g. `Mo-Fr 10:00-16:00; We 12:00-18:00` means that on Wednesday the facility is open from 12:00 till 18:00, not from 10:00 to 18:00.

  This also applies for time ranges spanning midnight. This is the only way to be consistent. Example: `22:00-02:00; Th 12:00-14:00`. By not overriding specifically for midnight ranges, we could get either `22:00-02:00; Th 00:00-02:00,12:00-14:00,22:00-02:00` or `22:00-02:00; Th 00:00-02:00,12:00-14:00` and deciding which interpretation was really intended cannot always be guessed.

- Date ranges (calendar ranges) can be separated from the time range by a colon (`Jan 10-Feb 10: 07:30-12:00`) but this is not required. This was implemented to also parse the syntax proposed by [Netzwolf][oh:spec:separator_for_readability].

### Time ranges

- Supports sets of time ranges (`10:00-12:00,14:00-16:00`)

  - **WARN:** Accept `10-12,14-16` as abbreviation for the previous example. Please don’t use this as this is not very explicit.
  - Correctly supports ranges wrapping over midnight (`10:00-26:00`, `10:00-02:00`)

- Supports 24/7 keyword (`24/7`, which means always open. Use [state keywords][ohlib.states] to express always closed.)

  - **WARN:** 24/7 is handled as a synonym for `00:00-24:00`, so it can be misused like `Mo-Fr 24/7` and still interpreted (but it is not really correct, you should avoid it or replace it with "open". A warning will be given if you use it anyway for that purpose)

    *The use of 24/7 in such way is never needed, you should use `24/7` only when it applies to the entire week.* In cases where a facility is really open 24 hours 7 days a week thats where this value is for.

- **WARN:** Supports omitting time range (`Mo-Fr; Tu off`)

  *A warning will be given as this is not very explicit. See [issue 49](https://github.com/opening-hours/opening_hours.js/issues/49).*

- **WARN:** Supports space as time interval separator, i.e. `Mo 12:00-14:00,16:00-20:00` and `Mo 12:00-14:00 16:00-20:00` are the same thing
- **WARN:** Supports dot as time separator (`12.00-16.00`)
- Complete support for dawn/sunrise/sunset/dusk (variable times) keywords (`10:00-sunset`, `dawn-dusk`). To calculate the correct values, the latitude and longitude are required which are included in the JSON returned by [Nominatim] \(see in the [Library API][ohlib.library-api] how to provide it\). The calculation is done by [suncalc].

  If the coordinates are missing, constant times will be used (dawn: '05:30', sunrise: '06:00', sunset: '18:00', dusk: '18:30').

  If the end time (second time in time range) is near the sunrise (for instance `sunrise-08:00`) than it can happen that the sunrise would actually be after 08:00 which would normally be interpreted as as time spanning midnight. But with variable times, this only partly applies. The rule here is that if the end time is lesser than the constant time (or the actual time) for the variable time in the start time (in that example sunrise: '06:00') then it is interpreted as the end time spanning over midnight. So this would be a valid time range spanning midnight: `sunrise-05:59`.

  A second thing to notice is that if the variable time becomes greater than the end time and the end time is greater than the constant time than this time range will be ignored (e.g `sunrise-08:00` becomes `08:03-08:00` for one day, it is ignored for this day).

- Support calculation with variable times (e.g. `sunrise-(sunset-00:30)`: meaning that the time range ends 30 minutes before sunset; `(sunrise+01:02)-(sunset-00:30)`).

- Supports open end (`10:00+`). It is interpreted as state unknown and the comment "Specified as open end. Closing time was guessed." if there is no comment specified.

  If a facility is open for a fix time followed by open end the shortcut `14:00-17:00+` can be used (see also [proposal page](https://wiki.openstreetmap.org/wiki/Proposed_features/opening_hours_open_end_fixed_time_extension)).

  Open end applies until the end of the day if the opening time is before 17:00. If the opening time is between 17:00 and 21:59 the open end time ends 10 hours after the opening. And if the opening time is after 22:00 (including 22:00) the closing time will be interpreted as 8 hours after the opening time.

- `07:00+,12:00-16:00`: If an open end time is used in a way that the first time range includes the second one (`07:00+` is interpreted as `07:00-24:00` and thus includes the complete `12:00-16:00` time selector), the second time selector cuts of the part which would follow after 16:00.

### Points in time

- In mode 1 or 2, points in time are evaluated. Example: `Mo-Fr 12:00,15:00,18:00; Su (sunrise+01:00)`. Currently a point in time is interpreted as an interval of one minute. It was the easiest thing to implement and has some advantages. See [here](https://github.com/AMDmi3/opening_hours.js/issues/12) for discussion.
- To express regular points in time, like each hour, a abbreviation can be used to express the previous example `Mo-Fr 12:00-18:00/03:00` which means from 12:00 to 18:00 every three hours.

### Weekday ranges

- Supports set of weekdays and weekday ranges (`Mo-We,Fr`)
- Supports weekdays which wrap to the next week (`Fr-Mo`)
- Supports constrained weekdays (`Th[1,2-3]`, `Fr[-1]`)
- Supports calculations based on constrained weekdays (`Sa[-1],Sa[-1] +1 day` e.g. last weekend in the month, this also works if Sunday is in the next month)

### Holidays

- Supports public holidays (`open; PH off`, `PH 12:00-13:00`).

  - Countries with PH definition:

    - [Argentina][ph-ar]
    - [Australia][ph-au]
    - [Austria][ph-at] ([footnotes][ph-at] are ignored)
    - [Belgium][ph-be] (See [issue #115](https://github.com/opening-hours/opening_hours.js/issues/115) for details)
    - [Brazil][ph-br]
    - [Canada][ph-ca]
    - China (Only fixed-date holidays. See https://github.com/opening-hours/opening_hours.js/issues/408)
    - [Croatia][ph-hr]
    - [Czech Republic][ph-cz]
    - [Denmark][ph-dk]
    - [England, Wales, Scotland and Northern Ireland][ph-gb]
    - [France][ph-fr]
    - Finland
    - [Germany][ph-de] ([footnotes][ph-de] are ignored)
    - Greece
    - [Hungary][ph-hu]
    - [Ireland][ph-ie]
    - [Italy][ph-it] (Without the Saint Patron day, see [comment](https://github.com/opening-hours/opening_hours.js/pull/74#issuecomment-76194891))
    - [Ivory Coast][ph-ci] (Without the four islamic holidays because they can not be calculated and depend on subjective ad-hoc definition)
    - Japan
    - Luxembourg
    - Namibia
    - [Netherlands][ph-ne]
    - [New Zealand][ph-nz] (Provincial holiday is not handled. See [PR #333](https://github.com/opening-hours/opening_hours.js/pull/333) for details.)
    - Norway
    - [Poland][ph-nl]
    - [Romania][ph-ro]
    - [Russian][ph-ru]
    - Slovakia
    - [Slovenia][ph-si]
    - Spain
    - [Sweden][ph-se]
    - [Switzerland][ph-ch]
    - [Ukraine][ph-ua]
    - [United states][ph-us] (Some special cases are [currently not handled](https://github.com/opening-hours/opening_hours.js/issues/69#issuecomment-74103181))
    - [Vietnam][ph-vn] (Lunar calendar-based public holidays cannot currently be calculated by the library and are missing. See https://github.com/opening-hours/opening_hours.js/pull/388)

  - **EXT:** Supports limited calculations based on public holidays (e.g. `Sa,PH -1 day open`). The only two possibilities are currently +1 and -1. All other cases are not handled. This seems to be enough because the only thing which is really used is -1.

- Support for school holidays (`SH 10:00-14:00`).

  School holidays are automatically sourced from the [OpenHolidays API](https://openholidaysapi.org) for 33 countries (from 2020 onwards). Update data by running:

  ```bash
  node scripts/fetch-school-holidays.mjs
  ```

  For details see [src/holidays/README.md](src/holidays/README.md).

- There can be two cases which need to be separated (this applies for PH and SH):

  1. `Mo-Fr,PH`: The facility is open Mo-Fr and PH. If PH is a Sunday for example the facility is also open. This is the default case.
  2. **EXT:** `PH Mo-Fr`: The facility is only open if a PH falls on Mo-Fr. For example if a PH is on the weekday Wednesday then the facility will be open, if PH is Saturday it will be closed.

- If there is no comment specified by the rule, the name of the holiday is used as comment.

- To evaluate the correct holidays, the country code and the state (could be omitted but this will probably result in less correctness) are required which are included in the JSON returned by [Nominatim] \(see in the [Library API][ohlib.library-api] how to provide it\).

- If your country or state is missing or wrong you can [add it][ohlib.contribute.holidays]. Please note that issues for missing or wrong holidays cannot be handled. There are just to many countries for them to be handled by one spare time maintainer. See also [issue #300](https://github.com/opening-hours/opening_hours.js/issues/300).

### Month ranges

- Supports set of months and month ranges (`Jan,Mar-Apr`)
- Supports months which wrap to the next year (`Dec-Jan`)

### Monthday ranges

- Supports monthday ranges across multiple months (`Jan 01-Feb 03 10:00-20:00`)
- Supports monthday ranges within single month (`Jan 01-26 10:00-20:00`), with periods as well `Jan 01-29/7 10:00-20:00`, period equals 1 should be avoided)
- Supports monthday ranges with years (`2013 Dec 31-2014 Jan 02 10:00-20:00`, `2012 Jan 23-31 10:00-24:00`)
- Supports monthday ranges based on constrained weekdays (`Jan Su[1]-Feb 03 10:00-20:00`)
- Supports calculation based on constrained weekdays in monthday range (`Jan Su[1] +1 day-Feb 03 10:00-20:00`)
- Supports movable events like easter (`easter - Apr 20: open "Around easter"`) Note that if easter would be after the 20th of April for one year, this will be interpreted as spanning into the next year currently.
- Supports calculations based on movable events (`2012 easter - 2 days - 2012 easter + 2 days: open "Around easter"`)
- Supports multiple monthday ranges separated by a comma (`Jan 23-31/3,Feb 1-12,Mar 1`)

### Week ranges

- [The ISO 8601 definition for week 01 is the week with the year's first Thursday in it.](https://en.wikipedia.org/wiki/ISO_week_date#First_week)
- Supports week ranges (`week 04-07 10:00-20:00`)
- Supports periodic weeks (`week 2-53/2 10:00-20:00`)
- Supports multiple week ranges (`week 1,3-5,7-30/2 10:00-20:00`)

### Year ranges

- **EXT:** Supports year ranges (`2013,2015,2050-2053,2055/2,2020-2029/3 10:00-20:00`)

- **EXT:** Supports periodic year (either limited by range or unlimited starting with given year) (`2020-2029/3,2055/2 10:00-20:00`)

  There is one exception. It is not necessary to use a year range with a period of one (`2055-2066/1 10:00-20:00`) because this means the same as just the year range without the period (`2055-2066 10:00-20:00`) and should be expressed like this …

  The _oh.getWarnings()_ function will give you a warning if you use this anyway.

- **EXT:** Supports way to say that a facility is open (or closed) from a specified year without limit in the future (`2055+ 10:00-20:00`)

### States

- A facility can be in two main states for a given point in time: `open` (true) or `closed` (false).

  - But since the state can also depend on other information (e.g. weather depending, call us) than just the time, a third state (called `unknown`) can be expressed (`Mo unknown; Th-Fr 09:00-18:00 open`)

    In that case the main state is false and unknown is true for Monday.

- instead of `closed` `off` will also work

### Comments

- Supports (additional) comments (`Mo unknown "on appointment"; Th-Fr 09:00-18:00 open "female only"; Su closed "really"`)

  - The string which is delimited by double-quotes can contain any character (except a double-quote sign)
  - unknown can be omitted (just a comment (without [state][ohlib.states]) will also result in unknown)
  - value can also be just a double-quoted string (`"on appointment"`) which will result in unknown for any given time.

## Testing

This project has become so complex that development without extensive testing would be madness.

### Regression testing

A node.js based test framework is bundled. You can run it with `node test/test.js` or with `make check-full`. Note that the number of lines of the test framework almost match up with the number of lines of the actual implementation :)

Included in the `test` directory are the log outputs of the previous testing runs. By comparing to these logs and assuming that the checkedd-in logs are always passing, it allows the developer to validate if the number of passed tests have changed since the last feature implementation.

The current results of this test are also tracked in the repository and can be viewed [here](test/test.en.log). Note that this file uses [ANSI escape code](https://en.wikipedia.org/wiki/ANSI_escape_code) which can be interpreted by cat in the terminal. `make check` compares the test output with the output from the last commit and shows you a diff.

### Testing with real data

#### Large scale

To see how this library performs in the real OpenStreetMap world you can run `make osm-tag-data-taginfo-check` to test the parser with real data from [taginfo].

By default, the test downloads **all available values** from taginfo. As of December 2025, this library can parse **99.3%** of all opening_hours values in OSM (955,260/978,867 unique values, with duplicates: 4,358,786 total). If identical values appear multiple times, each occurrence counts.

For faster testing during development, you can limit the number of values: `make osm-tag-data-taginfo-check MAX_VALUES=10000`

#### Small scale

A python script to search with regular expressions over OSM opening_hours style tags is bundled. You can run it with `make run-regex_search` or `./scripts/regex_search.py` which will search on the opening_hours tag. To search over different tags either use `make run-regex_search "SEARCH=$tagname"` (this also makes sure that the tag you would like to search on will be downloaded if necessary) or run `./scripts/regex_search.py $path_to_downloaded_taginfo_json_file`.

This script not only shows you if the found value can be processed with this library or not, it also indicates using different colors if the facility is currently open (open: green, unknown: magenta, closed: blue).

It also offers filter options (e.g. only errors) and additional things like a link to [taginfo].

Hint: If you want to do quality assurance on tags like opening_hours you can also use this script and enter a regex for values you would like to check and correct (if you have no particular case just enter a dot which matches any character which results in every value being selected). Now you see how many values match your search pattern. As you do QA you probably only want to see values which can not be evaluated. To do this enter the filter "failed".
To improve the speed of fixing errors, a [feature](https://github.com/opening-hours/opening_hours.js/issues/29) was added to load those failed values in JOSM. To enable this, append " josm" to the input line. So you will have something like "failed josm" as argument. Now you can hit enter and go through the values.

[taginfo]: https://taginfo.openstreetmap.org/

### Test it yourself (the geeky way)

You want to try some opening_hours yourself? Just run `make run-interactive_testing` or `node ./scripts/interactive_testing.js` which will open an primitive interpreter. Just write your opening_hours value and hit enter and you will see if it can be processed (with current state) or not (with error message). The answer is JSON encoded.

Testing is much easier by now. Have a look at the [evaluation tool][ohlib.evaluation-tool]. The reason why this peace of code was written is to have an interface which can be accessed from other programming languages. It is used by the python module [pyopening_hours].

## Performance

Simple node.js based benchmark is bundled. You can run it with `node ./scripts/benchmark.mjs` or with `make benchmark`.

The library allows ~9k/sec constructor calls and ~9k/sec openIntervals() calls with one week period on author's Intel(R) Core(TM) i7-6600U CPU @ 2.60GHz running NodeJS 7.7.1, Linux 4.4.38-11 virtualized under Xen/Qubes OS). This may further improve in the future.

## Used by other projects

This library is known to the used by the following projects:

| Project                                                          | Additional Information                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [osm24.eu](https://github.com/dotevo/osm24)                      |
| [OpenBeerMap](https://openbeermap.github.io)                     | [issue for integration](https://github.com/OpenBeerMap/OpenBeerMap.github.io/issues/25)                                                                                                                                                                             |
| [opening_hours_map]                                              |
| [ulm-opening-hours](https://github.com/cmichi/ulm-opening-hours) |
| [YoHours][]                                                      | A simple editor for OpenStreetMap opening hours, [source code](https://framagit.org/PanierAvide/YoHours)                                                                                                                                 |
| [opening_hours_server.js]                                        | A little server answering query‘s for opening_hours and check if they can be evaluated.                                                                                                                                                                             |
| [opening_hours-statistics]                                       | Visualization of the data quality and growth over time in OSM.                                                                                                                                                                                                      |
| [www.openstreetmap.hu](https://www.openstreetmap.hu/)            | old version of this library, see also <https://github.com/AMDmi3/opening_hours.js/issues/19>                                                                                                                                                                        |
| [osmopeninghours][]                                              | JavaScript library which provides a more abstract, specialized API and Italian localization. It returns a JavaScript object for a given time interval (see [example.json](https://github.com/digitalxmobile-dev/osmopeninghours/blob/master/example/example.json)). |
| [ComplexAlarm](https://github.com/ypid/ComplexAlarm)             | Java/Android. Using the JS implementation through [js-evaluator-for-android](https://github.com/evgenyneu/js-evaluator-for-android).                                                                                                                                |
| [MapComplete](https://github.com/pietervdvn/MapComplete)         | An OpenStreetMap-editor which aims to be really simple to use by offering multiple themes                                                                                                                                                                           |

If you use this library please let me know.

## Projects that previously used the library

| Project                                | Additional Information                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [JOSM](https://josm.openstreetmap.de/) | [ticket for integration in 13.11](https://josm.openstreetmap.de/ticket/9157), [ticket for removal in 20.03](https://josm.openstreetmap.de/ticket/18140) |

### YoHours

YoHours currently only checks with this lib if the opening_hours value can be evaluated at all and links to the [evaluation tool][ohlib.evaluation-tool] if yes. There might be more integration with YoHours and opening_hours.js in the future. See <https://github.com/PanierAvide/panieravide.github.io/issues/2>

[opening_hours_map]: https://github.com/opening-hours/opening_hours_map
[pyopening_hours]: https://github.com/ypid/pyopening_hours
[opening_hours_server.js]: https://github.com/ypid/opening_hours_server.js
[opening_hours-statistics]: https://github.com/ypid/opening_hours-statistics
[yohours]: https://projets.pavie.info/yohours/
[osmopeninghours]: https://github.com/digitalxmobile-dev/osmopeninghours

## Bindings and ports

- Python: <https://github.com/ypid/pyopening_hours> (using the JS implementation through Python subprocess and JSON passing to a Node.JS process executing the JS implementation, access to the [simple API](https://github.com/opening-hours/opening_hours.js#simple-api))
- Java/Nashorn: <https://josm.openstreetmap.de/ticket/11755> (using the JS implementation through [Nashorn](https://openjdk.java.net/projects/nashorn/), Status: Nashorn provides access to all features of the JS implementation)
- Java/Android: <https://github.com/ypid/ComplexAlarm> (using the JS implementation through [js-evaluator-for-android](https://github.com/evgenyneu/js-evaluator-for-android), Status: Library runs on Android, Return code/Result passing from JS to Java not yet clear/tested)

## Other implementations

- Java: <https://github.com/simonpoole/OpeningHoursParser> (Implementation using [JavaCC](https://de.wikipedia.org/wiki/JavaCC) as Lexer/Parser compiler generator, Status: Basic language features implemented)
- PHP: <https://github.com/kenguest/Services_Openstreetmap/blob/master/Services/OpenStreetMap/OpeningHours.php> (reimplementation, Status: Basic language features implemented)
- C: <https://github.com/anthill/C_OpeningHours> Implementation in C.
- JavaScript: <https://github.com/ubahnverleih/simple-opening-hours> In the words of the author "It only supports the human readable parts and not this complete crazy overengineered specification." Only covers a very small subset of the spec and API, which is a design goal. There is no clear definition/spec what "simple" or "crazy" means (seems subjective and might change over time, ref: [open end syntax listed as TODO in the code](https://github.com/ubahnverleih/simple-opening-hours/blob/a81c9f2b260114be049e335b6a751977f9425919/src/simple-opening-hours.ts#L32)). Also refer to [issue 143](https://github.com/opening-hours/opening_hours.js/issues/143#issuecomment-259721731).
- Ruby: <https://github.com/Publidata/opening_hours_converter>

## Related links

- [fossgis project page on the OSM wiki][fossgis-project]

## ToDo

List of missing features which can currently not be expressing in any other way without much pain.
Please share your opinion on the [talk page](https://wiki.openstreetmap.org/wiki/Talk:Key:opening_hours) (or the discussion page of the proposal if that does exist) if you have any idea how to express this (better).

- Select single (or more, comma separated) (school|public) holidays. [Proposed syntax](https://wiki.openstreetmap.org/wiki/Proposed_features/opening_hours_holiday_select): `SH(Sommerferien)`
- Depending on moon position like `"low tide only"`. Suncalc lib does support moon position. Syntax needed.
- If weekday is PH than the facility will be open weekday-1 this week. Syntax something like: `We if (We +1 day == PH) else Th` ???

List of features which can make writing easier:

- `May-Aug: (Mo-Th 9:00-20:00; Fr 11:00-22:00; Sa-Su 11:00-20:00)`

- Last day of the month.

  ```text
  Jan 31,Mar 01 -1 day,Mar 31,Apr 30,May 31,Jun 30,Jul 31,Aug 31,Sep 30,Oct 31,Nov 30,Dec 31 open
  ```

  Better syntax needed? This example is valid even if the evaluation tool does not agree. It simily does not yet implement this.

  Ref and source: <https://forum.openstreetmap.org/viewtopic.php?pid=663026#p663026>

## How to contribute

If you want to contribute to this project, please read the [contribution guidelines](CONTRIBUTING.md).

## Maintainers

* [Dmitry Marakasov](https://github.com/AMDmi3) <amdmi3@amdmi3.ru>: Maintainer from 2012-12 until 2014-05. Initial coding and design and all basic features like time ranges, week ranges, month ranges and week ranges.
* [Robin Schneider](https://me.ypid.de/) <ypid@riseup.net>: Maintainer from 2013-09 until 2025-05. Added support for years, holidays, unknown, comments, open end, fallback/additional rules (and more), wrote getWarnings, prettifyValue, translated demo page to English and German and extended it to enter values yourself (now called [evaluation tool][ohlib.evaluation-tool]).
* [Kristjan ESPERANTO](https://github.com/KristjanESPERANTO) [GitHub](https://github.com/KristjanESPERANTO)/[OSM](https://www.openstreetmap.org/user/Kristjan%20ESPERANTO): Maintainer since 2025-05. Switch from CommonJS to ESM. Sharpening the ESLint rules incl. handling the reported issues. HTML/CSS/JS/GitHub CI improvements, keeping the stack up-to-date. Major [evaluation tool][ohlib.evaluation-tool] Redesign.

## Contributors

Refer to the [Changelog](https://github.com/opening-hours/opening_hours.js/blob/main/CHANGELOG.md)

## Credits

- [Netzwolf](https://www.netzwolf.info/) (He developed the first and very feature complete JS implementation for opening_hours (time_domain.js, [mirror](https://openingh.ypid.de/netzwolf_mirror/)). His implementation did not create selector code to go through time as this library does (which is a more advanced design). time_domain.js has been withdrawn in favor of opening_hours.js but a few parts where reused (mainly the error tolerance and the online evaluation for the [evaluation tool][ohlib.evaluation-tool]). It was also very useful as prove and motivation that all those complex things used in the [opening_hours syntax][oh:specification] are possible to evaluate with software :) )
- Also thanks to FOSSGIS for hosting a public instance of this service. See the [wiki][fossgis-project].
- The [favicon.svg](/img/favicon.svg) is based on the file ic_action_add_alarm.png from the [Android Design Icons](https://developer.android.com/downloads/design/Android_Design_Icons_20131106.zip) which is licensed under [Creative Commons Attribution 2.5](https://creativecommons.org/licenses/by/2.5/). It represents a clock next to the most common opening_hours value (by far) which is `24/7` and a check mark.

## Stats

- [Open HUB](https://www.openhub.net/p/opening_hours)

## License

As of version 3.4, opening_hours.js is licensed under the [GNU Lesser General Public License v3.0](<https://tldrlegal.com/license/gnu-lesser-general-public-license-v3-(lgpl-3)>) only.

Note that the original work from Dmitry Marakasov is published under the BSD 2-clause "Simplified" (BSD-2-Clause) license which is included in this repository under the commit hash [b2e11df02c76338a3a32ec0d4e964330d48bdd2d](https://github.com/opening-hours/opening_hours.js/tree/b2e11df02c76338a3a32ec0d4e964330d48bdd2d).

<https://reuse.software> is used. The year of initial publication is used and not updated. When you as new author make copyrightable changes, you are free of course to add a `SPDX-FileCopyrightText` line to the file(s) you changed with the year of the contribution. Please use a format like this:

```text
SPDX-FileCopyrightText: © 2021 Humble Hacker <hh@example.org>
```

See also:

- <https://reuse.software/faq/#years-copyright>
- <https://matija.suklje.name/how-and-why-to-properly-write-copyright-statements-in-your-code#why-not-bump-the-year-on-change>

<!-- Links {{{ -->

[nominatim]: https://wiki.openstreetmap.org/wiki/Nominatim#Reverse_Geocoding_.2F_Address_lookup
[suncalc]: https://github.com/mourner/suncalc
[fossgis-project]: https://wiki.openstreetmap.org/wiki/FOSSGIS/Server/Projects/opening_hours.js
[releases on github]: /../../releases
[key:opening_hours]: https://wiki.openstreetmap.org/wiki/Key:opening_hours
[oh:specification]: https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification
[oh:specification:fallback rule]: https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#fallback_rule_separator
[oh:specification:additional rule]: https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#additional_rule_separator
[oh:spec:separator_for_readability]: https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification#separator_for_readability

<!-- Can not use short links only referring to the section inside the README.md any more because this will not work on other pages like https://www.npmjs.org/package/opening_hours.
Edit: This does also work on npmjs in this short version … -->

[ohlib.iterator-api]: #iterator-api
[ohlib.time-ranges]: #time-ranges
[ohlib.states]: #states
[ohlib.contribute.holidays]: /src/holidays/
[ohlib.evaluation-tool]: #evaluation-tool
[ohlib.library-api]: #library-api
[ohlib.npmjs]: https://www.npmjs.org/package/opening_hours
[ohlib.github]: https://github.com/opening-hours/opening_hours.js
[evaluation tool]: https://openingh.openstreetmap.de/evaluation_tool/
[ph-ar]: https://en.wikipedia.org/wiki/Public_holidays_in_Argentina
[ph-at]: https://de.wikipedia.org/wiki/Feiertage_in_%C3%96sterreich
[ph-au]: https://en.wikipedia.org/wiki/Public_holidays_in_Australia
[ph-be]: https://de.wikipedia.org/wiki/Feiertage_in_Belgien
[ph-br]: https://pt.wikipedia.org/wiki/Feriados_no_Brasil
[ph-ca]: https://en.wikipedia.org/wiki/Public_holidays_in_Canada
[ph-ch]: https://www.bj.admin.ch/dam/bj/de/data/publiservice/service/zivilprozessrecht/kant-feiertage.pdf.download.pdf/kant-feiertage.pdf
[ph-ci]: https://fr.wikipedia.org/wiki/Jour_f%C3%A9ri%C3%A9#_C%C3%B4te_d%27Ivoire
[ph-cz]: https://en.wikipedia.org/wiki/Public_holidays_in_the_Czech_Republic
[ph-de]: https://de.wikipedia.org/wiki/Feiertage_in_Deutschland
[ph-dk]: https://en.wikipedia.org/wiki/Public_holidays_in_Denmark
[ph-fr]: https://fr.wikipedia.org/wiki/F%C3%AAtes_et_jours_f%C3%A9ri%C3%A9s_en_France
[ph-gb]: https://www.gov.uk/bank-holidays#england-and-wales
[ph-hr]: https://en.wikipedia.org/wiki/Public_holidays_in_Croatia
[ph-hu]: https://en.wikipedia.org/wiki/Public_holidays_in_Hungary
[ph-ie]: https://en.wikipedia.org/wiki/Public_holidays_in_the_Republic_of_Ireland
[ph-it]: https://presidenza.governo.it/ufficio_cerimoniale/cerimoniale/giornate.html
[ph-ne]: https://nl.wikipedia.org/wiki/Feestdagen_in_Nederland
[ph-nl]: https://pl.wikipedia.org/wiki/Dni_wolne_od_pracy_w_Polsce
[ph-nz]: https://en.wikipedia.org/wiki/Public_holidays_in_New_Zealand
[ph-ro]: https://en.wikipedia.org/wiki/Public_holidays_in_Romania#Official_non-working_holidays
[ph-ru]: https://ru.wikipedia.org/wiki/%D0%9F%D1%80%D0%B0%D0%B7%D0%B4%D0%BD%D0%B8%D0%BA%D0%B8_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8
[ph-se]: https://en.wikipedia.org/wiki/Public_holidays_in_Sweden
[ph-si]: http://www.vlada.si/o_sloveniji/politicni_sistem/prazniki/
[ph-ua]: https://uk.wikipedia.org/wiki/%D0%A1%D0%B2%D1%8F%D1%82%D0%B0_%D1%82%D0%B0_%D0%BF%D0%B0%D0%BC%27%D1%8F%D1%82%D0%BD%D1%96_%D0%B4%D0%BD%D1%96_%D0%B2_%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%96
[ph-us]: https://en.wikipedia.org/wiki/Public_holidays_in_the_United_States
[ph-vn]: https://vi.wikipedia.org/wiki/C%C3%A1c_ng%C3%A0y_l%E1%BB%85_%E1%BB%9F_Vi%E1%BB%87t_Nam

<!-- }}} -->
