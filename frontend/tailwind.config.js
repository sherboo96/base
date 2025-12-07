/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        customGold: "#D4A373", // Replace with the exact color code
        darkGray: "#2E3A3F",
        primary: "#1E3A8A", // Replace with your theme's primary color
        secondary: "#10B981",
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
