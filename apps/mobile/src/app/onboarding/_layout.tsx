import { Stack } from "expo-router";
import { colors } from "@/theme/tokens";

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white }, animation: "slide_from_right", gestureEnabled: false }} />;
}
