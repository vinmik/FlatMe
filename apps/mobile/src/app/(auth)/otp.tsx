import { LIMITS } from "@flatme/shared";
import { useLocalSearchParams } from "expo-router";
import { MailOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, errorMessage } from "@/api";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/store/session";
import { colors, spacing } from "@/theme/tokens";
import { Button, Header, OtpInput, PressableScale, Text, toast } from "@/ui";

export default function OtpScreen() {
  const params = useLocalSearchParams<{ email: string; resendIn?: string; devCode?: string }>();
  const email = params.email ?? "";
  const insets = useSafeAreaInsets();
  const signIn = useSession((s) => s.signIn);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devCode, setDevCode] = useState(params.devCode || "");
  const [cooldown, setCooldown] = useState(Number(params.resendIn) || LIMITS.otpResendSeconds);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    if (verifying || success) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await api.verifyOtp(email, value);
      setSuccess(true);
      haptics.success();
      // Let the success cascade play before the journey guard swaps the screen.
      setTimeout(() => void signIn(res.token, res.user), 650);
    } catch (e) {
      setError(errorMessage(e));
      haptics.error();
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    try {
      const res = await api.requestOtp(email);
      setCooldown(res.resendInSec);
      setDevCode(res.devCode ?? "");
      setError(null);
      toast.success("New code sent");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header transparent />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.icon}>
          <MailOpen size={34} color={colors.primary} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(80)} style={{ gap: spacing.sm }}>
          <Text variant="h1" align="center">
            Check your inbox
          </Text>
          <Text variant="body" color={colors.muted} align="center">
            We sent a 6-digit code to{"\n"}
            <Text variant="bodyMedium">{email}</Text>
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160)} style={{ marginTop: spacing.xl }}>
          <OtpInput
            value={code}
            error={!!error}
            success={success}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
              if (v.length === LIMITS.otpLength) void verify(v);
            }}
          />
        </Animated.View>

        <View style={{ minHeight: 22 }}>
          {error && (
            <Animated.View entering={FadeIn}>
              <Text variant="smallMedium" color={colors.danger} align="center">
                {error}
              </Text>
            </Animated.View>
          )}
          {success && (
            <Animated.View entering={FadeIn}>
              <Text variant="smallMedium" color={colors.success} align="center">
                Verified! Setting things up…
              </Text>
            </Animated.View>
          )}
        </View>

        {devCode ? (
          <PressableScale
            onPress={() => {
              setCode(devCode);
              void verify(devCode);
            }}
            style={styles.devHint}
          >
            <Text variant="small" color={colors.primaryDark} align="center">
              Dev mode — tap to use code <Text variant="smallMedium">{devCode}</Text>
            </Text>
          </PressableScale>
        ) : null}

        <View style={{ flex: 1 }} />

        <Button title={success ? "Verified" : "Verify"} onPress={() => verify(code)} loading={verifying} disabled={code.length !== LIMITS.otpLength || success} />
        <View style={styles.resendRow}>
          <Text variant="small" color={colors.muted}>
            Didn&apos;t get it?
          </Text>
          {cooldown > 0 ? (
            <Text variant="smallMedium" color={colors.subtle}>
              Resend in 0:{String(cooldown).padStart(2, "0")}
            </Text>
          ) : (
            <PressableScale onPress={resend} hitSlop={8}>
              <Text variant="smallMedium" color={colors.primary}>
                Resend code
              </Text>
            </PressableScale>
          )}
        </View>
        <Text variant="caption" color={colors.subtle} align="center">
          Tip: check spam or promotions if it&apos;s not in your inbox.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: spacing.xxl, paddingTop: spacing.xl, gap: spacing.md },
  icon: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  devHint: { alignSelf: "center", backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  resendRow: { flexDirection: "row", justifyContent: "center", gap: spacing.xs + 2, marginTop: spacing.sm },
});
