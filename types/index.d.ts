declare module 'opening_hours' {
  export class opening_hours {
    constructor(
      value: string,
      nominatim_object?: nominatim_object | null,
      optional_conf_param?: optional_conf_param | null
    )
    getState(date?: Date): boolean
    getUnknown(date?: Date): boolean
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
    ): [
      [Date, Date, boolean, string | undefined],
      [Date, Date, boolean, string | undefined]
    ]
    getStatePair(
      date?: Date
    ): [boolean, Date, boolean, string | undefined, number | undefined]
    getWarnings(): string[]
    isEqualTo(
      second_oh_object: opening_hours,
      start_date: opening_hours
    ): boolean
    isWeekStable(): boolean
    prettifyValue(argument_hash: argument_hash): string
    getIterator(date?: Date): opening_hours_iterator
  }
  export default opening_hours

  export class opening_hours_iterator {
    getDate(): Date
    setDate(date: Date): void
    getState(date?: Date): boolean
    getUnknown(date?: Date): boolean
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
    rule_index: 'number' | undefined
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
    mode: mode
    tag_key: string | undefined
    map_value: boolean | undefined
    warnings_severity: warnings_severity | undefined
    locale: string | undefined
  }

  export type optional_conf_param = number | optional_conf
}
