import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ErrorView, LoadingView } from '@/components/ui/status-view';
import { colors, radius, spacing } from '@/constants/theme';
import { useAlarmPermission } from '@/features/alarm/use-alarm-permission';
import type { Profile } from '@/features/auth/session-provider';
import { useTeam, useTeamMembers, type TeamMember } from '@/features/team/api';
import { MemberList } from '@/features/team/member-list';
import { useMarkAwake, usePendingWakeups, useTeamWakeups, type PendingWakeup } from '@/features/wakeups/api';
import { TeamStatusCard } from '@/features/wakeups/team-status';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { formatCountdown, formatDay, formatTime, getGreeting } from '@/lib/format';

import { AlarmPermissionBanner, HomeHeader, LeaveTeamButton, TestAlarmButton } from './shared';

export function MemberHome({ profile }: { profile: Profile }) {
  const team = useTeam(profile.team_id);
  const wakeups = usePendingWakeups();
  const teamWakeups = useTeamWakeups();
  const members = useTeamMembers(profile.team_id);
  const now = useNow();

  if (wakeups.isPending) return <LoadingView />;
  if (wakeups.isError) return <ErrorView error={wakeups.error} onRetry={() => void wakeups.refetch()} />;

  const [next, ...later] = wakeups.data;
  // The most recent wake-up that has started, so teammates can see who is up.
  const started = teamWakeups.data?.filter((wakeup) => new Date(wakeup.ring_at) <= now).at(-1);

  return (
    <Screen
      onRefresh={() => {
        void wakeups.refetch();
        void teamWakeups.refetch();
        void members.refetch();
      }}
      refreshing={wakeups.isRefetching || teamWakeups.isRefetching || members.isRefetching}
      footer={<TestAlarmButton />}>
      <Appear index={0}>
        <HomeHeader overline={getGreeting(now)} title={profile.display_name} avatarName={profile.display_name} />
      </Appear>
      <AlarmPermissionBanner />

      <Appear index={1}>
        {next ? <NextWakeupCard wakeup={next} now={now} /> : <NoWakeupsCard />}
      </Appear>

      {started ? (
        <Appear index={2}>
          <TeamStatusCard wakeupId={started.id} userId={profile.id} />
        </Appear>
      ) : null}

      {later.length > 0 ? (
        <Appear index={3}>
          <Section title="Coming up" count={later.length}>
            <Card style={styles.groupedList}>
              {later.map((wakeup, index) => (
                <LaterRow key={wakeup.id} wakeup={wakeup} now={now} isFirst={index === 0} />
              ))}
            </Card>
          </Section>
        </Appear>
      ) : null}

      {members.data ? (
        <Appear index={4}>
          <TeamCard teamName={team.data?.name ?? 'Your team'} members={members.data} currentUserId={profile.id} />
        </Appear>
      ) : null}

      <Appear index={5}>
        <LeaveTeamButton />
      </Appear>
    </Screen>
  );
}

function NextWakeupCard({ wakeup, now }: { wakeup: PendingWakeup; now: Date }) {
  const { data: permission } = useAlarmPermission();
  const markAwake = useMarkAwake();
  const ringAt = new Date(wakeup.ring_at);
  const isRinging = ringAt <= now;
  const isAllowed = permission === 'granted';
  const isArmed = isAllowed && wakeup.alarm_set_at !== null;

  return (
    <Card highlighted style={styles.nextCard}>
      <View style={styles.nextHeader}>
        <View style={styles.inline}>
          <Icon name={isRinging ? 'bell' : 'sunrise'} size={16} color={colors.accent} />
          <AppText variant="overline" tone="accent">
            {isRinging ? 'Ringing now' : 'Next wake-up'}
          </AppText>
        </View>
        {isRinging ? null : <Badge label={formatCountdown(ringAt, now)} tone="accent" icon="clock" />}
      </View>

      <View>
        <AppText variant="display">{formatTime(ringAt)}</AppText>
        <AppText variant="heading" tone="muted">
          {formatDay(ringAt, now)}
        </AppText>
      </View>

      {wakeup.message ? (
        <View style={styles.message}>
          <Icon name="message" size={16} color={colors.textMuted} />
          <AppText style={styles.flex}>{wakeup.message}</AppText>
        </View>
      ) : null}

      {isRinging ? (
        <View style={styles.awake}>
          <Button
            title="I'm awake"
            icon="check"
            size="large"
            loading={markAwake.isPending}
            onPress={() => markAwake.mutate(wakeup.id)}
          />
          {markAwake.error ? <AppText tone="danger">{getErrorMessage(markAwake.error)}</AppText> : null}
        </View>
      ) : (
        <View style={styles.checklist}>
          <ChecklistItem done={isAllowed} label={isAllowed ? 'Alarms allowed' : 'Alarms not allowed yet'} />
          <ChecklistItem
            done={isArmed}
            label={
              isArmed
                ? 'Alarm set on this phone'
                : isAllowed
                  ? 'Setting the alarm on this phone…'
                  : 'Alarm not set on this phone'
            }
          />
        </View>
      )}
    </Card>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.inline}>
      <Icon name={done ? 'check' : 'hourglass'} size={18} color={done ? colors.success : colors.textSubtle} />
      <AppText variant="label" tone={done ? 'default' : 'muted'}>
        {label}
      </AppText>
    </View>
  );
}

function NoWakeupsCard() {
  return (
    <Card style={styles.emptyCard}>
      <IconCircle name="moon" size={64} color={colors.textMuted} backgroundColor={colors.surfaceRaised} />
      <View style={styles.emptyText}>
        <AppText variant="title" style={styles.center}>
          Nothing scheduled
        </AppText>
        <AppText tone="muted" style={styles.center}>
          When your admin schedules a wake-up, it shows up here and the alarm is set on this phone automatically.
        </AppText>
      </View>
    </Card>
  );
}

function LaterRow({ wakeup, now, isFirst }: { wakeup: PendingWakeup; now: Date; isFirst: boolean }) {
  const ringAt = new Date(wakeup.ring_at);

  return (
    <View style={[styles.laterRow, !isFirst && styles.divider]}>
      <View style={styles.dateTile}>
        <AppText variant="caption" tone="accent" style={styles.dateTileWeekday}>
          {ringAt.toLocaleDateString(undefined, { weekday: 'short' })}
        </AppText>
        <AppText variant="heading">{ringAt.getDate()}</AppText>
      </View>
      <View style={styles.laterText}>
        <AppText variant="heading">{formatTime(ringAt)}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {wakeup.message || formatDay(ringAt, now)}
        </AppText>
      </View>
    </View>
  );
}

type TeamCardProps = {
  teamName: string;
  members: TeamMember[];
  currentUserId: string;
};

/** The team at a glance; tap to see everyone. */
function TeamCard({ teamName, members, currentUserId }: TeamCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const count = members.length;

  return (
    <View style={styles.team}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${teamName}, ${count} ${count === 1 ? 'person' : 'people'}`}
        accessibilityHint={isExpanded ? 'Hides the team list' : 'Shows everyone on the team'}
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((value) => !value)}>
        <Card style={styles.teamCard}>
          <View style={styles.teamText}>
            <AppText variant="overline" tone="muted">
              Your team
            </AppText>
            <AppText variant="heading" numberOfLines={1}>
              {teamName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {count} {count === 1 ? 'person' : 'people'}
            </AppText>
          </View>
          <AvatarStack names={members.map((member) => member.display_name)} max={4} size={32} />
          <View style={isExpanded && styles.chevronOpen}>
            <Icon name="chevronRight" size={16} color={colors.textSubtle} />
          </View>
        </Card>
      </PressableScale>
      {isExpanded ? (
        <Appear>
          <MemberList members={members} currentUserId={currentUserId} showCallButtons={false} />
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nextCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
  },
  nextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  message: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  awake: {
    gap: spacing.sm,
  },
  checklist: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
  },
  emptyText: {
    gap: spacing.sm,
  },
  groupedList: {
    paddingVertical: spacing.xs,
    gap: 0,
  },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dateTile: {
    width: 48,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  dateTileWeekday: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  laterText: {
    flex: 1,
    gap: spacing.xxs,
  },
  team: {
    gap: spacing.sm,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamText: {
    flex: 1,
    gap: spacing.xxs,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
});
