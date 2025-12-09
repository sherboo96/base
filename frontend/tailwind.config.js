/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: "#0F4C75",
        // Accent colors (main brand color)
        accent: "#0B5367",
        accentLight: "#0D6B7F",
        accentDark: "#084354",
        accentDarker: "#063240",
        // Text color
        textDark: "#2E3A3F",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-1px)' },
          '100%': { transform: 'translateX(1px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease forwards',
        fadeInDown: 'fadeInDown 0.2s ease-out',
        slideRight: 'slideRight 1s infinite alternate',
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ["checked"],
      borderColor: ["checked"],
    },
  },
  plugins: [],
};
