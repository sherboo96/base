/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        customGold: "#D4A373",
        darkGray: "#2E3A3F",
        primary: "#1E3A8A",
        secondary: "#10B981",
        accent: "#c9ae81", // Main accent color used throughout
        accentDark: "#b89a6e", // Darker shade of accent
        accentDarker: "#a6895d", // Even darker shade
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
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
