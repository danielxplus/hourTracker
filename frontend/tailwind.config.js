/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          soft: "#A855F7",
        },
        accent: {
          green: "#10B981",
          yellow: "#FBBF24",
        },
        surface: {
          soft: "#F3F4F6",
          card: "#111827",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};


