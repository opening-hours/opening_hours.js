/**
 * SPDX-FileCopyrightText: © 2014 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
// Import dependencies
import i18next from '../../node_modules/i18next/dist/esm/i18next.bundled.js';
import { OpeningHoursTable } from './opening_hours_table.js';
import { mapCountryToLanguage } from './countryToLanguageMapping.js';
import { updateTimeButtonLabels } from './main.js';
import { YoHoursChecker } from './yohours_model.js';

// Access global variables set by main.js or UMD scripts
const { opening_hours, default_lat, default_lon } = window;

// Export date/time state
export let currentDateTime = {
    year: 2013,
    month: 0,  // January (0-indexed)
    day: 2,
    hour: 22,
    minute: 21
};

/* Constants {{{ */
const nominatim_api_url = 'https://nominatim.openstreetmap.org/reverse';
// let nominatim_api_url = 'https://open.mapquestapi.com/nominatim/v1/reverse.php';

const evaluation_tool_colors = {
    'ok': '#ADFF2F',
    'warn': '#FFA500',
    'error': '#DEB887',
};

const OSM_MAX_VALUE_LENGTH = 255;
/* }}} */

// load nominatim_data in JOSM {{{
// Using a different way to load stuff in JOSM than https://github.com/vibrog/OpenLinkMap/
// prevent josm remote plugin of showing message
export function josm(url_param) {
    fetch(`http://localhost:8111/${url_param}`)
        .then(response => {
            if (!response.ok) {
                alert(i18next.t('texts.JOSM remote conn error'));
            }
        })
        .catch(() => {
            alert(i18next.t('texts.JOSM remote conn error'));
        });
}
// }}}

// add calculation for calendar week to date {{{
export function dateAtWeek(date, week) {
    const minutes_in_day = 60 * 24;
    const msec_in_day    = 1000 * 60 * minutes_in_day;
    const msec_in_week   = msec_in_day * 7;

    const tmpdate = new Date(date.getFullYear(), 0, 1);
    tmpdate.setDate(1 - (tmpdate.getDay() + 6) % 7 + week * 7); // start of week n where week starts on Monday
    return Math.floor((date - tmpdate) / msec_in_week);
}
// }}}

/**
 * Reverse geocode coordinates to get localized place names from Nominatim.
 *
 * The names of countries and states are localized in OSM and opening_hours.js
 * (holidays) so we need to get the localized names from Nominatim as well.
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} preferredLanguage - Preferred language code (e.g., 'de', 'en')
 * @returns {Promise<Object>} Nominatim response with address data
 */
async function reverseGeocodeLocation(lat, lon, preferredLanguage) {
    // Cached response for default coordinates to avoid queries on initial load
    if (lat === 48.7769 && lon === 9.1844) {
        return { place_id: '159221147', licence: 'Data © OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright', osm_type: 'relation', osm_id: '62611', lat: '48.6296972', lon: '9.1949534', display_name: 'Baden-Württemberg, Deutschland', address: { state: 'Baden-Württemberg', country: 'Deutschland', country_code: 'de' }, boundingbox: ['47.5324787', '49.7912941', '7.5117461', '10.4955731'] };
    }

    const params = new URLSearchParams({
        format: 'json',
        lat: String(lat),
        lon: String(lon),
        zoom: '5',
        addressdetails: '1',
        email: 'ypid23@aol.de',
        'accept-language': preferredLanguage
    });

    async function fetchNominatim() {
        const response = await fetch(`${nominatim_api_url}?${params}`);
        if (!response.ok) {
            throw new Error(`Nominatim request failed: ${response.status}`);
        }
        return response.json();
    }

    let data = await fetchNominatim();

    // Refetch with localized language if country differs from preferred language
    const countryCode = data.address?.country_code;
    if (countryCode && countryCode !== preferredLanguage) {
        params.set('accept-language', mapCountryToLanguage(countryCode));
        data = await fetchNominatim();
    }

    return data;
}

/* JS for toggling examples on and off {{{ */
export function toggle(control){
    const elem = document.getElementById(control);

    if (elem.style.display === 'none') {
        elem.style.display = 'block';
    } else {
        elem.style.display = 'none';
    }
}
/* }}} */

export function copyToClipboard(text) {
    window.prompt('Copy to clipboard: Ctrl+C, Enter', text);
}

// Internal state for geocoding and date
let lat, lon, string_lat, string_lon, nominatim;
let date;

/* Helper functions for Evaluate {{{ */

function getFragmentIdentifier(selectorType) {
    switch(selectorType) {
        case '24/7':
            return 'selector_sequence';
        case 'state':
            return 'section:rule_modifier';
        case 'comment':
            return 'comment';
        default:
            return `selector:${selectorType}`;
    }
}

function generateRuleSeparatorHTML(ruleSeparator) {
    return `<span title="${i18next.t('texts.rule separator ' + ruleSeparator)}" class="rule_separator">` +
           `<a target="_blank" class="specification" href="${window.specification_url}#section:rule_separators">${ruleSeparator}</a></span><br>`;
}

function generateSelectorHTML(selectorType, selectorValue) {
    const fragmentIdentifier = getFragmentIdentifier(selectorType);
    const translationKey = selectorType.match(/(?:state|comment)/) ? 'modifier' : 'selector';

    return `<span title="${i18next.t(`words.${translationKey}`, { name: selectorType })}" class="${selectorType}">` +
           `<a target="_blank" class="specification" href="${window.specification_url}#${fragmentIdentifier}">${selectorValue}</a></span>`;
}

/**
 * Generate HTML explanation for prettified opening hours value.
 *
 * Converts the internal rule structure into human-readable HTML with links
 * to the specification for each selector type and rule separator.
 *
 * @param {Array} prettifiedValueArray - Array containing [rules, ruleSeparators]
 * @returns {string} HTML string with formatted value explanation
 */
function generateValueExplanation(prettifiedValueArray) {
    const [rules, ruleSeparators] = prettifiedValueArray;
    const parts = [
        `${i18next.t('texts.prettified value for displaying')}:<br />`,
        '<p class="value_explanation">'
    ];

    for (const [ruleIndex, selectors] of rules.entries()) {
        if (ruleIndex !== 0) {
            const separatorData = ruleSeparators[ruleIndex];
            const ruleSeparator = separatorData[1]
                ? ' ||'
                : (separatorData[0][0][1] === 'rule separator' ? ',' : ';');

            parts.push(generateRuleSeparatorHTML(ruleSeparator));
        }

        parts.push('<span class="one_rule">');

        for (const [selectorIndex, selector] of selectors.entries()) {
            const [typeArray, selectorValue] = selector;
            const selectorType = typeArray[2];

            parts.push(generateSelectorHTML(selectorType, selectorValue));

            const isLastSelector = selectorIndex === selectors.length - 1;
            if (!isLastSelector) {
                parts.push(' ');
            }
        }

        parts.push('</span>');
    }

    parts.push('</p></div>');
    return parts.join('');
}

function generateResultsHTML() {
    return `
        <div class="matching-rule-card">
            <div class="status-label">${i18next.t('texts.MatchingRule')}</div>
            <div class="matching-rule-value" id="matching-rule-display"></div>
        </div>
    `;
}

/**
 * Generate HTML display for deviation information between two opening hours values.
 *
 * @param {Object} oh1 - The first opening_hours instance
 * @param {Object} oh2 - The second opening_hours instance
 * @param {Object} deviationInfo - Deviation data from isEqualTo comparison
 * @returns {string} HTML string with formatted deviation information
 */
function generateDeviationHTML(oh1, oh2, deviationInfo) {
    const parts = ['<div class="diff-deviation">'];

    // Show which rules are matching
    if (typeof deviationInfo.matching_rule !== 'undefined' || typeof deviationInfo.matching_rule_other !== 'undefined') {
        parts.push('<div class="diff-rules">');
        parts.push(`<strong>${i18next.t('texts.Affected rules')}:</strong> `);
        if (typeof deviationInfo.matching_rule !== 'undefined') {
            parts.push(`${i18next.t('texts.Original')}: ${i18next.t('texts.Rule')} ${deviationInfo.matching_rule + 1}`);
        }
        if (typeof deviationInfo.matching_rule_other !== 'undefined') {
            parts.push(` / ${i18next.t('texts.Comparison')}: ${i18next.t('texts.Rule')} ${deviationInfo.matching_rule_other + 1}`);
        }
        parts.push('</div>');
    }

    // Show time-based deviations with actual values
    if (deviationInfo.deviation_for_time && typeof deviationInfo.deviation_for_time === 'object') {
        for (const [timeCode, deviations] of Object.entries(deviationInfo.deviation_for_time)) {
            const deviationDate = new Date(parseInt(timeCode));
            const timeString = deviationDate.toLocaleString(i18next.language, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

            // Build readable comparison lines
            const line1Parts = [];
            const line2Parts = [];

            if (deviations.includes('getState') || deviations.includes('getDate')) {
                const state1 = oh1.getState(deviationDate);
                const state2 = oh2.getState(deviationDate);
                const unknown1 = oh1.getUnknown(deviationDate);
                const unknown2 = oh2.getUnknown(deviationDate);

                const stateText1 = unknown1 ? i18next.t('words.unknown') : i18next.t(`words.${state1 ? 'open' : 'closed'}`);
                const stateText2 = unknown2 ? i18next.t('words.unknown') : i18next.t(`words.${state2 ? 'open' : 'closed'}`);

                line1Parts.push(stateText1);
                line2Parts.push(stateText2);
            }

            if (deviations.includes('getComment')) {
                const comment1 = oh1.getComment(deviationDate);
                const comment2 = oh2.getComment(deviationDate);

                if (comment1) line1Parts.push(`"${comment1}"`);
                if (comment2) line2Parts.push(`"${comment2}"`);
            }

            const comparisonHTML = `
                <div class="diff-times">
                    <strong>${i18next.t('texts.Deviation at')} ${timeString}</strong><br>
                    ${i18next.t('texts.Original')}: ${line1Parts.join(', ')}<br>
                    ${i18next.t('texts.Comparison')}: ${line2Parts.join(', ')}
                </div>
            `;

            parts.push(comparisonHTML);
        }
    }

    // Show raw JSON for developers
    const deviationJson = JSON.stringify(deviationInfo);
    parts.push(`<div class="diff-raw"><code>${deviationJson}</code></div>`);

    parts.push('</div>');
    return parts.join('');
}

/**
 * Compare opening hours value with a diff value and update UI accordingly.
 *
 * Compares the current opening hours object with another value and sets
 * the background color of the diff input field to indicate the result:
 * - Green (ok): Values are equivalent
 * - Orange (warn): Values differ, shows deviation details in #compare-result
 * - Brown (error): Diff value failed to parse
 *
 * @param {Object} oh - The opening_hours instance to compare
 * @param {string} diffValue - The opening hours value to compare against
 * @param {number} mode - The parsing mode for opening hours
 * @param {Date} startDate - The date to start comparison from
 */
function handleDiffComparison(oh, diffValue, mode, startDate) {
    const diffValueElement = document.getElementById('diff_value');
    const compareResult = document.getElementById('compare-result');

    if (diffValue.length === 0) {
        diffValueElement.style.backgroundColor = '';
        compareResult.innerHTML = '';
        return;
    }

    let comparisonOh;
    let comparisonResult;
    try {
        comparisonOh = new opening_hours(diffValue, nominatim, {
            'mode': mode,
            'warnings_severity': 7,
            'locale': i18next.language
        });
        comparisonResult = oh.isEqualTo(comparisonOh, startDate);
    } catch {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.error;
        compareResult.innerHTML = '';
        return;
    }

    if (!Array.isArray(comparisonResult)) {
        compareResult.innerHTML = '';
        return;
    }

    const [isEqual, deviationInfo] = comparisonResult;

    if (isEqual) {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.ok;
        compareResult.innerHTML = '';
    } else {
        diffValueElement.style.backgroundColor = evaluation_tool_colors.warn;
        compareResult.innerHTML = generateDeviationHTML(oh, comparisonOh, deviationInfo);
    }
}

function generateJosmHTML(value) {
    const josmUrl = 'import?url=' + encodeURIComponent(
        `https://overpass-api.de/api/xapi_meta?*[opening_hours=${value}]`
    );

    return `<div class="action-description">${i18next.t('texts.load osm objects')}</div>` +
           `<div><a href="#" class="josm-link" data-url="${josmUrl}">JOSM</a></div>`;
}

function generateYoHoursHTML(value, crashed) {
    const yoHoursChecker = new YoHoursChecker();
    if (!crashed && yoHoursChecker.canRead(value)) {
        const yohoursUrl = `https://projets.pavie.info/yohours/?oh=${value}`;
        return `<div class="action-description">${i18next.t('texts.yohours description')}</div>` +
               `<div><a href="${yohoursUrl}" target="_blank">YoHours</a></div>`;
    }

    return `<div class="action-description">${i18next.t('texts.yohours description')}</div>` +
           `<div class="yohours-warning">${i18next.t('texts.yohours incompatible')}</div>`;
}

function generatePrettifiedValueHTML(prettified) {
    const escapedValue = prettified.replace(/"/g, '&quot;');

    // Build translation with placeholder for the link
    const translatedText = i18next.t('texts.prettified value', { copyFunc: '__COPY_LINK__' });
    const linkHtml = `<a href="#" class="copy-prettified-value" data-value="${escapedValue}">`;
    const finalText = translatedText.replace('<a href="__COPY_LINK__">', linkHtml);

    const copyTooltip = i18next.t('texts.copy');

    return `<div class="prettified-value-section">
        <p>${finalText}:</p>
        <div class="prettified-value-container">
            <code class="prettified-value-display" data-value="${escapedValue}">${prettified}</code>
            <button type="button" class="copy-btn copy-prettified-btn" data-value="${escapedValue}" title="${copyTooltip}">📋</button>
        </div>
    </div>`;
}

function generateWarningsHTML(warnings) {
    if (warnings.length === 0) return '';

    return `<div class="warning">${i18next.t('texts.filter.error')}` +
           `<div class="warning_error_message">${warnings.join('\n')}</div></div>`;
}

function generateValueTooLongHTML(prettified, value) {
    if (prettified.length <= OSM_MAX_VALUE_LENGTH) return '';

    return `<div class="warning">${i18next.t('texts.filter.error')}` +
           `<div class="warning_error_message">${i18next.t('texts.value to long for osm', {
               pretLength: prettified.length,
               valLength: value.length,
               maxLength: OSM_MAX_VALUE_LENGTH
           })}</div></div>`;
}

/* }}} */

export async function Evaluate (offset = 0, reset) {
    if (document.forms.check.elements['lat'].value !== string_lat || document.forms.check.elements['lon'].value !== string_lon) {
        string_lat = document.forms.check.elements['lat'].value;
        string_lon = document.forms.check.elements['lon'].value;
        lat = parseFloat(string_lat);
        lon = parseFloat(string_lon);
        if (typeof lat !== 'number' || typeof lon !== 'number') {
            if (typeof lat !== 'number') {
                document.forms.check.elements['lat'].value = default_lat;
            }
            if (typeof lon !== 'number') {
                document.forms.check.elements['lon'].value = default_lon;
            }
            console.log('Please enter numbers for latitude and longitude.');
            return;
        }
        try {
            nominatim = await reverseGeocodeLocation(
                lat,
                lon,
                mapCountryToLanguage(i18next.language)
            );
            document.forms.check.elements['cc'].value = nominatim.address.country_code;
            document.forms.check.elements['state'].value = nominatim.address.state;
            Evaluate();
        } catch (error) {
            /* Set fallback Nominatim answer to allow using the evaluation tool even without Nominatim. */
            console.error('Reverse geocoding failed:', error);
            alert('Reverse geocoding of the coordinates using Nominatim was not successful. The evaluation of features of the opening_hours specification which depend this information will be unreliable. Otherwise, this tool will work as expected using a fallback answer. You might want to check your browser settings to fix this.');
            nominatim = {'place_id':'44651229','licence':'Data \u00a9 OpenStreetMap contributors, ODbL 1.0. https://www.openstreetmap.org/copyright','osm_type':'way','osm_id':'36248375','lat':'49.5400039','lon':'9.7937133','display_name':'K 2847, Lauda-K\u00f6nigshofen, Main-Tauber-Kreis, Regierungsbezirk Stuttgart, Baden-W\u00fcrttemberg, Germany, European Union','address':{'road':'K 2847','city':'Lauda-K\u00f6nigshofen','county':'Main-Tauber-Kreis','state_district':'Regierungsbezirk Stuttgart','state':'Baden-W\u00fcrttemberg','country':'Germany','country_code':'de','continent':'European Union'}};
            document.forms.check.elements['cc'].value = nominatim.address.country_code;
            document.forms.check.elements['state'].value = nominatim.address.state;
            Evaluate();
        }
        return;
    }

    date = reset
        ? new Date()
        : new Date(
            currentDateTime.year,
            currentDateTime.month,
            currentDateTime.day,
            currentDateTime.hour,
            currentDateTime.minute,
            offset
        );

    // Update module state
    currentDateTime = {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes()
    };

    // Update time button labels with current values
    updateTimeButtonLabels(date);

    // Cache DOM elements
    const showTimeTable = document.getElementById('show_time_table');
    const showWarningsOrErrors = document.getElementById('show_warnings_or_errors');
    const showResults = document.getElementById('show_results');
    const actionJosm = document.getElementById('action-josm');
    const actionYoHours = document.getElementById('action-yohours');

    showWarningsOrErrors.innerHTML = '';

    // Parse opening hours value
    let crashed = false;
    const value = document.forms.check.elements['expression'].value;
    const diffValue = document.forms.check.elements['diff_value'].value;
    const mode = parseInt(document.getElementById('mode').selectedIndex);
    let oh;
    let it;

    try {
        oh = new opening_hours(value, nominatim, {
            'mode': mode,
            'warnings_severity': 7,
            'locale': i18next.language
        });
        it = oh.getIterator(date);
    } catch (err) {
        crashed = err;
        showWarningsOrErrors.innerHTML =
            `<div class="error">${i18next.t('texts.filter.error')}` +
            `<div class="warning_error_message">${crashed}</div></div>`;
        showTimeTable.innerHTML = '';
        showResults.innerHTML = '';
    }

    // Populate action links
    actionJosm.innerHTML = generateJosmHTML(value);
    actionYoHours.innerHTML = generateYoHoursHTML(value, crashed);

    if (!crashed) {
        const prettified = oh.prettifyValue({});
        const prettifiedValueArray = oh.prettifyValue({
            get_internals: true,
        });

        // Generate and display results
        showResults.innerHTML = generateResultsHTML();

        // Generate value explanation
        const valueExplanation = generateValueExplanation(prettifiedValueArray);

        // Handle diff comparison
        handleDiffComparison(oh, diffValue, mode, date);

        // Display value explanation
        showWarningsOrErrors.innerHTML = valueExplanation;

        // Update matching rule
        const ruleIndex = it.getMatchingRule();
        const ruleDisplay = document.getElementById('matching-rule-display');
        if (ruleDisplay) {
            ruleDisplay.textContent = typeof ruleIndex === 'undefined' ? i18next.t('words.none') : oh.prettifyValue({ 'rule_index': ruleIndex });
        }

        // Show prettified value if different from input
        if (prettified !== value) {
            showWarningsOrErrors.innerHTML = generatePrettifiedValueHTML(prettified);
        }

        // Append warnings if any
        const warnings = oh.getWarnings();
        showWarningsOrErrors.innerHTML += generateWarningsHTML(warnings);

        // Check value length
        showWarningsOrErrors.innerHTML += generateValueTooLongHTML(prettified, value);

        // Generate time table
        showTimeTable.innerHTML = OpeningHoursTable.drawTableAndComments(oh, it, date);
    }

    updatePermalinkHref();
}

export function EX (element) {
    newValue(element.innerHTML);
    return false;
}

export function newValue(value) {
    document.forms.check.elements['expression'].value = value;
    Evaluate();
}

function updatePermalinkHref() {
    const params = new URLSearchParams({
        EXP: document.getElementById('expression').value,
        lat: document.getElementById('lat').value,
        lon: document.getElementById('lon').value,
        mode: document.getElementById('mode').selectedIndex
    });

    const diffValue = document.getElementById('diff_value').value;
    if (diffValue !== '') {
        params.set('diff_value', diffValue);
    }

    const baseUrl = `${location.origin}${location.pathname}`;

    // Permalink with timestamp
    const paramsWithTimestamp = new URLSearchParams(params);
    paramsWithTimestamp.set('DATE', date.getTime());
    document.getElementById('permalink-link-with-timestamp').href = `${baseUrl}?${paramsWithTimestamp}`;

    // Permalink without timestamp
    document.getElementById('permalink-link-without-timestamp').href = `${baseUrl}?${params}`;
}

export function setCurrentPosition() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(onPositionUpdate);
    }
}

function onPositionUpdate(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    document.getElementById('lat').value = lat;
    document.getElementById('lon').value = lng;
    Evaluate();
    console.log('Current position: ' + lat + ' ' + lng);
}

window.onload = function () {
    const params = new URLSearchParams(location.search);
    const customCoords = params.has('lat') || params.has('lon');

    if (params.has('EXP')) {
        document.forms.check.elements['expression'].value = params.get('EXP');
    }
    if (params.has('diff_value')) {
        document.forms.check.elements['diff_value'].value = params.get('diff_value');
    }
    if (params.has('lat')) {
        document.forms.check.elements['lat'].value = params.get('lat');
    }
    if (params.has('lon')) {
        document.forms.check.elements['lon'].value = params.get('lon');
    }
    if (params.has('mode')) {
        document.forms.check.elements['mode'].value = params.get('mode');
    }
    if (params.has('DATE')) {
        try {
            const loadedDate = new Date(parseInt(params.get('DATE')));
            currentDateTime = {
                year: loadedDate.getFullYear(),
                month: loadedDate.getMonth(),
                day: loadedDate.getDate(),
                hour: loadedDate.getHours(),
                minute: loadedDate.getMinutes()
            };
            Evaluate(0, false);
        } catch (err) {
            console.error(err);
            Evaluate(0, true);
        }
    } else {
        Evaluate(0, true);
    }
    if (navigator.geolocation && !customCoords) {
        navigator.geolocation.getCurrentPosition(onPositionUpdate);
    }
};
/* }}} */
