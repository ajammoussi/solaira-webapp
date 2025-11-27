/**
 * Design Tokens - Solaira Color Scheme for PV Energy Management System
 * 
 * Color Palette inspired by Solaira homepage:
 * - Black (#000000) ONLY for top header bar
 * - Teal/Turquoise (#00D9A3) for primary accents and interactive elements
 * - White (#FFFFFF) for backgrounds
 * - Dark Gray (#333333) for body text
 * - Green (#00A86B), Blue, Orange/Yellow for illustrations and highlights
 * 
 * Design Philosophy: Clean, modern, minimalist, eco-friendly aesthetic
 */

// ============================================================================
// COLOR PALETTE - SOLAIRA THEME
// ============================================================================

export const colors = {
  // Theme Colors - Solaira Primary
  primary: {
    1: '#00D9A3', // Teal/Turquoise - Main interactive elements
    2: '#00F5B8', // Lighter teal (hover states)
  },
  secondary: {
    1: '#FFFFFF', // White - Primary backgrounds
    2: '#F9FAFB', // Light gray - Subtle backgrounds
  },
  accent: {
    1: '#00A86B', // Green - Illustrations and highlights
    2: '#33BA87', // Light green accent
  },
  neutral: {
    dark: '#333333', // Dark gray - Body text (Solaira spec)
    light: '#FFFFFF', // White backgrounds
  },

  // Extended Palette - Solaira Inspired (Eco-Friendly Energy Theme)
  extended: {
    // Greens - PV/Energy/Success states (Solaira spec)
    primaryGreen: '#00A86B', // Main green accent
    lightGreen: '#33BA87',
    darkGreen: '#007A4E',
    emerald: '#00D9A3', // Matches teal primary
    mintGreen: '#C7EEC2',
    paleGreen: '#E8F5E9',

    // Teals - Primary interactive elements (Solaira spec)
    teal: '#00D9A3', // Main teal
    lightTeal: '#33E4B8',
    darkTeal: '#00A67D',
    tealMuted: '#B2F5EA',

    // Blues - Technical/grid/system indicators (Solaira spec)
    primaryBlue: '#2196F3',
    lightBlue: '#64B5F6',
    darkBlue: '#1976D2',
    skyBlue: '#BBE2FF',
    navyBlue: '#0F2C49',

    // Warnings/Alerts (Orange/Yellow from Solaira spec)
    warningYellow: '#FFC107',
    warningOrange: '#FF9800',
    lightOrange: '#FFB74D',
    errorRed: '#F44336',
    lightRed: '#EF5350',

    // Neutrals/Grays (Solaira grayscale)
    black: '#000000', // ONLY for top header
    white: '#FFFFFF',
    darkGray: '#333333', // Body text (Solaira spec)
    mediumGray: '#6B7280',
    lightGray: '#9CA3AF',
    paleGray: '#D1D5DB',
    subtleGray: '#E5E7EB',
    backgroundGray: '#F3F4F6',
    offWhite: '#F9FAFB',

    // Opacity variants (Solaira aesthetic)
    teal10: 'rgba(0, 217, 163, 0.1)',
    teal20: 'rgba(0, 217, 163, 0.2)',
    teal40: 'rgba(0, 217, 163, 0.4)',
    teal80: 'rgba(0, 217, 163, 0.8)',
    black20: 'rgba(0, 0, 0, 0.2)',
    black40: 'rgba(0, 0, 0, 0.4)',
    white10: 'rgba(255, 255, 255, 0.1)',
    white20: 'rgba(255, 255, 255, 0.2)',
    white40: 'rgba(255, 255, 255, 0.4)',
    white80: 'rgba(255, 255, 255, 0.8)',
  },

  // Semantic Colors for PV Application - Solaira Theme
  semantic: {
    pvProduction: '#00D9A3', // Teal - solar production (matches Solaira primary)
    consumption: '#333333', // Dark gray - energy consumption (body text color)
    gridImport: '#2196F3', // Blue - grid import
    gridExport: '#FF9800', // Orange - grid export (highlight)
    battery: '#00A86B', // Green - battery (Solaira green)
    success: '#00A86B', // Green - success states
    warning: '#FF9800', // Orange - warnings
    error: '#F44336', // Red - errors
    info: '#2196F3', // Blue - info
  },
};

// ============================================================================
// TYPOGRAPHY - SOLAIRA CLEAN & MODERN
// ============================================================================

export const typography = {
  // Font Families - Sans-Serif Modern (Solaira spec)
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'Inter, sans-serif', // Clean modern sans-serif
    mono: 'Consolas, Monaco, "Courier New", monospace', // For technical data
  },

  // Font Sizes
  sizes: {
    // THQ Design System
    heading1: '48px',
    heading2: '35px',
    heading3: '26px',
    bodyLarge: '18px',
    bodySmall: '16px',

    // Outfit Light variants
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '22px',
    xxl: '24px',

    // Outfit Regular
    '2xl': '32px',

    // Semantic Headings
    h1: '66px',
    h2: '44px',
    h2Alt1: '46px',
    h2Alt2: '48px',
    h3: '24px',
    h3Alt1: '34px',
    h3Alt2: '60px',
    h3Alt3: '36px',
    h4: '24px',

    // Links
    link: '16px',
    linkLg: '18px',
    linkXl: '20px',
  },

  // Font Weights
  weights: {
    light: 300,
    regular: 400,
    semibold: 600,
    bold: 700,
  },

  // Line Heights
  lineHeights: {
    tight: 1.15,
    normal: 1.5,
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  halfUnit: '8px',
  unit: '16px',
  oneAndHalfUnits: '24px',
  twoUnits: '32px',
  threeUnits: '48px',
  fourUnits: '64px',
  fiveUnits: '80px',
  sixUnits: '96px',

  // Sizes
  xsmall: '16px',
  small: '48px',
  medium: '96px',
  large: '144px',
  xlarge: '192px',
  xxlarge: '288px',
  maxWidth: '1400px',
};

// ============================================================================
// BORDER RADIUS - SOLAIRA ROUNDED STYLE
// ============================================================================

export const radius = {
  round: '50%', // Circular elements
  small: '4px',
  medium: '8px',
  large: '12px',
  xlarge: '16px',
  card: '12px', // Solaira card style
  image: '8px',
  input: '8px', // Clean modern inputs
  button: '24px', // Rounded buttons with teal dot indicators (Solaira spec)
  buttonPill: '9999px', // Full pill shape
};

// ============================================================================
// SHADOWS - SOLAIRA MINIMALIST
// ============================================================================

export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)', // Solaira card shadow
  tealGlow: '0 0 20px rgba(0, 217, 163, 0.3)', // Teal accent glow
};

// ============================================================================
// BREAKPOINTS (Responsive Design)
// ============================================================================

export const breakpoints = {
  mobile: '479px',
  tablet: '767px',
  desktop: '991px',
  wide: '1400px',
};

export const mediaQueries = {
  mobile: `@media(max-width: ${breakpoints.mobile})`,
  tablet: `@media(max-width: ${breakpoints.tablet})`,
  desktop: `@media(max-width: ${breakpoints.desktop})`,
};

// ============================================================================
// PV-SPECIFIC THEME - SOLAIRA ENERGY AESTHETIC
// ============================================================================

export const pvTheme = {
  // Chart colors for PV application (Solaira palette)
  charts: {
    production: '#00D9A3', // Teal for solar production
    consumption: '#333333', // Dark gray for consumption
    gridImport: '#2196F3', // Blue for grid import
    gridExport: '#FF9800', // Orange for grid export
    battery: '#00A86B', // Green for battery
    forecast: '#9CA3AF', // Light gray for forecast
    confidence: 'rgba(0, 217, 163, 0.2)', // Teal with opacity
  },

  // Status indicators (Solaira color-coded)
  status: {
    online: '#00A86B', // Green - healthy/online
    warning: '#FF9800', // Orange - warning
    offline: '#F44336', // Red - error/offline
    info: '#2196F3', // Blue - info
    healthy: '#00D9A3', // Teal - optimal performance
  },

  // Gradients (for gauges, progress bars) - Solaira aesthetic
  gradients: {
    production: `linear-gradient(135deg, #00D9A3 0%, #00A86B 100%)`, // Teal to green
    consumption: `linear-gradient(135deg, #333333 0%, #6B7280 100%)`, // Dark to medium gray
    battery: `linear-gradient(135deg, #00A86B 0%, #33BA87 100%)`, // Green gradient
    grid: `linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)`, // Blue gradient
    tealAccent: `linear-gradient(135deg, #00D9A3 0%, #00F5B8 100%)`, // Primary teal
    warning: `linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)`, // Orange gradient
  },

  // Header-specific (Solaira spec: Black ONLY for top header)
  header: {
    background: '#000000', // Black top header bar
    text: '#FFFFFF', // White text on black
    accent: '#00D9A3', // Teal accents/active states
  },

  // Navigation (Solaira clean spacing)
  navigation: {
    background: '#FFFFFF', // White navigation
    text: '#333333', // Dark gray text
    activeText: '#00D9A3', // Teal for active items
    activeDot: '#00D9A3', // Teal dot indicator (Solaira spec)
    hover: '#F9FAFB', // Light gray hover
  },

  // Buttons (Solaira rounded style with teal)
  buttons: {
    primary: {
      background: '#00D9A3', // Teal background
      text: '#FFFFFF', // White text
      hover: '#00F5B8', // Lighter teal on hover
      dotIndicator: '#00A86B', // Green dot on teal buttons
    },
    secondary: {
      background: '#FFFFFF', // White background
      text: '#333333', // Dark gray text
      border: '#00D9A3', // Teal border
      hover: '#F9FAFB', // Light gray hover
    },
    ghost: {
      background: 'transparent',
      text: '#00D9A3', // Teal text
      hover: 'rgba(0, 217, 163, 0.1)', // Teal tint
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get CSS variable reference
 * @param {string} varName - Variable name from :root
 * @returns {string} CSS var() reference
 */
export const cssVar = (varName) => `var(--${varName})`;

/**
 * Convert design token to inline style object
 */
export const toStyleObject = (tokens) => {
  return Object.entries(tokens).reduce((acc, [key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    acc[cssKey] = value;
    return acc;
  }, {});
};

export default {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  breakpoints,
  mediaQueries,
  pvTheme,
  cssVar,
  toStyleObject,
};
