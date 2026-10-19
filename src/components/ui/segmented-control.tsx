import { Pressable, StyleSheet, View } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';

type Option<T extends string> = {
  value: T;
  label: string;
  /** Background of the selected segment. Defaults to the accent color. */
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
            style={[
              styles.segment,
              selected && styles.selected,
              selected && option.activeColor ? { backgroundColor: option.activeColor } : null,
            ]}>
            <AppText variant="label" tone={selected ? 'onAccent' : 'muted'}>
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
    backgroundColor: colors.accent,
  },
});
