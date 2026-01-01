/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0A6ED1", // Calm Medical Blue
          dark: "#084C99",    // Deep Blue
          soft: "#E8F1FB",    // Light Blue Tint
        },
        accent: {
          DEFAULT: "#0FB9B1", // Teal
        },
        success: "#2EBD85",   // Green
        warning: "#F4B740",   // Amber
        error: "#E5533D",     // Soft Red
        neutral: {
          900: "#111827", // Primary Text (Almost Black)
          500: "#6B7280", // Secondary Text (Muted Gray)
          400: "#9CA3AF", // Placeholder (Light Gray)
          200: "#E5E7EB", // Borders (Subtle Gray)
          50: "#F9FAFB",  // Background (Off-White)
          white: "#FFFFFF", // Card Background
        },
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
      spacing: {
        4: "4px",
        8: "8px",
        12: "12px",
        16: "16px",
        24: "24px",
        32: "32px",
        40: "40px",
      },
      borderRadius: {
        xl: "12px",   // Inputs
        "2xl": "14px", // Buttons
        "3xl": "16px", // Cards
      },
    },
  },
  plugins: [],
};
