/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0b213f',
          deep: '#0f2c59',
          primary: '#1e40af',
          accent: '#2563eb',
          light: '#f0f6ff',
          gold: '#c59b27',
        },
      },
    },
  },
  plugins: [],
}
