import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/contexts/AppContext";
import { StripeProviderWrapper } from "@/components/StripeProviderWrapper";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// ── Notification deep-link handler ────────────────────────────────────────────
// Lives inside Stack so useRouter() is available.
// Handles three cases:
//   1. Cold start  — app was closed; user tapped notification to open it
//   2. Background  — app was backgrounded; user tapped notification
//   3. (Foreground notifications just display the alert; no navigation needed)
function NotificationDeepLink() {
  const router = useRouter();
  const handled = useRef<string | null>(null);

  function navigate(data: Record<string, unknown>) {
    const path = data?.router as string | undefined;
    if (!path || handled.current === path) return;
    handled.current = path;
    // Small delay so the navigator is fully mounted before pushing
    setTimeout(() => {
      try {
        router.push(path as any);
      } catch {
        // Fallback to tabs root if path is invalid
        router.replace("/(tabs)" as any);
      }
    }, 300);
  }

  // Case 1: Cold start — check for a notification that launched the app
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response?.notification?.request?.content?.data) {
          navigate(response.notification.request.content.data as Record<string, unknown>);
        }
      }).catch(() => {});
    } catch {
      // Android Expo Go: push notifications removed in SDK 53
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Case 2: Background — app already running, user taps notification
  useEffect(() => {
    if (Platform.OS === "web") return;
    try {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data ?? {};
        navigate(data as Record<string, unknown>);
      });
      return () => sub.remove();
    } catch {
      // Android Expo Go: push notifications removed in SDK 53
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NotificationDeepLink />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="practitioner/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="new-message" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="meditation" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false }} />
        <Stack.Screen name="gratitude" options={{ headerShown: false }} />
        <Stack.Screen name="vision-board" options={{ headerShown: false }} />
        <Stack.Screen name="practitioner-waivers" options={{ headerShown: false }} />
        <Stack.Screen name="saved-waivers" options={{ headerShown: false }} />
        <Stack.Screen name="verification" options={{ headerShown: false }} />
        <Stack.Screen name="group-chat/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <StripeProviderWrapper>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </StripeProviderWrapper>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
