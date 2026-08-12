/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2563EB',
          dark: '#E4E4E7',
        },
        background: {
          light: '#F4F4F5',
          dark: '#09090B',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111113',
        },
        elevated: {
          light: '#FAFAFA',
          dark: '#18181B',
        },
        control: {
          light: '#FFFFFF',
          dark: '#141416',
        },
        text: {
          light: '#18181B',
          dark: '#F4F4F5',
        },
        muted: {
          light: '#71717A',
          dark: '#A1A1AA',
        },
        line: {
          light: '#E4E4E7',
          dark: '#2A2A2E',
        },
        action: {
          light: '#2563EB',
          dark: '#27272A',
        },
        actionHover: {
          light: '#1D4ED8',
          dark: '#3F3F46',
        },
      },
    },
  },
  plugins: [],
};
