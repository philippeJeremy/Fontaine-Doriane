/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Vert sauge / olive — inspiré de la charte graphique (fond vert forêt, carte crème)
                sauge: {
                    50:  '#f1f4ea',
                    100: '#dfe7d2',
                    200: '#c0d0a7',
                    300: '#9bb479',
                    400: '#789752',
                    500: '#5a7a38',  // couleur principale (boutons, focus)
                    600: '#4a6530',  // hover
                    700: '#3a5026',  // active
                    800: '#2b3c1c',  // texte sombre
                    900: '#1c2812',  // hero / fond foncé
                },
            },
        },
    },
    plugins: [],
}
