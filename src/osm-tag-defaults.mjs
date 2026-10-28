// SPDX-FileCopyrightText: © opening_hours.js contributors
// SPDX-License-Identifier: LGPL-3.0-only

/** @typedef {{ mode: number, warn_for_PH_missing?: boolean, map?: Record<string, string> }} OsmTagDefault */

/** @type {Record<string, OsmTagDefault>} */
const OSM_TAG_DEFAULTS = {
    'opening_hours'       :  { 'mode' :  0, 'warn_for_PH_missing' :  true, },
    'collection_times'    :  { 'mode' :  2, },
    /* oh_mode 2: "including the hyphen because there are post boxes which are
     * emptied several (undefined) times or one (undefined) time in a certain time
     * frame. This shall be covered also.".
     * Ref: https://wiki.openstreetmap.org/wiki/Key:collection_times */
    'opening_hours:.+'     : { 'mode' :  0, },
    '^.+:opening_hours'    : { 'mode' :  0, },
    '^.+:opening_hours:.+' : { 'mode' :  0, },
    '^.+:conditional'      : { 'mode' :  0, },
    'smoking_hours'        : { 'mode' :  0, },
    'service_times'        : { 'mode' :  2, },
    'happy_hours'          : { 'mode' :  0, },
    'lit'                  : { 'mode' :  0,
        map: {
            'yes'      : 'sunset-sunrise open "specified as yes: At night (unknown time schedule or daylight detection)"',
            'automatic': 'unknown "specified as automatic: When someone enters the way the lights are turned on."',
            'no'       : 'off "specified as no: There are no lights installed."',
            'interval' : 'unknown "specified as interval"',
            'limited'  : 'unknown "specified as limited"',
        }
    },
};

/**
 * Resolve defaults for an OpenStreetMap tag key. Exact matches take precedence;
 * otherwise the last matching pattern wins.
 * @param {string} key Tag key, e.g. `opening_hours:kitchen`.
 * @returns {OsmTagDefault|undefined} Matching defaults, if any.
 */
export function resolveOsmTagDefault(key) {
    let matching_default;

    for (const [osm_key, tag_default] of Object.entries(OSM_TAG_DEFAULTS)) {
        if (key === osm_key) {
            return tag_default;
        }
        if (new RegExp(osm_key).test(key)) {
            matching_default = tag_default;
        }
    }
    return matching_default;
}

/**
 * Tag keys whose defaults request a warning when a public holiday selector is missing.
 * @returns {string[]} Keys with `warn_for_PH_missing` set.
 */
export function getKeysWithWarnForPHMissing() {
    return Object.keys(OSM_TAG_DEFAULTS).filter((key) => OSM_TAG_DEFAULTS[key].warn_for_PH_missing);
}
