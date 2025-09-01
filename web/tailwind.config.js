import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1020',
        bg2: '#0e142a',
        accent: '#7c5cff',
        accent2: '#19c37d',
        accent3: '#00b3ff',
        text: '#e8eefc',
        muted: '#aab6da',
      },
    },
  },
  plugins: [forms, typography, daisyui],
  daisyui: {
    themes: [
      {
        movie: {
          primary: '#7c5cff',
          secondary: '#19c37d',
          accent: '#00b3ff',
          'base-100': '#0b1020',
          'base-200': '#0e142a',
          'base-content': '#e8eefc',
          info: '#00b3ff',
          success: '#19c37d',
          warning: '#7c5cff',
          error: '#ff3860',
        },
      },
    ],
    darkTheme: 'movie',
  },
};
