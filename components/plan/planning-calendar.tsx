"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Scale,
  CreditCard,
  Coins,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "@/components/financial/money-display";
import { Tables } from "@/types/database";
import { MarkBillPaidDialog } from "@/components/recurring/mark-bill-paid-dialog";

export interface CalendarEventItem {
  id: string;
  type: "bill" | "loan_emi" | "credit_card" | "sip" | "goal";
  title: string;
  amount: number | string;
  date: string; // yyyy-MM-dd
  status: "paid" | "upcoming" | "due" | "overdue" | "completed";
  sourceRecord?: any;
}

interface PlanningCalendarProps {
  events: CalendarEventItem[];
  accounts?: Tables<"accounts">[];
  onMarkPaid?: (event: CalendarEventItem) => void;
}

export function PlanningCalendar({
  events,
  accounts = [],
  onMarkPaid,
}: PlanningCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [viewMode, setViewMode] = React.useState<"month" | "agenda">("month");
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [payTargetBill, setPayTargetBill] = React.useState<any | null>(null);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  // Month interval days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = React.useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  // Index events by yyyy-MM-dd
  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      const dateKey = ev.date.slice(0, 10);
      const list = map.get(dateKey) || [];
      list.push(ev);
      map.set(dateKey, list);
    }
    return map;
  }, [events]);

  const selectedDateEvents = React.useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd");
    return eventsByDate.get(key) || [];
  }, [eventsByDate, selectedDate]);

  const getEventBadge = (type: CalendarEventItem["type"]) => {
    switch (type) {
      case "bill":
        return { label: "Bill", icon: Receipt, color: "text-indigo-600 bg-indigo-50 border-indigo-200" };
      case "loan_emi":
        return { label: "Loan EMI", icon: Scale, color: "text-amber-600 bg-amber-50 border-amber-200" };
      case "credit_card":
        return { label: "Credit Card", icon: CreditCard, color: "text-rose-600 bg-rose-50 border-rose-200" };
      case "sip":
        return { label: "SIP", icon: Coins, color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
      case "goal":
        return { label: "Goal", icon: Target, color: "text-primary bg-primary/10 border-primary/20" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="h-8 w-8 rounded-lg border-border text-text-secondary hover:text-text-primary"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 rounded-lg border-border text-text-secondary hover:text-text-primary"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h3 className="text-base font-bold text-text-primary min-w-[140px]">
            {format(currentMonth, "MMMM yyyy")}
          </h3>

          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="h-7 text-xs font-semibold px-2 rounded-lg text-primary hover:bg-primary/10"
          >
            Today
          </Button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-surface-secondary p-0.5 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "month"
                ? "bg-surface text-primary shadow-2xs font-bold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Month Grid
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "agenda"
                ? "bg-surface text-primary shadow-2xs font-bold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Upcoming Agenda
          </button>
        </div>
      </div>

      {viewMode === "month" ? (
        /* Month Grid View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 7x5 Calendar Grid */}
          <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-surface shadow-2xs overflow-hidden">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 bg-surface-secondary/70 border-b border-border/70 text-center py-2 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60 font-sans">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const dayIsToday = isToday(day);

                return (
                  <div
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${
                      !isCurrentMonth
                        ? "bg-surface-secondary/30 text-text-secondary/40"
                        : "bg-surface text-text-primary hover:bg-surface-secondary/40"
                    } ${isSelected ? "ring-2 ring-inset ring-primary bg-primary/5" : ""}`}
                  >
                    {/* Day Number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold h-5 w-5 flex items-center justify-center rounded-full ${
                          dayIsToday
                            ? "bg-primary text-surface font-bold"
                            : isSelected
                            ? "font-bold text-primary"
                            : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>

                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono font-bold text-text-secondary px-1 rounded bg-surface-secondary">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Event Pills */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const isPaid = ev.status === "paid";
                        return (
                          <div
                            key={ev.id}
                            className={`text-[10px] truncate px-1 py-0.5 rounded font-medium flex items-center justify-between ${
                              isPaid
                                ? "bg-success/10 text-success line-through opacity-70"
                                : "bg-primary/10 text-primary font-semibold"
                            }`}
                            title={`${ev.title} — ₹${ev.amount}`}
                          >
                            <span className="truncate">{ev.title}</span>
                            <span className="shrink-0 font-mono text-[9px] ml-1">
                              ₹{parseFloat(ev.amount.toString()).toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-text-secondary text-center">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Detail Sidebar */}
          <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs p-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
              <div>
                <h4 className="font-bold text-sm text-text-primary">
                  {format(selectedDate, "EEEE, dd MMMM")}
                </h4>
                <p className="text-xs text-text-secondary">
                  {selectedDateEvents.length} scheduled item{selectedDateEvents.length !== 1 ? "s" : ""}
                </p>
              </div>

              {isToday(selectedDate) && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                  Today
                </Badge>
              )}
            </div>

            {selectedDateEvents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-secondary text-xs">
                <CalendarIcon className="h-8 w-8 text-text-secondary/40 mb-2" />
                <span>No scheduled bills, EMIs, or SIPs on this date.</span>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[460px]">
                {selectedDateEvents.map((ev) => {
                  const badge = getEventBadge(ev.type);
                  const Icon = badge.icon;
                  const isPaid = ev.status === "paid";

                  return (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl border border-border/70 bg-surface-secondary/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`p-1.5 rounded-lg border shrink-0 ${badge.color}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-primary truncate">
                              {ev.title}
                            </p>
                            <span className="text-[10px] text-text-secondary block">
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <MoneyDisplay
                            amount={ev.amount}
                            className="text-xs font-bold font-mono text-text-primary"
                          />
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 px-1 mt-0.5 capitalize ${
                              isPaid
                                ? "bg-success/15 text-success border-success/30"
                                : ev.status === "overdue"
                                ? "bg-danger/15 text-danger border-danger/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {ev.status}
                          </Badge>
                        </div>
                      </div>

                      {!isPaid && ev.sourceRecord && accounts.length > 0 && (
                        <div className="pt-2 border-t border-border/50 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPayTargetBill(ev.sourceRecord)}
                            className="h-7 text-xs gap-1 border-success/30 text-success hover:bg-success/10 rounded-lg"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Mark as Paid</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="rounded-2xl border border-border/80 bg-surface shadow-2xs divide-y divide-border/60 overflow-hidden">
          {events.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">
              No upcoming scheduled commitments found.
            </div>
          ) : (
            events.map((ev) => {
              const badge = getEventBadge(ev.type);
              const Icon = badge.icon;
              const isPaid = ev.status === "paid";

              return (
                <div
                  key={ev.id}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`p-2 rounded-xl border shrink-0 ${badge.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-text-primary truncate">
                          {ev.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 h-4 border-border text-text-secondary"
                        >
                          {badge.label}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-text-secondary">
                        Due: {format(new Date(ev.date), "dd MMM yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                    <MoneyDisplay
                      amount={ev.amount}
                      className="text-xs sm:text-sm font-bold font-mono text-text-primary"
                    />

                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0.5 px-2 capitalize ${
                        isPaid
                          ? "bg-success/15 text-success border-success/30 font-semibold"
                          : ev.status === "overdue"
                          ? "bg-danger/15 text-danger border-danger/30 font-semibold"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {ev.status}
                    </Badge>

                    {!isPaid && ev.sourceRecord && accounts.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPayTargetBill(ev.sourceRecord)}
                        className="h-8 text-xs gap-1 border-success/30 text-success hover:bg-success/10 rounded-lg"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Pay</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Mark Bill Paid Dialog */}
      {payTargetBill && (
        <MarkBillPaidDialog
          recurring={payTargetBill}
          accounts={accounts}
          open={!!payTargetBill}
          onOpenChange={(open) => {
            if (!open) setPayTargetBill(null);
          }}
        />
      )}
    </div>
  );
}
