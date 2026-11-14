import { companyFromEmail } from "@flatme/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "@/api";
import { useUpdateProfile } from "@/api/hooks";
import { draftFromUser, ProfileForm, validateProfile } from "@/features/profile/ProfileForm";
import { StepProgress } from "@/features/profile/StepProgress";
import { useSession } from "@/store/session";
import { colors, spacing } from "@/theme/tokens";
import { Button, Text, toast } from "@/ui";

export default function OnboardingProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user)!;
  const signOut = useSession((s) => s.signOut);
  const [draft, setDraft] = useState(() => draftFromUser(user, companyFromEmail(user.email)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useUpdateProfile();

  // Returning users with a complete profile land here only for the location step.
  const alreadyComplete = user.profileComplete;

  async function submit() {
    if (alreadyComplete) return router.replace("/onboarding/location");
    const v = validateProfile(draft);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    try {
      await save.mutateAsync(v.value);
      router.replace("/onboarding/location");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.head, { paddingTop: insets.top + spacing.lg }]}>
        <StepProgress step={1} total={2} />
        <Animated.View entering={FadeInDown}>
          <Text variant="h1">{alreadyComplete ? `Welcome back, ${user.fullName.split(" ")[0]}` : "Tell us about you"}</Text>
          <Text variant="body" color={colors.muted} style={{ marginTop: spacing.xs }}>
            Flatmates see your name, company and role — it&apos;s what makes FlatMe trusted.
          </Text>
        </Animated.View>
      </View>
      <ProfileForm value={draft} onChange={setDraft} errors={errors} />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button title="Continue" onPress={submit} loading={save.isPending} testID="profile-continue" />
        <Button title="Use a different email" variant="ghost" size="md" onPress={() => void signOut()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: spacing.xxl, gap: spacing.xl, paddingBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, gap: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
