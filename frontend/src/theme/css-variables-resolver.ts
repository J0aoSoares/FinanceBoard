import type { CSSVariablesResolver } from '@mantine/core';

const schemeAware = {
  '--mantine-color-body': 'var(--fb-body)',
  '--mantine-color-text': 'var(--fb-text)',
  '--mantine-color-dimmed': 'var(--fb-text-muted)',
  '--mantine-color-default': 'var(--fb-surface)',
  '--mantine-color-default-hover': 'var(--fb-surface-hover)',
  '--mantine-color-default-color': 'var(--fb-text)',
  '--mantine-color-default-border': 'var(--fb-border)',
  '--mantine-color-placeholder': 'var(--fb-text-muted)',
  '--mantine-color-anchor': 'var(--fb-brand)',
  '--mantine-color-error': 'var(--fb-danger)',
};

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--mantine-primary-color-contrast': 'var(--fb-brand-contrast)',
    '--mantine-line-height': 'var(--fb-line-height-normal)',
  },
  light: schemeAware,
  dark: schemeAware,
});
