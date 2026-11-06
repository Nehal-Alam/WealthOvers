"use client";

import * as React from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateDurationFilter } from "@/lib/calculations/date-ranges";

export interface PlanningPeriodState {
  periodType: DateDurationFilter | "next_month";
  referenceDate: Date;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd
  label: string;
}

interface PeriodSelectorProps {
  currentPeriod?: string;
  onPeriodChange?: (period: string) => void;
  referenceDate?: Date;
  onReferenceDateChange?: (date: Date) => void;
}

const presetOptions = [
  { id: "this_month", label: "This Month" },
  { id: "next_month", label: "Next Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "Last 3 Months" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "financial_year", label: "Financial Year (Apr–Mar)" },
  { id: "all_time", label: "All Time" },
  { id: "custom", label: "Custom Period" },
];

export function PeriodSelector({
  currentPeriod = "this_month",
  onPeriodChange,
  referenceDate = new Date(),
  onReferenceDateChange,
}: PeriodSelectorProps) {
  const [internalDate, setInternalDate] = React.useState<Date>(referenceDate);

  const activeDate = referenceDate || internalDate;

  const handlePrev = () => {
    const prev = subMonths(activeDate, 1);
    setInternalDate(prev);
    onReferenceDateChange?.(prev);
  };

  const handleNext = () => {
    const next = addMonths(activeDate, 1);
    setInternalDate(next);
    onReferenceDateChange?.(next);
  };

  const formattedMonthYear = format(activeDate, "MMMM yyyy");

  return (
    <div className="flex items-center bg-surface border border-border/80 rounded-xl p-0.5 shadow-2xs">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrev}
        className="h-8 w-8 text-text-secondary hover:text-text-primary rounded-lg shrink-0"
        title="Previous Month"
        aria-label="Previous Month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {onPeriodChange ? (
        <Select value={currentPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="h-8 border-0 bg-transparent text-xs font-medium text-text-primary focus:ring-0 focus:ring-offset-0 gap-1.5 px-2">
            <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <SelectValue placeholder={formattedMonthYear} />
          </SelectTrigger>
          <SelectContent className="bg-surface text-text-primary border-border">
            {presetOptions.map((opt) => (
              <SelectItem key={opt.id} value={opt.id} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-text-primary font-sans">
          <CalendarIcon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{formattedMonthYear}</span>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="h-8 w-8 text-text-secondary hover:text-text-primary rounded-lg shrink-0"
        title="Next Month"
        aria-label="Next Month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

