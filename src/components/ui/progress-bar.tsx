import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type ProgressBarProps = {
  value: number;
  total: number;
  color?: string;
};

export function ProgressBar({ value, total, color = colors.success }: ProgressBarProps) {
  const fraction = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
