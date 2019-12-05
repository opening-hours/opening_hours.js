# holidays

## Deciding which holidays do apply

Because each country/culture has it‘s own important dates/events, holidays are defined on a country level. The country wide definition can be overwritten as needed by more specific definitions. Because this library works with the OSM ecosystem, those boundaries are based on OSM.

More specifically, the dataset on which a decision is made which holidays apply for a given location is based on [Nominatim](https://wiki.openstreetmap.org/wiki/Nominatim).

Consider this [Nominatim reverse geocoding][] query: https://nominatim.openstreetmap.org/reverse?format=json&lat=49.5487&lon=9.8160&zoom=18&addressdetails=1&accept-language=de,en

which returned the following JSON object:

```JSON
{
  "place_id": "2614369044",
  "licence": "Data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright",
  "osm_type": "way",
  "osm_id": "416578669",
  "lat": "49.5438327",
  "lon": "9.8155867",
  "display_name": "K 2847, Lauda-Königshofen, Main-Tauber-Kreis, Regierungsbezirk Stuttgart, Baden-Württemberg, 97922, Deutschland",
  "address": {
    "road": "K 2847",
    "town": "Lauda-Königshofen",
    "county": "Main-Tauber-Kreis",
    "state_district": "Regierungsbezirk Stuttgart",
    "state": "Baden-Württemberg",
    "postcode": "97922",
    "country": "Deutschland",
    "country_code": "de"
  },
  "boundingbox": [
    "49.5401338",
    "49.5523393",
    "9.8003394",
    "9.8274515"
  ]
}
```

as of 2016-06-29.

For now it has been enough to make a decision based on the fields `address.country_code` and `address.state` and thus only those two levels are supported right now in the data format. But the other information is there when needed, just extend the data format and source code to make use of it.

Note that you will need to use exactly the same values that Nominatim returns in the holiday definition data format which is described next.
Also note that the definition is based on Nominatim results in local language so you will likely need to adjust the `accept-language` URL get parameter from the example.
Refer to [Nominatim/Country Codes](https://wiki.openstreetmap.org/wiki/Nominatim/Country_Codes) for the country codes to language code mapping used for this specification.

You can use https://www.openstreetmap.org to get the coordinates for the states you are defining holidays for. Just search the state and position the map view on that state. Copy the latitude and longitude from the address bar. Consider this example of a permalink:

https://www.openstreetmap.org/#map=15/49.5487/9.8160

You can now use the `&lat=49.5487&lon=9.8160` parameters and use them instead of the once in the example Nominatim query shown above. Note that you should include this Nominatim URL for each defined state using the `_nominatim_url` key (see below).
The `_nominatim_url` is intended to make testing of the holiday definitions easier.

You can also specify `_nominatim_url` as a [Nominatim search][] directly using: https://nominatim.openstreetmap.org/search?format=json&country=Deutschland&state=Berlin&&zoom=18&addressdetails=1&limit=1&accept-language=de,en

## Holiday definition format

Data format version `3.0.0`. The data format will probably need to be adapted to support more holiday definitions in the future.
The data format versioning complies with [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

Each country has it’s own [YAML] file below [./holidays/][ohlib.holidays] with
the `address.country_code` as the file name. Lets take a look at the
(shortened) [`de.yaml`][ohlib.holidays.de.yaml] file as an example for the
general structure:

```YAML
---

_nominatim_url: 'https://nominatim.openstreetmap.org/reverse?format=json&lat=49.5487&lon=9.8160&zoom=18&addressdetails=1&accept-language=de,en'
# Somewhere in this country.

PH: []  # https://de.wikipedia.org/wiki/Feiertage_in_Deutschland

Baden-Württemberg:  # Does only apply in Baden-Württemberg
  _state_code: bw
  # Short string which can be used to refer to this entry in the test framework.
  # Needs to be unique for the country wide definition.
  # Should be specified when a commonly known code exists for the country/state.

  _nominatim_url: 'https://nominatim.openstreetmap.org/reverse?format=json&lat=49.5487&lon=9.8160&zoom=18&addressdetails=1&accept-language=de,en'
  # Somewhere in this state/state.

  # PH: []
  # This more specific rule set overwrites the country wide one (they are just ignored).
  # You may use this instead of the country wide with when one state
  # totally disagrees about how to do public holidays.

  SH: []
  # school holiday normally variate between states
```

The dictionary of the country either consists of `PH`, `SH` or the value of `address.state` (under the assumption that `address.state` will never be equal to `PH` or `SH`, probably a poor assumption, will need to be changed). When `PH` or `SH` is defined at this level it applies country wide. Those country wide definitions can be overwritten for an `address.state` by creating an additional dictionary with the name set to `address.state` and define `PH` or `SH` accordingly.

Note that the data format versions below 2.2.0 used JSON as data serialization language. The data structure remains the same as 2.1.0 however.

### Holiday definition format: PH

Now lets look at the public holiday (`PH`) definition in more detail. Each `PH` definition consists of an array of dictionaries for each holiday.

The following keys in the dictionary are supported:

* `name`: Holiday name in local language.
* `fixed_date`: Array consisting of two integers representing month and day.
* `variable_date`: The name of a movable event. The movable events and the formulas for calculating them for a given year are defined in the `getMovableEventsForYear` function.
* `offset`: Optional, defaults to 0. Offset in days to `variable_date`. Can only be used when `variable_date` is specified.
* `only_states`: Optional. Array of `address.state` strings for which the holiday applies.

Only one of `fixed_date` or `variable_date` can be used for one holiday.

```YAML
PH:  # https://de.wikipedia.org/wiki/Feiertage_in_Deutschland
  - {'name': 'Neujahrstag', 'fixed_date': [1, 1]}
  - {'name': 'Heilige Drei Könige', 'fixed_date': [1, 6], 'only_states': [Baden-Württemberg, Bayern, Sachsen-Anhalt]}
  - {'name': 'Tag der Arbeit', 'fixed_date': [5, 1]}
  - {'name': 'Karfreitag', 'variable_date': easter, 'offset': -2}
  - {'name': 'Ostersonntag', 'variable_date': easter, 'only_states': [Brandenburg]}
  - {'name': 'Ostermontag', 'variable_date': easter, 'offset': 1}
  - {'name': 'Christi Himmelfahrt', 'variable_date': easter, 'offset': 39}
  - {'name': 'Pfingstsonntag', 'variable_date': easter, 'offset': 49, 'only_states': [Brandenburg]}
  - {'name': 'Pfingstmontag', 'variable_date': easter, 'offset': 50}
  - {'name': 'Fronleichnam', 'variable_date': easter, 'offset': 60, 'only_states': [Baden-Württemberg, Bayern, Hessen, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland]}
  - {'name': 'Mariä Himmelfahrt', 'fixed_date': [8, 15], 'only_states': [Saarland]}
  - {'name': 'Tag der Deutschen Einheit', 'fixed_date': [10, 3]}
  - {'name': 'Reformationstag', 'fixed_date': [10, 31], 'only_states': [Brandenburg, Mecklenburg-Vorpommern, Sachsen, Sachsen-Anhalt, Thüringen]}
  - {'name': 'Allerheiligen', 'fixed_date': [11, 1], 'only_states': [Baden-Württemberg, Bayern, Nordrhein-Westfalen, Rheinland-Pfalz, Saarland]}
  - {'name': 'Buß- und Bettag', 'variable_date': nextWednesday16Nov, 'only_states': [Sachsen]}
  - {'name': '1. Weihnachtstag', 'fixed_date': [12, 25]}
  - {'name': '2. Weihnachtstag', 'fixed_date': [12, 26]}
```

Order matters, "first come first serve"/"first rule wins" is used to determine the name of a holiday. Evaluation is done in sequence so if two PH definitions evaluate to the same date for a given year, then the first definition is used.

### Holiday definition format: SH

School holiday (`SH`) definitions look a little bit different. This is because school holidays usually spans multiple days and because `SH` are different for each year/can not be mathematically calculated (at least the countries that @ypid has seen so far).
This is not very nice, but as we are hackers, we can just grab the data and convert it into the data format documented here. This is what @ypid has been doing for all states in Germany using the [hc] tool which was developed for use with this library and which fellows might find useful to convert holidays for other countries as well.

Now to the data format. It consists of an array of dictionaries. Each dictionary defines one school holiday. The `name` key defines the name of the school holiday, again preferably in local language. 4-digit string keys define the year with a time range definition as value.
The time range definition is an array consisting of a multiple of 4 integers.

Meaning of the integers:

1 and 2: Month and day of the first day of the school holiday.

3 and 4: Month and day of the last day of the school holiday.

Multiple time ranges can be defined.

```YAML
# Everything below is generated and kept up-to-date by hc.
SH:
  - name: Osterferien
    '2017': [4, 10, 4, 21]
    '2018': [3, 26, 4, 6]
  - name: Pfingstferien
    '2017': [6, 6, 6, 16]
    '2018': [5, 22, 6, 2]
  - name: Sommerferien
    '2017': [7, 27, 9, 9]
    '2018': [7, 26, 9, 8]
  - name: Herbstferien
    '2017': [10, 30, 11, 3]
    '2018': [10, 29, 11, 2]
  - name: Weihnachtsferien
    '2017': [12, 22, 1, 5]
    '2018': [12, 24, 1, 5]
```

Note that the 4-digit keys define the year are in fact strings. This is done for compatibility reasons.

If some school holidays are the same for all states, you can define them on the country level and they will be merged with the state level definition. Refer to `./at.yaml` for an example.

Also note that past year definitions can be removed from the definition as long as the SH dataset can be regenerated as a whole by Free Software without depending on none-cached resources and as long as the unit tests pass which might where written against previous holidays.
Two years in the past should be more then enough for the typical use cases of the library. In the far future, a compile time option might be provided to make this configurable to also make historian’s happy.

### Hints

* Note that you should include the definitions in order (see [#126](https://github.com/opening-hours/opening_hours.js/issues/126#issuecomment-156853794) for details).
* Please also add the source for this information (in form of an URL) as comment. Like shown in the examples above. Usually Wikipedia in the local language is a great source.
* You can use `make check-holidays` to check all regions of all countries.

[ohlib.holidays]: https://github.com/opening-hours/opening_hours.js/tree/master/holidays
[ohlib.holidays.de.yaml]: https://github.com/opening-hours/opening_hours.js/blob/master/holidays/de.yaml
[hc]: https://gitlab.com/ypid/hc
[YAML]: https://en.wikipedia.org/wiki/YAML
[Nominatim search]: https://wiki.openstreetmap.org/wiki/Nominatim#Search
[Nominatim reverse geocoding]: https://wiki.openstreetmap.org/wiki/Nominatim#Reverse_Geocoding
