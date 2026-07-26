import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function DemoAnalysisCard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const productName = isRTL ? 'آيفون 15 برو' : 'iPhone 15 Pro';
  const dealScoreLabel = isRTL ? 'تقييم الصفقة' : 'Deal Score';
  const goodPrice = isRTL ? 'سعر جيد' : 'Good price';
  const alternatives = isRTL ? 'بدائل أفضل متوفرة' : 'Better alternatives available';
  const warranty = isRTL ? 'الضمان: موثق' : 'Warranty: Verified';
  const demoLabel = isRTL ? 'مثال حي' : 'Live Example';

  return (
    <View style={styles.container}>
      <View style={styles.demoBadge}>
        <View style={styles.demoDot} />
        <Text style={styles.demoText}>{demoLabel}</Text>
      </View>

      <View style={styles.card}>
        <LinearGradient
          colors={['rgba(94, 92, 230, 0.08)', 'rgba(10, 132, 255, 0.04)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header: Product name + Score */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          <View style={styles.productInfo}>
            <View style={styles.productIcon}>
              <Ionicons name="phone-portrait" size={20} color="#0A84FF" />
            </View>
            <View>
              <Text style={styles.productName}>{productName}</Text>
              <Text style={styles.productSubtext}>
                {isRTL ? 'هاتف ذكي' : 'Smartphone'}
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={['#30D158', '#34C759']}
            style={styles.scoreBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.scoreValue}>86</Text>
            <Text style={styles.scoreDivider}>/100</Text>
          </LinearGradient>
        </View>

        <View style={styles.divider} />

        {/* Analysis points */}
        <View style={styles.analysisList}>
          <AnalysisRow
            icon="checkmark-circle"
            color="#30D158"
            text={goodPrice}
            isRTL={isRTL}
          />
          <AnalysisRow
            icon="alert-circle"
            color="#FF9F0A"
            text={alternatives}
            isRTL={isRTL}
          />
          <AnalysisRow
            icon="shield-checkmark"
            color="#0A84FF"
            text={warranty}
            isRTL={isRTL}
          />
        </View>
      </View>
    </View>
  );
}

const AnalysisRow = ({
  icon,
  color,
  text,
  isRTL,
}: {
  icon: any;
  color: string;
  text: string;
  isRTL: boolean;
}) => (
  <View style={[styles.row, isRTL && styles.rowRTL]}>
    <Ionicons name={icon} size={18} color={color} />
    <Text style={[styles.rowText, isRTL && styles.rowTextRTL]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    marginBottom: 10,
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#30D158',
  },
  demoText: {
    fontSize: 11,
    color: '#30D158',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scoreDivider: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  analysisList: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  rowText: {
    fontSize: 13,
    color: '#E5E5EA',
    flex: 1,
  },
  rowTextRTL: {
    textAlign: 'right',
  },
});
