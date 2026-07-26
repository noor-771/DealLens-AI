import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface PrivacyConsentModalProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function PrivacyConsentModal({
  visible,
  onAccept,
  onDecline,
}: PrivacyConsentModalProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <View style={styles.container} testID="privacy-consent-modal">
          <View style={styles.handle} />

          {/* Icon */}
          <LinearGradient
            colors={['#0A84FF', '#5E5CE6', '#BF5AF2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
          </LinearGradient>

          <Text style={[styles.title, isRTL && styles.textRTL]}>
            {t('privacyTitle')}
          </Text>
          <Text style={[styles.subtitle, isRTL && styles.textRTL]}>
            {t('privacySubtitle')}
          </Text>

          <ScrollView
            style={styles.pointsScroll}
            contentContainerStyle={styles.pointsContainer}
            showsVerticalScrollIndicator={false}
          >
            <PrivacyPoint
              icon="lock-closed"
              iconColor="#30D158"
              text={t('privacyPoint1')}
              isRTL={isRTL}
            />
            <PrivacyPoint
              icon="sparkles"
              iconColor="#0A84FF"
              text={t('privacyPoint2')}
              isRTL={isRTL}
            />
            <PrivacyPoint
              icon="cloud-upload"
              iconColor="#BF5AF2"
              text={t('privacyPoint3')}
              isRTL={isRTL}
            />
            <PrivacyPoint
              icon="trash"
              iconColor="#FF9F0A"
              text={t('privacyPoint4')}
              isRTL={isRTL}
            />
            <PrivacyPoint
              icon="eye-off"
              iconColor="#FF3B30"
              text={t('privacyPoint5')}
              isRTL={isRTL}
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={onDecline}
              testID="privacy-decline-button"
            >
              <Text style={styles.declineText}>{t('privacyDecline')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={onAccept}
              activeOpacity={0.85}
              testID="privacy-accept-button"
            >
              <LinearGradient
                colors={['#0A84FF', '#5E5CE6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.acceptText}>{t('privacyAccept')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const PrivacyPoint = ({
  icon,
  iconColor,
  text,
  isRTL,
}: {
  icon: any;
  iconColor: string;
  text: string;
  isRTL: boolean;
}) => (
  <View style={[styles.pointRow, isRTL && styles.pointRowRTL]}>
    <View
      style={[
        styles.pointIcon,
        { backgroundColor: `${iconColor}22`, borderColor: `${iconColor}44` },
      ]}
    >
      <Ionicons name={icon} size={16} color={iconColor} />
    </View>
    <Text style={[styles.pointText, isRTL && styles.pointTextRTL]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#48484A',
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  textRTL: {
    // texts still center; RTL handled via language font
  },
  pointsScroll: {
    maxHeight: 260,
    marginBottom: 20,
  },
  pointsContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  pointRowRTL: {
    flexDirection: 'row-reverse',
  },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    color: '#E5E5EA',
    lineHeight: 19,
  },
  pointTextRTL: {
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E5EA',
  },
  acceptBtn: {
    flex: 1.6,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  acceptText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
