/**
 * SPDX-FileCopyrightText: © 2025 Kristjan ESPERANTO <https://github.com/KristjanESPERANTO>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
// Import all required modules
import i18next from '../../node_modules/i18next/dist/esm/i18next.bundled.js';
import { resources, detectLanguage, getUserSelectTranslateHTMLCode, changeLanguage } from './i18n-resources.js';
import { Evaluate, EX, josm, toggle, dateAtWeek, newValue, currentDateTime } from './helpers.js';

// Configuration constants
window.default_lat = 48.7769;
window.default_lon = 9.1844;
window.repo_url = 'https://github.com/opening-hours/opening_hours.js';

// Helper function to generate time navigation buttons
function generateTimeButtons() {
    const buttons = [
        [ 3600 * 24 * 365, 1, 'words.time.year'   , 'year'   ],
        [ null           , 1, 'words.time.month'  , 'month'  ], // Special handling for month
        [ 3600 * 24      , 1, 'words.time.day'    , 'day'    ],
        [ 3600           , 1, 'words.time.hour'   , 'hour'   ],
        [ 60             , 1, 'words.time.minute' , 'minute' ],
        [ 3600 * 24 *   7, 1, 'words.time.week'   , 'week'   ],
        [ 0              , 0, 'words.time.now'    , null     ],
    ];
    let html = '';
    for (let i = 0; i < buttons.length; i++) {
        if (buttons[i][1] !== 0) {
            const offset = buttons[i][0];
            const field = buttons[i][3];
            const isEditable = field === 'year' || field === 'day' || field === 'hour' || field === 'minute';
            const labelText = i18next.t(buttons[i][2]);
            const dataAttr = field === 'month' ? 'data-month-offset' : 'data-offset';
            const minusVal = field === 'month' ? -1 : -offset;
            const plusVal = field === 'month' ? 1 : offset;

            html += `<div class="time-btn-wrapper">
                <label class="time-btn-label-top">${labelText}</label>
                <div class="time-btn-group">
                    <button type="button" class="time-btn time-btn-minus" ${dataAttr}="${minusVal}" title="-1 ${labelText}">−</button>
                    <span class="time-btn-label${isEditable ? ' editable' : ''}" id="time-btn-value-${field}" ${isEditable ? 'contenteditable="true" spellcheck="false"' : ''} data-field="${field}"></span>
                    <button type="button" class="time-btn time-btn-plus" ${dataAttr}="${plusVal}" title="+1 ${labelText}">+</button>
                </div>`;
            // Add weekday display below day button
            if (buttons[i][3] === 'day') {
                html += '<span class="time-btn-label-bottom" id="time-display-wday"></span>';
            }
            html += '</div>';
        } else {
            html += `<button type="button" class="time-btn time-btn-now">${i18next.t(buttons[i][2])}</button>`;
        }
    }
    return html;
}

// Helper function to update time button labels with current values

export function updateTimeButtonLabels(date) {
    const yearLabel = document.getElementById('time-btn-value-year');
    const monthLabel = document.getElementById('time-btn-value-month');
    const dayLabel = document.getElementById('time-btn-value-day');
    const hourLabel = document.getElementById('time-btn-value-hour');
    const minuteLabel = document.getElementById('time-btn-value-minute');
    const weekLabel = document.getElementById('time-btn-value-week');
    const wdayDisplay = document.getElementById('time-display-wday');

    function u2(v) { return v >= 0 && v < 10 ? `0${v}` : v; }

    if (yearLabel) yearLabel.textContent = currentDateTime.year;
    if (monthLabel) {
        monthLabel.textContent = new Date(2018, currentDateTime.month, 1)
            .toLocaleString(i18next.language, {month: 'short'});
    }
    if (dayLabel) dayLabel.textContent = u2(currentDateTime.day);
    if (hourLabel) hourLabel.textContent = u2(currentDateTime.hour);
    if (minuteLabel) minuteLabel.textContent = u2(currentDateTime.minute);

    if (weekLabel && date) {
        weekLabel.textContent = `W${u2(dateAtWeek(date, 0) + 1)}`;
    }

    if (wdayDisplay && date) {
        wdayDisplay.textContent = date.toLocaleString(i18next.language, {weekday: 'short'});
    }
}

// Helper function to generate mode selector options
function generateModeOptions() {
    let options = '';
    for (let i = 0; i <= 2; i++) {
        options += `<option value="${i}">${i18next.t(`texts.mode ${i}`)}</option>`;
    }
    return options;
}

// Populate all dynamic content with localized text
function initializeUI() {
    // Page title
    document.getElementById('page-title').textContent = i18next.t('texts.title');

    // Language selector
    document.getElementById('language-selector').innerHTML = getUserSelectTranslateHTMLCode();

    // Date and time inputs with navigation buttons only
    document.getElementById('date-time-inputs').innerHTML = `
        <h2>${i18next.t('words.date')} ${i18next.t('words.and')} ${i18next.t('words.time.time')}</h2>
    ` + generateTimeButtons();

    // Position inputs
    document.getElementById('position-inputs').innerHTML = `
        <h2>${i18next.t('words.position')}</h2>
        ${i18next.t('words.lat')} <input type="number" class="input__coordinate" id="lat" value="${window.default_lat}" />
        ${i18next.t('words.lon')} <input type="number" class="input__coordinate" id="lon" value="${window.default_lon}" />
        ${i18next.t('words.country')} <input size="3" id="cc" readonly="readonly" />
        ${i18next.t('words.state')} <input size="20" id="state" readonly="readonly" /><br />
    `;

    // Mode selector
    document.getElementById('mode-selector').innerHTML = `
        <h2>${i18next.t('words.mode')}</h2>
        <select id="mode" name="mode" style="max-width:100%;">
            ${generateModeOptions()}
        </select>
    `;

    // Value section heading
    document.getElementById('value-section-heading').textContent = i18next.t('texts.value for') + ' „opening_hours“';

    // Value label (hide - redundant with section heading)
    document.getElementById('value-label').style.display = 'none';

    // Actions section
    document.getElementById('actions-heading').textContent = i18next.t('words.actions');
    document.getElementById('compare-label').textContent = i18next.t('texts.value to compare');
    document.getElementById('action-permalink-label').textContent = i18next.t('texts.share config');
    document.getElementById('permalink-with-timestamp-label').textContent = i18next.t('texts.with timestamp');
    document.getElementById('permalink-without-timestamp-label').textContent = i18next.t('texts.without timestamp');

    // Set title attributes for all buttons with data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(btn => {
        const key = btn.getAttribute('data-i18n-title');
        btn.title = i18next.t('texts.' + key);
    });

    // Copy button handlers for permalink copy buttons
    document.querySelectorAll('.copy-permalink-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetLink = document.getElementById(targetId);
            if (targetLink) {
                navigator.clipboard.writeText(targetLink.href).catch(() => {});
            }
        });
    });

    // Copy and clear buttons for expression input
    document.getElementById('copy-expression-btn').addEventListener('click', function() {
        const expressionInput = document.getElementById('expression');
        navigator.clipboard.writeText(expressionInput.value).catch(() => {});
    });

    document.getElementById('clear-expression-btn').addEventListener('click', function() {
        document.getElementById('expression').value = '';
        Evaluate();
    });

    document.getElementById('clear-diff-btn').addEventListener('click', function() {
        document.getElementById('diff_value').value = '';
        Evaluate();
    });

    // Results section heading
    document.getElementById('results-heading').textContent = i18next.t('words.results');

    // Examples header
    document.getElementById('examples').textContent = i18next.t('words.examples');

    // Year ranges documentation link
    const yearRangesDocu = document.getElementById('year-ranges-docu');
    yearRangesDocu.href = `${window.repo_url}/tree/main#year-ranges`;
    yearRangesDocu.textContent = i18next.t('words.docu');

    // Example hints
    document.getElementById('hint-error-correction-1').textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    document.getElementById('hint-error-correction-2').textContent = `(${i18next.t('texts.check out error correction, prettify')})`;
    document.getElementById('hint-ph-mo-fr').textContent = `(${i18next.t('texts.if PH is between Mo and Fr')})`;
    document.getElementById('hint-sh-ph').textContent = `(${i18next.t('texts.SH,PH or PH,SH')})`;

    // Footer content
    document.getElementById('footer').innerHTML = i18next.t('texts.more information',
        { href: 'https://wiki.openstreetmap.org/wiki/Key:opening_hours' }) + '<br />' +
        i18next.t('texts.this website', { url: window.repo_url, hoster: 'GitHub' });

    document.body.parentElement.lang = i18next.language;
}

// Set up event listeners using event delegation (only for repetitive handlers)
function setupEventListeners() {
    const main = document.getElementById('user');

    // Input field listeners
    document.getElementById('expression').addEventListener('keyup', () => Evaluate());
    document.getElementById('expression').addEventListener('blur', () => Evaluate());
    document.getElementById('diff_value').addEventListener('keyup', () => Evaluate());
    document.getElementById('diff_value').addEventListener('blur', () => Evaluate());
    document.getElementById('lat').addEventListener('blur', () => Evaluate());
    document.getElementById('lon').addEventListener('blur', () => Evaluate());
    document.getElementById('mode').addEventListener('change', () => Evaluate());

    // Language selector
    document.getElementById('language-select').addEventListener('change', function() {
        changeLanguage(this.value);
    });

    // Use mousedown instead of click for prettified value elements
    // This prevents interference with browser's text selection behavior
    main.addEventListener('mousedown', (e) => {
        // Prettified value display (code element)
        if (e.target.closest('.prettified-value-display')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const code = e.target.closest('.prettified-value-display');
            newValue(code.dataset.value);
        }
        // Copy button for prettified value
        else if (e.target.closest('.copy-prettified-btn')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const btn = e.target.closest('.copy-prettified-btn');
            navigator.clipboard.writeText(btn.dataset.value).catch(() => {});
        }
        // Copy prettified value link
        else if (e.target.closest('.copy-prettified-value')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const link = e.target.closest('.copy-prettified-value');
            newValue(link.dataset.value);
        }
        // Time jump links/buttons (from opening_hours_table.js)
        else if (e.target.closest('.time-jump, .time-jump-btn')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const link = e.target.closest('.time-jump, .time-jump-btn');
            Evaluate(parseInt(link.dataset.offset, 10), false);
        }
    });

    main.addEventListener('click', (e) => {
        // Examples toggle
        if (e.target.closest('#examples-toggle')) {
            e.preventDefault();
            const toggleBtn = e.target.closest('#examples-toggle');
            toggleBtn.classList.toggle('collapsed');
            toggle('user_examples');
        }
        // Example links (60+ handlers → 1 listener)
        else if (e.target.closest('.example-link')) {
            e.preventDefault();
            EX(e.target.closest('.example-link'));
        }
        // Time buttons
        else if (e.target.closest('.time-btn')) {
            const btn = e.target.closest('.time-btn');
            if (btn.classList.contains('time-btn-now')) {
                Evaluate(0, true);
            } else if (btn.hasAttribute('data-month-offset')) {
                // Month: use Date to handle day overflow automatically
                const dt = currentDateTime;
                const targetMonth = dt.month + parseInt(btn.dataset.monthOffset, 10);
                const lastDay = new Date(dt.year, targetMonth + 1, 0).getDate();
                const newDate = new Date(dt.year, targetMonth, Math.min(dt.day, lastDay), dt.hour, dt.minute);
                currentDateTime.year = newDate.getFullYear();
                currentDateTime.month = newDate.getMonth();
                currentDateTime.day = newDate.getDate();
                currentDateTime.hour = newDate.getHours();
                currentDateTime.minute = newDate.getMinutes();
                Evaluate();
            } else {
                Evaluate(parseInt(btn.dataset.offset, 10));
            }
        }
        // JOSM link
        else if (e.target.closest('.josm-link')) {
            e.preventDefault();
            const link = e.target.closest('.josm-link');
            josm(link.dataset.url);
        }
    });

    // Editable time values
    main.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('time-btn-label') && e.target.hasAttribute('contenteditable')) {
            // Allow Enter to commit the value
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
            // Allow Escape to cancel
            else if (e.key === 'Escape') {
                e.preventDefault();
                e.target.textContent = e.target.dataset.originalValue || e.target.textContent;
                e.target.blur();
            }
        }
    });

    main.addEventListener('focus', (e) => {
        if (e.target.classList.contains('time-btn-label') && e.target.hasAttribute('contenteditable')) {
            // Store original value for Escape key
            e.target.dataset.originalValue = e.target.textContent;
            // Select all text for easy replacement
            const range = document.createRange();
            range.selectNodeContents(e.target);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }, true);

    main.addEventListener('blur', (e) => {
        if (e.target.classList.contains('time-btn-label') && e.target.hasAttribute('contenteditable')) {
            const field = e.target.dataset.field;
            const value = e.target.textContent.trim();

            // Validate and update based on field type
            if (field === 'year') {
                const year = parseInt(value, 10);
                if (!isNaN(year) && year >= 1970 && year <= 2100) {
                    currentDateTime.year = year;
                    Evaluate();
                } else {
                    updateTimeButtonLabels();
                }
            } else if (field === 'day') {
                const day = parseInt(value, 10);
                if (!isNaN(day) && day >= 1 && day <= 31) {
                    currentDateTime.day = day;
                    Evaluate();
                } else {
                    updateTimeButtonLabels();
                }
            } else if (field === 'hour') {
                const hour = parseInt(value, 10);
                if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                    currentDateTime.hour = hour;
                    Evaluate();
                } else {
                    updateTimeButtonLabels();
                }
            } else if (field === 'minute') {
                const minute = parseInt(value, 10);
                if (!isNaN(minute) && minute >= 0 && minute <= 59) {
                    currentDateTime.minute = minute;
                    Evaluate();
                } else {
                    updateTimeButtonLabels();
                }
            }

            delete e.target.dataset.originalValue;
        }
    }, true);
}

/* Initialize application (ES6 modules execute after DOM parsing) */
await i18next.init({
    lng: detectLanguage(),
    fallbackLng: 'en',
    resources: resources,
    debug: false
});

// Update specification_url after i18next is ready
window.specification_url = `https://wiki.openstreetmap.org/wiki/${i18next.language === 'de' ? 'DE:' : ''}Key:opening_hours/specification`;

// Set page title
if (document.title !== i18next.t('texts.title')) {
    document.title = i18next.t('texts.title');
}

initializeUI();
setupEventListeners();
Evaluate();
