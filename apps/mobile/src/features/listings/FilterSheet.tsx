import {
  AREA_NAMES,
  BUDGET,
  countActiveFilters,
  DEFAULT_FILTERS,
  formatRupees,
  furnishingLabel,
  FURNISHING,
  type ListingFilters,
} from "@flatme/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme/tokens";
import { Button, Chip, Sheet, Text } from "@/ui";
import { RangeSlider } from "@/ui/RangeSlider";

const GENDER = [
  { value: "any", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;
const MOVE_IN = [
  { value: "any", label: "Anytime" },
  { value: "immediate", label: "Immediate" },
  { value: "within-week", label: "Within a week" },
  { value: "within-month", label: "Within a month" },
] as const;

interface FilterSheetProps {
  visible: boolean;
  value: ListingFilters;
  onClose: () => void;
  onApply: (f: ListingFilters) => void;
}

/** Edits a draft copy; nothing changes until "Show results" so the feed doesn't thrash mid-edit. */
export function FilterSheet({ visible, value, onClose, onApply }: FilterSheetProps) {
  const [draft, setDraft] = useState(value);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(value);
  }

  const set = <K extends keyof ListingFilters>(k: K, v: ListingFilters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleArea = (a: (typeof AREA_NAMES)[number]) =>
    set("areas", draft.areas.includes(a) ? draft.areas.filter((x) => x !== a) : [...draft.areas, a]);
  const active = countActiveFilters(draft);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      footer={
        <View style={styles.footer}>
          <Button title="Reset" variant="outline" onPress={() => setDraft(DEFAULT_FILTERS)} style={{ flex: 1 }} disabled={active === 0} />
          <Button title={active ? `Show results (${active})` : "Show results"} onPress={() => onApply(draft)} style={{ flex: 2 }} />
        </View>
      }
    >
      <Section title="Budget" trailing={`${formatRupees(draft.budgetMin)} – ${formatRupees(draft.budgetMax)}${draft.budgetMax >= BUDGET.max ? "+" : ""}`}>
        <RangeSlider
          min={BUDGET.min}
          max={BUDGET.max}
          step={BUDGET.step}
          low={draft.budgetMin}
          high={draft.budgetMax}
          onChange={(budgetMin, budgetMax) => setDraft((d) => ({ ...d, budgetMin, budgetMax }))}
        />
      </Section>

      <Section title="Flatmate preference">
        <View style={styles.wrap}>
          {GENDER.map((g) => (
            <Chip key={g.value} label={g.label} selected={draft.gender === g.value} onPress={() => set("gender", g.value)} />
          ))}
        </View>
      </Section>

      <Section title="Furnishing">
        <View style={styles.wrap}>
          <Chip label="Any" selected={draft.furnishing === "any"} onPress={() => set("furnishing", "any")} />
          {FURNISHING.map((f) => (
            <Chip key={f} label={furnishingLabel(f)} selected={draft.furnishing === f} onPress={() => set("furnishing", f)} />
          ))}
        </View>
      </Section>

      <Section title="Move-in">
        <View style={styles.wrap}>
          {MOVE_IN.map((m) => (
            <Chip key={m.value} label={m.label} selected={draft.moveIn === m.value} onPress={() => set("moveIn", m.value)} />
          ))}
        </View>
      </Section>

      <Section title="Areas" trailing={draft.areas.length ? `${draft.areas.length} selected` : "All of Hyderabad"}>
        <View style={styles.wrap}>
          {AREA_NAMES.map((a) => (
            <Chip key={a} size="sm" label={a} selected={draft.areas.includes(a)} onPress={() => toggleArea(a)} />
          ))}
        </View>
      </Section>
    </Sheet>
  );
}

function Section({ title, trailing, children }: { title: string; trailing?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.sectionHead}>
        <Text variant="h3">{title}</Text>
        {trailing && (
          <Text variant="smallMedium" color={colors.primary}>
            {trailing}
          </Text>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: "row", gap: spacing.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
