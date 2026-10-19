import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

import { AppText } from './app-text';

type ProgressRingProps = {
  value: number;
  total: number;
  accessibilityLabel: string;
  /** Small text under the value, e.g. "of 12". */
  caption?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

/**
 * A donut chart built from Views, so it needs no native SVG module.
 *
 * A circle whose border is colored on two adjacent sides draws a 180° arc.
 * Each half of the ring is clipped to its own box, and an arc rotates into
 * that box to reveal progress: the right half covers 0–180°, the left half
 * 180–360°.
 */
export function ProgressRing({
  value,
  total,
  accessibilityLabel,
  caption,
  size = 112,
  strokeWidth = 12,
  color = colors.success,
}: ProgressRingProps) {
  const fraction = total > 0 ? Math.min(Math.max(value / total, 0), 1) : 0;
  const degrees = fraction * 360;
  const half = size / 2;
  const circle = { width: size, height: size, borderRadius: half, borderWidth: strokeWidth };
  const halfBox = [styles.halfBox, { width: half, height: size }];

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      <View style={[circle, styles.track]} />

      <View style={[halfBox, { left: half }]}>
        {/* Bottom + left border = 180–360° after the 45° offset; rotating it fills 0–180°. */}
        <View
          style={[
            circle,
            styles.arc,
            {
              left: -half,
              borderBottomColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${45 + Math.min(degrees, 180)}deg` }],
            },
          ]}
        />
      </View>

      <View style={[halfBox, { left: 0 }]}>
        {/* Top + right border = 0–180° after the 45° offset; rotating it fills 180–360°. */}
        <View
          style={[
            circle,
            styles.arc,
            {
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${45 + Math.max(degrees - 180, 0)}deg` }],
            },
          ]}
        />
      </View>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText variant="title">{value}</AppText>
        {caption ? (
          <AppText variant="caption" tone="muted">
            {caption}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderColor: colors.surfaceRaised,
  },
  halfBox: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderColor: 'transparent',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
