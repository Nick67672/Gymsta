// Define theme colors for the app
const tintColorLight = '#6C5CE7';
const tintColorDark = '#a395e9';

export default {
  light: {
    text: '#333333',
    textSecondary: '#666666',
    background: '#FFFFFF',
    backgroundSecondary: '#F5F5F5',
    tint: tintColorLight,
    tabIconDefault: '#A0A0A0',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#E5E5E5',
    notification: '#FF3B30',
    error: '#D32F2F',
    success: '#4CAF50',
    button: tintColorLight,
    buttonText: '#FFFFFF',
    inputBackground: '#F5F5F5',
    modalBackground: 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
  },
  dark: {
    text: '#E0E0E0',
    textSecondary: '#A0A0A0',
    background: '#000000',
    backgroundSecondary: '#1E1E1E',
    tint: tintColorDark,
    tabIconDefault: '#787878',
    tabIconSelected: tintColorDark,
    card: '#000000', // Changed from '#242424' to pure black
    border: '#333333',
    notification: '#FF453A',
    error: '#CF6679',
    success: '#81C784',
    button: tintColorDark,
    buttonText: '#FFFFFF',
    inputBackground: '#333333',
    modalBackground: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
  },
};