import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const INSTALLATION_ID_KEY = 'wakeup.installation-id';

/** A random ID per app install, kept in local storage. */
function getInstallationId(): string {
  const existing = localStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;
  const created = randomUUID();
  localStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Saves this phone's Expo push token so the server can send backup rings.
 * Call after notification permission is granted. Returns false if skipped.
 */
export async function registerDeviceForPush(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return false;

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] No EAS projectId in app config. Run `npx eas-cli init` to enable push.');
    return false;
  }

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_device', {
    p_installation_id: getInstallationId(),
    p_platform: Platform.OS,
    p_push_token: pushToken,
  });
  if (error) throw error;
  return true;
}

/** Stops server pushes to this phone. Best effort: sign-out must still work offline. */
export async function unregisterDevice(): Promise<void> {
  const { error } = await supabase.rpc('unregister_device', {
    p_installation_id: getInstallationId(),
  });
  if (error) console.warn('[push] Could not unregister device', error.message);
}
