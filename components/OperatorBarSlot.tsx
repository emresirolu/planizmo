"use client";

import { usePathname } from "next/navigation";
import OperatorBar from "@/components/OperatorBar";

/**
 * The app-wide operator bar, persistent on every tab — except Today, where the
 * Today page renders its own Quick Log card (the same OperatorBar) in a specific
 * position, so we hide the global one there to avoid a duplicate.
 */
export default function OperatorBarSlot() {
  const pathname = usePathname();
  if (pathname === "/dashboard") return null;
  return <OperatorBar />;
}
