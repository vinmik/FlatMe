import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/api/hooks";
import { AnimatedSplash } from "@/features/splash/AnimatedSplash";
import { useLocation } from "@/store/preferences";
import { useJourney, useSession } from "@/store/session";
import { colors } from "@/theme/tokens";
import { ToastHost } from "@/ui";

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const journey = useJourney();
  const [splashDone, setSplashDone] = useState(false);
  const ready = (fontsLoaded || !!fontError) && journey !== "loading";

  useEffect(() => {
    void useSession.getState().hydrate();
    void useLocation.getState().refresh();
  }, []);

  useEffect(() => {
    // Hand over from the native splash as soon as we can draw our animated one.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  const onSplashDone = useCallback(() => setSplashDone(true), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={splashDone ? "dark" : "light"} />
          {journey !== "loading" && (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white }, animation: "slide_from_right" }}>
              <Stack.Screen name="index" options={{ animation: "none" }} />
              <Stack.Protected guard={journey === "auth"}>
                <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
              </Stack.Protected>
              <Stack.Protected guard={journey === "onboarding"}>
                <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
              </Stack.Protected>
              <Stack.Protected guard={journey === "app"}>
                <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
                <Stack.Screen name="listing/[id]" />
                <Stack.Screen name="listing/new" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
                <Stack.Screen name="listing/edit/[id]" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
                <Stack.Screen name="listings" />
                <Stack.Screen name="my-listings" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="edit-profile" />
              </Stack.Protected>
            </Stack>
          )}
          <ToastHost />
          {!splashDone && <AnimatedSplash ready={ready} onDone={onSplashDone} />}
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
