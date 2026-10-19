import { ActivityIndicator, StyleSheet } from 'react-native';

import { colors, gradients, MIN_TOUCH_TARGET, radius, shadows, spacing } from '@/constants/theme';

import { AppText } from './app-text';
import { Icon, type IconName } from './icon';
import { PressableScale, type PressableScaleProps } from './pressable-scale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'regular' | 'large';

export type ButtonProps = Omit<PressableScaleProps, 'children' | 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
};

const FOREGROUND: Record<Variant, string> = {
  primary: colors.onAccent,
  secondary: colors.text,
  ghost: colors.accent,
  danger: colors.danger,
};

export function Button({
  title,
  variant = 'primary',
  size = 'regular',
  icon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const foreground = FOREGROUND[variant];

  return (
    // `rest` goes first so the button always owns its style. `<Link asChild>`
    // injects `style={{}}` into its child, which would otherwise wipe the
    // background and leave dark text on a dark screen.
    <PressableScale
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={[
        styles.base,
        size === 'large' && styles.large,
        styles[variant],
        variant === 'primary' && !isDisabled && shadows.glow,
        isDisabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'large' ? 24 : 18} color={foreground} /> : null}
          <AppText variant="heading" style={[{ color: foreground }, size === 'large' && styles.largeText]}>
            {title}
          </AppText>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 76,
    borderRadius: radius.pill,
  },
  largeText: {
    fontSize: 21,
  },
  primary: {
    backgroundColor: colors.accent,
    experimental_backgroundImage: gradients.sunrise,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
  },
  ghost: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  disabled: {
    opacity: 0.45,
  },
});
