/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        shop: {
          bg: '#0d131b',
          panel: '#172231',
          panelAlt: '#1f2e41',
          line: '#32465f',
          ink: '#eef3f8',
          accent: '#f59e0b',
          ok: '#16a34a'
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif']
      },
      boxShadow: {
        panel: '0 10px 30px rgba(0, 0, 0, 0.35)'
      }
    },
  },
  plugins: [],
}
