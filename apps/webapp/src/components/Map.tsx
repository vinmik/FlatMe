"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/ui";

// Leaflet needs the browser's window, so the map code loads only on the client.
const loading = () => <Skeleton className="size-full rounded-none" />;
export const ListingsMap = dynamic(() => import("./MapCanvas").then((m) => m.ListingsMap), { ssr: false, loading });
export const AreaMap = dynamic(() => import("./MapCanvas").then((m) => m.AreaMap), { ssr: false, loading });
export const PinMap = dynamic(() => import("./MapCanvas").then((m) => m.PinMap), { ssr: false, loading });
