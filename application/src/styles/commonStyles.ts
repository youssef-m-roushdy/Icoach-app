import { StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants';

// Theme-aware styles using dynamic colors
export const createCommonStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: SIZES.radiusSmall,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: SIZES.radiusXLarge,
    marginTop: 15,
  },
  buttonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: SIZES.h4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 120,
    borderRadius: SIZES.radiusLarge,
  },
  primaryButtonText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 28,
  },
});

// Legacy styles (for backwards compatibility)
export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.inputBackground,
    padding: 14,
    borderRadius: SIZES.radiusSmall,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.darkGray,
    color: COLORS.white,
  },
  button: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: SIZES.radiusXLarge,
    marginTop: 15,
  },
  buttonText: {
    color: COLORS.lightGray,
    fontWeight: 'bold',
    fontSize: SIZES.h4,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 120,
    borderRadius: SIZES.radiusLarge,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 28,
  },
});
