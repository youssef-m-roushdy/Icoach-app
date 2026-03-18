import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
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

// ─────────────────────────────────────────────────────────────────────────────
//  Detect gesture navigation mode on Android
//
//  The reliable way to tell the difference:
//  - Button nav:  navBarHeight is typically >= 40px
//  - Gesture nav: navBarHeight is typically <= 24px (just a tiny gesture hint bar)
//
//  Android reports a small ~24dp tappable zone even in gesture mode,
//  but it is TRANSPARENT — not a solid bar.
//  The threshold of 30dp separates them reliably across all devices.
// ─────────────────────────────────────────────────────────────────────────────
function getNavBarInfo(): { height: number; isGestureMode: boolean } {
  console.log("platform", Platform.OS);
  if (Platform.OS !== 'android') {
    return { height: 0, isGestureMode: false };
  }
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const sbH = StatusBar.currentHeight ?? 0;
  const height = Math.max(screenH - windowH - sbH, 0);

  // Gesture nav = nav bar height is small (the system only reserves ~24dp for swipe hint)
  // Button nav  = nav bar height is large (~48dp for the 3 buttons)
  // Threshold of 30dp reliably separates the two on all Android versions
  const isGestureMode = height <= 30;

  return { height, isGestureMode };
}

export default function MediaPickerSheet({
  isVisible,
  onClose,
  onSelectMedia,
}: MediaPickerSheetProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  const { colors, theme } = useTheme();

  const { height: navBarHeight, isGestureMode } = getNavBarInfo();
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
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
      <View style={styles.root}>

        {/* Semi-dark overlay — tap to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetWrapper}>

          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBg,
                // In gesture mode add a little bottom padding so last button
                // isn't right at the edge. In button mode the filler handles it.
                paddingBottom: isGestureMode ? 8 : 8,
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
            Nav bar filler — only rendered in 3-button nav mode.

            BUTTON MODE  (isGestureMode = false):
              Solid black View, height = navBarHeight (~48dp)
              Sits below sheet rounded corners with zero gap.
              Nav buttons appear on solid black — matches system nav bar.

            GESTURE MODE (isGestureMode = true):
              This View is NOT rendered at all (null).
              Sheet sits flush at bottom. Swipe zone is fully transparent.
              Identical to Facebook / Instagram in gesture mode.
          */}
          {!isGestureMode && (
            <View
              style={{
                width: '100%',
                height: navBarHeight,
                backgroundColor: '#000000',
              }}
            />
          )}

        </View>
      </View>
    </View>
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
  sheetWrapper: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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