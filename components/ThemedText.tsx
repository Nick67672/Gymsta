import { Text, TextProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export function ThemedText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.text },
        style,
      ]}
    />
  );
}

export function ThemedSecondaryText(props: TextProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <Text
      {...otherProps}
      style={[
        { color: colors.textSecondary },
        style,
      ]}
    />
  );
}