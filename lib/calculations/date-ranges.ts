import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";
import { getIndianFinancialYearInterval } from "./financial";

export type DateDurationFilter =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "previous_year"
  | "financial_year"
  | "all_time"
  | "custom";

export interface DateRangeResult {
  start: Date | null;
  end: Date | null;
  startDateIso: string | null;
  endDateIso: string | null;
  label: string;
}

export const DATE_FILTER_OPTIONS: Array<{
  value: DateDurationFilter;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "last_3_months", label: "Last 3 Months" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "previous_year", label: "Previous Year" },
  { value: "financial_year", label: "Financial Year (Apr–Mar)" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Date Range" },
];

/**
 * Computes exact start and end boundaries for any duration filter preset
 * Formatted with Asia/Kolkata context
 */
export function getDateRangeFromFilter(
  filter: DateDurationFilter,
  customStart?: string | Date | null,
  customEnd?: string | Date | null,
  now: Date = new Date()
): DateRangeResult {
  let start: Date | null = null;
  let end: Date | null = null;
  let label = "All Time";

  switch (filter) {
    case "today": {
      start = startOfDay(now);
      end = endOfDay(now);
      label = "Today";
      break;
    }
    case "yesterday": {
      const y = subDays(now, 1);
      start = startOfDay(y);
      end = endOfDay(y);
      label = "Yesterday";
      break;
    }
    case "last_7_days": {
      start = startOfDay(subDays(now, 6));
      end = endOfDay(now);
      label = "Last 7 Days";
      break;
    }
    case "last_30_days": {
      start = startOfDay(subDays(now, 29));
      end = endOfDay(now);
      label = "Last 30 Days";
      break;
    }
    case "this_week": {
      // Monday start
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
      label = "This Week";
      break;
    }
    case "last_week": {
      const prevWeek = subWeeks(now, 1);
      start = startOfWeek(prevWeek, { weekStartsOn: 1 });
      end = endOfWeek(prevWeek, { weekStartsOn: 1 });
      label = "Last Week";
      break;
    }
    case "this_month": {
      start = startOfMonth(now);
      end = endOfMonth(now);
      label = "This Month";
      break;
    }
    case "last_month": {
      const prevMonth = subMonths(now, 1);
      start = startOfMonth(prevMonth);
      end = endOfMonth(prevMonth);
      label = "Last Month";
      break;
    }
    case "last_3_months": {
      start = startOfMonth(subMonths(now, 2));
      end = endOfMonth(now);
      label = "Last 3 Months";
      break;
    }
    case "last_6_months": {
      start = startOfMonth(subMonths(now, 5));
      end = endOfMonth(now);
      label = "Last 6 Months";
      break;
    }
    case "this_year": {
      start = startOfYear(now);
      end = endOfYear(now);
      label = "This Year";
      break;
    }
    case "previous_year": {
      const prevYear = subYears(now, 1);
      start = startOfYear(prevYear);
      end = endOfYear(prevYear);
      label = "Previous Year";
      break;
    }
    case "financial_year": {
      const fy = getIndianFinancialYearInterval(now, 0);
      start = fy.start;
      end = fy.end;
      label = fy.label;
      break;
    }
    case "custom": {
      if (customStart) {
        start = startOfDay(new Date(customStart));
      }
      if (customEnd) {
        end = endOfDay(new Date(customEnd));
      }
      label = "Custom Range";
      break;
    }
    case "all_time":
    default: {
      start = null;
      end = null;
      label = "All Time";
      break;
    }
  }

  return {
    start,
    end,
    startDateIso: start ? start.toISOString() : null,
    endDateIso: end ? end.toISOString() : null,
    label,
  };
}

/**
 * Filter transactions by selected date range
 */
export function filterTransactionsByDateRange<T extends { transaction_date: string }>(
  transactions: T[],
  range: DateRangeResult
): T[] {
  if (!range.start && !range.end) return transactions;

  return transactions.filter((t) => {
    const tTime = new Date(t.transaction_date).getTime();
    if (range.start && tTime < range.start.getTime()) return false;
    if (range.end && tTime > range.end.getTime()) return false;
    return true;
  });
}

