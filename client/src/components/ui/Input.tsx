import {
  TextInput,
  View,
  TextInputProps,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";
import { Typography } from "./Typography";
import { Ionicons } from "@expo/vector-icons";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;

  // Strength indicator
  strength?: number; // 0–100
  showStrengthBar?: boolean;
  strengthLabels?: string[];
}

const DEFAULT_LABELS = ["Weak", "Fair", "Good", "Strong"];

export function Input({
  label,
  error,
  className,
  containerClassName,
  onFocus,
  onBlur,
  strength = 0,
  showStrengthBar = false,
  strengthLabels = DEFAULT_LABELS,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const animatedValue = useRef(new Animated.Value(0)).current;

  const clampedStrength = Math.min(100, Math.max(0, strength));
  const activeLevel = Math.min(3, Math.floor(clampedStrength / 25));

  useEffect(() => {
    if (!showStrengthBar) return;

    Animated.timing(animatedValue, {
      toValue: activeLevel,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [activeLevel, showStrengthBar]);

  const getColorForLevel = (level: number) => {
    switch (level) {
      case 0:
        return "#E5E7EB"; // neutral
      case 1:
        return "#F4B740"; // warning
      case 2:
        return "#0FB9B1"; // info
      case 3:
        return "#2EBD85"; // success
      default:
        return "#E5E7EB";
    }
  };

  return (
    <View className={cn("w-full", containerClassName)}>
      {label && (
        <Typography variant="body" className="mb-2 font-medium">
          {label}
        </Typography>
      )}
      <View className="relative h-[52px] w-full">
        <TextInput
          className={cn(
            "h-full w-full rounded-xl border bg-neutral-white px-5 text-[16px] text-neutral-900 placeholder:text-neutral-400",
            error
              ? "border-error"
              : isFocused
                ? "border-primary"
                : "border-neutral-200",
            className
          )}
          placeholderTextColor="#9CA3AF"
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
          secureTextEntry={props.secureTextEntry && !isPasswordVisible}
        />

        {props.secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2"
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        )}
      </View>
      {/* Strength Indicator */}
      {showStrengthBar && (
        <View className="mt-3">
          {/* Segments */}
          <View className="flex-row gap-1">
            {[0, 1, 2, 3].map((level) => {
              const animatedOpacity = animatedValue.interpolate({
                inputRange: [level - 1, level],
                outputRange: [0.3, 1],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={level}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 999,
                    backgroundColor:
                      level <= activeLevel
                        ? getColorForLevel(activeLevel)
                        : "#E5E7EB",
                    opacity: animatedOpacity,
                  }}
                />
              );
            })}
          </View>

          {/* Label */}
          <Typography variant="caption" className="mt-2 text-neutral-500">
            Strength:{" "}
            <Typography
              variant="caption"
              className="font-medium"
              style={{
                color: getColorForLevel(activeLevel),
              }}
            >
              {strengthLabels[activeLevel]}
            </Typography>
          </Typography>
        </View>
      )}

      {/* Error slot */}
      <View className="h-6">
        {error && (
          <Typography variant="caption" className="mt-1 text-error">
            {error}
          </Typography>
        )}
      </View>
    </View>
  );
}
