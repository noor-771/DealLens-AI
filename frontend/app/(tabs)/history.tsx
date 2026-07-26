import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/contexts/AuthContext';
import { theme } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { trackEvent } from '@/src/utils/analytics';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ScanHistoryItem {
  scan_id: string;
  product_info: {
    name: string;
    brand?: string;
    price?: number;
    currency?: string;
  };
  deal_score: number;
  image_base64: string;
  created_at: string;
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const router = useRouter();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
    if (token) trackEvent('history_viewed', {}, token);
  }, []);

  const loadHistory = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/scans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return theme.colors.success;
    if (score >= 50) return theme.colors.warning;
    return theme.colors.danger;
  };

  const renderItem = ({ item }: { item: ScanHistoryItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/result/${item.scan_id}`)}
    >
      <Image
        source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.product_info.name || 'Product'}
        </Text>
        {item.product_info.brand && (
          <Text style={styles.brand}>{item.product_info.brand}</Text>
        )}
        {item.product_info.price && (
          <Text style={styles.price}>
            {item.product_info.currency} {item.product_info.price}
          </Text>
        )}
        <View style={styles.scoreContainer}>
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: getScoreColor(item.deal_score) },
            ]}
          >
            <Text style={styles.scoreText}>{item.deal_score}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('history')}</Text>
      </View>

      {scans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>{t('noHistory')}</Text>
          <Text style={styles.emptyText}>{t('startScanning')}</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          renderItem={renderItem}
          keyExtractor={(item) => item.scan_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

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
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  cardContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  brand: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  price: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.primary,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  scoreBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  scoreText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  date: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
