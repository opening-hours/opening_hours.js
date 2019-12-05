/*
 * This file is part of YoHours.
 * 
 * YoHours is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 * 
 * YoHours is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with YoHours.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * YoHours
 * Web interface to make opening hours data for OpenStreetMap the easy way
 * Author: Adrien PAVIE
 *
 * Model JS classes
 */

/*
 * ========= CONSTANTS =========
 */
/**
 * The days in a week
 */
DAYS = {
	MONDAY: 0,
	TUESDAY: 1,
	WEDNESDAY: 2,
	THURSDAY: 3,
	FRIDAY: 4,
	SATURDAY: 5,
	SUNDAY: 6
};

/**
 * The days in OSM
 */
OSM_DAYS = [ "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su" ];

/**
 * The days IRL
 */
IRL_DAYS = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];

/**
 * The month in OSM
 */
OSM_MONTHS = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];

/**
 * The months IRL
 */
IRL_MONTHS = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

/**
 * The last day of month
 */
MONTH_END_DAY = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

/**
 * The maximal minute that an interval can have
 */
MINUTES_MAX = 1440;

/**
 * The maximal value of days
 */
DAYS_MAX = 6;

/**
 * The weekday ID for PH
 */
PH_WEEKDAY = -2;

/*
 * ========== CLASSES ==========
 */

/**
 * Class Interval, defines an interval in a week where the POI is open.
 * @param dayStart The start week day (use DAYS constants)
 * @param dayEnd The end week day (use DAYS constants)
 * @param minStart The interval start (in minutes since midnight)
 * @param minEnd The interval end (in minutes since midnight)
 */
var Interval = function(dayStart, dayEnd, minStart, minEnd) {
//ATTRIBUTES
	/** The start day in the week, see DAYS **/
	this._dayStart = dayStart;
	
	/** The end day in the week, see DAYS **/
	this._dayEnd = dayEnd;
	
	/** The interval start, in minutes since midnight (local hour) **/
	this._start = minStart;
	
	/** The interval end, in minutes since midnight (local hour) **/
	this._end = minEnd;

//CONSTRUCTOR
	if(this._dayEnd == 0 && this._end == 0) {
		this._dayEnd = DAYS_MAX;
		this._end = MINUTES_MAX;
	}
	//console.log("Interval", this._dayStart, this._dayEnd, this._start, this._end);
};

//ACCESSORS
	/**
	 * @return The start day in the week, see DAYS constants
	 */
	Interval.prototype.getStartDay = function() {
		return this._dayStart;
	};
	
	/**
	 * @return The end day in the week, see DAYS constants
	 */
	Interval.prototype.getEndDay = function() {
		return this._dayEnd;
	};
	
	/**
	 * @return The interval start, in minutes since midnight
	 */
	Interval.prototype.getFrom = function() {
		return this._start;
	};
	
	/**
	 * @return The interval end, in minutes since midnight
	 */
	Interval.prototype.getTo = function() {
		return this._end;
	};



/**
 * A wide interval is an interval of one or more days, weeks, months, holidays.
 * Use WideInterval.days/weeks/months/holidays methods to construct one object.
 */
var WideInterval = function() {
//ATTRIBUTES
	/** The start of the interval **/
	this._start = null;
	
	/** The end of the interval **/
	this._end = null;

	/** The kind of interval **/
	this._type = null;
};

//CONSTRUCTORS
	/**
	 * @return a day-based interval
	 */
	WideInterval.prototype.day = function(startDay, startMonth, endDay, endMonth) {
		if(startDay == null || startMonth == null) {
			throw Error("Start day and month can't be null");
		}
		this._start = { day: startDay, month: startMonth };
		this._end = (endDay != null && endMonth != null && (endDay != startDay || endMonth != startMonth)) ? { day: endDay, month: endMonth } : null;
		this._type = "day";
		return this;
	};
	
	/**
	 * @return a week-based interval
	 */
	WideInterval.prototype.week = function(startWeek, endWeek) {
		if(startWeek == null) {
			throw Error("Start week can't be null");
		}
		this._start = { week: startWeek };
		this._end = (endWeek != null && endWeek != startWeek) ? { week: endWeek } : null;
		this._type = "week";
		return this;
	};
	
	/**
	 * @return a month-based interval
	 */
	WideInterval.prototype.month = function(startMonth, endMonth) {
		if(startMonth == null) {
			throw Error("Start month can't be null");
		}
		this._start = { month: startMonth };
		this._end = (endMonth != null && endMonth != startMonth) ? { month: endMonth } : null;
		this._type = "month";
		return this;
	};
	
	/**
	 * @return a holiday-based interval
	 */
	WideInterval.prototype.holiday = function(holiday) {
		if(holiday == null || (holiday != "PH" && holiday != "SH" && holiday != "easter")) {
			throw Error("Invalid holiday, must be PH, SH or easter");
		}
		this._start = { holiday: holiday };
		this._end = null;
		this._type = "holiday";
		return this;
	};
	
	/**
	 * @return a holiday-based interval
	 */
	WideInterval.prototype.always = function() {
		this._start = null;
		this._end = null;
		this._type = "always";
		return this;
	};

//ACCESSORS
	/**
	 * @return The kind of wide interval (always, day, month, week, holiday)
	 */
	WideInterval.prototype.getType = function() {
		return this._type;
	};
	
	/**
	 * @return The start moment
	 */
	WideInterval.prototype.getStart = function() {
		return this._start;
	};
	
	/**
	 * @return The end moment
	 */
	WideInterval.prototype.getEnd = function() {
		return this._end;
	};
	
	/**
	 * @return True if the given object concerns the same interval as this one
	 */
	WideInterval.prototype.equals = function(o) {
		if(!o instanceof WideInterval) { return false; }
		if(this === o) { return true; }
		if(o._type == "always") { return this._type == "always"; }
		var result = false;
		
		switch(this._type) {
			case "always":
				result = o._start == null;
				break;
			case "day":
				result =
					(
					o._type == "day"
					&& o._start.month == this._start.month
					&& o._start.day == this._start.day
					&& (
						(o._end == null && this._end == null)
						|| (o._end != null && this._end != null && this._end.month == o._end.month && this._end.day == o._end.day)
					))
					||
					(
					o._type == "month"
					&& o._start.month == this._start.month
					&& (this.isFullMonth() && o.isFullMonth())
						|| (o._end != null && this._end != null && this._end.month == o._end.month && this.endsMonth() && o.endsMonth())
					);
				break;

			case "week":
				result =
					o._start.week == this._start.week
					&& (o._end == this._end || (this._end != null && o._end != null && o._end.week == this._end.week));
				break;

			case "month":
				result = 
					(
						o._type == "day"
						&& this._start.month == o._start.month
						&& o.startsMonth()
						&& (
							(this._end == null && o._end != null && this._start.month == o._end.month && o.endsMonth())
							||
							(this._end != null && o._end != null && this._end.month == o._end.month && o.endsMonth())
						)
					)
					||
					(
						o._type == "month"
						&& o._start.month == this._start.month
						&& (
							(this._end == null && o._end == null)
							||
							(this._end != null && o._end != null && this._end.month == o._end.month)
						)
					);
				break;

			case "holiday":
				result = o._start.holiday == this._start.holiday;
				break;
			default:
		}
		
		return result;
	};
	
	/**
	 * @return The human readable time
	 */
	WideInterval.prototype.getTimeForHumans = function() {
		var result;
		
		switch(this._type) {
			case "day":
				if(this._end != null) {
					result = "every week from "+IRL_MONTHS[this._start.month-1]+" "+this._start.day+" to ";
					if(this._start.month != this._end.month) { result += IRL_MONTHS[this._end.month-1]+" "; }
					result += this._end.day;
				}
				else {
					result = "day "+IRL_MONTHS[this._start.month-1]+" "+this._start.day;
				}
				break;

			case "week":
				if(this._end != null) {
					result = "every week from week "+this._start.week+" to "+this._end.week;
				}
				else {
					result = "week "+this._start.week;
				}
				break;

			case "month":
				if(this._end != null) {
					result = "every week from "+IRL_MONTHS[this._start.month-1]+" to "+IRL_MONTHS[this._end.month-1];
				}
				else {
					result = "every week in "+IRL_MONTHS[this._start.month-1];
				}
				break;

			case "holiday":
				if(this._start.holiday == "SH") {
					result = "every week during school holidays";
				}
				else if(this._start.holiday == "PH") {
					result = "every public holidays";
				}
				else if(this._start.holiday == "easter") {
					result = "each easter day";
				}
				else {
					throw new Error("Invalid holiday type: "+this._start.holiday);
				}
				break;

			case "always":
				result = "every week of year";
				break;
			default:
				result = "invalid time";
		}
		
		return result;
	};
	
	/**
	 * @return The time selector for OSM opening_hours
	 */
	WideInterval.prototype.getTimeSelector = function() {
		var result;
		
		switch(this._type) {
			case "day":
				result = OSM_MONTHS[this._start.month-1]+" "+((this._start.day < 10) ? "0" : "")+this._start.day;
				if(this._end != null) {
					//Same month as start ?
					if(this._start.month == this._end.month) {
						result += "-"+((this._end.day < 10) ? "0" : "")+this._end.day;
					}
					else {
						result += "-"+OSM_MONTHS[this._end.month-1]+" "+((this._end.day < 10) ? "0" : "")+this._end.day;
					}
				}
				break;

			case "week":
				result = "week "+((this._start.week < 10) ? "0" : "")+this._start.week;
				if(this._end != null) {
					result += "-"+((this._end.week < 10) ? "0" : "")+this._end.week;
				}
				break;

			case "month":
				result = OSM_MONTHS[this._start.month-1];
				if(this._end != null) {
					result += "-"+OSM_MONTHS[this._end.month-1];
				}
				break;

			case "holiday":
				result = this._start.holiday;
				break;

			case "always":
			default:
				result = "";
		}
		
		return result;
	};
	
	/**
	 * Does this interval corresponds to a full month ?
	 */
	WideInterval.prototype.isFullMonth = function() {
		if(this._type == "month" && this._end == null) {
			return true;
		}
		else if(this._type == "day") {
			return (this._start.day == 1 && this._end != null && this._end.month == this._start.month && this._end.day != undefined && this._end.day == MONTH_END_DAY[this._end.month-1]);
		}
		else {
			return false;
		}
	};
	
	/**
	 * Does this interval starts the first day of a month
	 */
	WideInterval.prototype.startsMonth = function() {
		return this._type == "month" || this._type == "always" || (this._type == "day" && this._start.day == 1);
	};
	
	/**
	 * Does this interval ends the last day of a month
	 */
	WideInterval.prototype.endsMonth = function() {
		return this._type == "month" || this._type == "always" || (this._type == "day" && this._end != null && this._end.day == MONTH_END_DAY[this._end.month-1]);
	};
	
	/**
	 * Does this interval strictly contains the given one (ie the second is a refinement of the first, and not strictly equal)
	 * @param o The other wide interval
	 * @return True if this date contains the given one (and is not strictly equal to)
	 */
	WideInterval.prototype.contains = function(o) {
		var result = false;
		
		/*
		 * Check if it is contained in this one
		 */
		if(this.equals(o)) {
			result = false;
		}
		else if(this._type == "always") {
			result = true;
		}
		else if(this._type == "day") {
			if(o._type == "day") {
				//Starting after
				if(o._start.month > this._start.month || (o._start.month == this._start.month && o._start.day >= this._start.day)) {
					//Ending before
					if(o._end != null) {
						if(this._end != null && (o._end.month < this._end.month || (o._end.month == this._end.month && o._end.day <= this._end.day))) {
							result = true;
						}
					}
					else {
						if(this._end != null && (o._start.month < this._end.month || (o._start.month == this._end.month && o._start.day <= this._end.day))) {
							result = true;
						}
					}
				}
			}
			else if(o._type == "month"){
				//Starting after
				if(o._start.month > this._start.month || (o._start.month == this._start.month && this._start.day == 1)) {
					//Ending before
					if(o._end != null && this._end != null && (o._end.month < this._end.month || (o._end.month == this._end.month && this._end.day == MONTH_END_DAY[end.month-1]))) {
						result = true;
					}
					else if(o._end == null && (this._end != null && o._start.month < this._end.month)) {
						result = true;
					}
				}
			}
		}
		else if(this._type == "week") {
			if(o._type == "week") {
				if(o._start.week >= this._start.week) {
					if(o._end != null && this._end != null && o._end.week <= this._end.week) {
						result = true;
					}
					else if(o._end == null && ((this._end != null && o._start.week <= this._end.week) || o._start.week == this._start.week)) {
						result = true;
					}
				}
			}
		}
		else if(this._type == "month") {
			if(o._type == "month") {
				if(o._start.month >= this._start.month) {
					if(o._end != null && this._end != null && o._end.month <= this._end.month) {
						result = true;
					}
					else if(o._end == null && ((this._end != null && o._start.month <= this._end.month) || o._start.month == this._start.month)) {
						result = true;
					}
				}
			}
			else if(o._type == "day") {
				if(o._end != null) {
					if(this._end == null) {
						if(
							o._start.month == this._start.month
							&& o._end.month == this._start.month
							&& ((o._start.day >= 1 && o._end.day < MONTH_END_DAY[o._start.month-1])
							|| (o._start.day > 1 && o._end.day <= MONTH_END_DAY[o._start.month-1]))
						) {
							result = true;
						}
					}
					else {
						if(o._start.month >= this._start.month && o._end.month <= this._end.month) {
							if(
								(o._start.month > this._start.month && o._end.month < this._end.month)
								|| (o._start.month == this._start.month && o._end.month < this._end.month && start.day > 1)
								|| (o._start.month > this._start.month && o._end.month == this._end.month && o._end.day < MONTH_END_DAY[o._end.month-1])
								|| (o._start.day >= 1 && o._end.day < MONTH_END_DAY[o._end.month-1])
								|| (o._start.day > 1 && o._end.day <= MONTH_END_DAY[o._end.month-1])
							) {
								result = true;
							}
						}
					}
				}
				else {
					if(this._end == null) {
						if(this._start.month == o._start.month) {
							result = true;
						}
					}
					else {
						if(o._start.month >= this._start.month && o._start.month <= this._end.month) {
							result = true;
						}
					}
				}
			}
		}
		
		return result;
	};



/**
 * Class Day, represents a typical day
 */
var Day = function() {
//ATTRIBUTES
	/** The intervals defining this week **/
	this._intervals = [];
	
	/** The next interval ID **/
	this._nextInterval = 0;
};

//ACCESSORS
	/**
	 * @return This day, as a boolean array (minutes since midnight). True if open, false else.
	 */
	Day.prototype.getAsMinutesArray = function() {
		//Create array with all values set to false
		//For each minute
		var minuteArray = [];
		for (var minute = 0; minute <= MINUTES_MAX; minute++) {
			minuteArray[minute] = false;
		}
		
		//Set to true values where an interval is defined
		for(var id=0, l=this._intervals.length; id < l; id++) {
			if(this._intervals[id] != undefined) {
				var startMinute = null;
				var endMinute = null;
				
				if(
					this._intervals[id].getStartDay() == this._intervals[id].getEndDay()
					|| (this._intervals[id].getEndDay() == DAYS_MAX && this._intervals[id].getTo() == MINUTES_MAX)
				) {
					//Define start and end minute regarding the current day
					startMinute = this._intervals[id].getFrom();
					endMinute = this._intervals[id].getTo();
				}
				
				//Set to true the minutes for this day
				if(startMinute != null && endMinute != null){
					for(var minute = startMinute; minute <= endMinute; minute++) {
						minuteArray[minute] = true;
					}
				}
				else {
					console.log(this._intervals[id].getFrom()+" "+this._intervals[id].getTo()+" "+this._intervals[id].getStartDay()+" "+this._intervals[id].getEndDay());
					throw new Error("Invalid interval");
				}
			}
		}
		
		return minuteArray;
	};
	
	/**
	 * @param clean Clean intervals ? (default: false)
	 * @return The intervals in this week
	 */
	Day.prototype.getIntervals = function(clean) {
		clean = clean || false;
		
		if(clean) {
			//Create continuous intervals over days
			var minuteArray = this.getAsMinutesArray();
			var intervals = [];
			var minStart = -1, minEnd;
			
			for(var min=0, lm=minuteArray.length; min < lm; min++) {
				//First minute
				if(min == 0) {
					if(minuteArray[min]) {
						minStart = min;
					}
				}
				//Last minute
				else if(min == lm-1) {
					if(minuteArray[min]) {
						intervals.push(new Interval(
							0,
							0,
							minStart,
							min
						));
					}
				}
				//Other minutes
				else {
					//New interval
					if(minuteArray[min] && minStart < 0) {
						minStart = min;
					}
					//Ending interval
					else if(!minuteArray[min] && minStart >= 0) {
						intervals.push(new Interval(
							0,
							0,
							minStart,
							min-1
						));

						minStart = -1;
					}
				}
			}
			
			return intervals;
		}
		else {
			return this._intervals;
		}
	};

//MODIFIERS
	/**
	 * Add a new interval to this week
	 * @param interval The new interval
	 * @return The ID of the added interval
	 */
	Day.prototype.addInterval = function(interval) {
		this._intervals[this._nextInterval] = interval;
		this._nextInterval++;
		
		return this._nextInterval-1;
	};
	
	/**
	 * Edits the given interval
	 * @param id The interval ID
	 * @param interval The new interval
	 */
	Day.prototype.editInterval = function(id, interval) {
		this._intervals[id] = interval;
	};
	
	/**
	 * Remove the given interval
	 * @param id the interval ID
	 */
	Day.prototype.removeInterval = function(id) {
		this._intervals[id] = undefined;
	};
	
	/**
	 * Redefines this date range intervals with a copy of the given ones
	 */
	Day.prototype.copyIntervals = function(intervals) {
		this._intervals = [];
		for(var i=0; i < intervals.length; i++) {
			if(intervals[i] != undefined && intervals[i].getStartDay() == 0 && intervals[i].getEndDay() == 0) {
				this._intervals.push($.extend(true, {}, intervals[i]));
			}
		}
		
		this._intervals = this.getIntervals(true);
	};
	
	/**
	 * Removes all defined intervals
	 */
	Day.prototype.clearIntervals = function() {
		this._intervals = [];
	};

//OTHER METHODS
	/**
	 * Is this day defining the same intervals as the given one ?
	 */
	Day.prototype.sameAs = function(d) {
		return d.getAsMinutesArray().equals(this.getAsMinutesArray());
	};



/**
 * Class Week, represents a typical week of opening hours.
 */
var Week = function() {
//ATTRIBUTES
	/** The intervals defining this week **/
	this._intervals = [];
};

//ACCESSORS
	/**
	 * @return This week, as a two-dimensional boolean array. First dimension is for days (see DAYS), second dimension for minutes since midnight. True if open, false else.
	 */
	Week.prototype.getAsMinutesArray = function() {
		//Create array with all values set to false
		//For each day
		var minuteArray = [];
		for(var day = 0; day <= DAYS_MAX; day++) {
			//For each minute
			minuteArray[day] = [];
			for (var minute = 0; minute <= MINUTES_MAX; minute++) {
				minuteArray[day][minute] = false;
			}
		}
		
		//Set to true values where an interval is defined
		for(var id=0, l=this._intervals.length; id < l; id++) {
			if(this._intervals[id] != undefined) {
				for(var day = this._intervals[id].getStartDay(); day <= this._intervals[id].getEndDay(); day++) {
					//Define start and end minute regarding the current day
					var startMinute = (day == this._intervals[id].getStartDay()) ? this._intervals[id].getFrom() : 0;
					var endMinute = (day == this._intervals[id].getEndDay()) ? this._intervals[id].getTo() : MINUTES_MAX;

					//Set to true the minutes for this day
					if(startMinute != null && endMinute != null) {
						for(var minute = startMinute; minute <= endMinute; minute++) {
							minuteArray[day][minute] = true;
						}
					}
				}
			}
		}
		
		return minuteArray;
	};
	
	/**
	 * @param clean Clean intervals ? (default: false)
	 * @return The intervals in this week
	 */
	Week.prototype.getIntervals = function(clean) {
		clean = clean || false;
		
		if(clean) {
			//Create continuous intervals over days
			var minuteArray = this.getAsMinutesArray();
			var intervals = [];
			var dayStart = -1, minStart = -1, minEnd;
			
			for(var day=0, l=minuteArray.length; day < l; day++) {
				for(var min=0, lm=minuteArray[day].length; min < lm; min++) {
					//First minute of monday
					if(day == 0 && min == 0) {
						if(minuteArray[day][min]) {
							dayStart = day;
							minStart = min;
						}
					}
					//Last minute of sunday
					else if(day == DAYS_MAX && min == lm-1) {
						if(dayStart >= 0 && minuteArray[day][min]) {
							intervals.push(new Interval(
								dayStart,
								day,
								minStart,
								min
							));
						}
					}
					//Other days or minutes
					else {
						//New interval
						if(minuteArray[day][min] && dayStart < 0) {
							dayStart = day;
							minStart = min;
						}
						//Ending interval
						else if(!minuteArray[day][min] && dayStart >= 0) {
							if(min == 0) {
								intervals.push(new Interval(
									dayStart,
									day-1,
									minStart,
									MINUTES_MAX
								));
							}
							else {
								intervals.push(new Interval(
									dayStart,
									day,
									minStart,
									min-1
								));
							}
							dayStart = -1;
							minStart = -1;
						}
					}
				}
			}
			
			return intervals;
		}
		else {
			return this._intervals;
		}
	};
	
	/**
	 * Returns the intervals which are different from those defined in the given week
	 * @param w The general week
	 * @return The intervals which are different, as object { open: [ Intervals ], closed: [ Intervals ] }
	 */
	Week.prototype.getIntervalsDiff = function(w) {
		//Get minutes arrays
		var myMinArray = this.getAsMinutesArray();
		var wMinArray = w.getAsMinutesArray();
		
		//Create diff array
		var intervals = { open: [], closed: [] };
		var dayStart = -1, minStart = -1, minEnd;
		var diffDay, m, intervalsLength;
		
		for(var d=0; d <= DAYS_MAX; d++) {
			diffDay = false;
			m = 0;
			intervalsLength = intervals.open.length;

			while(m <= MINUTES_MAX) {
				//Copy entire day
				if(diffDay) {
					//First minute of monday
					if(d == 0 && m == 0) {
						if(myMinArray[d][m]) {
							dayStart = d;
							minStart = m;
						}
					}
					//Last minute of sunday
					else if(d == DAYS_MAX && m == MINUTES_MAX) {
						if(dayStart >= 0 && myMinArray[d][m]) {
							intervals.open.push(new Interval(
								dayStart,
								d,
								minStart,
								m
							));
						}
					}
					//Other days or minutes
					else {
						//New interval
						if(myMinArray[d][m] && dayStart < 0) {
							dayStart = d;
							minStart = m;
						}
						//Ending interval
						else if(!myMinArray[d][m] && dayStart >= 0) {
							if(m == 0) {
								intervals.open.push(new Interval(
									dayStart,
									d-1,
									minStart,
									MINUTES_MAX
								));
							}
							else {
								intervals.open.push(new Interval(
									dayStart,
									d,
									minStart,
									m-1
								));
							}
							dayStart = -1;
							minStart = -1;
						}
					}
					m++;
				}
				//Check for diff
				else {
					diffDay = myMinArray[d][m] ? !wMinArray[d][m] : wMinArray[d][m];
					
					//If there is a difference, start to copy full day
					if(diffDay) {
						m = 0;
					}
					//Else, continue checking
					else {
						m++;
					}
				}
			}
			
			//Close intervals if day is identical
			if(!diffDay && dayStart > -1) {
				intervals.open.push(new Interval(
					dayStart,
					d-1,
					minStart,
					MINUTES_MAX
				));
				dayStart = -1;
				minStart = -1;
			}
			
			//Create closed intervals if closed all day
			if(diffDay && dayStart == -1 && intervalsLength == intervals.open.length) {
				//Merge with previous interval if possible
				if(intervals.closed.length > 0 && intervals.closed[intervals.closed.length-1].getEndDay() == d - 1) {
					intervals.closed[intervals.closed.length-1] = new Interval(
																intervals.closed[intervals.closed.length-1].getStartDay(),
																d,
																0,
																MINUTES_MAX
															);
				}
				else {
					intervals.closed.push(new Interval(d, d, 0, MINUTES_MAX));
				}
			}
		}
		
		return intervals;
	};

//MODIFIERS
	/**
	 * Add a new interval to this week
	 * @param interval The new interval
	 * @return The ID of the added interval
	 */
	Week.prototype.addInterval = function(interval) {
		this._intervals[this._intervals.length] = interval;
		return this._intervals.length-1;
	};
	
	/**
	 * Edits the given interval
	 * @param id The interval ID
	 * @param interval The new interval
	 */
	Week.prototype.editInterval = function(id, interval) {
		this._intervals[id] = interval;
	};
	
	/**
	 * Remove the given interval
	 * @param id the interval ID
	 */
	Week.prototype.removeInterval = function(id) {
		this._intervals[id] = undefined;
	};
	
	/**
	 * Removes all intervals during a given day
	 */
	Week.prototype.removeIntervalsDuringDay = function(day) {
		var interval, itLength = this._intervals.length, dayDiff;
		for(var i=0; i < itLength; i++) {
			interval = this._intervals[i];
			if(interval != undefined) {
				//If interval over given day
				if(interval.getStartDay() <= day && interval.getEndDay() >= day) {
					dayDiff = interval.getEndDay() - interval.getStartDay();
					
					//Avoid deletion if over night interval
					if(dayDiff > 1 || dayDiff == 0 || interval.getStartDay() == day || interval.getFrom() <= interval.getTo()) {
						//Create new interval if several day
						if(interval.getEndDay() - interval.getStartDay() >= 1 && interval.getFrom() <= interval.getTo()) {
							if(interval.getStartDay() < day) {
								this.addInterval(new Interval(interval.getStartDay(), day-1, interval.getFrom(), 24*60));
							}
							if(interval.getEndDay() > day) {
								this.addInterval(new Interval(day+1, interval.getEndDay(), 0, interval.getTo()));
							}
						}
						
						//Delete
						this.removeInterval(i);
					}
				}
			}
		}
	};
	
	/**
	 * Redefines this date range intervals with a copy of the given ones
	 */
	Week.prototype.copyIntervals = function(intervals) {
		this._intervals = [];
		for(var i=0; i < intervals.length; i++) {
			if(intervals[i] != undefined) {
				this._intervals.push($.extend(true, {}, intervals[i]));
			}
		}
	};

//OTHER METHODS
	/**
	 * Is this week defining the same intervals as the given one ?
	 */
	Week.prototype.sameAs = function(w) {
		return w.getAsMinutesArray().equals(this.getAsMinutesArray());
	};



/**
 * Class DateRange, defines a range of months, weeks or days.
 * A typical week or day will be associated.
 */
var DateRange = function(w) {
//ATTRIBUTES
	/** The wide interval of this date range **/
	this._wideInterval = null;
	
	/** The typical week or day associated **/
	this._typical = undefined;

//CONSTRUCTOR
	this.updateRange(w);
};

//ACCESSORS
	/**
	 * Is this interval defining a typical day ?
	 */
	DateRange.prototype.definesTypicalDay = function() {
		return this._typical instanceof Day;
	};
	
	/**
	 * Is this interval defining a typical week ?
	 */
	DateRange.prototype.definesTypicalWeek = function() {
		return this._typical instanceof Week;
	};
	
	/**
	 * @return The typical day or week
	 */
	DateRange.prototype.getTypical = function() {
		return this._typical;
	};
	
	/**
	 * @return The wide interval this date range concerns
	 */
	DateRange.prototype.getInterval = function() {
		return this._wideInterval;
	};

//MODIFIERS
	/**
	 * Changes the date range
	 */
	DateRange.prototype.updateRange = function(wide) {
		this._wideInterval = (wide != null) ? wide : new WideInterval().always();

		//Create typical week/day
		if(this._typical == undefined) {
			switch(this._wideInterval.getType()) {
				case "day":
					if(this._wideInterval.getEnd() == null) {
						this._typical = new Day();
					}
					else {
						this._typical = new Week();
					}
					break;
				case "week":
					this._typical = new Week();
					break;
				case "month":
					this._typical = new Week();
					break;
				case "holiday":
					if(this._wideInterval.getStart().holiday == "SH") {
						this._typical = new Week();
					}
					else {
						this._typical = new Day();
					}
					break;
				case "always":
					this._typical = new Week();
					break;
				default:
					throw Error("Invalid interval type: "+this._wideInterval.getType());
			}
		}
	};

//OTHER METHODS
	/**
	 * Check if the typical day/week of this date range is the same as in the given date range
	 * @param dr The other DateRange
	 * @return True if same typical day/week
	 */
	DateRange.prototype.hasSameTypical = function(dr) {
		return this.definesTypicalDay() == dr.definesTypicalDay() && this._typical.sameAs(dr.getTypical());
	};
	
	/**
	 * Does this date range contains the given date range (ie the second is a refinement of the first)
	 * @param start The start of the date range
	 * @param end The end of the date range
	 * @return True if this date contains the given one (and is not strictly equal to)
	 */
	DateRange.prototype.isGeneralFor = function(dr) {
		return dr.definesTypicalDay() == this.definesTypicalDay() && this._wideInterval.contains(dr.getInterval());
	};



/**
 * An opening_hours time, such as "08:00" or "08:00-10:00" or "off" (if no start and end)
 * @param start The start minute (from midnight), can be null
 * @param end The end minute (from midnight), can be null
 */
var OhTime = function(start, end) {
//ATTRIBUTES
	/** The start minute **/
	this._start = (start >= 0) ? start : null;
	
	/** The end minute **/
	this._end = (end >= 0 && end != start) ? end : null;
};

//ACCESSORS
	/**
	 * @return The time in opening_hours format
	 */
	OhTime.prototype.get = function() {
		if(this._start === null && this._end === null) {
			return "off";
		}
		else {
			return this._timeString(this._start) + ((this._end == null) ? "" : "-" + this._timeString(this._end));
		}
	};
	
	/**
	 * @return The start minutes
	 */
	OhTime.prototype.getStart = function() {
		return this._start;
	};
	
	/**
	 * @return The end minutes
	 */
	OhTime.prototype.getEnd = function() {
		return this._end;
	};

	/**
	 * @return True if same time
	 */
	OhTime.prototype.equals = function(t) {
		return this._start == t.getStart() && this._end == t.getEnd();
	};
	
//OTHER METHODS
	/**
	 * @return The hour in HH:MM format
	 */
	OhTime.prototype._timeString = function(minutes) {
		var h = Math.floor(minutes / 60);
		var period = "";
		var m = minutes % 60;
		return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + period;
	};



/**
 * An opening_hours date, such as "Apr 21", "week 1-15 Mo,Tu", "Apr-Dec Mo-Fr", "SH Su", ...
 * @param w The wide selector, as string
 * @param wt The wide selector type (month, week, day, holiday, always)
 * @param wd The weekdays, as integer array (0 to 6 = Monday to Sunday, -1 = single day date, -2 = PH)
 */
var OhDate = function(w, wt, wd) {
//ATTRIBUTES
	/** Kind of wide date (month, week, day, holiday, always) **/
	this._wideType = wt;
	
	/** Wide date **/
	this._wide = w;
	
	/** Weekdays + PH **/
	this._weekdays = wd.sort();
	
	/** Overwritten days (to allow create simpler rules) **/
	this._wdOver = [];

//CONSTRUCTOR
	if(w == null || wt == null || wd == null) {
		throw Error("Missing parameter");
	}
};

//ACCESSORS
	/**
	 * @return The wide type
	 */
	OhDate.prototype.getWideType = function() {
		return this._wideType;
	};

	/**
	 * @return The monthday, month, week, SH (depends of type)
	 */
	OhDate.prototype.getWideValue = function() {
		return this._wide;
	};
	
	/**
	 * @return The weekdays array
	 */
	OhDate.prototype.getWd = function() {
		return this._weekdays;
	};
	
	/**
	 * @return The overwrittent weekdays array
	 */
	OhDate.prototype.getWdOver = function() {
		return this._wdOver;
	};
	
	/**
	 * @param a The other weekdays array
	 * @return True if same weekdays as other object
	 */
	OhDate.prototype.sameWd = function(a) {
		return a.equals(this._weekdays);
	};
	
	/**
	 * @return The weekdays in opening_hours syntax
	 */
	OhDate.prototype.getWeekdays = function() {
		var result = "";
		var wd = this._weekdays.concat(this._wdOver).sort();
		
		//PH as weekday
		if(wd.length > 0 && wd[0] == PH_WEEKDAY) {
			result = "PH";
			wd.shift();
		}
		
		//Check if we should create a continuous interval for week-end
		if(wd.length > 0 && wd.contains(6) && wd.contains(0) && (wd.contains(5) || wd.contains(1))) {
			//Find when the week-end starts
			var startWE = 6;
			var i=wd.length-2, stopLooking = false;
			while(!stopLooking && i >= 0) {
				if(wd[i] == wd[i+1] - 1) {
					startWE = wd[i];
					i--;
				}
				else {
					stopLooking = true;
				}
			}
			
			//Find when it stops
			i=1;
			stopLooking = false;
			var endWE = 0;
			
			while(!stopLooking && i < wd.length) {
				if(wd[i-1] == wd[i] - 1) {
					endWE = wd[i];
					i++;
				}
				else {
					stopLooking = true;
				}
			}
			
			//If long enough, add it as first weekday interval
			var length = 7 - startWE + endWE + 1;

			if(length >= 3 && startWE > endWE) {
				if(result.length > 0) { result += ","; }
				result += OSM_DAYS[startWE]+"-"+OSM_DAYS[endWE];
				
				//Remove processed days
				var j=0;
				while(j < wd.length) {
					if(wd[j] <= endWE || wd[j] >= startWE) {
						wd.splice(j, 1);
					}
					else {
						j++;
					}
				}
			}
		}
		
		//Process only if not empty weekday list
		if(wd.length > 1 || (wd.length == 1 && wd[0] != -1)) {
			result += (result.length > 0) ? ","+OSM_DAYS[wd[0]] : OSM_DAYS[wd[0]];
			var firstInRow = wd[0];
			
			for(var i=1; i < wd.length; i++) {
				//When days aren't following
				if(wd[i-1] != wd[i] - 1) {
					//Previous day range length > 1
					if(firstInRow != wd[i-1]) {
						//Two days
						if(wd[i-1] - firstInRow == 1) {
							result += ","+OSM_DAYS[wd[i-1]];
						}
						else {
							result += "-"+OSM_DAYS[wd[i-1]];
						}
					}
					
					//Add the current day
					result += ","+OSM_DAYS[wd[i]];
					firstInRow = wd[i];
				}
				else if(i==wd.length-1) {
					if(wd[i] - firstInRow == 1) {
						result += ","+OSM_DAYS[wd[i]];
					}
					else {
						result += "-"+OSM_DAYS[wd[i]];
					}
				}
			}
		}
		
		if(result == "Mo-Su") { result = ""; }
		
		return result;
	};
	
	/**
	 * Is the given object of the same kind as this one
	 * @return True if same weekdays and same wide type
	 */
	OhDate.prototype.sameKindAs = function(d) {
		return this._wideType == d.getWideType() && d.sameWd(this._weekdays);
	};
	
	/**
	 * @return True if this object is equal to the given one
	 */
	OhDate.prototype.equals = function(o) {
		return o instanceof OhDate && this._wideType == o.getWideType() && this._wide == o.getWideValue() && o.sameWd(this._weekdays);
	};

//MODIFIERS
	/**
	 * Adds a new weekday in this date
	 */
	OhDate.prototype.addWeekday = function(wd) {
		if(!this._weekdays.contains(wd) && !this._wdOver.contains(wd)) {
			this._weekdays.push(wd);
			this._weekdays = this._weekdays.sort();
		}
	};
	
	/**
	 * Adds public holiday as a weekday of this date
	 */
	OhDate.prototype.addPhWeekday = function() {
		this.addWeekday(PH_WEEKDAY);
	};
	
	/**
	 * Adds an overwritten weekday, which can be included in this date and that will be overwritten in a following rule
	 */
	OhDate.prototype.addOverwrittenWeekday = function(wd) {
		if(!this._wdOver.contains(wd) && !this._weekdays.contains(wd)) {
			this._wdOver.push(wd);
			this._wdOver = this._wdOver.sort();
		}
	}



/**
 * An opening_hours rule, such as "Mo,Tu 08:00-18:00"
 */
var OhRule = function() {
//ATTRIBUTES
	/** The date selectors **/
	this._date = [];
	
	/** The time selectors **/
	this._time = [];
};

//ACCESSORS
	/**
	 * @return The date selectors, as an array
	 */
	OhRule.prototype.getDate = function() {
		return this._date;
	};
	
	/**
	 * @return The time selectors, as an array
	 */
	OhRule.prototype.getTime = function() {
		return this._time;
	};
	
	/**
	 * @return The opening_hours value
	 */
	OhRule.prototype.get = function() {
		var result = "";
		
		//Create date part
		if(this._date.length > 1 || this._date[0].getWideValue() != "") {
			//Add wide selectors
			for(var i=0, l=this._date.length; i < l; i++) {
				if(i > 0) {
					result += ",";
				}
				result += this._date[i].getWideValue();
			}
		}
		
		//Add weekdays
		if(this._date.length > 0) {
			var wd = this._date[0].getWeekdays();
			if(wd.length > 0) {
				result += " "+wd;
			}
		}
		
		//Create time part
		if(this._time.length > 0) {
			result += " ";
			for(var i=0, l=this._time.length; i < l; i++) {
				if(i > 0) {
					result += ",";
				}
				result += this._time[i].get();
			}
		}
		else {
			result += " off";
		}
		
		if(result.trim() == "00:00-24:00") { result = "24/7"; }
		
		return result.trim();
	};
	
	/**
	 * @return True if the given rule has the same time as this one
	 */
	OhRule.prototype.sameTime = function(o) {
		if(o == undefined || o == null || o.getTime().length != this._time.length) {
			return false;
		}
		else {
			for(var i=0, l=this._time.length; i < l; i++) {
				if(!this._time[i].equals(o.getTime()[i])) {
					return false;
				}
			}
			return true;
		}
	};
	
	/**
	 * Is this rule concerning off time ?
	 */
	OhRule.prototype.isOff = function() {
		return this._time.length == 0 || (this._time.length == 1 && this._time[0].getStart() == null);
	};
	
	/**
	 * Does the rule have any overwritten weekday ?
	 */
	OhRule.prototype.hasOverwrittenWeekday = function() {
		return this._date.length > 0 && this._date[0]._wdOver.length > 0;
	};

//MODIFIERS
	/**
	 * Adds a weekday to all the dates
	 */
	OhRule.prototype.addWeekday = function(wd) {
		for(var i=0; i < this._date.length; i++) {
			this._date[i].addWeekday(wd);
		}
	};
	
	/**
	 * Adds public holidays as weekday to all dates
	 */
	OhRule.prototype.addPhWeekday = function() {
		for(var i=0; i < this._date.length; i++) {
			this._date[i].addPhWeekday();
		}
	};
	
	/**
	 * Adds an overwritten weekday to all the dates
	 */
	OhRule.prototype.addOverwrittenWeekday = function(wd) {
		for(var i=0; i < this._date.length; i++) {
			this._date[i].addOverwrittenWeekday(wd);
		}
	};
	
	/**
	 * @param d A new date selector
	 */
	OhRule.prototype.addDate = function(d) {
		//Check param
		if(d == null || d == undefined || !d instanceof OhDate) {
			throw Error("Invalid parameter");
		}
		
		//Check if date can be added
		if(this._date.length == 0 || (this._date[0].getWideType() != "always" && this._date[0].sameKindAs(d))) {
			this._date.push(d);
		}
		else {
			if(this._date.length != 1 || this._date[0].getWideType() != "always" || !this._date[0].sameWd(d.getWd())) {
				throw Error("This date can't be added to this rule");
			}
		}
	};
	
	/**
	 * @param t A new time selector
	 */
	OhRule.prototype.addTime = function(t) {
		if((this._time.length == 0 || this._time[0].get() != "off") && !this._time.contains(t)) {
			this._time.push(t);
		}
		else {
			throw Error("This time can't be added to this rule");
		}
	};



/**
 * Class OpeningHoursBuilder, creates opening_hours value from date range object
 */
var OpeningHoursBuilder = function() {};

//OTHER METHODS
	/**
	 * Parses several date ranges to create an opening_hours string
	 * @param dateRanges The date ranges to parse
	 * @return The opening_hours string
	 */
	OpeningHoursBuilder.prototype.build = function(dateRanges) {
		var rules = [];
		var dateRange, ohrules, ohrule, ohruleAdded, ruleId, rangeGeneral, rangeGeneralFor;
		
		//Read each date range
		for(var rangeId=0, l=dateRanges.length; rangeId < l; rangeId++) {
			dateRange = dateRanges[rangeId];
			
			if(dateRange != undefined) {
				//Check if the defined typical week/day is not strictly equal to a previous wider rule
				rangeGeneral = null;
				rangeGeneralFor = null;
				var rangeGenId=rangeId-1;
				while(rangeGenId >= 0 && rangeGeneral == null) {
					if(dateRanges[rangeGenId] != undefined) {
						generalFor = dateRanges[rangeGenId].isGeneralFor(dateRange);
						if(
							dateRanges[rangeGenId].hasSameTypical(dateRange)
							&& (
								dateRanges[rangeGenId].getInterval().equals(dateRange.getInterval())
								|| generalFor
							)
						) {
							rangeGeneral = rangeGenId;
						}
						else if(generalFor && dateRanges[rangeGenId].definesTypicalWeek() && dateRange.definesTypicalWeek()) {
							rangeGeneralFor = rangeGenId; //Keep this ID to make differences in order to simplify result
						}
					}
					rangeGenId--;
				}
				
				if(rangeId == 0 || rangeGeneral == null) {
					//Get rules for this date range
					if(dateRange.definesTypicalWeek()) {
						if(rangeGeneralFor != null) {
							ohrules = this._buildWeekDiff(dateRange, dateRanges[rangeGeneralFor]);
						}
						else {
							ohrules = this._buildWeek(dateRange);
						}
					}
					else {
						ohrules = this._buildDay(dateRange);
					}
					
					//Process each rule
					for(var ohruleId=0, orl=ohrules.length; ohruleId < orl; ohruleId++) {
						ohrule = ohrules[ohruleId];
						ohruleAdded = false;
						ruleId = 0;
						
						//Try to add them to previously defined ones
						while(!ohruleAdded && ruleId < rules.length) {
							//Identical one
							if(rules[ruleId].sameTime(ohrule)) {
								try {
									for(var dateId=0, dl=ohrule.getDate().length; dateId < dl; dateId++) {
										rules[ruleId].addDate(ohrule.getDate()[dateId]);
									}
									ohruleAdded = true;
								}
								//If first date not same kind as in found rule, continue
								catch(e) {
									//But before, try to merge PH with always weekdays
									if(
										ohrule.getDate()[0].getWideType() == "holiday"
										&& ohrule.getDate()[0].getWideValue() == "PH"
										&& rules[ruleId].getDate()[0].getWideType() == "always"
									) {
										rules[ruleId].addPhWeekday();
										ohruleAdded = true;
									}
									else if(
										rules[ruleId].getDate()[0].getWideType() == "holiday"
										&& rules[ruleId].getDate()[0].getWideValue() == "PH"
										&& ohrule.getDate()[0].getWideType() == "always"
									) {
										ohrule.addPhWeekday();
										rules[ruleId] = ohrule;
										ohruleAdded = true;
									}
									else {
										ruleId++;
									}
								}
							}
							else {
								ruleId++;
							}
						}
						
						//If not, add as new rule
						if(!ohruleAdded) {
							rules.push(ohrule);
						}
						
						//If some overwritten weekdays are still in last rule
						if(ohruleId == orl - 1 && ohrule.hasOverwrittenWeekday()) {
							var ohruleOWD = new OhRule();
							for(var ohruleDateId = 0; ohruleDateId < ohrule.getDate().length; ohruleDateId++) {
								ohruleOWD.addDate(
									new OhDate(
										ohrule.getDate()[ohruleDateId].getWideValue(),
										ohrule.getDate()[ohruleDateId].getWideType(),
										ohrule.getDate()[ohruleDateId].getWdOver()
									)
								);
							}
							ohruleOWD.addTime(new OhTime());
							ohrules.push(ohruleOWD);
							orl++;
						}
					}
				}
			}
		}
		
		//Create result string
		var result = "";
		for(var ruleId=0, l=rules.length; ruleId < l; ruleId++) {
			if(ruleId > 0) { result += "; "; }
			result += rules[ruleId].get();
		}
		
		return result;
	};

	
/***********************
 * Top level functions *
 ***********************/
	
	/**
	 * Creates rules for a given typical day
	 * @param dateRange The date range defining a typical day
	 * @return An array of OhRules
	 */
	OpeningHoursBuilder.prototype._buildDay = function(dateRange) {
		var intervals = dateRange.getTypical().getIntervals(true);
		var interval;
		
		//Create rule
		var rule = new OhRule();
		var date = new OhDate(dateRange.getInterval().getTimeSelector(), dateRange.getInterval().getType(), [ -1 ]);
		rule.addDate(date);
		
		//Read time
		for(var i=0, l=intervals.length; i < l; i++) {
			interval = intervals[i];
			
			if(interval != undefined) {
				rule.addTime(new OhTime(interval.getFrom(), interval.getTo()));
			}
		}
		
		return [ rule ];
	};
	
	/**
	 * Create rules for a date range defining a typical week
	 * Algorithm inspired by OpeningHoursEdit plugin for JOSM
	 * @param dateRange The date range defining a typical day
	 * @return An array of OhRules
	 */
	OpeningHoursBuilder.prototype._buildWeek = function(dateRange) {
		var result = [];
		var intervals = dateRange.getTypical().getIntervals(true);
		var interval, rule, date;
		
		/*
		 * Create time intervals per day
		 */
		var timeIntervals = this._createTimeIntervals(dateRange.getInterval().getTimeSelector(), dateRange.getInterval().getType(), intervals);
		var monday0 = timeIntervals[0];
		var sunday24 = timeIntervals[1];
		var days = timeIntervals[2];
		
		//Create continuous night for monday-sunday
		days = this._nightMonSun(days, monday0, sunday24);
		
		/*
		 * Group rules with same time
		 */
		// 0 means nothing done with this day yet
		// 8 means the day is off
		// -8 means the day is off and should be shown
		// 0<x<8 means the day have the openinghours of day x
		// -8<x<0 means nothing done with this day yet, but it intersects a
		// range of days with same opening_hours
		var daysStatus = [];
		
		//Init status
		for(var i=0; i < OSM_DAYS.length; i++) {
			daysStatus[i] = 0;
		}
		
		//Read status
		for(var i=0; i < days.length; i++) {
			if(days[i].isOff() && daysStatus[i] == 0) {
				daysStatus[i] = 8;
			}
			else if(days[i].isOff() && daysStatus[i] < 0 && daysStatus[i] > -8) {
				daysStatus[i] = -8;
				
				//Try to merge with another off day
				var merged = false, mdOff = 0;
				while(!merged && mdOff < i) {
					if(days[mdOff].isOff()) {
						days[mdOff].addWeekday(i);
						merged = true;
					}
					else {
						mdOff++;
					}
				}
				
				//If not merged, add it
				if(!merged) {
					result.push(days[i]);
				}
			} else if (daysStatus[i] <= 0 && daysStatus[i] > -8) {
				daysStatus[i] = i + 1;
				var lastSameDay = i;
				var sameDayCount = 1;
				
				for(var j = i + 1; j < days.length; j++) {
					if (days[i].sameTime(days[j])) {
						daysStatus[j] = i + 1;
						days[i].addWeekday(j);
						lastSameDay = j;
						sameDayCount++;
					}
				}
				if (sameDayCount == 1) {
					// a single Day with this special opening_hours
					result.push(days[i]);
				} else if (sameDayCount == 2) {
					// exactly two Days with this special opening_hours
					days[i].addWeekday(lastSameDay);
					result.push(days[i]);
				} else if (sameDayCount > 2) {
					// more than two Days with this special opening_hours
					for (var j = i + 1; j < lastSameDay; j++) {
						if (daysStatus[j] == 0) {
							daysStatus[j] = -i - 1;
							days[i].addOverwrittenWeekday(j);
						}
					}
					days[i].addWeekday(lastSameDay);
					result.push(days[i]);
				}
			}
		}
		
		result = this._mergeDays(result);
		
		return result;
	};
	
	/**
	 * Reads a week to create an opening_hours string for weeks which are overwriting a previous one
	 * @param dateRange The date range defining a typical day
	 * @param generalDateRange The date range which is wider than this one
	 * @return An array of OhRules
	 */
	OpeningHoursBuilder.prototype._buildWeekDiff = function(dateRange, generalDateRange) {
		var intervals = dateRange.getTypical().getIntervalsDiff(generalDateRange.getTypical());
		
		/*
		 * Create time intervals per day
		 */
		//Open
		var timeIntervals = this._createTimeIntervals(dateRange.getInterval().getTimeSelector(), dateRange.getInterval().getType(), intervals.open);
		var monday0 = timeIntervals[0];
		var sunday24 = timeIntervals[1];
		var days = timeIntervals[2];
		
		//Closed
		for(var i=0, l=intervals.closed.length; i < l; i++) {
			interval = intervals.closed[i];
			
			for(var j=interval.getStartDay(); j <= interval.getEndDay(); j++) {
				days[j].addTime(new OhTime());
			}
		}
		
		//Create continuous night for monday-sunday
		days = this._nightMonSun(days, monday0, sunday24);
		
		/*
		 * Group rules with same time
		 */
		// 0 means nothing done with this day yet
		// 8 means the day is off
		// -8 means the day is off and should be shown
		// 0<x<8 means the day have the openinghours of day x
		// -8<x<0 means nothing done with this day yet, but it intersects a
		// range of days with same opening_hours
		var daysStatus = [];
		
		//Init status
		for(var i=0; i < OSM_DAYS.length; i++) {
			daysStatus[i] = 0;
		}
		
		//Read rules
		var result = [];
		for(var i=0; i < days.length; i++) {
			//Off day which must be shown
			if(days[i].isOff() && days[i].getTime().length == 1) {
				daysStatus[i] = -8;
				
				//Try to merge with another off day
				var merged = false, mdOff = 0;
				while(!merged && mdOff < i) {
					if(days[mdOff].isOff() && days[mdOff].getTime().length == 1) {
						days[mdOff].addWeekday(i);
						merged = true;
					}
					else {
						mdOff++;
					}
				}
				
				//If not merged, add it
				if(!merged) {
					result.push(days[i]);
				}
			}
			//Off day which must be hidden
			else if(days[i].isOff() && days[i].getTime().length == 0) {
				daysStatus[i] = 8;
			}
			//Non-processed day
			else if(daysStatus[i] <= 0 && daysStatus[i] > -8) {
				daysStatus[i] = i+1;
				var sameDayCount = 1;
				var lastSameDay = i;
				
				result.push(days[i]);
				
				for(var j = i + 1; j < days.length; j++) {
					if (days[i].sameTime(days[j])) {
						daysStatus[j] = i + 1;
						days[i].addWeekday(j);
						lastSameDay = j;
						sameDayCount++;
					}
				}
				if (sameDayCount == 1) {
					// a single Day with this special opening_hours
					result.push(days[i]);
				} else if (sameDayCount == 2) {
					// exactly two Days with this special opening_hours
					days[i].addWeekday(lastSameDay);
					result.push(days[i]);
				} else if (sameDayCount > 2) {
					// more than two Days with this special opening_hours
					for (var j = i + 1; j < lastSameDay; j++) {
						if (daysStatus[j] == 0) {
							daysStatus[j] = -i - 1;
							if(days[j].getTime().length > 0) {
								days[i].addOverwrittenWeekday(j);
							}
						}
					}
					days[i].addWeekday(lastSameDay);
					result.push(days[i]);
				}
			}
		}
		
		result = this._mergeDays(result);
		
		return result;
	};


/****************************************
 * Utility functions for top-level ones *
 ****************************************/
	
	/**
	 * Merge days with same opening time
	 */
	OpeningHoursBuilder.prototype._mergeDays = function(rules) {
		if(rules.length == 0) { return rules; }
		
		var result = [];
		var dateMerged;

		result.push(rules[0]);
		var dm=0, wds;
		for(var d=1; d < rules.length; d++) {
			dateMerged = false;
			dm = 0;
			while(!dateMerged && dm < d) {
				if(rules[dm].sameTime(rules[d])) {
					wds = rules[d].getDate()[0].getWd();
					for(var wd=0; wd < wds.length; wd++) {
						rules[dm].addWeekday(wds[wd]);
					}
					dateMerged = true;
				}
				dm++;
			}
			
			if(!dateMerged) {
				result.push(rules[d]);
			}
		}
		
		return result;
	};
	
	/**
	 * Creates time intervals for each day
	 * @return [ monday0, sunday24, days ]
	 */
	OpeningHoursBuilder.prototype._createTimeIntervals = function(timeSelector, type, intervals) {
		var monday0 = -1;
		var sunday24 = -1;
		var days = [];
		var interval;
		
		//Create rule for each day of the week
		for(var i=0; i < 7; i++) {
			days.push(new OhRule());
			days[i].addDate(new OhDate(timeSelector, type, [ i ]));
		}
		
		for(var i=0, l=intervals.length; i < l; i++) {
			interval = intervals[i];
			
			if(interval != undefined) {
				//Handle sunday 24:00 with monday 00:00
				if(interval.getStartDay() == DAYS_MAX && interval.getEndDay() == DAYS_MAX && interval.getTo() == MINUTES_MAX) {
					sunday24 = interval.getFrom();
				}
				if(interval.getStartDay() == 0 && interval.getEndDay() == 0 && interval.getFrom() == 0) {
					monday0 = interval.getTo();
				}
				
				try {
					//Interval in a single day
					if(interval.getStartDay() == interval.getEndDay()) {
						days[interval.getStartDay()].addTime(
							new OhTime(interval.getFrom(), interval.getTo())
						);
					}
					//Interval on two days
					else if(interval.getEndDay() - interval.getStartDay() == 1) {
						//Continuous night
						if(interval.getFrom() > interval.getTo()) {
							days[interval.getStartDay()].addTime(
								new OhTime(interval.getFrom(), interval.getTo())
							);
						}
						//Separated days
						else {
							days[interval.getStartDay()].addTime(
								new OhTime(interval.getFrom(), MINUTES_MAX)
							);
							days[interval.getEndDay()].addTime(
								new OhTime(0, interval.getTo())
							);
						}
					}
					//Interval on more than two days
					else {
						for(var j=interval.getStartDay(), end=interval.getEndDay(); j <= end; j++) {
							if(j == interval.getStartDay()) {
								days[j].addTime(
									new OhTime(interval.getFrom(), MINUTES_MAX)
								);
							}
							else if(j == interval.getEndDay()) {
								days[j].addTime(
									new OhTime(0, interval.getTo())
								);
							}
							else {
								days[j].addTime(
									new OhTime(0, MINUTES_MAX)
								);
							}
						}
					}
				}
				catch(e) {
					console.warn(e);
				}
			}
		}
		
		return [ monday0, sunday24, days ];
	};
	
	/**
	 * Changes days array to make sunday - monday night continuous if needed
	 */
	OpeningHoursBuilder.prototype._nightMonSun = function(days, monday0, sunday24) {
		if(monday0 >= 0 && sunday24 >= 0 && monday0 < sunday24) {
			days[0].getTime().sort(this._sortOhTime);
			days[6].getTime().sort(this._sortOhTime);
			
			//Change sunday interval
			days[6].getTime()[days[6].getTime().length-1] = new OhTime(sunday24, monday0);
			
			//Remove monday interval
			days[0].getTime().shift();
		}
		return days;
	};
	
	/**
	 * Sort OhTime objects by start hour
	 */
	OpeningHoursBuilder.prototype._sortOhTime = function(a, b) {
		return a.getStart() - b.getStart();
	};



/**
 * Class OpeningHoursParser, creates DateRange/Week/Day objects from opening_hours string
 * Based on a subpart of grammar defined at https://wiki.openstreetmap.org/wiki/Key:opening_hours/specification
 */
var OpeningHoursParser = function() {
//CONSTANTS
	this.RGX_RULE_MODIFIER = /^(open|closed|off)$/i;
	this.RGX_WEEK_KEY = /^week$/;
	this.RGX_WEEK_VAL = /^([01234]?[0-9]|5[0123])(\-([01234]?[0-9]|5[0123]))?(,([01234]?[0-9]|5[0123])(\-([01234]?[0-9]|5[0123]))?)*\:?$/;
	this.RGX_MONTH = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?\:?$/;
	this.RGX_MONTHDAY = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([012]?[0-9]|3[01])(\-((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) )?([012]?[0-9]|3[01]))?\:?$/;
	this.RGX_TIME = /^((([01]?[0-9]|2[01234])\:[012345][0-9](\-([01]?[0-9]|2[01234])\:[012345][0-9])?(,([01]?[0-9]|2[01234])\:[012345][0-9](\-([01]?[0-9]|2[01234])\:[012345][0-9])?)*)|(24\/7))$/;
	this.RGX_WEEKDAY = /^(((Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?)|(PH|SH|easter))(,(((Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?)|(PH|SH|easter)))*$/;
	this.RGX_HOLIDAY = /^(PH|SH|easter)$/;
	this.RGX_WD = /^(Mo|Tu|We|Th|Fr|Sa|Su)(\-(Mo|Tu|We|Th|Fr|Sa|Su))?$/;
};

//OTHER METHODS
	/**
	 * Parses the given opening_hours string
	 * @param oh The opening_hours string
	 * @return An array of date ranges
	 */
	OpeningHoursParser.prototype.parse = function(oh) {
		var result = [];
		
		//Separate each block
		var blocks = oh.split(';');
		
		/*
		 * Blocks parsing
		 * Each block can be divided in three parts: wide range selector, small range selector, rule modifier.
		 * The last two are simpler to parse, so we start to read rule modifier, then small range selector.
		 * All the lasting tokens are part of wide range selector.
		 */
		
		var block, tokens, currentToken, ruleModifier, timeSelector, weekdaySelector, wideRangeSelector;
		var singleTime, from, to, times;
		var singleWeekday, wdStart, wdEnd, holidays, weekdays;
		var monthSelector, weekSelector, weeks, singleWeek, weekFrom, weekTo, singleMonth, months, monthFrom, monthTo;
		var dateRanges, dateRange, drObj, foundDateRange, resDrId;
		
		//Read each block
		for(var i=0, li=blocks.length; i < li; i++) {
			block = blocks[i].trim();
			
			if(block.length == 0) { continue; } //Don't parse empty blocks
			
			tokens = this._tokenize(block);
			currentToken = tokens.length - 1;
			ruleModifier = null;
			timeSelector = null;
			weekdaySelector = null;
			wideRangeSelector = null;
			
			//console.log(tokens);
			
			/*
			 * Rule modifier (open, closed, off)
			 */
			if(currentToken >= 0 && this._isRuleModifier(tokens[currentToken])) {
				//console.log("rule modifier",tokens[currentToken]);
				ruleModifier = tokens[currentToken].toLowerCase();
				currentToken--;
			}
			
			/*
			 * Small range selectors
			 */
			from = null;
			to = null;
			times = []; //Time intervals in minutes
			
			//Time selector
			if(currentToken >= 0 && this._isTime(tokens[currentToken])) {
				timeSelector = tokens[currentToken];
				
				if(timeSelector == "24/7") {
					times.push({from: 0, to: 24*60});
				}
				else {
					//Divide each time interval
					timeSelector = timeSelector.split(',');
					for(var ts=0, tsl = timeSelector.length; ts < tsl; ts++) {
						//Separate start and end values
						singleTime = timeSelector[ts].split('-');
						from = this._asMinutes(singleTime[0]);
						if(singleTime.length > 1) {
							to = this._asMinutes(singleTime[1]);
						}
						else {
							to = from;
						}
						times.push({from: from, to: to});
					}
				}
				
				currentToken--;
			}
			
			holidays = [];
			weekdays = [];
			
			//Weekday selector
			if(timeSelector == "24/7") {
				weekdays.push({from: 0, to: 6});
			}
			else if(currentToken >= 0 && this._isWeekday(tokens[currentToken])) {
				weekdaySelector = tokens[currentToken];
				
				//Divide each weekday
				weekdaySelector = weekdaySelector.split(',');
				
				for(var wds=0, wdsl = weekdaySelector.length; wds < wdsl; wds++) {
					singleWeekday = weekdaySelector[wds];
					
					//Holiday
					if(this.RGX_HOLIDAY.test(singleWeekday)) {
						holidays.push(singleWeekday);
					}
					//Weekday interval
					else if(this.RGX_WD.test(singleWeekday)) {
						singleWeekday = singleWeekday.split('-');
						wdFrom = OSM_DAYS.indexOf(singleWeekday[0]);
						if(singleWeekday.length > 1) {
							wdTo = OSM_DAYS.indexOf(singleWeekday[1]);
						}
						else {
							wdTo = wdFrom;
						}
						weekdays.push({from: wdFrom, to: wdTo});
					}
					else {
						throw new Error("Invalid weekday interval: "+singleWeekday);
					}
				}
				
				currentToken--;
			}
			
			/*
			 * Wide range selector
			 */
			weeks = [];
			months = [];
			
			if(currentToken >= 0) {
				wideRangeSelector = tokens[0];
				for(var ct=1; ct <= currentToken; ct++) {
					wideRangeSelector += " "+tokens[ct];
				}
				
				if(wideRangeSelector.length > 0) {
					wideRangeSelector = wideRangeSelector.replace(/\:$/g, '').split('week'); //0 = Month or SH, 1 = weeks
					
					//Month or SH
					monthSelector = wideRangeSelector[0].trim();
					if(monthSelector.length == 0) { monthSelector = null; }
					
					//Weeks
					if(wideRangeSelector.length > 1) {
						weekSelector = wideRangeSelector[1].trim();
						if(weekSelector.length == 0) { weekSelector = null; }
					}
					else { weekSelector = null; }
					
					if(monthSelector != null && weekSelector != null) {
						throw new Error("Unsupported simultaneous month and week selector");
					}
					else if(monthSelector != null) {
						monthSelector = monthSelector.split(',');
						
						for(var ms=0, msl = monthSelector.length; ms < msl; ms++) {
							singleMonth = monthSelector[ms];
							
							//School holidays
							if(singleMonth == "SH") {
								months.push({holiday: "SH"});
							}
							//Month intervals
							else if(this.RGX_MONTH.test(singleMonth)) {
								singleMonth = singleMonth.split('-');
								monthFrom = OSM_MONTHS.indexOf(singleMonth[0])+1;
								if(monthFrom < 1) {
									throw new Error("Invalid month: "+singleMonth[0]);
								}
								
								if(singleMonth.length > 1) {
									monthTo = OSM_MONTHS.indexOf(singleMonth[1])+1;
									if(monthTo < 1) {
										throw new Error("Invalid month: "+singleMonth[1]);
									}
								}
								else {
									monthTo = null;
								}
								months.push({from: monthFrom, to: monthTo});
							}
							//Monthday intervals
							else if(this.RGX_MONTHDAY.test(singleMonth)) {
								singleMonth = singleMonth.replace(/\:/g, '').split('-');
								
								//Read monthday start
								monthFrom = singleMonth[0].split(' ');
								monthFrom = { day: parseInt(monthFrom[1],10), month: OSM_MONTHS.indexOf(monthFrom[0])+1 };
								if(monthFrom.month < 1) {
									throw new Error("Invalid month: "+monthFrom[0]);
								}
								
								if(singleMonth.length > 1) {
									monthTo = singleMonth[1].split(' ');
									
									//Same month as start
									if(monthTo.length == 1) {
										monthTo = { day: parseInt(monthTo[0],10), month: monthFrom.month };
									}
									//Another month
									else {
										monthTo = { day: parseInt(monthTo[1],10), month: OSM_MONTHS.indexOf(monthTo[0])+1 };
										if(monthTo.month < 1) {
											throw new Error("Invalid month: "+monthTo[0]);
										}
									}
								}
								else {
									monthTo = null;
								}
								months.push({fromDay: monthFrom, toDay: monthTo});
							}
							//Unsupported
							else {
								throw new Error("Unsupported month selector: "+singleMonth);
							}
						}
					}
					else if(weekSelector != null) {
						//Divide each week interval
						weekSelector = weekSelector.split(',');
						
						for(var ws=0, wsl = weekSelector.length; ws < wsl; ws++) {
							singleWeek = weekSelector[ws].split('-');
							weekFrom = parseInt(singleWeek[0],10);
							if(singleWeek.length > 1) {
								weekTo = parseInt(singleWeek[1],10);
							}
							else {
								weekTo = null;
							}
							weeks.push({from: weekFrom, to: weekTo});
						}
					}
					else {
						throw Error("Invalid date selector");
					}
				}
			}
			
			//If no read token, throw error
			if(currentToken == tokens.length - 1) {
				throw Error("Unreadable string");
			}
			
 			// console.log("months",months);
 			// console.log("weeks",weeks);
 			// console.log("holidays",holidays);
 			// console.log("weekdays",weekdays);
 			// console.log("times",times);
 			// console.log("rule",ruleModifier);
			
			/*
			 * Create date ranges
			 */
			dateRanges = [];
			
			//Month range
			if(months.length > 0) {
				for(var mId=0, ml = months.length; mId < ml; mId++) {
					singleMonth = months[mId];
					
					if(singleMonth.holiday != undefined) {
						dateRanges.push(new WideInterval().holiday(singleMonth.holiday));
					}
					else if(singleMonth.fromDay != undefined) {
						if(singleMonth.toDay != null) {
							dateRange = new WideInterval().day(singleMonth.fromDay.day, singleMonth.fromDay.month, singleMonth.toDay.day, singleMonth.toDay.month);
						}
						else {
							dateRange = new WideInterval().day(singleMonth.fromDay.day, singleMonth.fromDay.month);
						}
						dateRanges.push(dateRange);
					}
					else {
						if(singleMonth.to != null) {
							dateRange = new WideInterval().month(singleMonth.from, singleMonth.to);
						}
						else {
							dateRange = new WideInterval().month(singleMonth.from);
						}
						dateRanges.push(dateRange);
					}
				}
			}
			//Week range
			else if(weeks.length > 0) {
				for(var wId=0, wl = weeks.length; wId < wl; wId++) {
					if(weeks[wId].to != null) {
						dateRange = new WideInterval().week(weeks[wId].from, weeks[wId].to);
					}
					else {
						dateRange = new WideInterval().week(weeks[wId].from);
					}
					dateRanges.push(dateRange);
				}
			}
			//Holiday range
			else if(holidays.length > 0) {
				for(var hId=0, hl = holidays.length; hId < hl; hId++) {
					dateRanges.push(new WideInterval().holiday(holidays[hId]));
					if(holidays[hId] == "PH" && weekdays.length > 0 && months.length == 0 && weeks.length == 0) {
						dateRanges.push(new WideInterval().always());
					}
				}
			}
			//Full year range
			else {
				dateRanges.push(new WideInterval().always());
			}
			
			//Case of no weekday defined = all week
			if(weekdays.length == 0) {
				if(holidays.length == 0 || (holidays.length == 1 && holidays[0] == "SH")) {
					weekdays.push({from: 0, to: OSM_DAYS.length -1 });
				}
				else {
					weekdays.push({from: 0, to: 0 });
				}
			}
			
			//Case of no time defined = all day
			if(times.length == 0) {
				times.push({from: 0, to: 24*60});
			}
			
			/*
			 * Create date range objects
			 */
			for(var drId = 0, drl=dateRanges.length; drId < drl; drId++) {
				/*
				 * Find an already defined date range or create new one
				 */
				foundDateRange = false;
				resDrId=0;
				while(resDrId < result.length && !foundDateRange) {
					if(result[resDrId].getInterval().equals(dateRanges[drId])) {
						foundDateRange = true;
					}
					else {
						resDrId++;
					}
				}
				
				if(foundDateRange) {
					drObj = result[resDrId];
				}
				else {
					drObj = new DateRange(dateRanges[drId]);
					
					//Find general date range that may be refined by this one
					var general = -1;
					for(resDrId=0; resDrId < result.length; resDrId++) {
						if(result[resDrId].isGeneralFor(new DateRange(dateRanges[drId]))) {
							general = resDrId;
						}
					}
					
					//Copy general date range intervals
					if(general >= 0 && drObj.definesTypicalWeek()) {
						drObj.getTypical().copyIntervals(result[general].getTypical().getIntervals());
					}
					
					result.push(drObj);
				}
				
				/*
				 * Add time intervals
				 */
				//For each weekday
				for(var wdId=0, wdl=weekdays.length; wdId < wdl; wdId++) {
					//Remove overlapping days
					if(weekdays[wdId].from <= weekdays[wdId].to) {
						for(var wdRm=weekdays[wdId].from; wdRm <= weekdays[wdId].to; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
					}
					else {
						for(var wdRm=weekdays[wdId].from; wdRm <= 6; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
						for(var wdRm=0; wdRm <= weekdays[wdId].to; wdRm++) {
							if(drObj.definesTypicalWeek()) {
								drObj.getTypical().removeIntervalsDuringDay(wdRm);
							}
							else {
								drObj.getTypical().clearIntervals();
							}
						}
					}
					
					//For each time interval
					for(var tId=0, tl=times.length; tId < tl; tId++) {
						if(ruleModifier == "closed" || ruleModifier == "off") {
							this._removeInterval(drObj.getTypical(), weekdays[wdId], times[tId]);
						}
						else {
							this._addInterval(drObj.getTypical(), weekdays[wdId], times[tId]);
						}
					}
				}
			}
		}
		
		return result;
	};

	/**
	 * Remove intervals from given typical day/week
	 * @param typical The typical day or week
	 * @param weekdays The concerned weekdays
	 * @param times The concerned times
	 */
	OpeningHoursParser.prototype._removeInterval = function(typical, weekdays, times) {
		if(weekdays.from <= weekdays.to) {
			for(var wd=weekdays.from; wd <= weekdays.to; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
		}
		else {
			for(var wd=weekdays.from; wd <= 6; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
			for(var wd=0; wd <= weekdays.to; wd++) {
				this._removeIntervalWd(typical, times, wd);
			}
		}
	};
	
	/**
	 * Remove intervals from given typical day/week for a given weekday
	 * @param typical The typical day or week
	 * @param times The concerned times
	 * @param wd The concerned weekday
	 */
	OpeningHoursParser.prototype._removeIntervalWd = function(typical, times, wd) {
		//Interval during day
		if(times.to >= times.from) {
			typical.removeInterval(
				new Interval(wd, wd, times.from, times.to)
			);
		}
		//Interval during night
		else {
			//Everyday except sunday
			if(wd < 6) {
				typical.removeInterval(
					new Interval(wd, wd+1, times.from, times.to)
				);
			}
			//Sunday
			else {
				typical.removeInterval(
					new Interval(wd, wd, times.from, 24*60)
				);
				typical.removeInterval(
					new Interval(0, 0, 0, times.to)
				);
			}
		}
	};
	
	/**
	 * Adds intervals from given typical day/week
	 * @param typical The typical day or week
	 * @param weekdays The concerned weekdays
	 * @param times The concerned times
	 */
	OpeningHoursParser.prototype._addInterval = function(typical, weekdays, times) {
		//Check added interval are OK for days
		if(typical instanceof Day) {
			if(weekdays.from != 0 || (weekdays.to != 0 && times.from <= times.to)) {
				weekdays = $.extend({}, weekdays);
				weekdays.from = 0;
				weekdays.to = (times.from <= times.to) ? 0 : 1;
			}
		}
		
		if(weekdays.from <= weekdays.to) {
			for(var wd=weekdays.from; wd <= weekdays.to; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
		}
		else {
			for(var wd=weekdays.from; wd <= 6; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
			for(var wd=0; wd <= weekdays.to; wd++) {
				this._addIntervalWd(typical, times, wd);
			}
		}
	};
	
	/**
	 * Adds intervals from given typical day/week for a given weekday
	 * @param typical The typical day or week
	 * @param times The concerned times
	 * @param wd The concerned weekday
	 */
	OpeningHoursParser.prototype._addIntervalWd = function(typical, times, wd) {
		//Interval during day
		if(times.to >= times.from) {
			typical.addInterval(
				new Interval(wd, wd, times.from, times.to)
			);
		}
		//Interval during night
		else {
			//Everyday except sunday
			if(wd < 6) {
				typical.addInterval(
					new Interval(wd, wd+1, times.from, times.to)
				);
			}
			//Sunday
			else {
				typical.addInterval(
					new Interval(wd, wd, times.from, 24*60)
				);
				typical.addInterval(
					new Interval(0, 0, 0, times.to)
				);
			}
		}
	};
	
	/**
	 * Converts a time string "12:45" into minutes integer
	 * @param time The time string
	 * @return The amount of minutes since midnight
	 */
	OpeningHoursParser.prototype._asMinutes = function(time) {
		var values = time.split(':');
		return parseInt(values[0],10) * 60 + parseInt(values[1],10);
	};
	
	/**
	 * Is the given token a weekday selector ?
	 */
	OpeningHoursParser.prototype._isWeekday = function(token) {
		return this.RGX_WEEKDAY.test(token);
	};
	
	/**
	 * Is the given token a time selector ?
	 */
	OpeningHoursParser.prototype._isTime = function(token) {
		return this.RGX_TIME.test(token);
	};
	
	/**
	 * Is the given token a rule modifier ?
	 */
	OpeningHoursParser.prototype._isRuleModifier = function(token) {
		return this.RGX_RULE_MODIFIER.test(token);
	};
	
	/**
	 * Create tokens for a given block
	 */
	OpeningHoursParser.prototype._tokenize = function(block) {
		var result = block.trim().split(' ');
		var position = $.inArray("", result);
		while( ~position ) {
			result.splice(position, 1);
			position = $.inArray("", result);
		}
		return result;
	};
	
	OpeningHoursParser.prototype._printIntervals = function(from, intervals) {
		console.log("From: "+from);
		if(intervals.length > 0) {
			console.log("-------------------------");
			for(var i=0; i < intervals.length; i++) {
				if(intervals[i] == undefined) {
					console.log(i+": "+undefined);
				}
				else {
					console.log(i+": "+intervals[i].getStartDay()+", "+intervals[i].getEndDay()+", "+intervals[i].getFrom()+", "+intervals[i].getTo());
				}
			}
			console.log("-------------------------");
		}
		else {
			console.log("Empty intervals");
		}
	};


/**
 * Check compatibility of opening_hours string with YoHours
 */
var YoHoursChecker = function() {
//ATTRIBUTES
	/** The OpeningHoursParser **/
	this._parser = new OpeningHoursParser();
};

//OTHER METHODS
	/**
	 * Check if the opening_hours is readable by YoHours
	 * @param oh The opening_hours string
	 * @return True if YoHours can read it and display it
	 */
	YoHoursChecker.prototype.canRead = function(oh) {
		var result = false;
		
		try {
			var parsed = this._parser.parse(oh);
			if(parsed != null) {
				result = true;
			}
		}
		catch(e) {;}
		
		return result;
	};
