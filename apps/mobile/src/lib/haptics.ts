import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const enabled = Platform.OS !== "web";

/** Centralised haptics so feedback is consistent (and a no-op on web). */
export const haptics = {
  tap: () => enabled && void Haptics.selectionAsync().catch(() => {}),
  light: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  medium: () => enabled && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => enabled && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
