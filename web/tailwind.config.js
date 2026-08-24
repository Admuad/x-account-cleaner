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
        space: {
          darkest: '#0e0f0f',
          black: '#121313',
          card: '#181a1b',
          'card-hover': '#1e2123',
          border: '#282b2e',
          'border-light': '#383c40',
          muted: '#8b98a5',
          text: '#f7f9f9',
          subtext: '#b9cad4',
        },
        coral: {
          50: '#fff2f0',
          100: '#ffe1dc',
          200: '#ffc7be',
          300: '#ffa394',
          400: '#ff7760',
          DEFAULT: '#FF6044',
          600: '#e64528',
          700: '#c23319',
          800: '#a12a15',
          900: '#842616',
        },
        brand: {
          emerald: '#00ba7c',
          amber: '#ffd400',
          crimson: '#f4212e',
          xblue: '#1d9bf0',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
