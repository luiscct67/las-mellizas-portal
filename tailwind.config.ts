import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf2f6",
          100: "#fbe8ef",
          200: "#f7d2e0",
          300: "#f0acc6",
          400: "#e47ba4",
          500: "#d35182",
          600: "#bc3266",
          700: "#8f1646", // Color institucional Las Mellizas
          800: "#841943",
          900: "#65102f",
          950: "#3d0418",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;