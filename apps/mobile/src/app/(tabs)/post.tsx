import { Redirect } from "expo-router";

/** The centre tab is an action, not a destination: the tab bar opens /listing/new directly. */
export default function PostTab() {
  return <Redirect href="/listing/new" />;
}
