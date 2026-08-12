import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        "portrait-phone": { raw: "(orientation: portrait) and (max-width: 640px)" },
        "landscape-phone": { raw: "(orientation: landscape) and (max-height: 520px)" },
      },
      colors: {
        felt: {
          900: "#0d2818",
          800: "#134029",
          700: "#1a5233",
          600: "#226b42",
        },
        gold: {
          400: "#f5d76e",
          500: "#e8c547",
          600: "#c9a227",
        },
      },
      fontFamily: {
        sans: ["var(--font-heebo)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
