import { REPORT_REASON_LABELS, REPORT_REASONS, type ReportInput } from "@flatme/shared";
import { Check } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { ApiError, errorMessage } from "@/api";
import { useReportListing } from "@/api/hooks";
import { colors, radius, spacing } from "@/theme/tokens";
import { Button, Input, PressableScale, Sheet, Text, toast } from "@/ui";

type Reason = ReportInput["reason"];

export function ReportSheet({ listingId, visible, onClose }: { listingId: string; visible: boolean; onClose: () => void }) {
  const report = useReportListing(listingId);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setReason(null);
      setDetails("");
    }
  }

  async function submit() {
    if (!reason) return;
    try {
      await report.mutateAsync({ reason, details });
      toast.success("Thanks — our team will review this listing");
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        toast.success("You've already reported this listing");
        onClose();
      } else toast.error(errorMessage(e));
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Report listing"
      footer={<Button title="Submit report" variant="danger" onPress={submit} disabled={!reason} loading={report.isPending} />}
    >
      <View style={{ gap: spacing.sm }}>
        <Text variant="body" color={colors.muted} style={{ marginBottom: spacing.sm }}>
          Reports are anonymous. Tell us what&apos;s wrong:
        </Text>
        {REPORT_REASONS.map((r) => {
          const on = reason === r;
          return (
            <PressableScale key={r} scaleTo={0.98} onPress={() => setReason(r)} style={[styles.row, on && styles.rowOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Text variant="bodyMedium" style={{ flex: 1 }}>
                {REPORT_REASON_LABELS[r]}
              </Text>
              <View style={[styles.radio, on && styles.radioOn]}>
                {on && (
                  <Animated.View entering={ZoomIn.springify()}>
                    <Check size={14} color={colors.white} strokeWidth={3} />
                  </Animated.View>
                )}
              </View>
            </PressableScale>
          );
        })}
        <Input value={details} onChangeText={setDetails} multiline maxLength={1000} placeholder="Anything else we should know? (optional)" containerStyle={{ marginTop: spacing.sm }} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  rowOn: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: colors.danger, backgroundColor: colors.danger },
});
