import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    darkMode: 'class', // Enable dark mode with class-based toggling
    theme: {
        extend: {
            colors: {
                // Custom dark mode colors
                primary: {
                    DEFAULT: '#3B82F6', // Blue for primary color
                    dark: '#2563EB'
                },
                background: {
                    light: '#FFFFFF',
                    dark: '#121212'
                },
                text: {
                    light: '#000000',
                    dark: '#E0E0E0'
                }
            },
            // Add dark mode specific styles
            backgroundColor: {
                dark: {
                    primary: '#1E293B', // Dark slate background
                    secondary: '#334155'
                }
            }
        }
    },
    plugins: [
        forms,
        typography
    ]
};
