import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import Ion from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

interface MediaPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectMedia: (uri: string | undefined) => void;
}

// ─── Measure the real Android nav bar height ───────────────────────────────
// Dimensions.get('screen') = full physical screen
// Dimensions.get('window') = usable app area (excludes nav bar + status bar)
// StatusBar.currentHeight  = status bar pixels (Android only)
function getNavBarHeight(): number {
  if (Platform.OS !== 'android') return 0;
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const sbH = StatusBar.currentHeight ?? 0;
  return Math.max(screenH - windowH - sbH, 0);
}

export default function MediaPickerSheet({
  isVisible,
  onClose,
  onSelectMedia,
}: MediaPickerSheetProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  const { colors, theme } = useTheme();

  const navBarHeight = getNavBarHeight();
  // Solid sheet colour — never transparent
  const sheetBg = theme === 'dark' ? '#1C1C1E' : '#FFFFFF';

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: isVisible ? 220 : 180,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const openCamera = () => {
    onClose();
    launchCamera({ mediaType: 'photo' }, (res) => {
      onSelectMedia(res.assets?.[0]?.uri);
    });
  };

  const openGallery = () => {
    onClose();
    launchImageLibrary({ mediaType: 'photo' }, (res) => {
      onSelectMedia(res.assets?.[0]?.uri);
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent   // modal window covers full screen incl. nav bar
      onRequestClose={onClose}
    >
      {/*
        ┌─────────────────────────────────┐  ← top of physical screen
        │  TouchableWithoutFeedback       │  ← dark overlay, closes on tap
        │  (flex: 1)                      │
        ├─────────────────────────────────┤
        │  sheetWrapper                   │  ← contains sheet + black bar
        │  ┌───────────────────────────┐  │
        │  │  Animated sheet (white)   │  │
        │  └───────────────────────────┘  │
        │  ┌───────────────────────────┐  │
        │  │  black bar (navBarHeight) │  │  ← KEY: solid black fills nav zone
        │  └───────────────────────────┘  │
        └─────────────────────────────────┘  ← bottom of physical screen
      */}
      <View style={styles.root}>
        {/* Dark overlay */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* Sheet + black nav bar filler stacked together */}
        <View style={styles.sheetWrapper}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBg,
                // Only pad enough for content — the black bar below handles the rest
                paddingBottom: 8,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.divider ?? '#C0C0C0' }]} />

            <TouchableOpacity style={styles.option} onPress={openCamera} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
                <Icon name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Open Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={openGallery} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBg }]}>
                <Ion name="images-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Choose from Device</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider ?? '#E0E0E0' }]} />
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.cancelText, { color: colors.subtleText }]}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>

          {/*
            This View sits OUTSIDE the sheet's border-radius zone.
            It fills exactly the Android nav bar height with pure black
            so the system nav bar blends seamlessly — zero transparency.
          */}
          <View style={[styles.navBarFill, { height: navBarHeight, backgroundColor: '#000000' }]} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  // sheetWrapper stacks the sheet and the black bar vertically
  // It sits at the bottom because the overlay above it takes all remaining flex space
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navBarFill: {
    width: '100%',
    // height and backgroundColor set dynamically
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
});