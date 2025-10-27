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
        'glow': '0 0 20px rgba(34, 197, 94, 0.3), 4px 0 25px rgba(34, 197, 94, 0.5), 8px 0 35px rgba(34, 197, 94, 0.3), 12px 0 50px rgba(34, 197, 94, 0.2)',
      },
    },
  },
  plugins: [],
  future: {
    enableCustomVariants: true,
    enableTheme: true,
  },
};
