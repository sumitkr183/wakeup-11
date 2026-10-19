import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';

type SectionProps = {
  title: string;
  /** Shown as a small counter next to the title. */
  count?: number;
  children: ReactNode;
};

export function Section({ title, count, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <AppText variant="overline" tone="muted" accessibilityRole="header">
          {title}
        </AppText>
        {count !== undefined ? (
          <View style={styles.count}>
            <AppText variant="caption" tone="muted" style={styles.countText}>
              {count}
            </AppText>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  count: {
    minWidth: 22,
    paddingHorizontal: spacing.sm - spacing.xxs,
    paddingVertical: spacing.xxs,
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  countText: {
    fontWeight: '700',
  },
});
