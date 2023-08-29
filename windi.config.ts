import { resolve } from 'path'
import { defineConfig } from 'windicss/helpers'

export default defineConfig({
  darkMode: 'class',
  attributify: false,
  extract: {
    include: [
      resolve(__dirname, 'src/**/*.{vue,html}'),
    ],
  },
  theme: {
    extend: {
      colors: {
        'primary-light': {
          DEFAULT: '#d5c9b6',
        },
        'primary-dark': {
          DEFAULT: '#141d2e',
        },
      },
    },
  },
})
