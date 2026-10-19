import { Alert, Linking, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';

type CallButtonProps = {
  name: string;
  phone: string;
  /** `filled` draws attention to someone who needs a call right now. */
  variant?: 'outline' | 'filled';
};

export function CallButton({ name, phone, variant = 'outline' }: CallButtonProps) {
  const call = () =>
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert("Couldn't start a call", `Call ${name} on ${phone}.`),
    );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Call ${name}`}
      onPress={() => void call()}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed]}>
      <AppText variant="label" tone={variant === 'filled' ? 'onAccent' : 'accent'}>
        Call
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  outline: {},
  filled: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
