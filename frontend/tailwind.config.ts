import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        primary: {
          DEFAULT: "#0B5E42",
          50: "#E8F5F0",
          100: "#C5E6D9",
          500: "#0B5E42",
          600: "#094F38",
          700: "#073F2D",
        },
        secondary: {
          DEFAULT: "#C8963E",
          600: "#A67A32",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        arabic: ["var(--font-cairo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
