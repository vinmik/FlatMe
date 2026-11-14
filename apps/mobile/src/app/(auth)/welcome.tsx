import { CorporateEmailSchema, formatRupees, furnishingLabel, isValidEmail, type ListingSummary } from "@flatme/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { CheckCircle2, Clock, Home, Mail, MapPin, Shield, Users, Zap } from "lucide-react-native";
import { useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type TextInputInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeInUp, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, errorMessage } from "@/api";
import { useHighlights } from "@/api/hooks";
import { config } from "@/lib/config";
import { colors, radius, shadow, spacing } from "@/theme/tokens";
import { AnimatedNumber, Button, CompanyMark, Input, ListingCardSkeleton, LogoMark, PressableScale, Text, VerifiedBadge } from "@/ui";

const TRUST = [
  { icon: Shield, text: "Corporate-verified only" },
  { icon: Clock, text: "Find in 60 seconds" },
  { icon: Zap, text: "No broker fees" },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInputInstance>(null);
  const { data, isLoading } = useHighlights();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const looksValid = isValidEmail(email);

  async function submit() {
    const parsed = CorporateEmailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid work email");
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(parsed.data);
      router.push({ pathname: "/otp", params: { email: parsed.data, resendIn: String(res.resendInSec), devCode: res.devCode ?? "" } });
    } catch (e) {
      setError(e instanceof ApiError && e.code === "rate_limited" && e.retryAfterSec ? `Too many attempts. Try again in ${Math.ceil(e.retryAfterSec / 60)} min.` : errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const stats = data?.stats;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.white }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradientsHero} style={[StyleSheet.absoluteFill, { height: 420 }]} />

        <View style={styles.hero}>
          <Animated.View entering={ZoomIn.springify().damping(12)} style={styles.brandRow}>
            <LogoMark size={36} />
            <Text variant="h3" color={colors.primaryDeep}>
              FlatMe
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text variant="display">Your next flatmate works at a great company</Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(220).duration(500)}>
            <Text variant="body" color={colors.muted} style={{ fontSize: 17, lineHeight: 25 }}>
              Join verified professionals in Hyderabad. Zero brokers, zero hassle.
            </Text>
          </Animated.View>

          <View style={styles.trust}>
            {TRUST.map(({ icon: Icon, text }, i) => (
              <Animated.View key={text} entering={FadeInUp.delay(320 + i * 90).springify()} style={styles.trustItem}>
                <View style={styles.trustIcon}>
                  <Icon size={20} color={colors.primary} />
                </View>
                <Text variant="small" color={colors.muted} align="center">
                  {text}
                </Text>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeIn.delay(600)} style={styles.stats}>
            <Stat value={stats?.activeListings} suffix="+" label="Active listings" />
            <View style={styles.divider} />
            <Stat value={stats?.professionals} suffix="+" label="Professionals" />
            <View style={styles.divider} />
            <Stat value={stats?.companies} suffix="+" label="Companies" />
          </Animated.View>
        </View>

        <View style={styles.featured}>
          <View style={styles.featuredHead}>
            <Text variant="h3">Posted by verified professionals</Text>
          </View>
          {isLoading ? (
            <View style={{ flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.xxl }}>
              <ListingCardSkeleton width={260} />
              <ListingCardSkeleton width={260} />
            </View>
          ) : (
            <FlatList
              horizontal
              data={data?.featured ?? []}
              keyExtractor={(l) => l.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.xxl, gap: spacing.lg, paddingBottom: spacing.sm }}
              snapToInterval={260 + spacing.lg}
              decelerationRate="fast"
              renderItem={({ item, index }) => <FeaturedCard listing={item} index={index} onPress={() => emailRef.current?.focus()} />}
            />
          )}
        </View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(400).springify().damping(18)} style={[styles.cta, shadow.lg, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <Input
          ref={emailRef}
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (error) setError(null);
          }}
          placeholder="Enter your corporate email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={error}
          left={<Mail size={18} color={colors.muted} />}
          right={looksValid ? <Animated.View entering={ZoomIn.springify()}><CheckCircle2 size={20} color={colors.success} /></Animated.View> : null}
          testID="email-input"
        />
        <View style={styles.privacy}>
          <Shield size={14} color={colors.primary} />
          <Text variant="small" color={colors.muted} style={{ flex: 1 }}>
            Only verified corporate emails. We never share your data.
          </Text>
        </View>
        <Button title="Get started — it's free" onPress={submit} loading={loading} disabled={!email.trim()} testID="get-started" />
        {config.useMockApi && (
          <Text variant="caption" color={colors.subtle} align="center">
            Demo mode · any work email works, code 123456
          </Text>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const gradientsHero = ["#ecfeff", "#ffffff"] as const;

function Stat({ value, suffix, label }: { value?: number; suffix: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      {value === undefined ? (
        <Text variant="h2" color={colors.primary}>
          —
        </Text>
      ) : (
        <AnimatedNumber value={value} variant="h2" color={colors.primary} format={(n) => `${Math.round(n).toLocaleString("en-IN")}${suffix}`} />
      )}
      <Text variant="caption" color={colors.muted}>
        {label}
      </Text>
    </View>
  );
}

function FeaturedCard({ listing, index, onPress }: { listing: ListingSummary; index: number; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInRight.delay(200 + index * 90).springify().damping(18)} style={{ width: 260 }}>
      <PressableScale onPress={onPress} scaleTo={0.97} style={[styles.card, shadow.sm]}>
        <View style={{ height: 160 }}>
          <Image source={listing.coverPhoto ?? undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <VerifiedBadge style={{ position: "absolute", top: spacing.md, left: spacing.md }} />
          <View style={[styles.glass, { position: "absolute", top: spacing.md, right: spacing.md }]}>
            <Text variant="caption">{furnishingLabel(listing.furnishing)}</Text>
          </View>
        </View>
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <View style={styles.row}>
            <CompanyMark company={listing.owner.company} />
            <Text variant="smallMedium">{listing.owner.company}</Text>
          </View>
          <View style={styles.row}>
            <MapPin size={14} color={colors.muted} />
            <Text variant="small" color={colors.muted}>
              {listing.area}
            </Text>
          </View>
          <View style={[styles.row, { alignItems: "baseline", gap: 4 }]}>
            <Text variant="price" color={colors.primary}>
              {formatRupees(listing.rent)}
            </Text>
            <Text variant="small" color={colors.muted}>
              /month
            </Text>
          </View>
          <View style={[styles.row, { gap: spacing.lg }]}>
            <View style={styles.row}>
              <Users size={14} color={colors.muted} />
              <Text variant="small" color={colors.muted}>
                {listing.flatmates} flatmate{listing.flatmates === 1 ? "" : "s"}
              </Text>
            </View>
            <View style={styles.row}>
              <Home size={14} color={colors.muted} />
              <Text variant="small" color={colors.muted}>
                {listing.roomType}
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: spacing.xxl, gap: spacing.lg },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  trust: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  trustItem: { flex: 1, alignItems: "center", gap: spacing.sm },
  trustIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", backgroundColor: colors.canvas, borderRadius: radius.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.border },
  divider: { width: 1, backgroundColor: colors.border },
  featured: { marginTop: spacing.xxl, paddingVertical: spacing.xl, backgroundColor: colors.canvas, gap: spacing.lg },
  featuredHead: { paddingHorizontal: spacing.xxl },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
  glass: { backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cta: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.md,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  privacy: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", paddingHorizontal: spacing.xs },
});
