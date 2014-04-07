var OpeningHoursTable = {

    // JS functions for generating the table {{{
    // In English. Localization is done somewhere else (above).
    months:   ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],
    weekdays: ['su','mo','tu','we','th','fr','sa'],

    formatdate: function (now, nextchange, from) {
        var now_daystart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var nextdays = (nextchange.getTime() - now_daystart.getTime()) / 1000 / 60 / 60 / 24;

        var timediff = '';

        var delta = Math.floor((nextchange.getTime() - now.getTime()) / 1000 / 60); // delta is minutes
        if (delta < 60)
            timediff = i18n.t("words.in duration") +' '+ delta + ' ' + this.plural(delta, 'words.time.minute');

        var deltaminutes = delta % 60;
        delta = Math.floor(delta / 60); // delta is now hours

        if (delta < 48 && timediff == '')
            timediff = i18n.t("words.in duration") +' '+ delta + ' ' + this.plural(delta, 'words.time.hour')
                +' '+ i18n.t('words.time.hours minutes sep') + this.pad(deltaminutes) + ' ' + this.plural(deltaminutes, 'words.time.minute');

        var deltahours = delta % 24;
        delta = Math.floor(delta / 24); // delta is now days

        if (delta < 14 && timediff == '')
            timediff = i18n.t("words.in duration") +' '+ delta + ' ' + this.plural(delta, 'words.time.day')
                + ' ' + deltahours + ' ' + this.plural(deltahours, 'words.time.hour')
        else if (timediff == '')
            timediff = i18n.t("words.in duration") +' '+ delta + ' ' + this.plural(delta, 'words.time.day');

        var atday = '';
        if (from ? (nextdays < 1) : (nextdays <= 1))
            atday = i18n.t('words.today');
        else if (from ? (nextdays < 2) : (nextdays <= 2))
            atday = i18n.t('words.tomorrow');
        else if (from ? (nextdays < 7) : (nextdays <= 7))
            atday = i18n.t('words.on weekday') + i18n.t('weekdays.word next.' + this.weekdays[nextchange.getDay()])
                +' '+ i18n.t('weekdays.full.' + this.weekdays[nextchange.getDay()]);

        var atdate = nextchange.getDate() + ' ' + i18n.t('months.full.' + this.months[nextchange.getMonth()]);

        var res = [];

        if (atday != '') res.push(atday);
        if (atdate != '') res.push(atdate);
        if (timediff != '') res.push(timediff);

        return res.join(', ');
    },

    pad: function (n) { return n < 10 ? '0'+n : n; },

    plural: function (n, trans_base) {
        return i18n.t(trans_base, {count: n}); // Correct i18next plural function call
        /*if (n == 1) {
            return i18n.t(trans_base); // singular form
        } else if (n < 2) { // FIXME: Is this correct for Russian?
            return i18n.t(trans_base + ' many');
        } else {
            return i18n.t(trans_base + '_plural');
        }*/
    },

    printDate: function (date) {
            return i18n.t('months.short.' + this.months[date.getMonth()]) + ' ' +
                date.getDate() + ', ' + i18n.t('weekdays.short.' + this.weekdays[date.getDay()]);
    },

    drawTable: function (it, date_today, has_next_change) {
        var date_today = new Date(date_today);
        date_today.setHours(0, 0, 0, 0);

        var date = new Date(date_today);
        // date.setDate(date.getDate() - date.getDay() + 7);
        date.setDate(date.getDate() - date.getDay() - 1); // start at begin of the week

        var table = [];

        for (var row = 0; row < 7; row++) {
            date.setDate(date.getDate()+1);
            // if (date.getDay() == date_today.getDay()) {
            // 	date.setDate(date.getDate()-7);
            // }

            it.setDate(date);
            var is_open      = it.getState();
            var unknown      = it.getUnknown();
            var state_string = it.getStateString(false);
            var prevdate = date;
            var curdate  = date;
            // console.log(state_string, is_open, unknown, date.toString());

            table[row] = {
                date: new Date(date),
                times: '',
                text: []
            };

            while (has_next_change && it.advance() && curdate.getTime() - date.getTime() < 24*60*60*1000) {
                curdate = it.getDate();

                var fr = prevdate.getTime() - date.getTime();
                var to = curdate.getTime() - date.getTime();

                if (to > 24*60*60*1000)
                    to = 24*60*60*1000;

                fr *= 100/1000/60/60/24;
                to *= 100/1000/60/60/24;

                table[row].times += '<div class="timebar ' + (is_open ? 'open' : (unknown ? 'unknown' : 'closed'))
                    + '" style="width:' + (to-fr) + '%"></div>';
                if (is_open || unknown) {
                    var text = i18n.t('words.' + state_string) + ' ' + prevdate.getHours() + ':' + this.pad(prevdate.getMinutes())
                        + ' ' + i18n.t('words.to') + ' ';
                    if (prevdate.getDay() != curdate.getDay())
                        text += '24:00';
                    else
                        text += curdate.getHours() + ':' + this.pad(curdate.getMinutes());

                    table[row].text.push(text);
                }

                prevdate = curdate;
                is_open      = it.getState();
                unknown      = it.getUnknown();
                state_string = it.getStateString(false);
            }

            if (!has_next_change && table[row].text.length == 0) { // 24/7
                table[row].times += '<div class="timebar ' + (is_open ? 'open' : (unknown ? 'unknown' : 'closed'))
                    + '" style="width:100%"></div>';
                if (is_open)
                    table[row].text.push(i18n.t('words.open') + ' 0:00 ' + i18n.t('words.to') + ' 24:00');
            }
        }

        var output = '';
        output += '<table>';
        for (var row in table) {
            var today = table[row].date.getDay() == date_today.getDay();
            var endweek = ((table[row].date.getDay() + 1) % 7) == date_today.getDay();
            var cl = today ? ' class="today"' : (endweek ? ' class="endweek"' : '');

            // if (today && date_today.getDay() != 1)
            // 	output += '<tr class="separator"><td colspan="3"></td></tr>';
            output += '<tr' + cl + '><td class="day ' + (table[row].date.getDay() % 6 == 0 ? 'weekend' : 'workday') + '">';
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

    getReadableState: function (startString, endString, oh, past) {
        if (past === true) past = 'd';
        else past = '';

        var output = '';
        return startString + output + endString + '.';
    },

    drawTableAndComments: function (oh, it, value) {
        var prevdate          = it.getDate();
        var is_open           = it.getState();
        var unknown           = it.getUnknown();
        var state_string      = it.getStateString(false);
        var state_string_past = it.getStateString(true);
        var comment           = it.getComment();
        var has_next_change   = it.advance();

        var output = '';

        output += '<p class="' + state_string_past + '">'
            + i18n.t('texts.' + state_string_past+ ' ' + (has_next_change ? 'now' : 'always'));
        if (unknown) {
            output += (typeof comment != 'undefined' ? i18n.t('texts.depends on', { comment: '"' + comment + '"' }) : '');
        } else {
            output += (typeof comment != 'undefined' ? ', ' + i18n.t('words.comment') + ': "' + comment + '"' : '');
        }
        output += '</p>';

        if (has_next_change) {
            var time_diff = it.getDate().getTime() - prevdate.getTime();
            time_diff = (time_diff) / 1000;
            time_diff += 60; // go one second after
            output += '<p class="' + it.getStateString(true) + '">'
                + i18n.t('texts.will ' + it.getStateString(false), {
                    timestring: this.formatdate(prevdate, it.getDate(), true),
                    href: 'javascript:Evaluate(' + time_diff + ', false, \'' + value + '\')',
                }) + '</p>';
        }

        output += this.drawTable(it, prevdate, has_next_change);

        if (oh.isWeekStable())
            output += '<p><b>'+ i18n.t('texts.week stable') +'</b></p>';
        else
            output += '<p><b>'+ i18n.t('texts.not week stable') +'</b></p>';

        return output;
    },
    // }}}
}
