import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  StatusBar,
  Dimensions,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Feather';
import Ion from 'react-native-vector-icons/Ionicons';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useSystemNavigation } from '../context/SystemNavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { foodService } from '../services/api';
import type { FoodPredictionResponse } from '../services/api';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
  getErrorMessage,
} from '../utils/toast';

// ─── Gesture vs button nav detection ─────────────────────────────────────────
function getNavBarInfo(): { height: number; isGestureMode: boolean } {
  if (Platform.OS !== 'android') return { height: 0, isGestureMode: false };
  const screenH = Dimensions.get('screen').height;
  const windowH = Dimensions.get('window').height;
  const sbH = StatusBar.currentHeight ?? 0;
  const height = Math.max(screenH - windowH - sbH, 0);
  const isGestureMode = height <= 30;
  return { height, isGestureMode };
}

export default function FoodsScreen() {
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { systemBottomInset } = useSystemNavigation();
  const isThreeButtonNav = systemBottomInset > 24;
  const dynamicPaddingBottom = isThreeButtonNav ? 130 : 95;

  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<FoodPredictionResponse | null>(null);

  // Track modal open state for back button handling
  const [isImageOptionsModalOpen, setIsImageOptionsModalOpen] = useState(false);

  const imageOptionsSheetRef = React.useRef<BottomSheetModal>(null);

  const { height: navBarHeight, isGestureMode } = getNavBarInfo();
  const sheetBg = theme === 'dark' ? '#1C1C1E' : '#FFFFFF';

  const sheetBackground = React.useMemo(
    () => ({ backgroundColor: sheetBg }),
    [sheetBg]
  );
  
  const handleIndicatorStyle = React.useMemo(
    () => ({ backgroundColor: colors.divider ?? '#C0C0C0', width: 40, height: 4 }),
    [colors.divider]
  );

  const renderBackdrop = React.useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // ─── Sheet animation ───────────────────────────────────────────────────────
  const openSheet = React.useCallback(() => {
    setIsImageOptionsModalOpen(true);
    imageOptionsSheetRef.current?.present();
  }, []);

  const closeSheet = React.useCallback(() => {
    setIsImageOptionsModalOpen(false);
    imageOptionsSheetRef.current?.dismiss();
  }, []);

  // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      if (isImageOptionsModalOpen) {
        closeSheet();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior (navigation)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [isImageOptionsModalOpen, closeSheet]);

  // ─── Food prediction ───────────────────────────────────────────────────────
  const predictFood = async (imageUri: string) => {
    setLoading(true);
    try {
      const data = await foodService.predictFood(imageUri);

      if (!data || !data.food_data) {
        showInfoToast({
          title: 'No Result',
          message: 'Could not identify the food clearly. Please try another image.',
        });
        return;
      }

      setPrediction(data);
      setSelectedImage(imageUri);

      showSuccessToast({
        title: 'Food Identified',
        message: `${formatFoodName(data.food_data.name)} detected successfully`,
      });
    } catch (error: unknown) {
      showErrorToast({
        title: 'Recognition Failed',
        message: getErrorMessage(error) || 'Failed to identify food. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Camera permission ─────────────────────────────────────────────────────
  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos of food.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // ─── Open camera ───────────────────────────────────────────────────────────
  const openCamera = async () => {
    closeSheet();

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showErrorToast({
        title: 'Permission Denied',
        message: 'Camera permission is required to take photos.',
      });
      return;
    }

    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.6,
        maxWidth: 800,
        maxHeight: 800,
        saveToPhotos: false,
        cameraType: 'back',
      },
      (response) => {
        if (response.didCancel) return;

        if (response.errorCode) {
          console.log('Camera Error Code:', response.errorCode);
          showErrorToast({
            title: 'Camera Error',
            message: response.errorMessage || 'An error occurred while opening the camera',
          });
          return;
        }

        if (response.assets?.[0]?.uri) {
          predictFood(response.assets[0].uri);
        } else {
          showInfoToast({
            title: 'No Image Selected',
            message: 'Please capture a valid image to continue.',
          });
        }
      }
    );
  };

  // ─── Open gallery ──────────────────────────────────────────────────────────
  const openGallery = () => {
    closeSheet();

    launchImageLibrary(
      { mediaType: 'photo', quality: 0.6, maxWidth: 800, maxHeight: 800, selectionLimit: 1 },
      (response) => {
        if (response.didCancel) return;

        if (response.errorMessage) {
          showErrorToast({
            title: 'Gallery Error',
            message: response.errorMessage,
          });
          return;
        }

        if (response.assets?.[0]?.uri) {
          predictFood(response.assets[0].uri);
        } else {
          showInfoToast({
            title: 'No Image Selected',
            message: 'Please choose a valid image from the gallery.',
          });
        }
      }
    );
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const clearResult = () => {
    setSelectedImage(null);
    setPrediction(null);
  };

  const formatFoodName = (name: string): string =>
    name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Animated Gradient Background matches SignIn */}
      <LinearGradient
        colors={colors.authBgGradient as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={[styles.decorativeCircle1, { backgroundColor: colors.authCircle1 }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: colors.authCircle2 }]} />
        <View style={[styles.decorativeCircle3, { backgroundColor: colors.authCircle3 }]} />
      </LinearGradient>

      <ScrollView 
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: dynamicPaddingBottom }} // Spacer for floating nav
      >
        <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>🍎 Food Recognition</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI-powered food identification
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.primary }]}>
              Identifying food...
            </Text>
          </View>
        ) : prediction && prediction.food_data && selectedImage ? (
          <View style={styles.resultContainer}>
            <Image source={{ uri: selectedImage }} style={styles.foodImage} />

            <View
              style={[
                styles.predictionCard,
                { backgroundColor: colors.authInputBg || colors.card, borderColor: colors.authInputBorder || colors.border },
              ]}
            >
              <Text style={[styles.foodName, { color: colors.primary }]}>
                {formatFoodName(prediction.food_data.name)}
              </Text>

              <Text style={[styles.confidence, { color: colors.textSecondary }]}>
                Confidence:{' '}
                {typeof prediction.confidence === 'number'
                  ? `${(prediction.confidence * 100).toFixed(1)}%`
                  : 'N/A'}
              </Text>

              <View style={styles.nutritionGrid}>
                {[
                  { label: 'Calories', value: prediction.food_data.calories,    unit: 'kcal' },
                  { label: 'Protein',  value: prediction.food_data.protein,      unit: 'g' },
                  { label: 'Carbs',    value: prediction.food_data.carbohydrate, unit: 'g' },
                  { label: 'Fat',      value: prediction.food_data.fat,          unit: 'g' },
                ].map((n) => (
                  <View
                    key={n.label}
                    style={[
                      styles.nutritionItem,
                      { backgroundColor: colors.authInputBg || colors.background, borderColor: colors.authInputBorder || colors.border },
                    ]}
                  >
                    <Text style={[styles.nutritionLabel, { color: colors.textSecondary }]}>
                      {n.label}
                    </Text>
                    <Text style={[styles.nutritionValue, { color: colors.text }]}>{n.value}</Text>
                    <Text style={[styles.nutritionUnit, { color: colors.textSecondary }]}>
                      {n.unit}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.newScanButton, { overflow: 'hidden', borderWidth: 0 }]}
              onPress={clearResult}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, (colors as any).secondary || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Icon name="camera" size={20} color="#FFFFFF" style={{ position: 'relative' }} />
              <Text
                style={[
                  styles.newScanButtonText,
                  { color: '#FFFFFF', position: 'relative' },
                ]}
              >
                Scan Another Food
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.scanCard, { backgroundColor: colors.authInputBg || colors.card, borderColor: colors.authInputBorder || colors.primary }]}
            onPress={openSheet}
          >
            <Icon name="camera" size={48} color={colors.primary} />
            <Text style={[styles.scanTitle, { color: colors.text }]}>Scan Your Food</Text>
            <Text style={[styles.scanText, { color: colors.textSecondary }]}>
              Take a photo or choose from gallery to identify food and get nutrition info
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>

      {/* ── Bottom Sheet Modal ── */}
      <BottomSheetModal
        ref={imageOptionsSheetRef}
        index={0}
        enableDynamicSizing={true}
        onChange={(index) => setIsImageOptionsModalOpen(index >= 0)}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBackground}
        handleIndicatorStyle={handleIndicatorStyle}
        enablePanDownToClose
      >
        <BottomSheetView style={[{ paddingBottom: Math.max(30, systemBottomInset + 4) }]}>
          <View style={{ paddingTop: 10 }}>
            <TouchableOpacity style={styles.option} onPress={openCamera} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBg ?? colors.card }]}>
                <Icon name="camera" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option} onPress={openGallery} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: colors.iconBg ?? colors.card }]}>
                <Ion name="images-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.optionText, { color: colors.text }]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.divider ?? colors.border }]} />
            <TouchableOpacity style={styles.cancelBtn} onPress={closeSheet}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  decorativeCircle1: { position: 'absolute', top: -100, right: -100, width: 250, height: 250, borderRadius: 125 },
  decorativeCircle2: { position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: 100 },
  decorativeCircle3: { position: 'absolute', top: '30%', left: '-20%', width: 150, height: 150, borderRadius: 75 },
  content: { padding: SIZES.lg },
  title: { fontSize: SIZES.h1, fontWeight: 'bold', marginBottom: SIZES.sm },
  subtitle: { fontSize: SIZES.body, marginBottom: SIZES.xl },

  scanCard: {
    padding: SIZES.xxl,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  scanTitle: { fontSize: SIZES.h2, fontWeight: 'bold', marginTop: SIZES.md, marginBottom: SIZES.sm },
  scanText: { fontSize: SIZES.body, textAlign: 'center', lineHeight: 22 },

  loadingContainer: {
    padding: SIZES.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  loadingText: { fontSize: SIZES.body, marginTop: SIZES.md },

  resultContainer: { marginBottom: SIZES.lg },
  foodImage: {
    width: '100%',
    height: 250,
    borderRadius: SIZES.radiusMedium,
    marginBottom: SIZES.md,
  },
  predictionCard: {
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMedium,
    borderWidth: 1,
    marginBottom: SIZES.md,
  },
  foodName: { fontSize: SIZES.h2, fontWeight: 'bold', marginBottom: SIZES.xs },
  confidence: { fontSize: SIZES.body, marginBottom: SIZES.lg },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  nutritionItem: {
    width: '48%',
    padding: SIZES.md,
    borderRadius: SIZES.radiusSmall,
    marginBottom: SIZES.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  nutritionLabel: { fontSize: SIZES.small, marginBottom: SIZES.xs },
  nutritionValue: { fontSize: SIZES.h2, fontWeight: 'bold' },
  nutritionUnit: { fontSize: SIZES.small },

  newScanButton: {
    flexDirection: 'row',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newScanButtonText: { fontSize: SIZES.body, fontWeight: 'bold', marginLeft: SIZES.sm },

  // Modal / bottom sheet
  modalRoot: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.50)' },
  sheetWrapper: { width: '100%' },
  sheet: {
    width: '100%',
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 10, alignSelf: 'center', marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  optionText: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, marginTop: 8 },
  cancelBtn: { paddingVertical: 16, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '500' },
});