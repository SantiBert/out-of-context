import { Image, StyleSheet, Text, View } from 'react-native';

import {
  brandLogoSizes,
  getBrandAsset,
  hasBrandAsset,
  logoAssetKey,
  type BrandLogoSize,
} from '../theme/brandAssets';
import { theme } from '../theme/theme';

type BrandLogoProps = {
  variant?: 'light' | 'dark';
  size?: BrandLogoSize;
  accessibilityLabel?: string;
};

/**
 * Logo de marca. Usa PNG si está en el manifiesto (`ready`);
 * si no, wordmark tipográfico Baloo (puente OOC-020.3).
 */
export function BrandLogo({
  variant = 'light',
  size = 'md',
  accessibilityLabel = 'Out Of Context',
}: BrandLogoProps) {
  const key = logoAssetKey(variant);
  const dims = brandLogoSizes[size];

  if (hasBrandAsset(key)) {
    const asset = getBrandAsset(key);
    return (
      <Image
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        source={asset.source as number}
        resizeMode="contain"
        style={{ width: dims.width, height: dims.width * 0.34 }}
      />
    );
  }

  const titleColor = variant === 'dark' ? theme.brand.cream : theme.colors.text;
  const accentColor = theme.colors.primary;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.wrap, { width: dims.width }]}
    >
      <Text
        style={[
          styles.line,
          {
            color: titleColor,
            fontSize: dims.fontSize,
            lineHeight: dims.lineHeight,
          },
        ]}
      >
        OUT OF
      </Text>
      <Text
        style={[
          styles.line,
          styles.context,
          {
            color: accentColor,
            fontSize: dims.fontSize,
            lineHeight: dims.lineHeight,
          },
        ]}
      >
        CONTEXT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  line: {
    fontFamily: theme.fontFamilies.displayBold,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  context: {
    letterSpacing: 1,
  },
});
