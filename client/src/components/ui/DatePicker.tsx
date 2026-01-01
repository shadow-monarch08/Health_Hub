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
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
  setMonth,
  setYear,
  addYears,
  subYears,
  startOfYear,
  eachMonthOfInterval,
  startOfDay,
} from "date-fns";

interface DatePickerProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date) => void;
  className?: string;
  error?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
type ViewMode = "day" | "month" | "year";

export function DatePicker({
  label,
  value,
  onChange,
  className,
  error,
}: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [yearRangeStart, setYearRangeStart] = useState(
    new Date().getFullYear()
  );

  useEffect(() => {
    if (visible) {
      if (value) {
        setCurrentDate(value);
        setYearRangeStart(value.getFullYear());
      } else {
        setCurrentDate(new Date());
        setYearRangeStart(new Date().getFullYear());
      }
      setViewMode("day");
    }
  }, [visible, value]);

  // Derive display value
  const displayValue = value ? format(value, "dd/MM/yyyy") : "";

  // --- Calendar (Day) Logic ---
  const days = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const firstDayOfWeek = getDay(startOfMonth(currentDate));
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const handleDayPress = (day: Date) => {
    onChange(day);
    setVisible(false);
  };

  // --- Month View Logic ---
  const months = useMemo(() => {
    const start = startOfYear(currentDate);
    // Generates 12 months for the current year
    return eachMonthOfInterval({
      start: start,
      end: addMonths(start, 11),
    });
  }, [currentDate]);

  // --- Year View Logic ---
  // Generate 12 years based on yearRangeStart
  const years = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
  }, [yearRangeStart]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 10,

        onPanResponderRelease: (_, g) => {
          if (g.dx < -50) {
            if (viewMode === "day") {
              setCurrentDate((prev) => addMonths(prev, 1));
            }
            if (viewMode === "year") {
              setYearRangeStart((prev) => prev + 12);
            }
          }

          if (g.dx > 50) {
            if (viewMode === "day") {
              setCurrentDate((prev) => subMonths(prev, 1));
            }
            if (viewMode === "year") {
              setYearRangeStart((prev) => prev - 12);
            }
          }
        },
      }),
    [viewMode]
  );

  // --- Render Functions ---

  const renderHeader = () => {
    if (viewMode === "day") {
      return (
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            className="p-2 bg-neutral-100 rounded-full"
            onPress={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setViewMode("month")}>
            <Typography variant="title" className="text-lg">
              {format(currentDate, "MMMM yyyy")}
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-2 bg-neutral-100 rounded-full"
            onPress={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === "month") {
      return (
        <View className="flex-row justify-center items-center mb-6 h-10">
          <TouchableOpacity
            onPress={() => {
              setYearRangeStart(currentDate.getFullYear() - 5); // Center vaguely
              setViewMode("year");
            }}
          >
            <Typography variant="title" className="text-lg">
              {format(currentDate, "yyyy")}
            </Typography>
          </TouchableOpacity>
        </View>
      );
    }

    if (viewMode === "year") {
      return (
        <View className="flex-row justify-between items-center mb-6">
          <TouchableOpacity
            className="p-2 bg-neutral-100 rounded-full"
            onPress={() => setYearRangeStart((prev) => prev - 12)}
          >
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>

          <Typography variant="title" className="text-lg">
            {yearRangeStart} - {yearRangeStart + 11}
          </Typography>

          <TouchableOpacity
            className="p-2 bg-neutral-100 rounded-full"
            onPress={() => setYearRangeStart((prev) => prev + 12)}
          >
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      );
    }
  };

  const renderContent = () => {
    if (viewMode === "day") {
      return (
        <View className="flex-row flex-wrap" {...panResponder.panHandlers}>
          {/* Weekdays Headers */}
          {WEEKDAYS.map((day) => (
            <View key={day} className="w-[14.28%] items-center mb-2">
              <Typography
                variant="caption"
                className="text-neutral-400 font-bold"
              >
                {day}
              </Typography>
            </View>
          ))}

          {/* Empty slots */}
          {emptyDays.map((_, i) => (
            <View key={`empty-${i}`} className="w-[14.28%] h-10" />
          ))}

          {/* Days */}
          {days.map((day) => {
            const isSelected = value ? isSameDay(day, value) : false;
            const isToday = isSameDay(day, new Date());

            return (
              <View
                key={day.toString()}
                className="w-[14.28%] aspect-square items-center justify-center p-1"
              >
                <TouchableOpacity
                  onPress={() => handleDayPress(day)}
                  className={cn(
                    "w-full h-full items-center justify-center rounded-full",
                    isSelected
                      ? "bg-accent"
                      : isToday
                        ? "bg-accent/10"
                        : "bg-transparent"
                  )}
                >
                  <Typography
                    variant="body"
                    className={cn(
                      "text-sm",
                      isSelected ? "text-white font-bold" : "text-neutral-900"
                    )}
                  >
                    {format(day, "d")}
                  </Typography>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      );
    }

    if (viewMode === "month") {
      return (
        <View className="flex-row flex-wrap justify-between">
          {months.map((month) => {
            const isSelected = isSameDay(
              startOfDay(startOfMonth(month)),
              startOfDay(startOfMonth(currentDate))
            );
            return (
              <TouchableOpacity
                key={month.toString()}
                className={cn(
                  "w-[31%] py-3 mb-3 items-center justify-center rounded-xl",
                  isSelected ? "bg-accent" : "bg-neutral-50"
                )}
                onPress={() => {
                  setCurrentDate(month);
                  setViewMode("day");
                }}
              >
                <Typography
                  variant="body"
                  className={cn(
                    "font-medium",
                    isSelected ? "text-white" : "text-neutral-900"
                  )}
                >
                  {format(month, "MMM")}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    if (viewMode === "year") {
      return (
        <View
          className="flex-row flex-wrap justify-between"
          {...panResponder.panHandlers}
        >
          {years.map((year) => {
            const isSelected = currentDate.getFullYear() === year;
            return (
              <TouchableOpacity
                key={year}
                className={cn(
                  "w-[31%] py-4 mb-3 items-center justify-center rounded-xl",
                  isSelected ? "bg-accent" : "bg-neutral-50"
                )}
                onPress={() => {
                  setCurrentDate(setYear(currentDate, year));
                  setViewMode("month");
                }}
              >
                <Typography
                  variant="body"
                  className={cn(
                    "font-medium text-lg",
                    isSelected ? "text-white" : "text-neutral-900"
                  )}
                >
                  {year}
                </Typography>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
  };

  return (
    <View className={cn("w-full", className)}>
      {label && (
        <Typography variant="body" className="mb-2 font-medium">
          {label}
        </Typography>
      )}

      <TouchableOpacity
        onPress={() => {
          setVisible(true);
        }}
        className={cn(
          "h-[52px] w-full rounded-xl border bg-white px-5 flex-row items-center justify-between",
          error ? "border-error" : "border-neutral-200"
        )}
      >
        <Typography
          variant="body"
          className={cn(
            "text-[16px]",
            value ? "text-neutral-900" : "text-neutral-400"
          )}
        >
          {displayValue || "DD/MM/YYYY"}
        </Typography>
        <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <View className="h-6">
        {error && (
          <Typography variant="caption" className="mt-1 text-error">
            {error}
          </Typography>
        )}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          className="bg-black/50"
          style={StyleSheet.absoluteFillObject}
          onPress={() => setVisible(false)}
        />
        <View className="flex-1 justify-end">
          <Pressable
            className="bg-white rounded-t-3xl p-6 shadow-xl"
            onPress={(e) => e.stopPropagation()}
          >
            {renderHeader()}
            {renderContent()}

            <View className="mt-6 items-center">
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Typography variant="caption" className="text-neutral-400">
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
