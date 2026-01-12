"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import type { Locale } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CalendarProps {
  mode?: "single" | "range" | "multiple";
  selected?: Date | Date[] | { from?: Date; to?: Date };
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  initialFocus?: boolean;
  locale?: Locale;
  showOutsideDays?: boolean;
  className?: string;
}

const WEEKDAYS = [
  { id: 0, letter: "Dim", name: "Dimanche" },
  { id: 1, letter: "Lun", name: "Lundi" },
  { id: 2, letter: "Mar", name: "Mardi" },
  { id: 3, letter: "Mer", name: "Mercredi" },
  { id: 4, letter: "Jeu", name: "Jeudi" },
  { id: 5, letter: "Ven", name: "Vendredi" },
  { id: 6, letter: "Sam", name: "Samedi" },
];

function Calendar({
  mode = "single",
  selected,
  onSelect,
  disabled,
  locale = fr,
  showOutsideDays = true,
  className,
}: CalendarProps) {
  // Initialize currentMonth based on selected date or today
  const getInitialMonth = (): Date => {
    if (mode === "single" && selected instanceof Date) {
      return startOfMonth(selected);
    }
    if (mode === "range" && selected && typeof selected === "object" && "from" in selected && selected.from) {
      return startOfMonth(selected.from);
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = React.useState<Date>(getInitialMonth());

  // Update current month when selected date changes
  React.useEffect(() => {
    if (mode === "single" && selected instanceof Date) {
      setCurrentMonth(startOfMonth(selected));
    }
  }, [selected, mode]);

  // Get month dates for calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) =>
      direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const handleDateSelect = (date: Date) => {
    if (disabled && disabled(date)) {
      return;
    }
    onSelect?.(date);
  };

  const isSelected = (date: Date): boolean => {
    if (!selected) return false;
    if (mode === "single" && selected instanceof Date) {
      return isSameDay(date, selected);
    }
    if (mode === "multiple" && Array.isArray(selected)) {
      return selected.some((d) => isSameDay(date, d));
    }
    if (mode === "range" && typeof selected === "object" && "from" in selected) {
      return (
        Boolean(selected.from && isSameDay(date, selected.from)) ||
        Boolean(selected.to && isSameDay(date, selected.to))
      );
    }
    return false;
  };

  const isInRange = (date: Date): boolean => {
    if (mode !== "range" || !selected || typeof selected !== "object" || !("from" in selected)) {
      return false;
    }
    if (!selected.from || !selected.to) return false;
    return date >= selected.from && date <= selected.to;
  };

  return (
    <div className={cn("p-3", className)}>
      {/* Header with month and navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigateMonth("prev")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy", { locale })}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => navigateMonth("next")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers - Calendar starts on Monday (weekStartsOn: 1) */}
        {[1, 2, 3, 4, 5, 6, 0].map((weekdayId) => {
          const weekday = WEEKDAYS.find((day) => day.id === weekdayId);
          return (
            <div
              key={`day-header-${weekdayId}`}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {weekday?.letter || ""}
            </div>
          );
        })}

        {/* Date cells */}
        {calendarDays.map((date) => {
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isTodayDate = isToday(date);
          const isSelectedDate = isSelected(date);
          const isInRangeDate = isInRange(date);
          const isDisabled = disabled ? disabled(date) : false;

          return (
            <Button
              key={date.toISOString()}
              variant={isSelectedDate ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-9 w-9 p-0 font-normal relative",
                !isCurrentMonth && showOutsideDays && "text-muted-foreground/50",
                !isCurrentMonth && !showOutsideDays && "hidden",
                isTodayDate && !isSelectedDate && "ring-2 ring-primary ring-offset-1",
                isSelectedDate && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isInRangeDate && !isSelectedDate && "bg-accent text-accent-foreground",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => handleDateSelect(date)}
              disabled={isDisabled || (!isCurrentMonth && !showOutsideDays)}
            >
              <span className="text-sm font-medium">{format(date, "d")}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
