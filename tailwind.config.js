/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './public/**/*.{html,js}',
    './src/pages/**/*.{astro,html,js,jsx,ts,tsx}',
    './src/components/**/*.{astro,html,js,jsx,ts,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '480px',  // Add this line
        'sm': '640px',  // Add this line
        'md': '768px',  // Add this line
        'lg': '1024px',  // Add this line
        'xl': '1280px',  // Add this line
        '2xl': '1536px'  // Add this line
      },
      backgroundColor: {
        white: '#ffffff',
        gray: {
          50: '#f9fafb',
          800: '#1f2937',
          900: '#111827'
        },
        'gray-900-10': 'rgba(17, 24, 39, 0.1)',
        'gray-100-10': 'rgba(255, 255, 255, 0.1)'
      },
      borderColor: {
        'gray-900-10': 'rgba(17, 24, 39, 0.1)',
        'gray-100-10': 'rgba(255, 255, 255, 0.1)'
      },
      animation: {
        'progress-indeterminate': 'progress-indeterminate 1.5s infinite linear',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'cursor-blink': 'cursor-blink 1s step-start infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'gradient-x': 'gradient-x 3s ease infinite',
        'modal-enter': 'modal-enter 0.3s ease-out',
        'modal-leave': 'modal-leave 0.2s ease-in',
        'backdrop-enter': 'backdrop-enter 0.3s ease-out',
        'backdrop-leave': 'backdrop-leave 0.2s ease-in',
        'logo-load': 'logo-load 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'modal-enter': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          }
        },
        'modal-leave': {
          '0%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)'
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0.95) translateY(10px)'
          }
        },
        'backdrop-enter': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        'backdrop-leave': {
          '0%': {
            opacity: '1'
          },
          '100%': {
            opacity: '0'
          }
        },
        'logo-load': {
          '0%': { 
            opacity: '0', 
            transform: 'scale(0.8) rotate(-15deg)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'scale(1) rotate(0deg)' 
          }
        }
      }
    }
  },
  plugins: [
    function({ addBase }) {
      addBase({
        'html': { 
          scrollBehavior: 'smooth'
        }
      })
    }
  ]
}
