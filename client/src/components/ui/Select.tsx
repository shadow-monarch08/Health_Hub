import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "./Typography";
import { cn } from "../../utils/cn";

interface SelectProps {
  label?: string;
  value?: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string;
}

export function Select({
  label,
  value,
  options,
  placeholder = "Select an option",
  onChange,
  className,
  error,
}: SelectProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View className={cn("w-full", className)}>
      {label && (
        <Typography variant="body" className="mb-2 font-medium">
          {label}
        </Typography>
      )}

      <TouchableOpacity
        onPress={() => setVisible(true)}
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
          {value || placeholder}
        </Typography>
        <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Error Message */}
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
        <View className="flex-1">
          <Pressable
            className="bg-black/50 justify-end"
            style={StyleSheet.absoluteFillObject}
            onPress={() => setVisible(false)}
          />
          <View className="flex-1 justify-end">
            <View className="bg-white rounded-t-3xl max-h-[50%]">
              <View className="p-6 pb-2 border-b border-neutral-100 flex-row justify-between items-center">
                <Typography variant="title">
                  {label || "Select Option"}
                </Typography>
                <TouchableOpacity onPress={() => setVisible(false)}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={{ padding: 24, paddingTop: 12 }}
              >
                {options.map((option) => (
                  <TouchableOpacity
                    key={option}
                    className={cn(
                      "p-3 rounded-xl flex-row justify-between items-center mb-2",
                      value === option ? "bg-accent/10" : "bg-transparent"
                    )}
                    onPress={() => {
                      onChange(option);
                      setVisible(false);
                    }}
                  >
                    <Typography
                      variant="body"
                      className={cn(
                        "font-medium",
                        value === option ? "text-accent" : "text-neutral-900"
                      )}
                    >
                      {option}
                    </Typography>
                    {value === option && (
                      <Ionicons name="checkmark" size={20} color="#0FB9B1" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
