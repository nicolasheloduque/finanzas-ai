/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'midnight': '#0a0a0f',
        'obsidian': '#12121a',
        'slate': '#1e1e2e',
        'ash': '#2a2a3e',
        'mist': '#8b8ba3',
        'cloud': '#c4c4d4',
        'snow': '#f0f0f5',
        'mint': '#00d4aa',
        'mint-dark': '#00b894',
        'coral': '#ff6b6b',
        'gold': '#ffd93d',
        'purple': '#a855f7',
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

