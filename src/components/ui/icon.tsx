import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { colors } from '@/constants/theme';

type SymbolName = Extract<SymbolViewProps['name'], object>;

/**
 * Semantic icon names, so screens never deal with per-platform symbol names.
 * iOS uses SF Symbols; Android and web use Material Symbols.
 */
const ICONS = {
  alarm: { ios: 'alarm.fill', android: 'alarm', web: 'alarm' },
  bell: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  bellOff: { ios: 'bell.slash.fill', android: 'notifications_off', web: 'notifications_off' },
  battery: { ios: 'battery.100', android: 'battery_full', web: 'battery_full' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  cancel: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  clock: { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  hourglass: { ios: 'hourglass', android: 'hourglass_top', web: 'hourglass_top' },
  key: { ios: 'key.fill', android: 'key', web: 'key' },
  leave: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  message: { ios: 'text.bubble.fill', android: 'chat', web: 'chat' },
  moon: { ios: 'moon.zzz.fill', android: 'bedtime', web: 'bedtime' },
  people: { ios: 'person.2.fill', android: 'group', web: 'group' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  play: { ios: 'play.circle.fill', android: 'play_circle', web: 'play_circle' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  sunrise: { ios: 'sunrise.fill', android: 'wb_twilight', web: 'wb_twilight' },
  volume: { ios: 'speaker.wave.3.fill', android: 'volume_up', web: 'volume_up' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

/** Decorative icon; pair it with text or an accessibility label on the parent. */
export function Icon({ name, size = 20, color = colors.text }: IconProps) {
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
