import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { PressableScale } from '@/components/ui/pressable-scale';
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
    <Card style={[styles.row, state.needsCall && styles.rowNeedsCall]}>
      <View>
        <Avatar name={name} />
        {state.isDone ? (
          <View style={styles.doneDot}>
            <Icon name="check" size={14} color={colors.success} />
          </View>
        ) : null}
      </View>
      <View style={styles.rowText}>
        <AppText variant="heading" numberOfLines={1}>
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
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Team status: ${awake} of ${total} awake`}
      accessibilityHint="Shows who is awake and who isn't"
      onPress={() => router.push({ pathname: '/wakeups/[id]', params: { id: wakeupId } })}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <IconCircle name="people" size={40} color={colors.success} backgroundColor={colors.successSoft} />
          <View style={styles.cardTitle}>
            <AppText variant="heading">Team status</AppText>
            <AppText variant="caption" tone="muted">
              {rank ? `You were #${rank} to wake up` : 'Tap to see who is still asleep'}
            </AppText>
          </View>
          <Icon name="chevronRight" size={16} color={colors.textSubtle} />
        </View>
        <ProgressBar value={awake} total={total} />
        <AppText variant="label">
          <AppText variant="label" tone="success">
            {awake}
          </AppText>
          <AppText variant="label" tone="muted">
            {' '}
            of {total} awake
          </AppText>
        </AppText>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowNeedsCall: {
    borderColor: 'rgba(255, 178, 36, 0.35)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  doneDot: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderRadius: 10,
    padding: 1,
    backgroundColor: colors.surface,
  },
  card: {
    gap: spacing.md,
    padding: spacing.xl,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
});
