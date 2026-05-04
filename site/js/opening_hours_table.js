/**
 * SPDX-FileCopyrightText: © 2013 Robin Schneider <ypid@riseup.net>
 *
 * SPDX-License-Identifier: LGPL-3.0-only
 */
// Import dependencies
import i18next from '../../node_modules/i18next/dist/esm/i18next.bundled.js';

export const OpeningHoursTable = {

    // JS functions for generating the table {{{
    // In English. Localization is done somewhere else (above).
    months:   ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    weekdays: ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'],

    getLocalizedWeekday(date) {
        return date.toLocaleString(i18next.language, { weekday: 'short' });
    },

    formatdate (now, nextchange, from) {
        const now_daystart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextdays = (nextchange.getTime() - now_daystart.getTime()) / 1000 / 60 / 60 / 24;

        let timediff = '';

        let delta = Math.floor((nextchange.getTime() - now.getTime()) / 1000 / 60); // delta is minutes
        if (delta < 60) {
            timediff = `${i18next.t('words.in duration')} ${delta} ${this.plural(delta, 'words.time.minute')}`;
        }

        const deltaminutes = delta % 60;
        delta = Math.floor(delta / 60); // delta is now hours

        if (delta < 48 && timediff === '') {
            timediff =
                `${i18next.t('words.in duration')} `
                + `${delta} `
                + `${this.plural(delta, 'words.time.hour')} `
                + `${i18next.t('words.time.hours minutes sep')}`
                + `${this.pad(deltaminutes)} `
                + `${this.plural(deltaminutes, 'words.time.minute')}`;
        }

        const deltahours = delta % 24;
        delta = Math.floor(delta / 24); // delta is now days

        if (delta < 14 && timediff === '') {
            timediff = `${i18next.t('words.in duration')} ${delta} ${this.plural(delta, 'words.time.day')
            } ${deltahours} ${this.plural(deltahours, 'words.time.hour')}`;
        } else if (timediff === '') {
            timediff = `${i18next.t('words.in duration')} ${delta} ${this.plural(delta, 'words.time.day')}`;
        }
        let atday = '';
        if (from ? (nextdays < 1) : (nextdays <= 1)) {
            atday = i18next.t('words.today');
        } else if (from ? (nextdays < 2) : (nextdays <= 2)) {
            atday = i18next.t('words.tomorrow');
        } else if (from ? (nextdays < 7) : (nextdays <= 7)) {
            if (i18next.exists(`weekdays.days next week.${this.weekdays[nextchange.getDay()]}`)) {
                atday = i18next.t(`weekdays.days next week.${this.weekdays[nextchange.getDay()]}`, {
                    day: nextchange.toLocaleString(i18next.language, {weekday: 'long'})
                });
            } else {
                atday = i18next.t('weekdays.day next week', {
                    day: nextchange.toLocaleString(i18next.language, {weekday: 'long'})
                });
            }
        }

        let month_name = nextchange.toLocaleString(i18next.language, {month: 'long'});
        const month_name_match = month_name.match(/\(([^|]+?)\|.*\)/);
        if (month_name_match && typeof month_name_match[1] === 'string') {
            /* The language has multiple words for the month (nominative, subjective).
             * Use the first one.
             * https://github.com/opening-hours/opening_hours_map/issues/41
             */
            month_name = month_name_match[1];
        }

        const atdate = `${nextchange.getDate()} ${month_name}`;
        const res = [];

        if (atday !== '') res.push(atday);
        if (atdate !== '') res.push(atdate);
        if (timediff !== '') res.push(timediff);

        return res.join(', ');
    },

    pad (n) { return n < 10 ? `0${n}` : n; },

    plural (n, trans_base) {
        // i18next plural function call
        return i18next.t(trans_base, {count: n});
    },

    toISODateString (date) {
        // ISO 8601: https://xkcd.com/1179/
        return `${date.getFullYear()}-${
            this.pad(date.getMonth() + 1)}-${
            this.pad(date.getDate())}`;
    },

    printTime (date) {
        // return date.toLocaleTimeString('de');
        return `${this.pad(date.getHours())}:${
            this.pad(date.getMinutes())}:${
            this.pad(date.getSeconds())}`;
    },

    drawTable (it, date_today, has_next_change, evalDate) {
        date_today = new Date(date_today);
        date_today.setHours(0, 0, 0, 0);

        const date = new Date(date_today);
        date.setDate(date.getDate() - date.getDay() - 1); // start at begin of the week

        // Calculate current time position for "now" marker (percentage of day)
        // Use evalDate instead of new Date() to show the evaluation time, not browser time
        const now = evalDate || new Date();
        const nowPercent = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;

        const tableData = [];

        for (let row = 0; row < 7; row++) {
            date.setDate(date.getDate() + 1);

            it.setDate(date);
            let is_open      = it.getState();
            let unknown      = it.getUnknown();
            let state_string = it.getStateString(true);
            let prevdate = date;
            let curdate  = date;

            const rowData = {
                date: new Date(date),
                times: [],
                text: [],
                isToday: date.getDay() === date_today.getDay()
            };

            while (has_next_change && it.advance() && curdate.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
                curdate = it.getDate();

                let fr = prevdate.getTime() - date.getTime();
                let to = curdate.getTime() - date.getTime();

                if (to > 24 * 60 * 60 * 1000) {
                    to = 24 * 60 * 60 * 1000;
                }

                fr *= 100 / 1000 / 60 / 60 / 24;
                to *= 100 / 1000 / 60 / 60 / 24;

                const stateClass = is_open ? 'open' : (unknown ? 'unknown' : 'closed');
                // Always use 24h format with HH:MM
                const timeFrom = `${String(prevdate.getHours()).padStart(2, '0')}:${String(prevdate.getMinutes()).padStart(2, '0')}`;
                const timeToDate = prevdate.getDay() !== curdate.getDay() ? null : curdate;
                const timeTo = timeToDate
                    ? `${String(timeToDate.getHours()).padStart(2, '0')}:${String(timeToDate.getMinutes()).padStart(2, '0')}`
                    : '24:00';

                // Use current state_string for this period (before advancing)
                const currentStateString = state_string;
                const tooltip = `${i18next.t(`words.${currentStateString}`)}: ${timeFrom} - ${timeTo}`;

                rowData.times.push(
                    `<div class="timebar ${stateClass}" style="width:${to - fr}%" title="${tooltip}"></div>`
                );

                if (is_open || unknown) {
                    const text = `${i18next.t(`words.${currentStateString}`)} ${i18next.t('words.from')} ${timeFrom} ${i18next.t('words.to')} ${timeTo}`;
                    rowData.text.push(text);
                }

                prevdate = curdate;
                is_open      = it.getState();
                unknown      = it.getUnknown();
                state_string = it.getStateString(true);
            }

            if (!has_next_change && rowData.text.length === 0) { // 24/7
                const stateClass = is_open ? 'open' : (unknown ? 'unknown' : 'closed');
                const tooltip = is_open ? `${i18next.t('words.open')}: 00:00 - 24:00` : '';
                rowData.times.push(
                    `<div class="timebar ${stateClass}" style="width:100%" title="${tooltip}"></div>`
                );
                if (is_open) {
                    rowData.text.push(`${i18next.t('words.open')} 00:00 ${i18next.t('words.to')} 24:00`);
                }
            }

            tableData.push(rowData);
        }

        // Build table HTML
        const headerRow = `
            <tr class="time-scale">
                <td></td>
                <td>
                    <div class="scale-labels">
                        <span>0h</span>
                        <span>6h</span>
                        <span>12h</span>
                        <span>18h</span>
                        <span>24h</span>
                    </div>
                </td>
                <td></td>
            </tr>`;

        const rows = tableData.map(row => {
            const isToday = row.date.getDay() === date_today.getDay();
            const isEndWeek = (row.date.getDay() + 1) % 7 === date_today.getDay();
            const rowClass = isToday ? ' class="today"' : (isEndWeek ? ' class="endweek"' : '');
            const dayClass = row.date.getDay() % 6 === 0 ? 'weekend' : 'workday';
            const weekdayName = this.getLocalizedWeekday(row.date);

            // Add "now" marker for today
            const nowMarker = isToday
                ? `<div class="now-marker" style="left:${nowPercent}%" title="${i18next.t('words.time.now')}"></div>`
                : '';

            return `<tr${rowClass}>
                <td class="day ${dayClass}">
                    <span class="weekday">${weekdayName}</span>
                    <span class="date">${this.toISODateString(row.date)}</span>
                </td>
                <td class="times">
                    ${row.times.join('')}
                    ${nowMarker}
                </td>
                <td class="description">${row.text.join(', ') || '&nbsp;'}</td>
            </tr>`;
        }).join('');

        return `<table class="opening-hours-table">${headerRow}${rows}</table>`;
    },

    drawTableAndComments (oh, it, evalDate) {
        const prevdate          = it.getDate();
        const unknown           = it.getUnknown();
        const currentState      = it.getState();
        const state_string_past = it.getStateString(true);
        const comment           = it.getComment();
        const has_next_change   = it.advance();

        let output = '';

        // 1. Current status
        output += `<p class="${state_string_past} status-info">${
            i18next.t(`texts.${state_string_past} ${has_next_change ? 'now' : 'always'}`)}`;
        if (unknown) {
            output += i18next.t('texts.depends on', {comment: `"${comment}"`});
        }
        output += '</p>';

        // 2. Show reason (comment) if present and not unknown
        if (typeof comment !== 'undefined' && !unknown) {
            output += `<p class="status-reason">↳ ${i18next.t('texts.reason')}: ${comment}</p>`;
        }

        // 3. Find next REAL state change (not just interval boundary)
        if (has_next_change) {
            let nextRealChangeDate = null;
            let nextRealStateString = null;
            let time_diff = 0;

            // Check if immediate next change is a real state change
            if (it.getState() !== currentState) {
                nextRealChangeDate = it.getDate();
                nextRealStateString = it.getStateString(false);
                time_diff = (nextRealChangeDate.getTime() - prevdate.getTime()) / 1000 + 60;
            } else {
                // Keep advancing until we find a real state change
                // Limit iterations to prevent infinite loops with complex values
                const maxIterations = 1000;
                let iterations = 0;
                while (it.advance() && iterations < maxIterations) {
                    iterations++;
                    if (it.getState() !== currentState) {
                        nextRealChangeDate = it.getDate();
                        nextRealStateString = it.getStateString(false);
                        time_diff = (nextRealChangeDate.getTime() - prevdate.getTime()) / 1000 + 60;
                        break;
                    }
                }
            }

            if (nextRealChangeDate) {
                const timeString = this.formatdate(prevdate, nextRealChangeDate, true);
                // Use "opens again" or "closes again" based on what will happen
                const translationKey = nextRealStateString === 'open' ? 'texts.opens again' : 'texts.closes again';
                const statusText = i18next.t(translationKey);
                const buttonText = i18next.t('texts.jump to time');

                const nextStateClass = nextRealStateString === 'open' ? 'opened' : 'closed';
                output += `<p class="${nextStateClass} status-info next-change">
                    ${statusText}: ${timeString}
                    <a href="#" class="time-jump-btn" data-offset="${time_diff}" title="${buttonText}">
                        ${buttonText}
                    </a>
                </p>`;
            }
        }

        // Add upcoming changes timeline
        const upcomingChanges = this.generateUpcomingChanges(oh, evalDate, 5);
        output += this.generateUpcomingChangesHTML(upcomingChanges, evalDate);

        output += this.drawTable(it, prevdate, has_next_change, evalDate);

        if (oh.isWeekStable()) {
            output += `<p><b>${i18next.t('texts.week stable')}</b></p>`;
        } else {
            output += `<p><b>${i18next.t('texts.not week stable')}</b></p>`;
        }

        return output;
    },

    // Generate upcoming changes timeline {{{
    generateUpcomingChanges(oh, currentDate, maxChanges = 5) {
        const changes = [];
        const it = oh.getIterator(currentDate);
        const currentState = it.getState();
        let previousState = currentState;

        // Collect next changes (all interval boundaries, not just state changes)
        let count = 0;
        while (count < maxChanges && it.advance()) {
            const changeDate = it.getDate();
            const newState = it.getState();
            const comment = it.getComment();
            const stateString = it.getStateString(true); // Use past form for consistency

            changes.push({
                date: changeDate,
                state: newState,
                stateString: stateString,
                comment: comment,
                isActualStateChange: previousState !== newState
            });

            previousState = newState;
            count++;
        }

        return changes;
    },

    formatUpcomingChangeTime(currentDate, changeDate) {
        const now_daystart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const change_daystart = new Date(changeDate.getFullYear(), changeDate.getMonth(), changeDate.getDate());
        const daysDiff = Math.round((change_daystart.getTime() - now_daystart.getTime()) / (1000 * 60 * 60 * 24));

        // Always use 24h format with HH:MM
        const hours = String(changeDate.getHours()).padStart(2, '0');
        const minutes = String(changeDate.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (daysDiff === 0) {
            return `${i18next.t('words.today')} ${timeStr}`;
        } else if (daysDiff === 1) {
            return `${i18next.t('words.tomorrow')} ${timeStr}`;
        } else if (daysDiff === -1) {
            return `${i18next.t('words.yesterday')} ${timeStr}`;
        } else {
            // For dates further away, show date + time
            const dateStr = this.toISODateString(changeDate);
            return `${dateStr} ${timeStr}`;
        }
    },

    generateUpcomingChangesHTML(changes, currentDate) {
        if (changes.length === 0) return '';

        let html = `<details class="upcoming-changes">
            <summary>${i18next.t('texts.interval boundaries')}</summary>
            <p class="timeline-hint">${i18next.t('texts.interval boundaries hint')}</p>
            <ul class="timeline">`;

        for (const change of changes) {
            const timeStr = this.formatUpcomingChangeTime(currentDate, change.date);
            const stateClass = change.state ? 'opened' : 'closed';
            // Visual distinction: filled circle for real changes, empty for boundaries
            const changeIcon = change.isActualStateChange ? '●' : '○';
            const changeType = change.isActualStateChange ? 'state-change' : 'boundary-only';
            const stateText = i18next.t(`words.${change.stateString}`);
            const commentText = typeof change.comment === 'string'
                ? ` <span class="timeline-comment">(${change.comment})</span>`
                : '';

            html += `<li class="timeline-item ${stateClass} ${changeType}">
                <span class="timeline-icon">${changeIcon}</span>
                <span class="timeline-time">${timeStr}</span>
                <span class="timeline-arrow">→</span>
                <span class="timeline-state">${stateText}</span>${commentText}
            </li>`;
        }

        html += '</ul></details>';
        return html;
    },
    // }}}
    // }}}
};
