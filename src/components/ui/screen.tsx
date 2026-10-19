import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  /** Pinned below the scrolling content, e.g. the primary action. */
  footer?: ReactNode;
  /** Use `['bottom']` when the screen has a native header. */
  edges?: Edge[];
  backgroundColor?: string;
  /** Enables pull to refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({
  children,
  footer,
  edges = ['top', 'bottom'],
  backgroundColor,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const background = { backgroundColor: backgroundColor ?? colors.background };

  return (
    <SafeAreaView style={[styles.root, background]} edges={edges}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
            ) : undefined
          }>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
});
