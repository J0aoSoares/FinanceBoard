import { createTheme, type MantineColorsTuple } from '@mantine/core';

const scale = (name: string): MantineColorsTuple =>
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(
    (shade) => `var(--fb-${name}-${shade})`,
  ) as unknown as MantineColorsTuple;

const darkScale: MantineColorsTuple = [
  'var(--fb-gray-1)',
  'var(--fb-gray-2)',
  'var(--fb-gray-3)',
  'var(--fb-gray-4)',
  'var(--fb-gray-5)',
  'var(--fb-gray-6)',
  'var(--fb-gray-7)',
  'var(--fb-gray-9)',
  'var(--fb-gray-9)',
  'var(--fb-gray-10)',
];

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 4 },
  autoContrast: false,
  defaultRadius: 'md',

  colors: {
    brand: scale('blue'),
    gray: scale('gray'),
    green: scale('green'),
    red: scale('red'),
    amber: scale('amber'),
    dark: darkScale,
  },

  fontFamily: 'var(--fb-font-sans)',
  fontFamilyMonospace: 'var(--fb-font-mono)',
  headings: { fontFamily: 'var(--fb-font-sans)', fontWeight: '600' },

  fontSizes: {
    xs: 'var(--fb-font-size-xs)',
    sm: 'var(--fb-font-size-sm)',
    md: 'var(--fb-font-size-md)',
    lg: 'var(--fb-font-size-lg)',
    xl: 'var(--fb-font-size-xl)',
  },

  spacing: {
    xs: 'var(--fb-space-xs)',
    sm: 'var(--fb-space-sm)',
    md: 'var(--fb-space-md)',
    lg: 'var(--fb-space-lg)',
    xl: 'var(--fb-space-xl)',
  },

  radius: {
    xs: 'var(--fb-radius-xs)',
    sm: 'var(--fb-radius-sm)',
    md: 'var(--fb-radius-md)',
    lg: 'var(--fb-radius-lg)',
    xl: 'var(--fb-radius-xl)',
  },

  shadows: {
    xs: 'var(--fb-shadow-xs)',
    sm: 'var(--fb-shadow-sm)',
    md: 'var(--fb-shadow-md)',
    lg: 'var(--fb-shadow-lg)',
    xl: 'var(--fb-shadow-lg)',
  },
});
