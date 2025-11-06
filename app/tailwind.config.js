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
        'brand-green': {
          DEFAULT: '#4CAF50',
          dark: '#388E3C',
          light: '#81C784',
        },
      },
      boxShadow: {
        'glow': '0 0 15px oklch(65% 0.16 151 / 0.25), 0 4px 20px oklch(65% 0.16 151 / 0.4)',
      },
    },
  },
  plugins: [],
  future: {
    enableCustomVariants: true,
    enableTheme: true,
  },
};
