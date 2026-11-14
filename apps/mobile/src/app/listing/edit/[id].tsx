import { useLocalSearchParams, useRouter } from "expo-router";
import { Home } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { errorMessage } from "@/api";
import { useListing } from "@/api/hooks";
import { ListingForm } from "@/features/listings/ListingForm";
import { colors } from "@/theme/tokens";
import { Button, EmptyState, toast } from "@/ui";

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useListing(id);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/my-listings"));

  if (q.isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!q.data || !q.data.isOwner) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.white }}>
        <EmptyState icon={Home} title="Can't edit this listing" body={q.error ? errorMessage(q.error) : "Only the owner can edit a listing."} action={<Button title="Go back" size="md" onPress={close} />} />
      </View>
    );
  }

  return (
    <ListingForm
      existing={q.data}
      onClose={close}
      onSaved={() => {
        toast.success("Listing updated");
        close();
      }}
    />
  );
}
