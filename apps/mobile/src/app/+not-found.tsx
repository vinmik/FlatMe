import { useRouter } from "expo-router";
import { MapPinOff } from "lucide-react-native";
import { View } from "react-native";
import { colors } from "@/theme/tokens";
import { Button, EmptyState } from "@/ui";

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.white }}>
      <EmptyState icon={MapPinOff} title="Page not found" body="This link may be broken or the listing has been removed." action={<Button title="Go home" size="md" onPress={() => router.replace("/")} />} />
    </View>
  );
}
