import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Vibration } from 'react-native';

const alarmSource = require('@/assets/sounds/alarm.wav');
const VIBRATION_PATTERN = [0, 800, 600];

/**
 * Loops the alarm sound and vibrates while `active`. Plays even with the
 * iPhone ringer switch on silent, because the app is in the foreground.
 */
export function useAlarmSound(active: boolean): void {
  const player = useAudioPlayer(alarmSource);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: false,
    }).then(() => {
      if (cancelled) return;
      player.loop = true;
      player.volume = 1;
      player.play();
    });
    Vibration.vibrate(VIBRATION_PATTERN, true);

    return () => {
      cancelled = true;
      player.pause();
      Vibration.cancel();
    };
  }, [active, player]);
}
