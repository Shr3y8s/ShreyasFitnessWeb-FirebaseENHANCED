/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'glow': '4px 0 15px -2px rgba(34, 197, 94, 0.4), 8px 0 25px -5px rgba(34, 197, 94, 0.2)',
      },
    },
  },
  plugins: [],
  future: {
    enableCustomVariants: true,
    enableTheme: true,
  },
};
