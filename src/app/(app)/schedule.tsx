import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, MIN_TOUCH_TARGET, radius, spacing } from '@/constants/theme';
import { useScheduleWakeup } from '@/features/wakeups/api';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { addDays, formatDay, formatDayAndTime, formatTime, startOfDay } from '@/lib/format';

const DAYS_AHEAD = 7;
const DEFAULT_HOUR = 6;
const MESSAGE_MAX_LENGTH = 140;

function defaultTime(): Date {
  const date = new Date();
  date.setHours(DEFAULT_HOUR, 0, 0, 0);
  return date;
}

function combine(day: Date, time: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());
}

export default function ScheduleScreen() {
  const now = useNow();
  const schedule = useScheduleWakeup();

  const [dayOffset, setDayOffset] = useState(1);
  const [time, setTime] = useState(defaultTime);
  const [message, setMessage] = useState('');

  const today = startOfDay(now);
  const days = Array.from({ length: DAYS_AHEAD }, (_, offset) => addDays(today, offset));
  const ringAt = combine(days[dayOffset], time);
  const isTooSoon = ringAt.getTime() < now.getTime() + 60_000;

  const openAndroidTimePicker = () =>
    DateTimePickerAndroid.open({
      value: time,
      mode: 'time',
      is24Hour: false,
      onValueChange: (_event, date) => setTime(date),
    });

  const submit = () =>
    schedule.mutate({ ringAt, message: message.trim() }, { onSuccess: () => router.back() });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          <AppText variant="caption" tone={isTooSoon ? 'danger' : 'muted'} style={styles.centerText}>
            {isTooSoon ? 'That time has passed. Pick a later time.' : `Rings ${formatDayAndTime(ringAt, now)}`}
          </AppText>
          <Button
            title="Set alarm for the team"
            loading={schedule.isPending}
            disabled={isTooSoon}
            onPress={submit}
          />
        </>
      }>
      <View style={styles.section}>
        <AppText variant="label" tone="muted">
          Day
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
          {days.map((day, offset) => {
            const selected = offset === dayOffset;
            return (
              <Pressable
                key={day.toISOString()}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setDayOffset(offset)}
                style={[styles.dayChip, selected && styles.dayChipSelected]}>
                <AppText variant="label" tone={selected ? 'onAccent' : 'default'}>
                  {formatDay(day, now)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <AppText variant="label" tone="muted">
          Time
        </AppText>
        {Platform.OS === 'ios' ? (
          <Card style={styles.iosPicker}>
            <DateTimePicker
              value={time}
              mode="time"
              display="spinner"
              themeVariant="dark"
              textColor={colors.text}
              minuteInterval={5}
              onValueChange={(_event, date) => setTime(date)}
            />
          </Card>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Opens the time picker"
            onPress={openAndroidTimePicker}>
            <Card style={styles.androidTime}>
              <AppText variant="display">{formatTime(time)}</AppText>
              <AppText variant="label" tone="accent">
                Tap to change
              </AppText>
            </Card>
          </Pressable>
        )}
      </View>

      <TextField
        label="Message on the alarm screen"
        value={message}
        onChangeText={setMessage}
        placeholder="e.g. Ground at 6:30. Bring your kit."
        maxLength={MESSAGE_MAX_LENGTH}
        hint={`${message.length}/${MESSAGE_MAX_LENGTH}`}
        error={schedule.error ? getErrorMessage(schedule.error) : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  days: {
    gap: spacing.sm,
  },
  dayChip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  iosPicker: {
    alignItems: 'center',
    padding: 0,
  },
  androidTime: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  centerText: {
    textAlign: 'center',
  },
});
