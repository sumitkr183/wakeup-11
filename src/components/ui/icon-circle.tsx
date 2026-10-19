import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

import { Icon, type IconName } from './icon';

type IconCircleProps = {
  name: IconName;
  size?: number;
  color?: string;
  backgroundColor?: string;
};

/** An icon on a soft tinted disc, for list rows, tips and empty states. */
export function IconCircle({
  name,
  size = 40,
  color = colors.accent,
  backgroundColor = colors.accentSoft,
}: IconCircleProps) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Icon name={name} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
