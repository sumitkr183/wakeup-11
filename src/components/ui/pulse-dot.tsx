import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

const pulse = {
  from: { transform: [{ scale: 1 }], opacity: 0.6 },
  to: { transform: [{ scale: 2.6 }], opacity: 0 },
};

type PulseDotProps = {
  color?: string;
  size?: number;
};

/** A dot with a soft radiating pulse, for "live" indicators. */
export function PulseDot({ color = colors.accent, size = 8 }: PulseDotProps) {
  const reduceMotion = useReducedMotion();
  const dot = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };

  return (
    <View style={{ width: size, height: size }}>
      {reduceMotion ? null : (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            dot,
            {
              animationName: pulse,
              animationDuration: '1.6s',
              animationIterationCount: 'infinite',
              animationTimingFunction: 'ease-out',
            },
          ]}
        />
      )}
      <View style={dot} />
    </View>
  );
}
