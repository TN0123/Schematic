import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          // Backgrounds
          background: "#121212",
          paper: "#121212",
          secondary: "#1e1e1e",

          // Text
          textPrimary: "#ffffff",
          textSecondary: "rgba(255, 255, 255, 0.7)",
          textDisabled: "rgba(255, 255, 255, 0.5)",
          textAccent: "#00ff00",

          // Buttons & Actions
          actionActive: "#ffffff",
          actionHover: "rgba(255, 255, 255, 0.08)",
          actionSelected: "rgba(255, 255, 255, 0.16)",
          actionDisabled: "rgba(255, 255, 255, 0.3)",
          actionDisabledBackground: "rgba(255, 255, 255, 0.12)",

          // Dividers
          divider: "rgba(255, 255, 255, 0.12)",
        },
      },
      backgroundColor: {
        "light-hover": "rgba(0, 0, 0, 0.04)",
        "light-active": "rgba(0, 0, 0, 0.12)",
        "dark-hover": "rgba(255, 255, 255, 0.08)",
        "dark-active": "rgba(255, 255, 255, 0.16)",
      },
    },
  },
  plugins: [],
} satisfies Config;
