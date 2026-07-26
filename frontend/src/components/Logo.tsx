import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'default' | 'compact';
}

export default function Logo({ size = 96, showText = true, variant = 'default' }: LogoProps) {
  const badgeSize = size;
  const iconSize = size * 0.5;
  const sparkleSize = size * 0.28;
  const sparkleOffset = size * 0.06;
  const borderRadius = size * 0.28;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.logoBadgeWrapper,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius,
            shadowRadius: size * 0.3,
          },
        ]}
      >
        <LinearGradient
          colors={['#0A84FF', '#5E5CE6', '#BF5AF2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.logoBadge,
            { width: badgeSize, height: badgeSize, borderRadius },
          ]}
        >
          {/* Inner glow ring */}
          <View
            style={[
              styles.innerRing,
              {
                width: badgeSize * 0.72,
                height: badgeSize * 0.72,
                borderRadius: (badgeSize * 0.72) / 2,
                borderWidth: size * 0.02,
              },
            ]}
          />
          {/* Scanner + Price tag icon */}
          <Ionicons
            name="scan-outline"
            size={iconSize}
            color="#FFFFFF"
            style={{ zIndex: 2 }}
          />
          {/* AI sparkle badge */}
          <View
            style={[
              styles.sparkleBadge,
              {
                width: sparkleSize,
                height: sparkleSize,
                borderRadius: sparkleSize / 2,
                top: sparkleOffset,
                right: sparkleOffset,
              },
            ]}
          >
            <Ionicons name="sparkles" size={sparkleSize * 0.6} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </View>

      {showText && variant === 'default' && (
        <View style={styles.textContainer}>
          <Text style={styles.appName}>
            DealLens
            <Text style={styles.appNameAccent}> AI</Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoBadgeWrapper: {
    shadowColor: '#5E5CE6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    elevation: 12,
  },
  logoBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  innerRing: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  sparkleBadge: {
    position: 'absolute',
    backgroundColor: '#FFCC00',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFCC00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  textContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  appNameAccent: {
    color: '#5E5CE6',
    fontWeight: '800',
  },
});
