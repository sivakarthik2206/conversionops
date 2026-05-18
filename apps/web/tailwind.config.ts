mport type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#e8ff47",
        bg: "#0a0a0b",
        "bg-2": "#111114",
        "bg-3": "#18181d",
      },
      fontFamily: {
        display: ["DM Serif Display", "serif"],
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
