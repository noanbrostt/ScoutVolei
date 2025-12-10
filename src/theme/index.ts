import {
  MD3LightTheme,
  MD3DarkTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

// Base primary color for the palette
const BASE_PRIMARY_BLUE = '#0535a4';

// --- Custom Light Theme Colors (Derived from #0535a4) ---
const CustomMD3LightThemeColors = {
  primary: '#0054DA',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DDE1FF',
  onPrimaryContainer: '#00164D',
  secondary: '#565E71',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#DAE2F8',
  onSecondaryContainer: '#131C2B',
  tertiary: '#705574',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FBD7FC',
  onTertiaryContainer: '#28132E',
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#410002',
  background: '#FEFBFF',
  onBackground: '#1B1B1F',
  surface: '#FEFBFF',
  onSurface: '#1B1B1F',
  surfaceVariant: '#E1E2EC',
  onSurfaceVariant: '#44474F',
  outline: '#74777F',
  outlineVariant: '#C4C6D0',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#303034',
  inverseOnSurface: '#F2F0F4',
  inversePrimary: '#B9C4FF',
  // Custom functional colors
  success: '#4CAF50',
  warning: '#FFC107',
};

// --- Custom Dark Theme Colors (Derived from #0535a4) ---
const CustomMD3DarkThemeColors = {
  primary: '#B9C4FF',
  onPrimary: '#00297A',
  primaryContainer: '#003DA7',
  onPrimaryContainer: '#DDE1FF',
  secondary: '#BDC7DC',
  onSecondary: '#283141',
  secondaryContainer: '#3F4759',
  onSecondaryContainer: '#DAE2F8',
  tertiary: '#DEAEE0',
  onTertiary: '#3F2844',
  tertiaryContainer: '#573E5B',
  onTertiaryContainer: '#FBD7FC',
  error: '#DC2626', // A stronger, more vivid red for dark mode
  onError: '#FFFFFF', 
  errorContainer: '#93000A',
  onErrorContainer: '#FFDAD6',
  background: '#1B1B1F',
  onBackground: '#E4E2E6',
  surface: '#1B1B1F',
  onSurface: '#E4E2E6',
  surfaceVariant: '#44474F',
  onSurfaceVariant: '#C4C6D0',
  outline: '#8E9099',
  outlineVariant: '#44474F',
  shadow: '#000000',
  scrim: '#000000',
  inverseSurface: '#E4E2E6',
  inverseOnSurface: '#303034',
  inversePrimary: '#0054DA',
  // Custom functional colors
  success: '#66BB6A', // Darker green for dark mode contrast
  warning: '#FFD54F', // Darker amber for dark mode contrast
};


export const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
    ...CustomMD3LightThemeColors,
  },
  fonts: MD3LightTheme.fonts,
};

export const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
    ...CustomMD3DarkThemeColors,
  },
  fonts: MD3DarkTheme.fonts,
};