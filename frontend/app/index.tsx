import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { theme } from '@/src/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Logo from '@/src/components/Logo';
import DemoAnalysisCard from '@/src/components/DemoAnalysisCard';

export default function Index() {
  const { user, isLoading, login } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(20);
  const demoOpacity = useSharedValue(0);
  const demoTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);
  const orbScale = useSharedValue(1);

  useEffect(() => {
    // Staggered entrance animations
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.2)) });

    taglineOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    taglineTranslateY.value = withDelay(300, withTiming(0, { duration: 600 }));

    demoOpacity.value = withDelay(600, withTiming(1, { duration: 700 }));
    demoTranslateY.value = withDelay(600, withTiming(0, { duration: 700 }));

    buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    buttonTranslateY.value = withDelay(1000, withTiming(0, { duration: 500 }));

    // Ambient orb animation
    orbScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const demoAnimStyle = useAnimatedStyle(() => ({
    opacity: demoOpacity.value,
    transform: [{ translateY: demoTranslateY.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const orbAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: orbScale.value }],
  }));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="landing-loading">
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/scan" />;
  }

  return (
    <View style={styles.root} testID="landing-screen">
      {/* Background gradient */}
      <LinearGradient
        colors={['#000000', '#0A0A1E', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow orbs */}
      <Animated.View style={[styles.orb, styles.orbTop, orbAnimStyle]}>
        <LinearGradient
          colors={['rgba(94, 92, 230, 0.35)', 'rgba(94, 92, 230, 0)']}
          style={styles.orbGradient}
        />
      </Animated.View>
      <Animated.View style={[styles.orb, styles.orbBottom, orbAnimStyle]}>
        <LinearGradient
          colors={['rgba(191, 90, 242, 0.25)', 'rgba(191, 90, 242, 0)']}
          style={styles.orbGradient}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top: Trust badge */}
          <View style={styles.trustBadgeContainer}>
            <View style={styles.trustBadge}>
              <Ionicons name="sparkles" size={12} color="#FFCC00" />
              <Text style={styles.trustBadgeText}>{t('poweredBy')}</Text>
            </View>
          </View>

          {/* Logo and app name */}
          <Animated.View style={[styles.logoSection, logoAnimStyle]}>
            <Logo size={96} showText={true} />
          </Animated.View>

          {/* Hero tagline */}
          <Animated.View style={[styles.taglineSection, taglineAnimStyle]}>
            <Text
              style={[styles.tagline, isRTL && styles.taglineRTL]}
              testID="hero-tagline"
            >
              {t('heroTagline')}
            </Text>
            <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
              {t('heroSubtitle')}
            </Text>
          </Animated.View>

          {/* Demo analysis card */}
          <Animated.View style={[styles.demoSection, demoAnimStyle]}>
            <DemoAnalysisCard />
          </Animated.View>

          {/* CTA Button */}
          <Animated.View style={[styles.ctaSection, buttonAnimStyle]}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={login}
              activeOpacity={0.85}
              testID="google-login-button"
            >
              <LinearGradient
                colors={['#FFFFFF', '#F5F5F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.loginGradient}
              >
                <View style={styles.googleIconContainer}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                </View>
                <Text style={styles.loginText}>{t('login')}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.privacyText}>{t('loginPrivacy')}</Text>

            {/* Language toggle */}
            <View style={styles.languageToggle}>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  i18n.language === 'en' && styles.langButtonActive,
                ]}
                onPress={() => i18n.changeLanguage('en')}
                testID="lang-en-button"
              >
                <Text
                  style={[
                    styles.langButtonText,
                    i18n.language === 'en' && styles.langButtonTextActive,
                  ]}
                >
                  EN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.langButton,
                  i18n.language === 'ar' && styles.langButtonActive,
                ]}
                onPress={() => i18n.changeLanguage('ar')}
                testID="lang-ar-button"
              >
                <Text
                  style={[
                    styles.langButtonText,
                    i18n.language === 'ar' && styles.langButtonTextActive,
                  ]}
                >
                  عربي
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  orb: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  orbTop: {
    top: -150,
    right: -100,
  },
  orbBottom: {
    bottom: -100,
    left: -150,
  },
  orbGradient: {
    flex: 1,
    borderRadius: 200,
  },
  trustBadgeContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  trustBadgeText: {
    fontSize: 11,
    color: '#E5E5EA',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  taglineSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tagline: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
  taglineRTL: {
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  subtitleRTL: {
    lineHeight: 26,
  },
  demoSection: {
    marginBottom: 32,
  },
  ctaSection: {
    marginTop: 'auto',
    paddingTop: 8,
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.2,
  },
  privacyText: {
    fontSize: 11,
    color: '#636366',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
  languageToggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 20,
    padding: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  langButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  langButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  langButtonTextActive: {
    color: '#FFFFFF',
  },
});
