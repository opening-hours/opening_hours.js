export type HolidayItem = {
	name: string;
	year?: number;
	years?: 'even' | 'odd';
	fixed_date?: [number, number];
	variable_date?: string;
	offset?: number;
	only_states?: string[];
	shift_rule?: string;
	substitute_rule?: string;
	substitute_name?: string;
	[key: string]: unknown;
};
export type SchoolHolidayItem = {
	name: string;
	default?: number[];
	[year: string]: string | number[] | undefined;
};
export type HolidayDefinition = Record<string, unknown> | HolidayItem[] | SchoolHolidayItem[] | string | number | boolean | null;
export type CountryHolidayDefinitions = Record<string, HolidayDefinition>;
export type HolidayDefinitions = Record<string, CountryHolidayDefinitions>;
