import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { COLORS, SIZES } from '../../constants';
import { useTheme } from '../../context/ThemeContext';

interface CustomInputProps extends TextInputProps {
  placeholder: string;
}

export const CustomInput: React.FC<CustomInputProps> = ({ placeholder, ...props }) => {
  const { theme, colors } = useTheme();
  
  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: colors.inputBg,
          color: colors.text,
          borderColor: colors.inputBorder,
        }
      ]}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    width: '100%',
    padding: 14,
    borderRadius: SIZES.radiusSmall,
    marginBottom: 18,
    borderWidth: 1,
  },
});
