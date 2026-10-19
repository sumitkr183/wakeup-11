import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Appear } from '@/components/ui/appear';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, spacing } from '@/constants/theme';
import { useScheduleWakeup } from '@/features/wakeups/api';
import { useNow } from '@/hooks/use-now';
import { getErrorMessage } from '@/lib/errors';
import { addDays, formatCountdown, formatDay, formatDayAndTime, formatTime, startOfDay } from '@/lib/format';

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

  const submit = () => schedule.mutate({ ringAt, message: message.trim() }, { onSuccess: () => router.back() });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          <View style={styles.summary}>
            <Icon name={isTooSoon ? 'warning' : 'alarm'} size={14} color={isTooSoon ? colors.danger : colors.textMuted} />
            <AppText variant="caption" tone={isTooSoon ? 'danger' : 'muted'} style={styles.summaryText}>
              {isTooSoon
                ? 'That time has passed. Pick a later time.'
                : `Rings ${formatDayAndTime(ringAt, now)} · ${formatCountdown(ringAt, now)}`}
            </AppText>
          </View>
          <Button
            title="Set alarm for the team"
            icon="alarm"
            loading={schedule.isPending}
            disabled={isTooSoon}
            onPress={submit}
          />
        </>
      }>
      <Appear index={0}>
        <Section title="Day">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.days}
            // Let the chips run edge to edge while the first one lines up with the content.
            style={styles.daysScroller}>
            {days.map((day, offset) => (
              <DayChip
                key={day.toISOString()}
                day={day}
                now={now}
                selected={offset === dayOffset}
                onPress={() => setDayOffset(offset)}
              />
            ))}
          </ScrollView>
        </Section>
      </Appear>

      <Appear index={1}>
        <Section title="Time">
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
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Time, ${formatTime(time)}`}
              accessibilityHint="Opens the time picker"
              onPress={openAndroidTimePicker}>
              <Card highlighted style={styles.androidTime}>
                <AppText variant="display">{formatTime(time)}</AppText>
                <View style={styles.changeHint}>
                  <Icon name="clock" size={14} color={colors.accent} />
                  <AppText variant="label" tone="accent">
                    Tap to change
                  </AppText>
                </View>
              </Card>
            </PressableScale>
          )}
        </Section>
      </Appear>

      <Appear index={2}>
        <TextField
          label="Message on the alarm screen"
          icon="message"
          value={message}
          onChangeText={setMessage}
          placeholder="e.g. Ground at 6:30. Bring your kit."
          maxLength={MESSAGE_MAX_LENGTH}
          hint={`${message.length}/${MESSAGE_MAX_LENGTH}`}
          error={schedule.error ? getErrorMessage(schedule.error) : null}
        />
      </Appear>
    </Screen>
  );
}

type DayChipProps = {
  day: Date;
  now: Date;
  selected: boolean;
  onPress: () => void;
};

function DayChip({ day, now, selected, onPress }: DayChipProps) {
  const isToday = day.getTime() === startOfDay(now).getTime();
  const weekday = isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'short' });

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={formatDay(day, now)}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.dayChip, selected && styles.dayChipSelected]}>
      <AppText variant="caption" tone={selected ? 'onAccent' : 'muted'} style={styles.weekday}>
        {weekday}
      </AppText>
      <AppText variant="title" tone={selected ? 'onAccent' : 'default'}>
        {day.getDate()}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  daysScroller: {
    marginHorizontal: -spacing.xl,
  },
  days: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  dayChip: {
    width: 64,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dayChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  weekday: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  iosPicker: {
    alignItems: 'center',
    padding: 0,
  },
  androidTime: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  changeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  summaryText: {
    flexShrink: 1,
  },
});
