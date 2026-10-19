import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';

import { AppText } from './app-text';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'regular' | 'large';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textTone = variant === 'primary' ? 'onAccent' : variant === 'secondary' ? 'default' : 'accent';

  return (
    // `rest` goes first so the button always owns its style. `<Link asChild>`
    // injects `style={{}}` into its child, which would otherwise wipe the
    // background and leave dark text on a dark screen.
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : colors.text} />
      ) : (
        <AppText variant="heading" tone={textTone} style={size === 'large' && styles.largeText}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 72,
    borderRadius: radius.pill,
  },
  largeText: {
    fontSize: 20,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ghost: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
