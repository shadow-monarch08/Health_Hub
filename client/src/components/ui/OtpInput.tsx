import React, { useRef, useState, useEffect } from "react";
import { View, TextInput, Pressable, Platform } from "react-native";
import { Typography } from "./Typography";
import { cn } from "../../utils/cn";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

export function OtpInput({
  length = 4,
  value,
  onChange,
  error,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Focus the input when component mounts (optional, but good for UX if it's the main action)
  // useEffect(() => {
  //   setTimeout(() => inputRef.current?.focus(), 100);
  // }, []);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleTextChange = (text: string) => {
    // filtering non-numeric if needed, though keyboardType helps
    const cleanText = text.replace(/[^0-9]/g, "");
    if (cleanText.length <= length) {
      onChange(cleanText);
    }
  };

  return (
    <View className="w-full items-center">
      <Pressable className="flex-row gap-3" onPress={handlePress}>
        {Array.from({ length }).map((_, index) => {
          const digit = value[index] || "";
          const isCurrent = index === value.length && isFocused;
          const isFilled = !!digit;

          return (
            <View
              key={index}
              className={cn(
                "size-20 rounded-2xl border-2 items-center justify-center bg-white shadow-sm transition-all duration-200",
                error
                  ? "border-error bg-error/5"
                  : isCurrent
                    ? "border-primary bg-primary/5 shadow-primary/20 scale-105"
                    : isFilled
                      ? "border-primary/50 bg-white"
                      : "border-neutral-200 bg-neutral-50"
              )}
            >
              <Typography
                variant="title"
                className={cn(
                  "text-2xl",
                  isFilled ? "text-neutral-900" : "text-neutral-300"
                )}
              >
                {digit}
              </Typography>
              {/* Cursor Blink (simulated) */}
              {isCurrent && (
                <View className="absolute bottom-3 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
              )}
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        maxLength={length}
        keyboardType="number-pad"
        returnKeyType="done"
        textContentType="oneTimeCode" // iOS autofill
        autoComplete="sms-otp" // Android autofill
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute w-full h-full opacity-0"
        // Position it over the visuals so gestures work, or keeping it hidden but focusable via Pressable.
        // If we use Pressable above to focus, we can hide this completely or put it 1px 1px.
        // For paste to work reliably on Android sometimes it helps if it's "visible" but 0 size or opacity 0.
        // Currently placing it absolute covering the whole area might capture taps too easily or interfere.
        // Better: opacity 0, pointerEvents="none" but we programmatically focus it.
        // Actually, if we want native paste menu to appear near the box, it's tricky with hidden input.
        // We'll rely on the Pressable to focus, and the input being 'somewhere'.
        style={{ width: 1, height: 1, opacity: 0 }}
      />
    </View>
  );
}
