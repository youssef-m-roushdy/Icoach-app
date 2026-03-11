import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  TouchableOpacityProps, 
  ViewStyle,  
  TextStyle   
} from 'react-native';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';


interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';

  buttonStyle?: ViewStyle; 
  textStyle?: TextStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({ 
  title, 
  variant = 'secondary',
  
  buttonStyle,
  textStyle,

  ...props 
}) => {
  const { colors } = useTheme();
  
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        };
      default:
        return {
          backgroundColor: colors.secondary,
        };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        // Use white text on gold background for better contrast in both themes
        return '#FFFFFF';
      case 'outline':
        return colors.primary;
      default:
        return colors.text;
    }
  };

  return (
    <TouchableOpacity 
     style={[
        styles.button,
        getButtonStyle(),
        buttonStyle, 
        props.disabled && styles.disabledButton, 
      ]}
      {...props}
    >
      <Text style={[
        styles.buttonText,
        { color: getTextColor() },
        textStyle, ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: { 
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: '700',
    letterSpacing: 0.5,
    fontSize: 16,
  },
});