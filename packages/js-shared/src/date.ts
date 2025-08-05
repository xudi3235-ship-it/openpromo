export namespace DateUtils {
  export enum DateGranularity {
    Hours = "hours",
    Minutes = "minutes",
    Seconds = "seconds",
    Milliseconds = "milliseconds",
    Days = "days",
    Weeks = "weeks",
    Months = "months",
    Years = "years",
  }

  export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

  /**
   * Adds a specified amount of time to a date.
   * @param date The base date (default: now)
   * @param amount The amount to add
   * @param granularity The unit of time
   * @returns A new Date object
   */
  export function addToDate(
    amount: number,
    granularity: DateGranularity,
    date: Date = new Date(),
  ): Date {
    const d = new Date(date);
    switch (granularity) {
      case DateGranularity.Days:
        d.setDate(d.getDate() + amount);
        break;
      case DateGranularity.Weeks:
        d.setDate(d.getDate() + amount * 7);
        break;
      case DateGranularity.Months:
        d.setMonth(d.getMonth() + amount);
        break;
      case DateGranularity.Years:
        d.setFullYear(d.getFullYear() + amount);
        break;
      case DateGranularity.Hours:
        d.setHours(d.getHours() + amount);
        break;
      case DateGranularity.Minutes:
        d.setMinutes(d.getMinutes() + amount);
        break;
      case DateGranularity.Seconds:
        d.setSeconds(d.getSeconds() + amount);
        break;
      case DateGranularity.Milliseconds:
        d.setMilliseconds(d.getMilliseconds() + amount);
        break;
      default:
        throw new Error("Invalid granularity");
    }
    return d;
  }

  /**
   * Builder for creating future/past dates with chaining.
   */
  export class DateBuilder {
    private date: Date;

    constructor(baseDate: Date = new Date()) {
      this.date = new Date(baseDate);
    }

    days(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Days, this.date);
      return this;
    }

    weeks(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Weeks, this.date);
      return this;
    }

    months(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Months, this.date);
      return this;
    }

    years(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Years, this.date);
      return this;
    }

    hours(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Hours, this.date);
      return this;
    }
    minutes(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Minutes, this.date);
      return this;
    }
    seconds(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Seconds, this.date);
      return this;
    }
    milliseconds(amount: number): this {
      this.date = addToDate(amount, DateGranularity.Milliseconds, this.date);
      return this;
    }

    get(): Date {
      return new Date(this.date);
    }
  }

  // Example constants
  export const TOMORROW = addToDate(1, DateGranularity.Days);
  export const THREE_DAYS_LATER = addToDate(3, DateGranularity.Days);
  export const NEXT_WEEK = addToDate(1, DateGranularity.Weeks);
  export const NEXT_MONTH = addToDate(1, DateGranularity.Months);

  // Example usage:
  // const sevenDaysLater = addToDate(7, DateGranularity.Days);
  // const fiveMonthsLater = addToDate(5, DateGranularity.Months);
  // const custom = new DateBuilder().days(3).months(2).get();
}
