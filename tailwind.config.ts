/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neu: {
          base: '#E0E5EC',
          dark: '#D1D9E6',
          light: '#F0F5FD',
        },
        accent: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      boxShadow: {
        'neu-flat': '9px 9px 16px rgba(163, 177, 198, 0.6), -9px -9px 16px rgba(255, 255, 255, 0.5)',
        'neu-pressed': 'inset 6px 6px 10px rgba(163, 177, 198, 0.7), inset -6px -6px 10px rgba(255, 255, 255, 0.8)',
        'neu-convex': '6px 6px 10px rgba(163, 177, 198, 0.6), -6px -6px 10px rgba(255, 255, 255, 0.5)',
      },
      borderRadius: {
        'neu': '20px',
      },
    },
  },
  plugins: [],
};