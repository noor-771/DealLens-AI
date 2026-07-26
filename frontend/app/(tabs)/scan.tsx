import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from '@/src/components/Logo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ScanScreen() {
  const { t, i18n } = useTranslation();
  const { token, user } = useAuth();
  const router = useRouter();
  const isRTL = i18n.language === 'ar';

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Pulse animation for main scan button
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(t('cameraPermission'), t('cameraPermissionMessage'), [
        { text: t('cancel'), style: 'cancel' },
      ]);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await analyzeProduct(result.assets[0].base64);
    }
  };

  const handleChooseFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(t('error'), 'Media library permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      await analyzeProduct(result.assets[0].base64);
    }
  };

  const analyzeProduct = async (base64Image: string) => {
    if (!token) {
      Alert.alert(t('error'), 'Please login first');
      return;
    }

    try {
      setIsAnalyzing(true);

      const response = await fetch(`${BACKEND_URL}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: base64Image,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }

      const result = await response.json();
      router.push(`/result/${result.scan_id}`);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || 'Failed to analyze product');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeText = async () => {
    if (!urlInput.trim()) return;
    if (!token) return;

    try {
      setShowUrlModal(false);
      setIsAnalyzing(true);

      const response = await fetch(`${BACKEND_URL}/api/scan-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: urlInput.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }

      const result = await response.json();
      setUrlInput('');
      router.push(`/result/${result.scan_id}`);
    } catch (error: any) {
      Alert.alert(t('error'), error.message || 'Failed to analyze');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <View style={styles.loadingContainer} testID="analyzing-screen">
        <LinearGradient
          colors={['#000000', '#0A0A1E', '#000000']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContent}>
          <Logo size={80} showText={false} />
          <ActivityIndicator
            size="large"
            color="#5E5CE6"
            style={{ marginTop: 32 }}
          />
          <Text style={styles.loadingText}>{t('analyzing')}</Text>
          <Text style={styles.loadingSubtext}>{t('analyzingSubtext')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="scan-screen">
      <LinearGradient
        colors={['#000000', '#0A0A1E', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={[styles.headerLeft, isRTL && styles.headerLeftRTL]}>
            <Logo size={36} showText={false} />
            <View>
              <Text style={styles.headerTitle}>DealLens AI</Text>
              <Text style={styles.headerSubtitle}>
                {user?.name?.split(' ')[0] || 'Welcome'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero: Scan a Deal */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, isRTL && styles.heroTitleRTL]}>
              {t('scanADeal')}
            </Text>
            <Text style={[styles.heroSubtitle, isRTL && styles.heroSubtitleRTL]}>
              {t('scanADealSubtitle')}
            </Text>
          </View>

          {/* Primary Scan Button */}
          <Animated.View style={[styles.primaryButtonWrapper, pulseAnimStyle]}>
            <TouchableOpacity
              onPress={handleTakePhoto}
              activeOpacity={0.9}
              testID="primary-scan-button"
            >
              <LinearGradient
                colors={['#0A84FF', '#5E5CE6', '#BF5AF2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <View style={styles.primaryButtonIconWrapper}>
                  <Ionicons name="scan" size={44} color="#FFFFFF" />
                </View>
                <Text style={styles.primaryButtonText}>{t('scanADeal')}</Text>
                <View style={styles.primaryButtonBadge}>
                  <Ionicons name="sparkles" size={12} color="#FFCC00" />
                  <Text style={styles.primaryButtonBadgeText}>AI</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Options Grid */}
          <View style={styles.optionsSection}>
            <View style={styles.optionsHeader}>
              <View style={styles.optionsLine} />
              <Text style={styles.optionsHeaderText}>
                {isRTL ? 'أو اختر طريقة' : 'or choose method'}
              </Text>
              <View style={styles.optionsLine} />
            </View>

            <OptionCard
              icon="camera"
              iconColor="#0A84FF"
              iconBg="rgba(10, 132, 255, 0.12)"
              title={t('takePhoto')}
              description={t('takePhotoDesc')}
              onPress={handleTakePhoto}
              isRTL={isRTL}
              testID="take-photo-option"
            />
            <OptionCard
              icon="images"
              iconColor="#30D158"
              iconBg="rgba(48, 209, 88, 0.12)"
              title={t('uploadImage')}
              description={t('uploadImageDesc')}
              onPress={handleChooseFromGallery}
              isRTL={isRTL}
              testID="upload-image-option"
            />
            <OptionCard
              icon="link"
              iconColor="#BF5AF2"
              iconBg="rgba(191, 90, 242, 0.12)"
              title={t('pasteLink')}
              description={t('pasteLinkDesc')}
              onPress={() => setShowUrlModal(true)}
              isRTL={isRTL}
              testID="paste-link-option"
            />
          </View>

          {/* Feature highlights */}
          <View style={styles.highlights}>
            <FeatureBadge icon="flash" text={t('instantAnalysis')} color="#FFCC00" />
            <FeatureBadge icon="shield-checkmark" text={t('scamProtection')} color="#30D158" />
            <FeatureBadge icon="bar-chart" text={t('smartInsights')} color="#0A84FF" />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* URL Input Modal */}
      <Modal
        visible={showUrlModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowUrlModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContainer}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t('urlInputTitle')}</Text>
                  <TouchableOpacity
                    onPress={() => setShowUrlModal(false)}
                    style={styles.modalCloseBtn}
                    testID="url-modal-close"
                  >
                    <Ionicons name="close" size={22} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalHint}>{t('urlInputHint')}</Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="link" size={18} color="#8E8E93" />
                  <TextInput
                    style={[styles.input, isRTL && styles.inputRTL]}
                    placeholder={t('urlInputPlaceholder')}
                    placeholderTextColor="#636366"
                    value={urlInput}
                    onChangeText={setUrlInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    multiline
                    numberOfLines={2}
                    testID="url-input"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.modalAnalyzeButton,
                    !urlInput.trim() && styles.modalAnalyzeButtonDisabled,
                  ]}
                  onPress={analyzeText}
                  disabled={!urlInput.trim()}
                  testID="url-analyze-button"
                >
                  <LinearGradient
                    colors={
                      urlInput.trim()
                        ? ['#0A84FF', '#5E5CE6']
                        : ['#2C2C2E', '#2C2C2E']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalAnalyzeGradient}
                  >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.modalAnalyzeText}>{t('analyze')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const OptionCard = ({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  onPress,
  isRTL,
  testID,
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  onPress: () => void;
  isRTL: boolean;
  testID?: string;
}) => (
  <TouchableOpacity
    style={[styles.optionCard, isRTL && styles.optionCardRTL]}
    onPress={onPress}
    activeOpacity={0.7}
    testID={testID}
  >
    <View style={[styles.optionIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.optionContent}>
      <Text style={[styles.optionTitle, isRTL && styles.textRTL]}>{title}</Text>
      <Text style={[styles.optionDesc, isRTL && styles.textRTL]}>
        {description}
      </Text>
    </View>
    <Ionicons
      name={isRTL ? 'chevron-back' : 'chevron-forward'}
      size={20}
      color="#48484A"
    />
  </TouchableOpacity>
);

const FeatureBadge = ({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color: string;
}) => (
  <View style={styles.featureBadge}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={styles.featureBadgeText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLeftRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroSection: {
    marginTop: 20,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },
  heroTitleRTL: {
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 6,
    lineHeight: 22,
  },
  heroSubtitleRTL: {
    textAlign: 'right',
  },
  primaryButtonWrapper: {
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 8,
  },
  primaryButton: {
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  primaryButtonIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  primaryButtonBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  primaryButtonBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  optionsSection: {
    marginTop: 32,
    gap: 10,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  optionsLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  optionsHeaderText: {
    fontSize: 11,
    color: '#636366',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionCardRTL: {
    flexDirection: 'row-reverse',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#8E8E93',
  },
  textRTL: {
    textAlign: 'right',
  },
  highlights: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 32,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureBadgeText: {
    fontSize: 11,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#48484A',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 40,
    paddingTop: 0,
  },
  inputRTL: {
    textAlign: 'right',
  },
  modalAnalyzeButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalAnalyzeButtonDisabled: {
    opacity: 0.5,
  },
  modalAnalyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  modalAnalyzeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
