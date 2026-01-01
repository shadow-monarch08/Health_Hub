import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { useToastStore, ToastType } from "../../store/toastStore";
import { Typography } from "./Typography";
import { cn } from "../../utils/cn";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_VARIANTS: Record<
    ToastType,
    {
        bg: string;
        border: string;
        icon: keyof typeof Ionicons.glyphMap;
        iconColor: string;
        titleColor: string;
    }
> = {
    success: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: "checkmark-circle",
        iconColor: "#10B981", // emerald-500
        titleColor: "text-emerald-900",
    },
    error: {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "alert-circle",
        iconColor: "#EF4444", // red-500
        titleColor: "text-red-900",
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "warning",
        iconColor: "#F59E0B", // amber-500
        titleColor: "text-amber-900",
    },
    info: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: "information-circle",
        iconColor: "#3B82F6", // blue-500
        titleColor: "text-blue-900",
    },
};

export function Toast() {
    const { message, type, isVisible, hideToast } = useToastStore();
    const variant = TOAST_VARIANTS[type];
    const insets = useSafeAreaInsets();

    return (
        <AnimatePresence>
            {isVisible && (
                <MotiView
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            zIndex: 9999,
                            pointerEvents: "box-none",
                            bottom: insets.bottom,
                        },
                    ]}
                    className="justify-end items-center pb-12"
                    from={{ opacity: 0, translateY: 100, scale: 0.9 }}
                    animate={{ opacity: 1, translateY: 0, scale: 1 }}
                    exit={{ opacity: 0, translateY: 100, scale: 0.9 }}
                    transition={{ type: "timing", duration: 300 }}
                >
                    <View
                        className={cn(
                            "flex-row items-center px-4 py-2 rounded-2xl border shadow-lg shadow-black/5 mx-4",
                            variant.bg,
                            variant.border,
                            "max-w-[90%]"
                        )}
                    >
                        <Ionicons name={variant.icon} size={30} color={variant.iconColor} />

                        <View className="mx-3">
                            <Typography
                                variant="body"
                                className={cn("font-medium", variant.titleColor)}
                            >
                                {message}
                            </Typography>
                        </View>

                        <TouchableOpacity onPress={hideToast} className="p-1 -mr-1">
                            <Ionicons
                                name="close"
                                size={24}
                                color={variant.iconColor}
                                style={{ opacity: 0.6 }}
                            />
                        </TouchableOpacity>
                    </View>
                </MotiView>
            )}
        </AnimatePresence>
    );
}
