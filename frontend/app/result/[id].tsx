import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/theme';
import { trackEvent } from '@/src/utils/analytics';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ProductInfo {
  name?: string;
  brand?: string;
  price?: number;
  currency?: string;
  specifications?: string[];
  category?: string;
}

interface Alternative {
  name: string;
  brand?: string;
  estimated_price?: number;
  currency?: string;
  reason: string;
}

interface Analysis {
  deal_score: number;
  positive_aspects: string[];
  warnings: string[];
  issues: string[];
  recommendations: string;
  summary: string;
  alternatives?: Alternative[];
}

interface ScanResult {
  scan_id: string;
  product_info: ProductInfo;
  analysis: Analysis;
  image_base64: string;
  created_at: string;
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { token } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadScanResult();
  }, [id]);

  const loadScanResult = async () => {
    if (!token || !id) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/scan/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        trackEvent('result_viewed', { scan_id: data.scan_id }, token);
      }
    } catch (error) {
      console.error('Failed to load scan result:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return theme.colors.success;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.danger;
  };

  const getScoreGradient = (score: number) => {
    if (score >= 75) return ['#34C759', '#30D158'];
    if (score >= 50) return ['#FF9500', '#FFCC00'];
    return ['#FF3B30', '#FF6961'];
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.errorText}>{t('error')}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('analysis')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <Image
          source={{ uri: `data:image/jpeg;base64,${result.image_base64}` }}
          style={styles.productImage}
          resizeMode="cover"
        />

        {/* Deal Score */}
        <View style={styles.scoreSection}>
          <LinearGradient
            colors={getScoreGradient(result.analysis.deal_score)}
            style={styles.scoreCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.scoreLabel}>{t('dealScore')}</Text>
            <Text style={styles.scoreValue}>{result.analysis.deal_score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </LinearGradient>
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('productInfo')}</Text>
          <View style={styles.card}>
            {result.product_info.name && (
              <InfoRow label={t('productInfo')} value={result.product_info.name} />
            )}
            {result.product_info.brand && (
              <InfoRow label={t('brand')} value={result.product_info.brand} />
            )}
            {result.product_info.price && (
              <InfoRow 
                label={t('price')} 
                value={`${result.product_info.currency} ${result.product_info.price}`} 
                highlight
              />
            )}
            {result.product_info.category && (
              <InfoRow label={t('category')} value={result.product_info.category} />
            )}
          </View>
        </View>

        {/* Specifications */}
        {result.product_info.specifications && result.product_info.specifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('specifications')}</Text>
            <View style={styles.card}>
              {result.product_info.specifications.map((spec, index) => (
                <View key={index} style={styles.specItem}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.specText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Positive Aspects */}
        {result.analysis.positive_aspects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('positiveAspects')}</Text>
            <View style={styles.card}>
              {result.analysis.positive_aspects.map((aspect, index) => (
                <AspectItem key={index} text={aspect} icon="checkmark-circle" color={theme.colors.success} />
              ))}
            </View>
          </View>
        )}

        {/* Warnings */}
        {result.analysis.warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('warnings')}</Text>
            <View style={styles.card}>
              {result.analysis.warnings.map((warning, index) => (
                <AspectItem key={index} text={warning} icon="warning" color={theme.colors.warning} />
              ))}
            </View>
          </View>
        )}

        {/* Issues */}
        {result.analysis.issues.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('issues')}</Text>
            <View style={styles.card}>
              {result.analysis.issues.map((issue, index) => (
                <AspectItem key={index} text={issue} icon="close-circle" color={theme.colors.danger} />
              ))}
            </View>
          </View>
        )}

        {/* Recommendations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recommendations')}</Text>
          <View style={styles.card}>
            <Text style={styles.recommendationText}>{result.analysis.recommendations}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('summary')}</Text>
          <View style={styles.card}>
            <Text style={styles.summaryText}>{result.analysis.summary}</Text>
          </View>
        </View>

        {/* Alternatives */}
        {result.analysis.alternatives && result.analysis.alternatives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.altHeader}>
              <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>{t('alternatives')}</Text>
            </View>
            <View style={styles.altList}>
              {result.analysis.alternatives.map((alt, index) => (
                <AlternativeCard key={index} alt={alt} />
              ))}
            </View>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <Text style={styles.actionButtonText}>{t('scanAnother')}</Text>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
  </View>
);

const AspectItem = ({ text, icon, color }: { text: string; icon: any; color: string }) => (
  <View style={styles.aspectItem}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={styles.aspectText}>{text}</Text>
  </View>
);

const AlternativeCard = ({ alt }: { alt: Alternative }) => (
  <View style={styles.altCard} testID={`alt-card-${alt.name}`}>
    <View style={styles.altIconWrap}>
      <Ionicons name="pricetag" size={18} color={theme.colors.primary} />
    </View>
    <View style={styles.altBody}>
      <View style={styles.altTopRow}>
        <Text style={styles.altName} numberOfLines={1}>{alt.name}</Text>
        {alt.estimated_price != null && (
          <Text style={styles.altPrice}>
            {alt.currency || ''} {alt.estimated_price}
          </Text>
        )}
      </View>
      {alt.brand && <Text style={styles.altBrand}>{alt.brand}</Text>}
      <Text style={styles.altReason}>{alt.reason}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
  },
  backButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 300,
  },
  scoreSection: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  scoreCard: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scoreLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.white,
    fontWeight: theme.fontWeight.medium,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
    marginTop: theme.spacing.xs,
  },
  scoreMax: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.white,
    fontWeight: theme.fontWeight.medium,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  infoValueHighlight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.lg,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  specText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
  },
  aspectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  aspectText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 22,
  },
  recommendationText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  summaryText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 24,
  },
  actionButton: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.white,
  },
  altHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  altList: {
    gap: 10,
  },
  altCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  altIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  altBody: {
    flex: 1,
  },
  altTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  altName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
  },
  altPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  altBrand: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  altReason: {
    fontSize: 13,
    color: '#C7C7CC',
    marginTop: 6,
    lineHeight: 18,
  },
});
