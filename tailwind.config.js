/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        transit: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#baddfd",
          300: "#7dc3fb",
          400: "#38a2f6",
          500: "#0e84e8",
          600: "#0267c6",
          700: "#0252a1",
          800: "#064685",
          900: "#0b3c6e",
          950: "#072549",
        },
        bus: "#f59e0b",
        train: "#3b82f6",
        metro: "#8b5cf6",
        walk: "#10b981",
        ferry: "#06b6d4",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.8)" },
        },
      },
    },
  },
  plugins: [],
};
