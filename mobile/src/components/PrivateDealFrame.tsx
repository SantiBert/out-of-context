import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../theme/theme';

type PrivateDealFrameProps = {
  children: ReactNode;
};

/** Contenedor navy del reparto privado (OOC-020.8). */
export function PrivateDealFrame({ children }: PrivateDealFrameProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.decorMint} pointerEvents="none" />
      <View style={styles.decorYellow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.brand.navyDark,
  },
  decorMint: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.brand.mint,
    opacity: 0.12,
    top: -50,
    right: -40,
  },
  decorYellow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.brand.yellow,
    opacity: 0.1,
    bottom: 60,
    left: -50,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: theme.spacing.lg,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
});
