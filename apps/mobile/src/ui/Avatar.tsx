import { initials } from "@flatme/shared";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { gradients } from "@/theme/tokens";
import { Text } from "./Text";

export function Avatar({ name, uri, size = 48 }: { name: string; uri?: string | null; size?: number }) {
  if (uri) return <Image source={uri} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" transition={200} />;
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant="h3" color="#fff" style={{ fontSize: size * 0.38, lineHeight: size * 0.46 }}>
        {initials(name)}
      </Text>
    </LinearGradient>
  );
}

/** Square monogram used for company badges on listing cards. */
export function CompanyMark({ company, size = 24 }: { company: string; size?: number }) {
  return (
    <LinearGradient colors={["#e0f2fe", "#cffafe"]} style={[styles.base, { width: size, height: size, borderRadius: 6 }]}>
      <Text variant="caption" color="#0e7490" style={{ fontSize: size * 0.46 }}>
        {company.charAt(0).toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ base: { alignItems: "center", justifyContent: "center" } });
