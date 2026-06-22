import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Identidade — Brandbook cap. 02
        'brand-azul': '#2A4FDA',
        'brand-azul-600': '#1E3FB8',
        'brand-azul-700': '#15308F',
        'brand-azul-100': '#E0E7FB',
        'brand-atlantico': '#0B2574',
        'brand-atlantico-600': '#081B5A',
        'brand-atlantico-100': '#D5DBEC',
        'brand-ceu': '#65B7FB',
        'brand-ceu-100': '#DCEFFD',
        'brand-offwhite': '#EFF3EE',
        'brand-preto': '#000000',
        // Tiers
        'tier-bronze': '#F39D72',
        'tier-prata': '#E0565D',
        'tier-ouro': '#FBEC76',
        'tier-platina': '#FF80C8',
        'tier-diamante': '#BE64E3',
        // Gamificação diversa
        begonia: '#FF80C8',
        manaca: '#BE64E3',
        jacaranda: '#8F85F4',
        tie: '#E0565D',
        acerola: '#F39D72',
        ipe: '#F2AFAB',
        canario: '#FBEC76',
        umbu: '#E7F79E',
        pera: '#CADF61',
        menta: '#9FF0BD',
        taiti: '#90D275',
        guaco: '#61B466',
        // Semântica
        'state-success': '#61B466',
        'state-success-strong': '#0F8A3F',
        'state-error': '#E0565D',
        'state-error-strong': '#A6202C',
        'state-warning': '#FBEC76',
        'state-warning-strong': '#8B6F00',
        'state-info': '#65B7FB',
        'state-info-strong': '#1E6FA8',
        'state-neutral': '#7A8499',
        // Superfícies
        'surface-canvas': '#EFF3EE',
        'surface-elevated': '#FFFFFF',
        'surface-sunken': '#E0E5DD',
        // Texto
        'text-primary': '#0B2574',
        'text-secondary': '#475569',
        'text-muted': '#7A8499',
        'text-disabled': '#B0B7C2',
        // Bordas
        'border-subtle': '#D8DDD6',
        'border-strong': '#0B2574',
      },
      fontFamily: {
        sans: ['Figtree', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['48px', { lineHeight: '1.17', letterSpacing: '-0.02em' }],
        h1: ['36px', { lineHeight: '1.22', letterSpacing: '-0.02em' }],
        h2: ['28px', { lineHeight: '1.29' }],
        h3: ['22px', { lineHeight: '1.36' }],
        h4: ['18px', { lineHeight: '1.44' }],
        'body-lg': ['17px', { lineHeight: '1.53' }],
        body: ['15px', { lineHeight: '1.60' }],
        'body-sm': ['14px', { lineHeight: '1.57' }],
        caption: ['12px', { lineHeight: '1.50' }],
        overline: ['11px', { lineHeight: '1.45', letterSpacing: '0.08em' }],
        points: ['40px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'points-hero': ['72px', { lineHeight: '1', letterSpacing: '-0.02em' }],
        rank: ['32px', { lineHeight: '1' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(11, 37, 116, 0.06)',
        sm: '0 1px 3px 0 rgba(11, 37, 116, 0.08), 0 1px 2px 0 rgba(11, 37, 116, 0.04)',
        md: '0 4px 12px -2px rgba(11, 37, 116, 0.10), 0 2px 4px -2px rgba(11, 37, 116, 0.06)',
        lg: '0 12px 24px -4px rgba(11, 37, 116, 0.12), 0 4px 8px -2px rgba(11, 37, 116, 0.08)',
        xl: '0 24px 48px -8px rgba(11, 37, 116, 0.16)',
        focus: '0 0 0 3px rgba(42, 79, 218, 0.32)',
        'focus-error': '0 0 0 3px rgba(224, 86, 93, 0.32)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slide-up 320ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;