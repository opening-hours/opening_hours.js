declare module 'opening_hours' {
  export type opening_hours_warning_type =
    | 'adding_0'
    | 'additional_rule_separator_not_used_after_time_wrapping_midnight'
    | 'additional_rule_which_evaluates_to_closed'
    | 'ambiguous_word'
    | 'combine_rules'
    | 'default_state'
    | 'empty_comment'
    | 'hour_min_separator'
    | 'interpreted_as_year'
    | 'no_colon_after'
    | 'nothing_useful'
    | 'omit_ko'
    | 'period_one'
    | 'period_one_year_plus'
    | 'please_use_ok_for_ko'
    | 'public_holiday'
    | 'rant_degree_sign_used_for_zero'
    | 'separator_for_readability'
    | 'strange_24_7'
    | 'switched'
    | 'use_multi'
    | 'vague'
    | 'value_ends_with_token'
    | 'without_minutes'
    | 'word_error_correction'
    | 'year_past'
    | 'zero_calculation'

  export interface opening_hours_warning {
    type: opening_hours_warning_type
    message: string
    /** The string the `position` offset refers to. This is the input value,
     * except for selector-reordering warnings where it is the prettified value. */
    value: string
    /** Character offset into `value` where the warning points (the spot the
     * `<--- ` marker is placed at in `getWarnings()`). `null` if it could not
     * be determined. */
    position: number | null
  }

  export class opening_hours {
    constructor(
      value: string,
      nominatim_object?: nominatim_object | null,
      optional_conf_param?: optional_conf_param | null
    )
    getState(date?: Date): boolean
    getUnknown(date?: Date): boolean
    getStateString(
      date: Date | undefined,
      past: true
    ): 'open' | 'unknown' | 'closed'
    getStateString(
      date?: Date,
      past?: false
    ): 'open' | 'unknown' | 'close'
    getStateString(
      date?: Date,
      past?: boolean
    ): 'open' | 'unknown' | 'closed' | 'close'
    getComment(date?: Date): string | undefined
    getNextChange(date?: Date, maxdate?: Date): Date | undefined
    getMatchingRule(date?: Date): number | undefined
    getOpenDuration(from: Date, to: Date): [number, number]
    getOpenIntervals(
      from: Date,
      to: Date
    ): [Date, Date, boolean, string | undefined][]
    getStatePair(
      date?: Date
    ): [boolean, Date, boolean, string | undefined, number | undefined]
    getWarnings(): string[]
    getStructuredWarnings(): opening_hours_warning[]
    isEqualTo(
      second_oh_object: opening_hours,
      start_date?: Date
    ): boolean
    isWeekStable(): boolean
    prettifyValue(argument_hash?: Partial<argument_hash>): string
    getIterator(date?: Date): opening_hours_iterator
  }
  export default opening_hours

  export class opening_hours_iterator {
    getDate(): Date
    setDate(date: Date): void
    getState(date?: Date): boolean
    getUnknown(date?: Date): boolean
    getStateString(
      date: Date | undefined,
      past: true
    ): 'open' | 'unknown' | 'closed'
    getStateString(
      date?: Date,
      past?: false
    ): 'open' | 'unknown' | 'close'
    getStateString(
      date?: Date,
      past?: boolean
    ): 'open' | 'unknown' | 'closed' | 'close'
    getComment(date?: Date): string | undefined
    getMatchingRule(date?: Date): number | undefined
    advance(limit?: Date): boolean
  }

  export interface nominatim_object {
    lat: number
    lon: number
    address: {
      country_code: string
      state: string
    }
  }

  export interface argument_hash {
    rule_index: number | undefined
    zero_pad_hour: boolean
    one_zero_if_hour_zero: boolean
    leave_off_closed: boolean
    keyword_for_off_closed: string
    rule_sep_string: string
    print_semicolon: boolean
    leave_weekday_sep_one_day_betw: boolean
    sep_one_day_between: string
    zero_pad_month_and_week_numbers: boolean
    locale: string
    date_format: Intl.DateTimeFormatOptions['weekday']
  }

  export enum mode {
    time_ranges = 0,
    points_in_time = 1,
    both = 2,
  }

  export enum warnings_severity {
    warning = 4,
    notice = 5,
    info = 6,
    debug = 7,
  }

  export interface optional_conf {
    mode: mode | undefined
    tag_key: string | undefined
    map_value: boolean | undefined
    warnings_severity: warnings_severity | undefined
    locale: string | undefined
  }

  export type optional_conf_param = number | optional_conf
}
