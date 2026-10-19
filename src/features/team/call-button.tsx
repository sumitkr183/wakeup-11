import { Alert, Linking, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { colors, MIN_TOUCH_TARGET, radius } from '@/constants/theme';

type CallButtonProps = {
  name: string;
  phone: string;
  /** `filled` draws attention to someone who needs a call right now. */
  variant?: 'outline' | 'filled';
};

export function CallButton({ name, phone, variant = 'outline' }: CallButtonProps) {
  const call = () =>
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("Couldn't start a call", `Call ${name} on ${phone}.`));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Call ${name}`}
      onPress={() => void call()}
      pressedScale={0.9}
      style={[styles.base, styles[variant]]}>
      <Icon name="phone" size={20} color={variant === 'filled' ? colors.onAccent : colors.accent} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  outline: {
    backgroundColor: colors.accentSoft,
  },
  filled: {
    backgroundColor: colors.accent,
    boxShadow: '0px 4px 14px rgba(255, 178, 36, 0.4)',
  },
});
