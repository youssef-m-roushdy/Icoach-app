import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import Ion from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';

interface MediaPickerSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectMedia: (uri: string | undefined) => void;
}

export default function MediaPickerSheet({ isVisible, onClose, onSelectMedia }: MediaPickerSheetProps) {
  const [slideAnim] = useState(new Animated.Value(0));
  const { colors } = useTheme();

  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: isVisible ? 200 : 180,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const openCamera = () => {
    onClose();
    launchCamera({ mediaType: 'photo' }, (res) => {
        if (res.assets && res.assets.length > 0) {
            onSelectMedia(res.assets[0].uri);
        } else {
            onSelectMedia(undefined); 
        }
    });
  };

  const openGallery = () => {
    onClose();
    launchImageLibrary({ mediaType: 'photo' }, (res) => {
        if (res.assets && res.assets.length > 0) {
            onSelectMedia(res.assets[0].uri);
        } else {
            onSelectMedia(undefined);
        }
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  if (!isVisible) return null; 

  return (
    <Modal transparent visible={isVisible} animationType="none">
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.modalBackground, { backgroundColor: colors.textSecondary + '80' }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.card, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.handleBar, { backgroundColor: colors.textSecondary }]} />

          <TouchableOpacity style={styles.option} onPress={openCamera}>
            <Icon name="camera" size={28} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.primary }]}>Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={openGallery}>
            <Ion name="images-outline" size={30} color={colors.primary} />
            <Text style={[styles.optionText, { color: colors.primary }]}>Choose from Device</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
  );
}

/* ========== STYLES ========== */
const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingTop: 12,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 45,
    height: 5,
    alignSelf: 'center',
    borderRadius: 10,
    marginBottom: 15,
  },
  option: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
});