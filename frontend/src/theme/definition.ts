import {defineTheme, type TokenValue} from '@astryxdesign/core/theme';

// The Astryx docsite uses its brand color for the mark and warm ink for controls.
const ink: TokenValue = ['#15110C', '#DFE2E5'];

export const syntroficTheme = defineTheme({
  name: 'syntrofic',
  tokens: {
    '--color-background-body': ['#F8F4ED', '#111112'],
    '--color-text-primary': ink,
    '--color-icon-primary': ink,
    '--color-accent': ink,
    '--color-text-accent': ink,
    '--color-icon-accent': ink,
    '--color-accent-muted': ['rgba(21, 17, 12, 0.08)', 'rgba(223, 226, 229, 0.14)'],
    '--color-on-accent': ['#FFFFFF', '#15110C'],
    '--text-display-1-weight': 'var(--font-weight-semibold)',
    '--text-display-2-weight': 'var(--font-weight-semibold)',
    '--text-display-3-weight': 'var(--font-weight-semibold)',
    '--radius-inner': '8px',
    '--radius-element': '12px',
    '--radius-container': '16px',
    '--radius-page': '32px',
    '--radius-chat': '28px',
  },
  typography: {
    body: {
      family: 'Figtree',
      fallbacks: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    },
  },
  components: {
    button: {base: {borderRadius: 'var(--radius-full)'}},
    'top-nav-item': {
      selected: {
        backgroundColor: 'transparent',
        ':hover': {backgroundColor: 'var(--color-overlay-hover)'},
        ':active': {backgroundColor: 'var(--color-overlay-pressed)'},
      },
    },
  },
});
