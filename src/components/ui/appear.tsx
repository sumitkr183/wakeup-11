import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const STAGGER_MS = 60;
const DURATION_MS = 420;

type AppearProps = {
  children: ReactNode;
  /** Position in a staggered group; each step adds a short delay. */
  index?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fades and slides its children in on mount. Respects the system
 * reduce-motion setting (Reanimated's default for layout animations).
 */
export function Appear({ children, index = 0, style }: AppearProps) {
  return (
    <Animated.View entering={FadeInDown.duration(DURATION_MS).delay(index * STAGGER_MS)} style={style}>
      {children}
    </Animated.View>
  );
}
