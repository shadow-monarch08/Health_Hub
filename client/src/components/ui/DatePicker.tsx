import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "./Typography";
import { cn } from "../../utils/cn";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  startOfYear,
  eachMonthOfInterval,
  startOfDay,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  setYear,
  isBefore,
  isAfter,
  endOfMonth,
  endOfYear,
  endOfDay,
} from "date-fns";
import { MotiView, AnimatePresence } from "moti";

interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date) => void;
  className?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
type ViewMode = "day" | "month" | "year";

export function DatePicker({
  label,
  value,
  onChange,
  className,
  error,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [yearRangeStart, setYearRangeStart] = useState(
    new Date().getFullYear()
  );
  // Direction: 1 = Slide Left (Next), -1 = Slide Right (Prev), 0 = No Slide
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    if (visible) {
      if (value) {
        setCurrentDate(value);
        setYearRangeStart(value.getFullYear());
      } else {
        const now = new Date();
        // If now is outside bounds, default to min or max
        if (minDate && isBefore(now, minDate)) {
          setCurrentDate(minDate);
          setYearRangeStart(minDate.getFullYear());
        } else if (maxDate && isAfter(now, maxDate)) {
          setCurrentDate(maxDate);
          setYearRangeStart(maxDate.getFullYear());
        } else {
          setCurrentDate(now);
          setYearRangeStart(now.getFullYear());
        }
      }
      setViewMode("day");
      setDirection(0);
    }
  }, [visible, value, minDate, maxDate]);

  // Derive display value
  const displayValue = value ? format(value, "dd/MM/yyyy") : "";

  // --- Calendar (Day) Logic ---
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    // Generate constant 42 days (6 weeks * 7 days)
    return Array.from({ length: 42 }).map((_, i) => addDays(startDate, i));
  }, [currentDate]);

  const handleDayPress = (day: Date) => {
    onChange(day);
    setVisible(false);
  };

  // --- Month View Logic ---
  const months = useMemo(() => {
    const start = startOfYear(currentDate);
    return eachMonthOfInterval({
      start: start,
      end: addMonths(start, 11),
    });
  }, [currentDate]);

  // --- Year View Logic ---
  const years = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
  }, [yearRangeStart]);

  // --- Navigation Helpers ---
  const handlePrev = () => {
    setDirection(-1);
    if (viewMode === "day") {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else if (viewMode === "year") {
      setYearRangeStart((prev) => prev - 12);
    }
  };

  const handleNext = () => {
    setDirection(1);
    if (viewMode === "day") {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else if (viewMode === "year") {
      setYearRangeStart((prev) => prev + 12);
    }
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,

        onPanResponderRelease: (_, g) => {
          if (g.dx < -30) {
            handleNext();
          }
          if (g.dx > 30) {
            handlePrev();
          }
        },
      }),
    [viewMode]
  );

  // --- Validation Helpers ---
  const isDateDisabled = (date: Date) => {
    if (minDate && isBefore(date, startOfDay(minDate))) return true;
    if (maxDate && isAfter(date, endOfDay(maxDate))) return true;
    return false;
  };

  const isMonthDisabled = (month: Date) => {
    // Disabled if the month ends before minDate OR starts after maxDate
    if (minDate && isBefore(endOfMonth(month), minDate)) return true;
    if (maxDate && isAfter(startOfMonth(month), maxDate)) return true;
    return false;
  }

  const isYearDisabled = (year: number) => {
    const yearDate = new Date(year, 0, 1);
    if (minDate && isBefore(endOfYear(yearDate), minDate)) return true;
    if (maxDate && isAfter(startOfYear(yearDate), maxDate)) return true;
    return false;
  }

  // --- Render Functions ---

  const renderHeader = () => {
    return (
      <View className="flex-row justify-between items-center mb-6 px-2">
        {viewMode === "month" ? (
          <TouchableOpacity
            onPress={() => {
              setYearRangeStart(currentDate.getFullYear() - 5);
              setViewMode("year");
              setDirection(0);
            }}
            className="flex-1 items-center"
          >
            <Typography
              variant="title"
              className="text-xl font-bold text-neutral-800"
            >
              {format(currentDate, "yyyy")}
            </Typography>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              className="p-2 bg-neutral-50 rounded-full border border-neutral-100 shadow-sm"
              onPress={handlePrev}
            >
              <Ionicons name="chevron-back" size={20} color="#374151" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (viewMode === "day") {
                  setViewMode("month");
                  setDirection(0);
                }
              }}
            >
              <Typography
                variant="title"
                className="text-xl font-bold text-neutral-800"
              >
                {viewMode === "day"
                  ? format(currentDate, "MMMM yyyy")
                  : `${yearRangeStart} - ${yearRangeStart + 11}`}
              </Typography>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-2 bg-neutral-50 rounded-full border border-neutral-100 shadow-sm"
              onPress={handleNext}
            >
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  const renderContent = () => {
    return (
      <AnimatePresence exitBeforeEnter={false} custom={direction}>
        <View
          className="flex-row gap-2 overflow-hidden"
          {...panResponder.panHandlers}
        >
          {viewMode === "day" && (
            <MotiView
              key={`day-${format(currentDate, "yyyy-MM")}`}
              from={{ opacity: 0, translateX: direction * 50 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -50 }}
              transition={{ type: "timing", duration: 200 }}
              className="w-full"
            >
              <View className="flex-row flex-wrap">
                {WEEKDAYS.map((day) => (
                  <View key={day} className="w-[14.28%] items-center mb-4">
                    <Typography
                      variant="caption"
                      className="text-neutral-400 font-bold text-xs uppercase tracking-wider"
                    >
                      {day}
                    </Typography>
                  </View>
                ))}

                {days.map((day) => {
                  const isSelected = value ? isSameDay(day, value) : false;
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const disabled = isDateDisabled(day);

                  return (
                    <View
                      key={day.toString()}
                      className="w-[14.28%] aspect-square items-center justify-center p-1"
                    >
                      <TouchableOpacity
                        onPress={() => !disabled && handleDayPress(day)}
                        disabled={disabled}
                        className={cn(
                          "w-10 h-10 items-center justify-center rounded-full",
                          isSelected
                            ? "bg-accent shadow-md shadow-accent/30"
                            : isToday
                              ? "bg-accent/10 border border-accent/20"
                              : "bg-transparent",
                          disabled && "opacity-30"
                        )}
                      >
                        <Typography
                          variant="body"
                          className={cn(
                            "text-sm font-medium",
                            isSelected
                              ? "text-white font-bold"
                              : isCurrentMonth
                                ? "text-neutral-900"
                                : "text-neutral-300",
                            disabled && "text-neutral-400"
                          )}
                        >
                          {format(day, "d")}
                        </Typography>
                        {isToday && !isSelected && !disabled && (
                          <View className="absolute bottom-1 w-1 h-1 rounded-full bg-accent" />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </MotiView>
          )}

          {viewMode === "month" && (
            <MotiView
              key="month-view"
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "timing", duration: 250 }}
              className="w-full"
            >
              <View className="flex-row flex-wrap justify-between">
                {months.map((month) => {
                  const isSelected = isSameDay(
                    startOfDay(startOfMonth(month)),
                    startOfDay(startOfMonth(currentDate))
                  );
                  const disabled = isMonthDisabled(month);

                  return (
                    <TouchableOpacity
                      key={month.toString()}
                      disabled={disabled}
                      className={cn(
                        "w-[31%] py-4 mb-4 items-center justify-center rounded-2xl border",
                        isSelected
                          ? "bg-accent border-accent shadow-md shadow-accent/20"
                          : "bg-neutral-50 border-neutral-100",
                        disabled && "opacity-30 bg-neutral-100"
                      )}
                      onPress={() => {
                        setDirection(0);
                        setCurrentDate(month);
                        setViewMode("day");
                      }}
                    >
                      <Typography
                        variant="body"
                        className={cn(
                          "font-semibold",
                          isSelected ? "text-white" : "text-neutral-700",
                          disabled && "text-neutral-400"
                        )}
                      >
                        {format(month, "MMM")}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </MotiView>
          )}

          {viewMode === "year" && (
            <MotiView
              key={`year-${yearRangeStart}`}
              from={{ opacity: 0, translateX: direction * 50 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: direction * -50 }}
              transition={{ type: "timing", duration: 200 }}
              className="w-full"
            >
              <View
                className="flex-row flex-wrap justify-between"
                {...panResponder.panHandlers}
              >
                {years.map((year) => {
                  const isSelected = currentDate.getFullYear() === year;
                  const disabled = isYearDisabled(year);

                  return (
                    <TouchableOpacity
                      key={year}
                      disabled={disabled}
                      className={cn(
                        "w-[31%] py-5 mb-4 items-center justify-center rounded-2xl border",
                        isSelected
                          ? "bg-accent border-accent shadow-md shadow-accent/20"
                          : "bg-neutral-50 border-neutral-100",
                        disabled && "opacity-30 bg-neutral-100"
                      )}
                      onPress={() => {
                        setCurrentDate(setYear(currentDate, year));
                        setViewMode("month");
                        setDirection(0);
                      }}
                    >
                      <Typography
                        variant="body"
                        className={cn(
                          "font-semibold text-lg",
                          isSelected ? "text-white" : "text-neutral-700",
                          disabled && "text-neutral-400"
                        )}
                      >
                        {year}
                      </Typography>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </MotiView>
          )}
        </View>
      </AnimatePresence>
    );
  };

  return (
    <View className={cn("w-full", className)}>
      {label && (
        <Typography
          variant="body"
          className="mb-2 font-medium text-neutral-700"
        >
          {label}
        </Typography>
      )}

      <TouchableOpacity
        onPress={() => {
          setVisible(true);
        }}
        className={cn(
          "h-[54px] w-full rounded-2xl border bg-white px-5 flex-row items-center justify-between shadow-sm",
          error ? "border-error bg-error/5" : "border-neutral-200"
        )}
      >
        <Typography
          variant="body"
          className={cn(
            "text-[16px] font-medium",
            value ? "text-neutral-900" : "text-neutral-400"
          )}
        >
          {displayValue || "DD/MM/YYYY"}
        </Typography>
        <View
          className={cn(
            "p-2 rounded-full",
            value ? "bg-accent/10" : "bg-neutral-100"
          )}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={value ? "#0FB9B1" : "#9CA3AF"}
          />
        </View>
      </TouchableOpacity>
      {/* Error Message */}
      <View className="h-6 pt-1">
        {error && (
          <View className="flex-row gap-1 items-center">
            <Ionicons
              name="alert-circle"
              className="mt-0.5"
              size={16}
              color="#E5533D"
            />
            <Typography variant="caption" className="text-error">
              {error}
            </Typography>
          </View>
        )}
      </View>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          className="bg-black/60 backdrop-blur-sm"
          style={StyleSheet.absoluteFillObject}
          onPress={() => setVisible(false)}
        />
        <View className="flex-1 justify-center items-center px-6">
          <Pressable
            className="bg-white rounded-3xl p-6 w-full shadow-2xl shadow-black/20"
            onPress={(e) => e.stopPropagation()}
          >
            {renderHeader()}
            {renderContent()}

            <View className="mt-8 items-center">
              <TouchableOpacity
                onPress={() => setVisible(false)}
                className="py-3 px-8"
              >
                <Typography
                  variant="body"
                  className="text-neutral-500 font-medium"
                >
                  Cancel
                </Typography>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
