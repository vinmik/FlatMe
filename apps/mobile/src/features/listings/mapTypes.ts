import type { GeoPoint, ListingSummary } from "@flatme/shared";
import type { StyleProp, ViewStyle } from "react-native";

export interface ListingMapHandle {
  focus: (p: GeoPoint, zoomed?: boolean) => void;
}

export interface ListingMapProps {
  listings: Pick<ListingSummary, "id" | "rent" | "location">[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  center?: GeoPoint | null;
  interactive?: boolean;
  showsUserLocation?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Draggable single pin (post-a-room flow). */
  draggablePin?: { value: GeoPoint; onChange: (p: GeoPoint) => void };
}
