/* global i18next */

// eslint-disable-next-line no-unused-vars
const OpeningHoursTable = {

    // JS functions for generating the table {{{
    // In English. Localization is done somewhere else (above).
    months:   ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    weekdays: ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'],

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

    printDate (date) {
        // return date.toLocaleDateString('en-CA');
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

    drawTable (it, date_today, has_next_change) {
        date_today = new Date(date_today);
        date_today.setHours(0, 0, 0, 0);

        const date = new Date(date_today);
        // date.setDate(date.getDate() - date.getDay() + 7);
        date.setDate(date.getDate() - date.getDay() - 1); // start at begin of the week

        const table = [];

        for (let row = 0; row < 7; row++) {
            date.setDate(date.getDate() + 1);
            // if (date.getDay() === date_today.getDay()) {
            //     date.setDate(date.getDate()-7);
            // }

            it.setDate(date);
            let is_open      = it.getState();
            let unknown      = it.getUnknown();
            let state_string = it.getStateString(false);
            let prevdate = date;
            let curdate  = date;
            // console.log(state_string, is_open, unknown, date.toString());

            table[row] = {
                date: new Date(date),
                times: '',
                text: []
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

                table[row].times += `<div class="timebar ${is_open ? 'open' : unknown ? 'unknown' : 'closed'
                    }" style="width:${to - fr}%"></div>`;
                if (is_open || unknown) {
                    let text = `${i18next.t(`words.${state_string}`)} ${
                        i18next.t('words.from')} ${this.printTime(prevdate)
                        } ${i18next.t('words.to')} `;
                    if (prevdate.getDay() !== curdate.getDay()) {
                        text += '24:00';
                    } else {
                        text += this.printTime(curdate);
                    }

                    table[row].text.push(text);
                }

                prevdate = curdate;
                is_open      = it.getState();
                unknown      = it.getUnknown();
                state_string = it.getStateString(false);
            }

            if (!has_next_change && table[row].text.length === 0) { // 24/7
                table[row].times += `<div class="timebar ${is_open ? 'open' : unknown ? 'unknown' : 'closed'
                    }" style="width:100%"></div>`;
                if (is_open) {
                    table[row].text.push(`${i18next.t('words.open')} 00:00 ${i18next.t('words.to')} 24:00`);
                }
            }
        }

        let output = '';
        output += '<table>';
        for (const row in table) {
            const today = table[row].date.getDay() === date_today.getDay();
            const endweek = (table[row].date.getDay() + 1) % 7 === date_today.getDay();
            const cl = today ? ' class="today"' : (endweek ? ' class="endweek"' : '');

            // if (today && date_today.getDay() !== 1)
            //     output += '<tr class="separator"><td colspan="3"></td></tr>';
            output += `<tr${cl}><td class="day ${table[row].date.getDay() % 6 === 0 ? 'weekend' : 'workday'}">`;
            output += this.printDate(table[row].date);
            output += '</td><td class="times">';
            output += table[row].times;
            output += '</td><td>';
            output += table[row].text.join(', ') || '&nbsp;';
            output += '</td></tr>';
        }
        output += '</table>';
        return output;
    },

    getReadableState (startString, endString, oh, past) {
        if (past === true) past = 'd';
        else past = '';

        const output = '';
        return `${startString + output + endString}.`;
    },

    drawTableAndComments (oh, it, value) {
        const prevdate          = it.getDate();
        const unknown           = it.getUnknown();
        const state_string_past = it.getStateString(true);
        const comment           = it.getComment();
        const has_next_change   = it.advance();

        let output = '';

        output += `<p class="${state_string_past}">${
            i18next.t(`texts.${state_string_past} ${has_next_change ? 'now' : 'always'}`)}`;
        if (typeof comment !== 'undefined') {
            if (unknown) {
                output += i18next.t('texts.depends on', {comment: `"${comment}"`});
            } else {
                output += `, ${i18next.t('words.comment')}: "${comment}"`;
            }
        }
        output += '</p>';

        if (has_next_change) {
            let time_diff = it.getDate().getTime() - prevdate.getTime();
            time_diff /= 1000;
            time_diff += 60; // go one second after
            output += `<p class="${it.getStateString(true)}">${
                i18next.t(`texts.will ${it.getStateString(false)}`, {
                    timestring: this.formatdate(prevdate, it.getDate(), true),
                    href: `javascript:Evaluate(${time_diff}, false, '${value}')`,
                    comment: typeof it.getComment() === 'string' || typeof comment === 'string'
                        ? `, ${i18next.t('words.comment')}: ${typeof it.getComment() === 'string'
                            ? `"${it.getComment()}"`
                            : i18next.t('words.undefined')}`
                        : ''
                })}</p>`;
        }

        output += this.drawTable(it, prevdate, has_next_change);

        if (oh.isWeekStable()) {
            output += `<p><b>${i18next.t('texts.week stable')}</b></p>`;
        } else {
            output += `<p><b>${i18next.t('texts.not week stable')}</b></p>`;
        }

        return output;
    },
    // }}}
};
