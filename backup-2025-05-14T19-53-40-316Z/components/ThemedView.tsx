import { View, ViewProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

export function ThemedView(props: ViewProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View
      {...otherProps}
      style={[
        { backgroundColor: colors.background },
        style,
      ]}
    />
  );
}

export function ThemedCardView(props: ViewProps) {
  const { style, ...otherProps } = props;
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  return (
    <View
      {...otherProps}
      style={[
        { 
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}