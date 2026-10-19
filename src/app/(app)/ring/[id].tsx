import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion, ZoomIn } from 'react-native-reanimated';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconCircle } from '@/components/ui/icon-circle';
import { Screen } from '@/components/ui/screen';
import { colors, gradients, radius, spacing } from '@/constants/theme';
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
    const showCancelled = isCancelled && !isTest;
    return (
      <Screen backgroundColor={colors.ringBackground} footer={<Button title="Done" onPress={closeRingScreen} />}>
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            {showCancelled ? (
              <IconCircle name="moon" size={96} color={colors.textMuted} backgroundColor={colors.surfaceRaised} />
            ) : (
              <IconCircle name="check" size={96} color={colors.success} backgroundColor={colors.successSoft} />
            )}
          </Animated.View>
          <Appear index={1} style={styles.doneText}>
            {showCancelled ? (
              <>
                <AppText variant="largeTitle" style={styles.centerText}>
                  Wake-up cancelled
                </AppText>
                <AppText tone="muted" style={styles.centerText}>
                  Your admin cancelled this wake-up. You can go back to sleep.
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="largeTitle" tone="success" style={styles.centerText}>
                  You’re up!
                </AppText>
                <AppText tone="muted" style={styles.centerText}>
                  {isTest
                    ? 'Your alarm works. Real wake-ups will look and sound like this.'
                    : `Checked in at ${formatTime(awakeAt ?? now)}. Your admin can see you're awake.`}
                </AppText>
              </>
            )}
          </Appear>
          {showCancelled || isTest ? null : (
            <Appear index={2} style={styles.teamStatus}>
              <TeamStatusCard wakeupId={id} userId={profile.id} />
            </Appear>
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
          <Button title="I'm awake" icon="sunrise" size="large" loading={markAwake.isPending} onPress={onAwake} />
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
          <AppText variant="caption" tone="subtle" style={styles.centerText}>
            {isTest
              ? 'This is only a test. Nobody is notified.'
              : "Your admin sees when you check in. If you don't, it rings again in a few minutes."}
          </AppText>
        </>
      }>
      <View style={[styles.center, styles.glow]}>
        <RingingIcon />
        <View style={styles.timeBlock}>
          <View style={styles.overline}>
            <Icon name="bell" size={14} color={colors.accent} />
            <AppText variant="overline" tone="accent">
              Team wake-up
            </AppText>
          </View>
          <AppText variant="display" accessibilityRole="header" style={styles.time}>
            {formatTime(now)}
          </AppText>
          <AppText variant="heading" tone="muted">
            {formatDay(now, now)}
          </AppText>
        </View>
        <View style={styles.messageBox}>
          <AppText variant="heading" style={styles.centerText}>
            {message}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

const RING_SIZE = 112;
const SONAR_DELAYS = ['0s', '0.8s', '1.6s'] as const;
const sonar = {
  from: { transform: [{ scale: 1 }], opacity: 0.5 },
  to: { transform: [{ scale: 2.2 }], opacity: 0 },
};

/** The alarm icon with sonar-like rings radiating out while it rings. */
function RingingIcon() {
  const reduceMotion = useReducedMotion();

  return (
    <View style={styles.ringWrap}>
      {reduceMotion
        ? null
        : SONAR_DELAYS.map((delay) => (
            <Animated.View
              key={delay}
              style={[
                styles.sonar,
                {
                  animationName: sonar,
                  animationDuration: '2.4s',
                  animationDelay: delay,
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'ease-out',
                },
              ]}
            />
          ))}
      <View style={styles.ringIcon}>
        <Icon name="alarm" size={52} color={colors.onAccent} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  glow: {
    experimental_backgroundImage: gradients.ringGlow,
  },
  centerText: {
    textAlign: 'center',
  },
  doneText: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamStatus: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
  timeBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  overline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    fontSize: 84,
  },
  messageBox: {
    alignSelf: 'stretch',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  sonar: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  ringIcon: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RING_SIZE / 2,
    backgroundColor: colors.accent,
    experimental_backgroundImage: gradients.sunrise,
    boxShadow: '0px 0px 40px rgba(255, 138, 61, 0.55)',
  },
});
