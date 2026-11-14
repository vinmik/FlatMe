import type { ListingDetail } from "@flatme/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { ListingForm } from "@/features/listings/ListingForm";
import { PublishSuccess } from "@/features/listings/PublishSuccess";
import { colors } from "@/theme/tokens";

export default function NewListingScreen() {
  const router = useRouter();
  const [published, setPublished] = useState<ListingDetail | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {!published && <ListingForm onClose={close} onSaved={setPublished} />}
      {published && (
        <PublishSuccess
          listing={published}
          edited={false}
          onDone={close}
          onView={() => router.replace({ pathname: "/listing/[id]", params: { id: published.id } })}
        />
      )}
    </View>
  );
}
