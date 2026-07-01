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
        // Identidade v2
        'brand-azul': '#1A2DD9',
        'brand-azul-600': '#1422AE',
        'brand-azul-700': '#0E1989',
        'brand-azul-100': '#E1E5FB',
        'brand-azul-50': '#F1F3FE',
        'brand-atlantico': '#0B195F',
        'brand-atlantico-600': '#08134A',
        'brand-atlantico-100': '#D5DAEC',
        'brand-ceu': '#65B7FB',
        'brand-ceu-100': '#DCEFFD',
        'brand-offwhite': '#FAFAF6',

        // Tiers v2
        'tier-bronze': '#E8915A',
        'tier-bronze-soft': '#FBE4D5',
        'tier-prata': '#B6BBC4',
        'tier-prata-soft': '#E7E9EE',
        'tier-ouro': '#F2C94C',
        'tier-ouro-soft': '#FCEDB8',
        'tier-platina': '#E478C5',
        'tier-platina-soft': '#FAD9EF',
        'tier-diamante': '#9B5DE5',
        'tier-diamante-soft': '#E5D5F5',

        // Paleta diversa
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
        'surface-canvas': '#FAFAF6',
        'surface-elevated': '#FFFFFF',
        'surface-sunken': '#F1EFE7',
        'surface-inverse': '#0B195F',

        // Texto
        'text-primary': '#0B195F',
        'text-secondary': '#4A5475',
        'text-muted': '#7A8499',
        'text-disabled': '#B0B7C2',

        // Borda
        'border-subtle': '#E4E2D7',
        'border-strong': '#0B195F',
      },
      fontFamily: {
        sans: ['Figtree', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['56px', { lineHeight: '1.05', letterSpacing: '-0.04em' }],
        h1: ['40px', { lineHeight: '1.12', letterSpacing: '-0.025em' }],
        h2: ['30px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        h3: ['22px', { lineHeight: '1.3' }],
        h4: ['18px', { lineHeight: '1.4' }],
        'body-lg': ['17px', { lineHeight: '1.55' }],
        body: ['15px', { lineHeight: '1.6' }],
        'body-sm': ['14px', { lineHeight: '1.55' }],
        caption: ['12px', { lineHeight: '1.45' }],
        overline: ['11px', { lineHeight: '1.4', letterSpacing: '0.1em' }],
        points: ['44px', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'points-hero': ['88px', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        rank: ['36px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '28px',
        '2xl': '40px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(11, 25, 95, 0.05)',
        sm: '0 2px 6px -1px rgba(11, 25, 95, 0.07), 0 1px 2px -1px rgba(11, 25, 95, 0.04)',
        md: '0 8px 20px -4px rgba(11, 25, 95, 0.10), 0 2px 6px -2px rgba(11, 25, 95, 0.06)',
        lg: '0 18px 36px -8px rgba(11, 25, 95, 0.14), 0 6px 12px -4px rgba(11, 25, 95, 0.08)',
        xl: '0 32px 64px -12px rgba(11, 25, 95, 0.18)',
        'glow-azul': '0 0 0 4px rgba(26, 45, 217, 0.16)',
        'glow-ceu': '0 0 0 4px rgba(101, 183, 251, 0.28)',
        focus: '0 0 0 3px rgba(26, 45, 217, 0.32)',
        'focus-error': '0 0 0 3px rgba(224, 86, 93, 0.32)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-quart': 'cubic-bezier(0.5, 0, 0.75, 0)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '140ms',
        base: '220ms',
        slow: '340ms',
        slower: '520ms',
        entrance: '600ms',
      },
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up-sm': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '60%': { opacity: '1', transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(26, 45, 217, 0.0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(26, 45, 217, 0.14)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.6) rotate(-12deg)', opacity: '0' },
          '60%': { transform: 'scale(1.18) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        'shake-x': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'header-collapse': {
          '0%': { maxHeight: '64px' },
          '100%': { maxHeight: '56px' },
        },
        'tier-celebrate': {
          '0%': { transform: 'translateY(12px) scale(0.9)', opacity: '0' },
          '60%': { transform: 'translateY(-4px) scale(1.06)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fade-in 220ms cubic-bezier(0.25, 1, 0.5, 1)',
        'fade-up': 'fade-up 340ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-up-sm': 'fade-up-sm 220ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-up': 'slide-up 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pop-in': 'pop-in 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'pulse-glow': 'pulse-glow 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'count-up': 'count-up 520ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'check-pop': 'check-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'shake-x': 'shake-x 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
        'tier-celebrate': 'tier-celebrate 600ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      backgroundImage: {
        'gradient-atlantico-cobalto': 'linear-gradient(135deg, #0B195F 0%, #1A2DD9 100%)',
        'gradient-cobalto-ceu': 'linear-gradient(135deg, #1A2DD9 0%, #65B7FB 100%)',
        'gradient-ceu-begonia': 'linear-gradient(135deg, #65B7FB 0%, #FF80C8 100%)',
        'gradient-taiti-begonia': 'linear-gradient(135deg, #90D275 0%, #FF80C8 100%)',
        'gradient-acelola-tie': 'linear-gradient(135deg, #F39D72 0%, #E0565D 100%)',
        'gradient-canario-umbu': 'linear-gradient(135deg, #FBEC76 0%, #E7F79E 100%)',
        'gradient-jacaranda-manaca': 'linear-gradient(135deg, #8F85F4 0%, #BE64E3 100%)',
        'gradient-podio-ouro': 'linear-gradient(180deg, #F2C94C 0%, #E8915A 100%)',
        'gradient-podio-prata': 'linear-gradient(180deg, #E7E9EE 0%, #B6BBC4 100%)',
        'gradient-podio-bronze': 'linear-gradient(180deg, #E8915A 0%, #A8543B 100%)',
      },
    },
  },
  plugins: [],
};

export default config;