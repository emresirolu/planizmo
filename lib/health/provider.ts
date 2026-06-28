import "server-only";
import { fitbitConfigured } from "./fitbit";

export type ProviderMode = "fitbit" | "mock" | "off";

/**
 * Global health provider mode from env. Unset (or anything other than
 * "fitbit"/"mock") means OFF — production can disable mock health entirely.
 */
export function selectedProviderName(): ProviderMode {
  const v = process.env.HEALTH_PROVIDER;
  if (v === "fitbit") return "fitbit";
  if (v === "mock") return "mock";
  return "off";
}

/** The seeded demo account is the only account that gets mock health. */
export function isDemoEmail(email: string | null | undefined): boolean {
  const demo = process.env.DEMO_EMAIL;
  return Boolean(demo && email && email.toLowerCase() === demo.toLowerCase());
}

/** Whether the real provider could run at all (selected + configured). */
export function realProviderAvailable(): boolean {
  return selectedProviderName() === "fitbit" && fitbitConfigured();
}
