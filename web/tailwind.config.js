/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 二次元简约配色
        ink:    { 50: '#f8fafc', 100: '#eef2f6', 700: '#334155', 900: '#0f172a' },
        sakura: { 100: '#ffe4ec', 300: '#ffb3c8', 500: '#ff7aa2', 700: '#e64f7c' },
        sea:    { 100: '#dbeafe', 300: '#93c5fd', 500: '#60a5fa', 700: '#2563eb' },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
      },
    },
  },
  plugins: [],
};
