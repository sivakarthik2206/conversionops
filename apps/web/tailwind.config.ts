import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#e8ff47",
        "accent-hover": "#f0ff6a",
        bg: "#0a0a0b",
        "bg-2": "#111114",
        "bg-3": "#18181d",
        "bg-4": "#1e1e24",
        green: "#47ff8e",
        red: "#ff4747",
        blue: "#4796ff",
        amber: "#ffb347",
        purple: "#a78bfa",
      },
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        sans: ['"DM Sans"', "-apple-system", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        fadeIn: "fadeIn 0.3s ease-out forwards",
        pulse: "pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
