import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';

type Option<T extends string> = {
  value: T;
  label: string;
  /** Text color of the selected segment. Defaults to the accent color. */
  activeColor?: string;
};

type SegmentedControlProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.selected]}>
            <AppText
              variant="label"
              tone={selected ? 'default' : 'muted'}
              style={selected ? { color: option.activeColor ?? colors.accent } : null}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET - spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  selected: {
    backgroundColor: colors.surfaceRaised,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.35)',
  },
});
