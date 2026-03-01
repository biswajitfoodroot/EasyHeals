/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                teal: {
                    DEFAULT: '#0C7B8F',
                    light: '#0EA5BE',
                    pale: '#E8F7FA',
                },
                sidebar: '#0F2830',
                bg: '#F4F6F8',
                card: '#FFFFFF',
            },
            fontFamily: {
                jakarta: ['Plus Jakarta Sans', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
                lora: ['Lora', 'serif'],
            },
        },
    },
    plugins: [],
}
