import {
  AMENITIES,
  AREAS,
  AVAILABILITY_OPTIONS,
  dateToAvailability,
  FURNISHING,
  furnishingLabel,
  GENDER_PREFS,
  ListingInputSchema,
  ROOM_TYPES,
  type GeoPoint,
  type ListingDetail,
  type ListingInput,
} from "@flatme/shared";
import { ArrowLeft, ArrowRight, Check, IndianRupee, MapPin, Minus, Plus, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "@/api";
import { useSaveListing } from "@/api/hooks";
import { StepProgress } from "@/features/profile/StepProgress";
import { haptics } from "@/lib/haptics";
import { colors, radius, spacing } from "@/theme/tokens";
import { Button, Chip, Input, PressableScale, Text, toast } from "@/ui";
import { ListingMap, type ListingMapHandle } from "./ListingMap";
import { PhotoPicker } from "./PhotoPicker";

type Area = ListingInput["area"];
interface Draft {
  area: Area | null;
  locality: string;
  location: GeoPoint | null;
  rent: string;
  deposit: string;
  roomType: ListingInput["roomType"];
  furnishing: ListingInput["furnishing"];
  flatmates: number;
  availability: ListingInput["availability"];
  genderPreference: ListingInput["genderPreference"];
  amenities: NonNullable<ListingInput["amenities"]>;
  description: string;
  photos: string[];
}

const STEPS = [
  { title: "Where is it?", subtitle: "Pick the area and drop a pin — exact address stays private." },
  { title: "Rent & room", subtitle: "Clear pricing gets you serious enquiries." },
  { title: "Final touches", subtitle: "Photos and a short note make your listing stand out." },
] as const;

const AVAILABILITY_LABEL = { immediate: "Immediately", "within-week": "Within a week", "within-month": "Within a month", flexible: "Flexible" } as const;
const GENDER_LABEL = { any: "Anyone", male: "Male", female: "Female" } as const;

function fromListing(l?: ListingDetail): Draft {
  if (!l) {
    return {
      area: null,
      locality: "",
      location: null,
      rent: "",
      deposit: "",
      roomType: "2BHK",
      furnishing: "semi-furnished",
      flatmates: 1,
      availability: "immediate",
      genderPreference: "any",
      amenities: [],
      description: "",
      photos: [],
    };
  }
  return {
    area: l.area,
    locality: l.locality,
    location: l.location,
    rent: String(l.rent),
    deposit: String(l.deposit),
    roomType: l.roomType,
    furnishing: l.furnishing,
    flatmates: l.flatmates,
    availability: dateToAvailability(l.availableFrom, l.flexible),
    genderPreference: l.genderPreference,
    amenities: l.amenities,
    description: l.description,
    photos: l.photos,
  };
}

const digits = (s: string) => s.replace(/\D/g, "").slice(0, 7);

interface ListingFormProps {
  existing?: ListingDetail;
  onClose: () => void;
  onSaved: (l: ListingDetail) => void;
}

/** Three-step post / edit wizard. Each step validates its own fields against the shared schema before advancing. */
export function ListingForm({ existing, onClose, onSaved }: ListingFormProps) {
  const insets = useSafeAreaInsets();
  const save = useSaveListing(existing?.id);
  const [draft, setDraft] = useState<Draft>(() => fromListing(existing));
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const scroll = useRef<ScrollViewInstance>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };

  function toInput(): ListingInput {
    return {
      area: draft.area as Area,
      locality: draft.locality,
      location: draft.location ?? { lat: 0, lng: 0 },
      rent: Number(draft.rent || 0),
      deposit: Number(draft.deposit || 0),
      roomType: draft.roomType,
      furnishing: draft.furnishing,
      flatmates: draft.flatmates,
      availability: draft.availability,
      genderPreference: draft.genderPreference,
      amenities: draft.amenities,
      description: draft.description,
      photos: draft.photos,
    };
  }

  const STEP_FIELDS: string[][] = [
    ["area", "locality", "location"],
    ["rent", "deposit", "roomType", "furnishing", "flatmates"],
    ["photos", "availability", "genderPreference", "amenities", "description"],
  ];

  /** Validates every field belonging to steps 0..upTo and surfaces the first message per field. */
  function validate(upTo: number): boolean {
    const fields = STEP_FIELDS.slice(0, upTo + 1).flat();
    const errs: Record<string, string> = {};
    if (!draft.area) errs.area = "Choose an area";
    const r = ListingInputSchema.safeParse(toInput());
    if (!r.success) {
      for (const i of r.error.issues) {
        const k = String(i.path[0]);
        if (fields.includes(k)) errs[k] ??= i.message;
      }
    }
    setErrors(errs);
    const ok = Object.keys(errs).length === 0;
    if (!ok) haptics.error();
    return ok;
  }

  function next() {
    if (!validate(step)) return;
    haptics.tap();
    setDir(1);
    setStep((s) => s + 1);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }

  function back() {
    if (step === 0) return onClose();
    setDir(-1);
    setStep((s) => s - 1);
  }

  async function submit() {
    if (!validate(2)) return;
    try {
      const l = await save.mutateAsync(toInput());
      haptics.success();
      onSaved(l);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const entering = (dir === 1 ? SlideInRight : SlideInLeft).springify().damping(20).stiffness(160);
  const exiting = dir === 1 ? SlideOutLeft.duration(200) : SlideOutRight.duration(200);
  const meta = STEPS[step]!;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topRow}>
          <PressableScale onPress={back} style={styles.iconBtn} accessibilityLabel={step === 0 ? "Close" : "Back"}>
            {step === 0 ? <X size={22} color={colors.foreground} /> : <ArrowLeft size={22} color={colors.foreground} />}
          </PressableScale>
          <Text variant="h3" style={{ flex: 1 }} align="center">
            {existing ? "Edit listing" : "Post a room"}
          </Text>
          <View style={styles.iconBtn} />
        </View>
        <StepProgress step={step + 1} total={STEPS.length} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={entering} exiting={exiting} style={{ gap: spacing.xl }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{meta.title}</Text>
            <Text variant="body" color={colors.muted}>
              {meta.subtitle}
            </Text>
          </View>
          {step === 0 && <StepLocation draft={draft} set={set} errors={errors} />}
          {step === 1 && <StepDetails draft={draft} set={set} errors={errors} />}
          {step === 2 && <StepExtras draft={draft} set={set} errors={errors} />}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {step < STEPS.length - 1 ? (
          <Button title="Continue" iconRight={ArrowRight} onPress={next} testID="form-next" />
        ) : (
          <Button title={existing ? "Save changes" : "Publish listing"} icon={Check} onPress={submit} loading={save.isPending} testID="form-submit" />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

interface StepProps {
  draft: Draft;
  set: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  errors: Record<string, string>;
}

function Label({ children, error }: { children: string; error?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
      <Text variant="smallMedium">{children}</Text>
      {error && (
        <Animated.View entering={FadeIn}>
          <Text variant="caption" color={colors.danger}>
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

function StepLocation({ draft, set, errors }: StepProps) {
  const map = useRef<ListingMapHandle>(null);
  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Label error={errors.area}>Area</Label>
        <View style={styles.wrap}>
          {AREAS.map((a) => (
            <Chip
              key={a.name}
              label={a.name}
              selected={draft.area === a.name}
              onPress={() => {
                set("area", a.name);
                const p = { lat: a.lat, lng: a.lng };
                set("location", p);
                map.current?.focus(p, true);
              }}
            />
          ))}
        </View>
      </View>
      <Input
        label="Locality / landmark"
        value={draft.locality}
        onChangeText={(t) => set("locality", t)}
        placeholder="e.g. Near Inorbit Mall, Ayyappa Society"
        error={errors.locality}
        left={<MapPin size={18} color={colors.muted} />}
      />
      {draft.location && (
        <Animated.View entering={FadeIn} style={{ gap: spacing.sm }}>
          <Label>Fine-tune the pin</Label>
          <View style={styles.map}>
            <ListingMap ref={map} listings={[]} draggablePin={{ value: draft.location, onChange: (p) => set("location", p) }} style={StyleSheet.absoluteFill} />
          </View>
          <Text variant="caption" color={colors.muted}>
            Drag the pin to your building. Only an approximate location is shown publicly.
          </Text>
        </Animated.View>
      )}
    </>
  );
}

function StepDetails({ draft, set, errors }: StepProps) {
  const rent = Number(draft.rent || 0);
  return (
    <>
      <View style={styles.row2}>
        <Input
          label="Monthly rent"
          value={draft.rent}
          onChangeText={(t) => set("rent", digits(t))}
          keyboardType="number-pad"
          placeholder="15000"
          error={errors.rent}
          left={<IndianRupee size={16} color={colors.muted} />}
          containerStyle={{ flex: 1 }}
        />
        <Input
          label="Deposit"
          value={draft.deposit}
          onChangeText={(t) => set("deposit", digits(t))}
          keyboardType="number-pad"
          placeholder="30000"
          error={errors.deposit}
          left={<IndianRupee size={16} color={colors.muted} />}
          containerStyle={{ flex: 1 }}
        />
      </View>
      {rent > 0 && (
        <Animated.View entering={FadeIn} style={styles.wrap}>
          {[1, 2, 3].map((m) => (
            <Chip key={m} size="sm" label={`${m}× rent`} selected={Number(draft.deposit) === rent * m} onPress={() => set("deposit", String(rent * m))} />
          ))}
          <Chip size="sm" label="No deposit" selected={draft.deposit === "0"} onPress={() => set("deposit", "0")} />
        </Animated.View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Label>Room type</Label>
        <Segmented options={ROOM_TYPES.map((r) => ({ value: r, label: r }))} value={draft.roomType} onChange={(v) => set("roomType", v)} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Label>Furnishing</Label>
        <Segmented options={FURNISHING.map((f) => ({ value: f, label: furnishingLabel(f) }))} value={draft.furnishing} onChange={(v) => set("furnishing", v)} />
      </View>
      <View style={styles.stepperRow}>
        <View style={{ flex: 1 }}>
          <Text variant="smallMedium">Current flatmates</Text>
          <Text variant="caption" color={colors.muted}>
            People already living there
          </Text>
        </View>
        <PressableScale onPress={() => set("flatmates", Math.max(0, draft.flatmates - 1))} style={styles.stepBtn} disabled={draft.flatmates === 0} accessibilityLabel="Fewer flatmates">
          <Minus size={18} color={colors.foreground} />
        </PressableScale>
        <Animated.View key={draft.flatmates} entering={FadeIn.duration(150)}>
          <Text variant="h2" style={{ minWidth: 28 }} align="center">
            {draft.flatmates}
          </Text>
        </Animated.View>
        <PressableScale onPress={() => set("flatmates", Math.min(6, draft.flatmates + 1))} style={styles.stepBtn} disabled={draft.flatmates === 6} accessibilityLabel="More flatmates">
          <Plus size={18} color={colors.foreground} />
        </PressableScale>
      </View>
    </>
  );
}

function StepExtras({ draft, set, errors }: StepProps) {
  const toggleAmenity = (a: (typeof AMENITIES)[number]) =>
    set("amenities", draft.amenities.includes(a) ? draft.amenities.filter((x) => x !== a) : [...draft.amenities, a]);
  return (
    <>
      <View style={{ gap: spacing.sm }}>
        <Label error={errors.photos}>Photos</Label>
        <PhotoPicker value={draft.photos} onChange={(p) => set("photos", p)} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Label>Available from</Label>
        <View style={styles.wrap}>
          {AVAILABILITY_OPTIONS.map((o) => (
            <Chip key={o} label={AVAILABILITY_LABEL[o]} selected={draft.availability === o} onPress={() => set("availability", o)} />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Label>Looking for</Label>
        <Segmented options={GENDER_PREFS.map((g) => ({ value: g, label: GENDER_LABEL[g] }))} value={draft.genderPreference} onChange={(v) => set("genderPreference", v)} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Label>Amenities</Label>
        <View style={styles.wrap}>
          {AMENITIES.map((a) => (
            <Chip key={a} size="sm" label={a} selected={draft.amenities.includes(a)} onPress={() => toggleAmenity(a)} />
          ))}
        </View>
      </View>
      <Input
        label="Description"
        value={draft.description}
        onChangeText={(t) => set("description", t)}
        multiline
        maxLength={1000}
        placeholder="Who you are, the vibe of the flat, commute, house rules…"
        error={errors.description}
        hint={`${draft.description.length}/1000`}
      />
    </>
  );
}

function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale key={o.value} onPress={() => onChange(o.value)} scaleTo={0.95} style={[styles.segment, on && styles.segmentOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
            <Text variant="smallMedium" color={on ? colors.white : colors.foreground} numberOfLines={1}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  topRow: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl * 2, overflow: "hidden" },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.white },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  map: { height: 200, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.border },
  row2: { flexDirection: "row", gap: spacing.md },
  segmented: { flexDirection: "row", gap: spacing.xs, padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, alignItems: "center", paddingVertical: spacing.md - 2, borderRadius: radius.sm },
  segmentOn: { backgroundColor: colors.primary },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
});
