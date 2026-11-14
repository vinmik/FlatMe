import { InquiryInputSchema, type ListingDetail } from "@flatme/shared";
import { CheckCircle2, Mail, MessageCircle, Phone, Send, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { errorMessage } from "@/api";
import { useSendInquiry } from "@/api/hooks";
import { haptics } from "@/lib/haptics";
import { useSession } from "@/store/session";
import { colors, radius, spacing } from "@/theme/tokens";
import { Avatar, Button, Input, PressableScale, Sheet, Text, VerifiedBadge } from "@/ui";

function defaultMessage(l: ListingDetail, me: string) {
  return `Hi ${l.owner.firstName}, I'm ${me} and I'm interested in your ${l.roomType} in ${l.area}. Is it still available? Could we schedule a visit?`;
}

/** Contact options (call / WhatsApp / email) plus an in-app message with a success state. */
export function ContactSheet({ listing, visible, onClose }: { listing: ListingDetail; visible: boolean; onClose: () => void }) {
  const me = useSession((s) => s.user);
  const send = useSendInquiry(listing.id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSent(false);
      setError(null);
      setMessage(defaultMessage(listing, me?.fullName.split(" ")[0] ?? "a FlatMe user"));
    }
  }

  const phone = listing.contact.phone?.replace(/\D/g, "");
  const subject = encodeURIComponent(`FlatMe: ${listing.roomType} in ${listing.area}`);
  const options: { icon: LucideIcon; label: string; color: string; bg: string; url: string }[] = [
    ...(phone
      ? [
          { icon: Phone, label: "Call", color: colors.primary, bg: colors.accent, url: `tel:+91${phone}` },
          { icon: MessageCircle, label: "WhatsApp", color: "#16a34a", bg: "#dcfce7", url: `https://wa.me/91${phone}?text=${encodeURIComponent(message)}` },
        ]
      : []),
    { icon: Mail, label: "Email", color: "#7c3aed", bg: "#ede9fe", url: `mailto:${listing.contact.email}?subject=${subject}&body=${encodeURIComponent(message)}` },
  ];

  async function submit() {
    const v = InquiryInputSchema.safeParse({ message });
    if (!v.success) return setError(v.error.issues[0]?.message ?? "Invalid message");
    try {
      await send.mutateAsync(v.data.message);
      haptics.success();
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (sent) {
    return (
      <Sheet visible={visible} onClose={onClose} footer={<Button title="Done" onPress={onClose} />}>
        <View style={styles.success}>
          <Animated.View entering={ZoomIn.springify().damping(10)} style={styles.successIcon}>
            <CheckCircle2 size={44} color={colors.success} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120)} style={{ gap: spacing.xs }}>
            <Text variant="h2" align="center">
              Message sent!
            </Text>
            <Text variant="body" color={colors.muted} align="center">
              {listing.owner.firstName} will get your message and your verified profile. Most owners reply within a few hours.
            </Text>
          </Animated.View>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Contact ${listing.owner.firstName}`}
      footer={<Button title="Send message" icon={Send} onPress={submit} loading={send.isPending} testID="send-inquiry" />}
    >
      <View style={{ gap: spacing.xl }}>
        <View style={styles.ownerRow}>
          <Avatar name={listing.contact.name} uri={listing.owner.avatarUrl} size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3">{listing.contact.name}</Text>
            <Text variant="small" color={colors.muted}>
              {listing.owner.designation} · {listing.contact.company}
            </Text>
          </View>
          {listing.owner.verified && <VerifiedBadge />}
        </View>

        <View style={styles.options}>
          {options.map((o, i) => (
            <Animated.View key={o.label} entering={FadeInDown.delay(i * 60)} style={{ flex: 1 }}>
              <PressableScale onPress={() => void Linking.openURL(o.url)} style={styles.option} accessibilityRole="button" accessibilityLabel={o.label}>
                <View style={[styles.optionIcon, { backgroundColor: o.bg }]}>
                  <o.icon size={22} color={o.color} />
                </View>
                <Text variant="smallMedium">{o.label}</Text>
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text variant="caption" color={colors.subtle}>
            OR SEND A MESSAGE
          </Text>
          <View style={styles.line} />
        </View>

        <Input value={message} onChangeText={(t) => (setMessage(t), error && setError(null))} multiline maxLength={1000} error={error} placeholder="Introduce yourself…" />
        {!phone && (
          <Animated.View entering={FadeIn}>
            <Text variant="caption" color={colors.muted}>
              The owner prefers not to share their phone number.
            </Text>
          </Animated.View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  ownerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  options: { flexDirection: "row", gap: spacing.md },
  option: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  optionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  success: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" },
});
