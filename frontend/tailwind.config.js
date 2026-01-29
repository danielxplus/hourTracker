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
        skin: {
          'bg-primary': 'var(--bg-primary)',
          'bg-secondary': 'var(--bg-secondary)',
          'bg-tertiary': 'var(--bg-tertiary)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          'border-primary': 'var(--border-primary)',
          'border-secondary': 'var(--border-secondary)',
          'accent-primary': 'var(--accent-primary)',
          'accent-secondary': 'var(--accent-secondary)',
          'accent-primary-bg': 'var(--accent-primary-bg)',
          'accent-secondary-bg': 'var(--accent-secondary-bg)',
          'card-bg': 'var(--card-bg)',
          'card-border': 'var(--card-border)',
          'nav-bg': 'var(--nav-bg)',
          'modal-overlay': 'var(--modal-overlay)',
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};


