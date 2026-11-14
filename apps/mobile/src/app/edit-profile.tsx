import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "@/api";
import { useUpdateProfile } from "@/api/hooks";
import { draftFromUser, ProfileForm, validateProfile } from "@/features/profile/ProfileForm";
import { useSession } from "@/store/session";
import { colors, spacing } from "@/theme/tokens";
import { Button, Header, Text, toast } from "@/ui";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useSession((s) => s.user)!;
  const [draft, setDraft] = useState(() => draftFromUser(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useUpdateProfile();

  async function submit() {
    const v = validateProfile(draft);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    try {
      await save.mutateAsync(v.value);
      toast.success("Profile updated");
      router.back();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title="Edit profile" />
      <View style={styles.email}>
        <Text variant="caption" color={colors.muted}>
          WORK EMAIL (VERIFIED)
        </Text>
        <Text variant="bodyMedium">{user.email}</Text>
      </View>
      <ProfileForm value={draft} onChange={setDraft} errors={errors} />
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Button title="Save changes" onPress={submit} loading={save.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  email: { marginHorizontal: spacing.xxl, marginBottom: spacing.lg, padding: spacing.md, borderRadius: 12, backgroundColor: colors.canvas, gap: 2 },
  footer: { paddingHorizontal: spacing.xxl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
