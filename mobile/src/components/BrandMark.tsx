import { Image, StyleSheet, Text, View } from 'react-native';

import {
  brandMarkSizes,
  getBrandAsset,
  hasBrandAsset,
  markAssetKey,
  type BrandMarkSize,
} from '../theme/brandAssets';
import { theme } from '../theme/theme';

type BrandMarkProps = {
  variant?: 'light' | 'dark';
  size?: BrandMarkSize;
  accessibilityLabel?: string;
};

/**
 * Mark / glyph. PNG si `ready`; si no, placeholder nativo provisional
 * (no es el ícono final de producto).
 */
export function BrandMark({
  variant = 'light',
  size = 'md',
  accessibilityLabel = 'Out Of Context',
}: BrandMarkProps) {
  const key = markAssetKey(variant);
  const edge = brandMarkSizes[size];

  if (hasBrandAsset(key)) {
    const asset = getBrandAsset(key);
    return (
      <Image
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        source={asset.source as number}
        resizeMode="contain"
        style={{ width: edge, height: edge }}
      />
    );
  }

  const backgroundColor =
    variant === 'dark' ? theme.brand.navyDark : theme.colors.primary;
  const letterColor =
    variant === 'dark' ? theme.brand.cream : theme.colors.onPrimary;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.box,
        {
          width: edge,
          height: edge,
          borderRadius: edge * 0.22,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            color: letterColor,
            fontSize: edge * 0.48,
            lineHeight: edge * 0.55,
          },
        ]}
      >
        O
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontFamily: theme.fontFamilies.displayBold,
    fontWeight: '700',
    textAlign: 'center',
  },
});
