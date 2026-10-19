import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

import { AppText } from './app-text';

// Muted hues that read well on the dark surfaces, with light initials on top.
const AVATAR_COLORS = ['#3B4A7A', '#5B3F72', '#2F5E62', '#6A4A2E', '#2E5A43', '#6B3A48', '#3D5A80'] as const;

type AvatarProps = {
  name: string;
  size?: number;
};

/** Initials on a color picked from the name, so each teammate keeps the same color. */
export function Avatar({ name, size = 40 }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: pickColor(name) },
      ]}>
      <AppText variant="label" style={{ fontSize: Math.round(size * 0.38) }}>
        {getInitials(name)}
      </AppText>
    </View>
  );
}

type AvatarStackProps = {
  names: readonly string[];
  /** How many avatars to draw before collapsing the rest into "+N". */
  max?: number;
  size?: number;
};

/** Overlapping avatars, e.g. for a team summary. */
export function AvatarStack({ names, max = 5, size = 36 }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  const ring = { borderWidth: 2, borderColor: colors.surface, borderRadius: (size + 4) / 2 };
  const overlap = { marginLeft: -size * 0.3 };

  return (
    <View style={styles.stack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {shown.map((name, index) => (
        <View key={`${name}-${index}`} style={[ring, index > 0 && overlap]}>
          <Avatar name={name} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            ring,
            overlap,
            styles.avatar,
            { width: size + 4, height: size + 4, backgroundColor: colors.surfaceRaised },
          ]}>
          <AppText variant="caption" tone="muted" style={styles.extra}>
            +{extra}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extra: {
    fontWeight: '700',
  },
});
