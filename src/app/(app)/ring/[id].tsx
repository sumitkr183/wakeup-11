import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { colors, radius, spacing } from '@/constants/theme';
import { DEFAULT_ALARM_BODY, TEST_WAKEUP_ID } from '@/features/alarm/constants';
import { silenceWakeup } from '@/features/alarm/scheduler';
import { useAlarmSound } from '@/features/alarm/use-alarm-sound';
import { useProfile } from '@/features/auth/session-provider';
import { useMarkAwake, useWakeup } from '@/features/wakeups/api';
import { TeamStatusCard } from '@/features/wakeups/team-status';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { formatDay, formatTime } from '@/lib/format';

function closeRingScreen() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function RingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isTest = id === TEST_WAKEUP_ID;
  const profile = useProfile();

  const wakeup = useWakeup(id, { enabled: !isTest });
  const markAwake = useMarkAwake();
  const [testDone, setTestDone] = useState(false);
  const now = useNow(1_000);

  const isCancelled = Boolean(wakeup.data?.cancelled_at) || (wakeup.isSuccess && wakeup.data === null);
  const awakeAt = markAwake.data ?? null;
  const isDone = isTest ? testDone : awakeAt !== null || isCancelled;

  useAlarmSound(!isDone);

  // Block the Android back button while ringing: the way out is "I'm awake".
  useEffect(() => {
    if (isDone) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isDone]);

  useEffect(() => {
    if (isCancelled) void silenceWakeup(id);
  }, [id, isCancelled]);

  const onAwake = () => {
    if (isTest) {
      setTestDone(true);
      void silenceWakeup(TEST_WAKEUP_ID);
      return;
    }
    markAwake.mutate(id);
  };

  const message = isTest ? 'Test alarm' : wakeup.data?.message || DEFAULT_ALARM_BODY;

  if (isDone) {
    return (
      <Screen
        backgroundColor={colors.ringBackground}
        footer={<Button title="Done" onPress={closeRingScreen} />}>
        <View style={styles.center}>
          {isCancelled && !isTest ? (
            <>
              <AppText variant="title">Wake-up cancelled</AppText>
              <AppText tone="muted" style={styles.centerText}>
                Your admin cancelled this wake-up. You can go back to sleep.
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="title" tone="success">
                You’re up!
              </AppText>
              <AppText tone="muted" style={styles.centerText}>
                {isTest
                  ? "Your alarm works. Real wake-ups will look and sound like this."
                  : `Checked in at ${formatTime(awakeAt ?? now)}. Your admin can see you're awake.`}
              </AppText>
              {isTest ? null : (
                <View style={styles.teamStatus}>
                  <TeamStatusCard wakeupId={id} userId={profile.id} />
                </View>
              )}
            </>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor={colors.ringBackground}
      footer={
        <>
          {markAwake.error ? (
            <AppText tone="danger" style={styles.centerText}>
              {getErrorMessage(markAwake.error)}
            </AppText>
          ) : null}
          <Button title="I'm awake" size="large" loading={markAwake.isPending} onPress={onAwake} />
          {markAwake.isError ? (
            // Offline escape hatch: stop the noise even if the check-in can't reach the server.
            <Button
              title="Stop alarm without checking in"
              variant="ghost"
              onPress={() => {
                void silenceWakeup(id);
                closeRingScreen();
              }}
            />
          ) : null}
          <AppText variant="caption" tone="muted" style={styles.centerText}>
            {isTest
              ? 'This is only a test. Nobody is notified.'
              : "Your admin sees when you check in. If you don't, it rings again in a few minutes."}
          </AppText>
        </>
      }>
      <View style={styles.center}>
        <AppText variant="overline" tone="accent">
          Team wake-up
        </AppText>
        <AppText variant="display" accessibilityRole="header">
          {formatTime(now)}
        </AppText>
        <AppText tone="muted">{formatDay(now, now)}</AppText>
        <View style={styles.messageBox}>
          <AppText variant="heading" style={styles.centerText}>
            {message}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  centerText: {
    textAlign: 'center',
  },
  teamStatus: {
    alignSelf: 'stretch',
    marginTop: spacing.xl,
  },
  messageBox: {
    marginTop: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
