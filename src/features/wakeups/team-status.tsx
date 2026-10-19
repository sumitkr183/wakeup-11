import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { colors, spacing } from '@/constants/theme';
import { CallButton } from '@/features/team/call-button';

import { useWakeupStatus } from './api';
import { getWakeRank, type MemberState } from './member-state';

type MemberStatusRowProps = {
  name: string;
  state: MemberState;
  /** Pass only for the admin, who phones people who are still asleep. */
  phone?: string | null;
};

export function MemberStatusRow({ name, state, phone }: MemberStatusRowProps) {
  return (
    <Card style={styles.row}>
      <Avatar name={name} />
      <View style={styles.rowText}>
        <AppText variant="label" numberOfLines={1} style={styles.rowName}>
          {name}
        </AppText>
        <AppText variant="caption" tone={state.tone}>
          {state.detail}
        </AppText>
      </View>
      {state.needsCall && phone ? <CallButton name={name} phone={phone} variant="filled" /> : null}
    </Card>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AppText variant="label">{getInitials(name)}</AppText>
    </View>
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0];
  return letters.toUpperCase();
}

/**
 * "21 of 28 awake" for one wake-up, kept live. Opens the live status screen.
 * With `userId`, adds "You were #7 to wake up" once that person checks in.
 */
export function TeamStatusCard({ wakeupId, userId }: { wakeupId: string; userId?: string }) {
  const status = useWakeupStatus(wakeupId);
  // A summary card: stay out of the way while loading or on error.
  if (!status.data) return null;

  const total = status.data.length;
  const awake = status.data.filter((member) => member.awake_at !== null).length;
  const rank = userId ? getWakeRank(status.data, userId) : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Team status: ${awake} of ${total} awake`}
      accessibilityHint="Shows who is awake and who isn't"
      onPress={() => router.push({ pathname: '/wakeups/[id]', params: { id: wakeupId } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <AppText variant="heading">Team status</AppText>
          <AppText>
            <AppText variant="label" tone="success">
              {awake}
            </AppText>
            <AppText tone="muted"> of {total} awake</AppText>
          </AppText>
        </View>
        <ProgressBar value={awake} total={total} />
        <AppText variant="caption" tone="muted">
          {rank ? `You were #${rank} to wake up. Tap to see the team.` : 'Tap to see who is still asleep.'}
        </AppText>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
});
