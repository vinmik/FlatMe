import type { NotificationPrefs, UpdatePrefs } from "@flatme/shared";
import Constants from "expo-constants";
import { Bell, ChevronRight, FileText, HelpCircle, Phone, Shield, Trash2, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { errorMessage } from "@/api";
import { useDeleteAccount, useUpdatePrefs } from "@/api/hooks";
import { config } from "@/lib/config";
import { useSession } from "@/store/session";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { Button, Header, Input, PressableScale, Sheet, Text, toast } from "@/ui";

const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "newListings", label: "New listings", hint: "Flats matching your filters" },
  { key: "messages", label: "Messages", hint: "When someone contacts you" },
  { key: "priceDrops", label: "Price drops", hint: "On flats you've saved" },
];

export default function SettingsScreen() {
  const user = useSession((s) => s.user);
  const prefs = useUpdatePrefs();
  const [deleteOpen, setDeleteOpen] = useState(false);
  if (!user) return null;

  function update(p: UpdatePrefs) {
    prefs.mutate(p, { onError: (e) => toast.error(errorMessage(e)) });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Group title="Notifications" icon={Bell} delay={0}>
          {NOTIFICATION_ROWS.map((r, i) => (
            <ToggleRow key={r.key} label={r.label} hint={r.hint} value={user.notifications[r.key]} onChange={(v) => update({ notifications: { [r.key]: v } })} border={i > 0} />
          ))}
        </Group>

        <Group title="Privacy" icon={Shield} delay={80}>
          <ToggleRow
            label="Show my phone number"
            hint="Lets people call or WhatsApp you from your listings"
            value={user.privacy.showPhone}
            onChange={(v) => update({ privacy: { showPhone: v } })}
          />
        </Group>

        <Group title="Support" icon={HelpCircle} delay={160}>
          <LinkRow icon={HelpCircle} label="Help centre & FAQs" onPress={() => void Linking.openURL("https://flatme.app/help")} />
          <LinkRow icon={Phone} label="Contact support" onPress={() => void Linking.openURL(`mailto:${config.supportEmail}`)} border />
          <LinkRow icon={FileText} label="Terms & privacy policy" onPress={() => void Linking.openURL("https://flatme.app/legal")} border />
        </Group>

        <Animated.View entering={FadeInDown.delay(240)}>
          <PressableScale onPress={() => setDeleteOpen(true)} style={[styles.card, styles.row, shadow.sm]} accessibilityRole="button">
            <Trash2 size={18} color={colors.danger} />
            <Text variant="bodyMedium" color={colors.danger} style={{ flex: 1 }}>
              Delete account
            </Text>
          </PressableScale>
        </Animated.View>

        <Text variant="caption" color={colors.subtle} align="center">
          FlatMe v{Constants.expoConfig?.version ?? "1.0.0"} · {config.useMockApi ? "Demo data" : "Live"}
        </Text>
      </ScrollView>
      <DeleteAccountSheet visible={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </View>
  );
}

function Group({ title, icon: Icon, delay, children }: { title: string; icon: LucideIcon; delay: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, paddingHorizontal: spacing.xs }}>
        <Icon size={14} color={colors.muted} />
        <Text variant="caption" color={colors.muted}>
          {title.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.card, shadow.sm]}>{children}</View>
    </Animated.View>
  );
}

function ToggleRow({ label, hint, value, onChange, border }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void; border?: boolean }) {
  return (
    <View style={[styles.row, border && styles.border]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="small" color={colors.muted}>
          {hint}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor={colors.white} accessibilityLabel={label} />
    </View>
  );
}

function LinkRow({ icon: Icon, label, onPress, border }: { icon: LucideIcon; label: string; onPress: () => void; border?: boolean }) {
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={[styles.row, border && styles.border]} accessibilityRole="link">
      <Icon size={18} color={colors.primary} />
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {label}
      </Text>
      <ChevronRight size={18} color={colors.subtle} />
    </PressableScale>
  );
}

/** Typed confirmation keeps a destructive, irreversible action from being a single mis-tap. */
function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const del = useDeleteAccount();
  const [confirm, setConfirm] = useState("");
  const ok = confirm.trim().toUpperCase() === "DELETE";

  function go() {
    const run = () => del.mutate(undefined, { onError: (e) => toast.error(errorMessage(e)) });
    if (Platform.OS === "web") return run();
    Alert.alert("Delete permanently?", "Your profile, listings and saved flats will be erased.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Delete account"
      footer={<Button title="Delete my account" variant="danger" onPress={go} disabled={!ok} loading={del.isPending} />}
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="body" color={colors.muted}>
          This permanently removes your profile, all your listings and saved flats. This can&apos;t be undone.
        </Text>
        <Input label='Type "DELETE" to confirm' value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md + 2 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
