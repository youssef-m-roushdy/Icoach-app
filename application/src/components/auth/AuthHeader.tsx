import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants';

interface AuthHeaderProps {
  activeTab: 'SignIn' | 'Login';
  onTabPress: (tab: 'SignIn' | 'Login') => void;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.topRight}>
      <View style={styles.headerTextContainer}>
        <TouchableOpacity onPress={() => onTabPress('SignIn')}>
          <Text 
            style={[
              styles.headerText, 
              activeTab === 'SignIn' ? styles.activeText : styles.inactiveText
            ]}
          >
            Sign Up {/* Always show "Sign Up" for the left tab */}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onTabPress('Login')}>
          <Text 
            style={[
              styles.headerText, 
              activeTab === 'Login' ? styles.activeText : styles.inactiveText
            ]}
          >
            Sign In {/* Always show "Sign In" for the right tab */}
          </Text>
        </TouchableOpacity>
      </View>
      <View 
        style={[
          styles.underline, 
          activeTab === 'SignIn' ? styles.underlineLeft : styles.underlineRight
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  topRight: {
    position: 'absolute',
    top: 60,
    right: 30,
    alignItems: 'flex-end',
  },
  headerTextContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  headerText: {
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  inactiveText: {
    opacity: 0.6,
  },
  activeText: {
    opacity: 1,
  },
  underline: {
    height: 2,
    width: 45,
    backgroundColor: COLORS.white,
    marginTop: 4,
  },
  underlineLeft: {
    alignSelf: 'flex-start',
  },
  underlineRight: {
    alignSelf: 'flex-end',
  },
});