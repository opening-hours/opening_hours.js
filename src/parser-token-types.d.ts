// SPDX-FileCopyrightText: © opening_hours.js contributors
//
// SPDX-License-Identifier: LGPL-3.0-only

/** A numeric token whose value and kind are correlated. */
export type NumberParserToken = [number, 'number', number] & {
    single_digit_lexeme?: boolean;
    meridian?: string;
};

/** A range selector token with a numeric value. */
export type NumericRangeParserToken = [number, 'year' | 'month' | 'weekday', number] & {
    single_digit_lexeme?: boolean;
    meridian?: string;
};

/** A parser token whose value is textual. */
export type TextParserToken = [string, string, number] & {
    single_digit_lexeme?: boolean;
    meridian?: string;
};

export type ParserToken = NumberParserToken | NumericRangeParserToken | TextParserToken;
export type ParserTokenRule = [ParserToken[], boolean, number?];
