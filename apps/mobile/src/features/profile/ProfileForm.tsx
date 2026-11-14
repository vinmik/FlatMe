import { COMPANIES, UpdateProfileSchema, type UpdateProfile, type User } from "@flatme/shared";
import * as ImagePicker from "expo-image-picker";
import { Briefcase, Building2, Camera, Phone, User as UserIcon } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { api, errorMessage } from "@/api";
import { colors, spacing } from "@/theme/tokens";
import { Avatar, Chip, Input, PressableScale, Text, toast } from "@/ui";

export interface ProfileDraft {
  fullName: string;
  company: string;
  designation: string;
  phone: string;
  avatarUrl: string | null;
}

export function draftFromUser(user: User, suggestedCompany?: string): ProfileDraft {
  return {
    fullName: user.fullName,
    company: user.company || suggestedCompany || "",
    designation: user.designation,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
}

/** Validates with the shared schema; returns field errors keyed by field name. */
export function validateProfile(d: ProfileDraft): { ok: true; value: UpdateProfile } | { ok: false; errors: Record<string, string> } {
  const r = UpdateProfileSchema.safeParse(d);
  if (r.success) return { ok: true, value: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
  return { ok: false, errors };
}

interface ProfileFormProps {
  value: ProfileDraft;
  onChange: (d: ProfileDraft) => void;
  errors: Record<string, string>;
  footer?: React.ReactNode;
}

export function ProfileForm({ value, onChange, errors, footer }: ProfileFormProps) {
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof ProfileDraft, v: string | null) => onChange({ ...value, [k]: v });
  const suggestions = useMemo(() => {
    const q = value.company.trim().toLowerCase();
    if (COMPANIES.some((c) => c.toLowerCase() === q)) return [];
    return COMPANIES.filter((c) => c !== "Other" && (!q || c.toLowerCase().startsWith(q))).slice(0, 8);
  }, [value.company]);

  async function pickAvatar() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    setUploading(true);
    try {
      const url = await api.uploadPhoto(asset.uri, asset.mimeType === "image/png" ? "image/png" : "image/jpeg", "avatar");
      set("avatarUrl", url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.delay(60)} style={styles.avatarRow}>
        <PressableScale onPress={pickAvatar} accessibilityLabel="Add profile photo" style={{ opacity: uploading ? 0.6 : 1 }}>
          <Avatar name={value.fullName || "?"} uri={value.avatarUrl} size={84} />
          <View style={styles.cameraBadge}>
            <Camera size={14} color={colors.white} />
          </View>
        </PressableScale>
        <Text variant="small" color={colors.muted}>
          {uploading ? "Uploading…" : "Add a photo (optional) — profiles with photos get 3× more replies"}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120)}>
        <Input
          label="Full name"
          value={value.fullName}
          onChangeText={(t) => set("fullName", t)}
          placeholder="e.g. Rahul Sharma"
          autoCapitalize="words"
          textContentType="name"
          error={errors.fullName}
          left={<UserIcon size={18} color={colors.muted} />}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180)} layout={LinearTransition} style={{ gap: spacing.sm }}>
        <Input
          label="Company"
          value={value.company}
          onChangeText={(t) => set("company", t)}
          placeholder="Where do you work?"
          autoCapitalize="words"
          error={errors.company}
          left={<Building2 size={18} color={colors.muted} />}
        />
        {suggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} keyboardShouldPersistTaps="handled">
            {suggestions.map((c) => (
              <Chip key={c} size="sm" label={c} onPress={() => set("company", c)} />
            ))}
          </ScrollView>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240)} layout={LinearTransition}>
        <Input
          label="Designation"
          value={value.designation}
          onChangeText={(t) => set("designation", t)}
          placeholder="e.g. Software Engineer"
          autoCapitalize="words"
          textContentType="jobTitle"
          error={errors.designation}
          left={<Briefcase size={18} color={colors.muted} />}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300)} layout={LinearTransition}>
        <Input
          label="Mobile number"
          value={value.phone}
          onChangeText={(t) => set("phone", t)}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          maxLength={14}
          error={errors.phone}
          hint="Shared only with people you contact or who contact you."
          left={
            <View style={styles.prefix}>
              <Phone size={18} color={colors.muted} />
              <Text variant="bodyMedium" color={colors.muted}>
                +91
              </Text>
            </View>
          }
        />
      </Animated.View>
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.xl },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  prefix: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
});
