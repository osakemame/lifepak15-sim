/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette "matériel de secours" (anthracite + accents du moniteur)
        anthracite: { 900: '#15181c', 800: '#1d2126', 700: '#2a2f36', 600: '#3a4048' },
        lcd: '#05080a',
        fc: '#37e06b', // fréquence cardiaque / ECG
        spo2: '#3cc8ff', // SpO2
        choc: '#ff8a1f', // bouton choc / charge
      },
    },
  },
  plugins: [],
};
