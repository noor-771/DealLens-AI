import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/theme';
import { changeLanguage } from '@/src/i18n';
import { trackEvent } from '@/src/utils/analytics';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserStats {
  total_scans: number;
  avg_deal_score: number;
  best_deal_score: number;
  top_category: string | null;
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { user, logout, token } = useAuth();
  const currentLanguage = i18n.language;
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!token) return;
    trackEvent('profile_viewed', {}, token);
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/analytics/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const handleLanguageChange = async (lang: string) => {
    try {
      await changeLanguage(lang);

      // Update language preference in backend
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/language?language=${lang}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        trackEvent('language_changed', { language: lang }, token);
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout'),
      'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: async () => {
            await trackEvent('logout', {}, token);
            logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile')}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.userCard}>
          <Image
            source={{ uri: user?.picture }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('yourStats')}</Text>
          {stats && stats.total_scans > 0 ? (
            <View style={styles.statsGrid}>
              <StatCard
                icon="scan"
                label={t('totalScans')}
                value={String(stats.total_scans)}
                gradient={['#0A84FF', '#5E5CE6']}
                testID="stat-total-scans"
              />
              <StatCard
                icon="analytics"
                label={t('avgScore')}
                value={`${stats.avg_deal_score}`}
                gradient={['#5E5CE6', '#BF5AF2']}
                testID="stat-avg-score"
              />
              <StatCard
                icon="trophy"
                label={t('bestDeal')}
                value={`${stats.best_deal_score}`}
                gradient={['#30D158', '#34C759']}
                testID="stat-best-deal"
              />
              <StatCard
                icon="pricetags"
                label={t('topCategory')}
                value={stats.top_category || '—'}
                gradient={['#FF9F0A', '#FFCC00']}
                testID="stat-top-category"
                textSize={16}
              />
            </View>
          ) : (
            <View style={styles.emptyStats}>
              <Ionicons name="stats-chart-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyStatsText}>{t('noStatsYet')}</Text>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>
          
          {/* Language Selection */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="language" size={24} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>{t('language')}</Text>
            </View>
            
            <View style={styles.languageButtons}>
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'en' && styles.languageButtonActive,
                ]}
                onPress={() => handleLanguageChange('en')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    currentLanguage === 'en' && styles.languageButtonTextActive,
                  ]}
                >
                  {t('english')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.languageButton,
                  currentLanguage === 'ar' && styles.languageButtonActive,
                ]}
                onPress={() => handleLanguageChange('ar')}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    currentLanguage === 'ar' && styles.languageButtonTextActive,
                  ]}
                >
                  {t('arabic')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.danger} />
          <Text style={styles.logoutText}>{t('logout')}</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>DealLens AI v1.0.0</Text>
          <Text style={styles.appInfoText}>Powered by OpenAI GPT-4o</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({
  icon,
  label,
  value,
  gradient,
  testID,
  textSize = 22,
}: {
  icon: any;
  label: string;
  value: string;
  gradient: [string, string];
  testID?: string;
  textSize?: number;
}) => (
  <View style={styles.statCard} testID={testID}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.statIconWrap}
    >
      <Ionicons name={icon} size={18} color="#FFFFFF" />
    </LinearGradient>
    <Text style={[styles.statValue, { fontSize: textSize }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  userCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: theme.spacing.md,
  },
  userName: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  languageButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  languageButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  languageButtonTextActive: {
    color: theme.colors.white,
    fontWeight: theme.fontWeight.semibold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  logoutText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.danger,
  },
  appInfo: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  appInfoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  emptyStats: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyStatsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
