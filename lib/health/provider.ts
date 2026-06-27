import "server-only";
import { mockProvider } from "./mock";
import { fitbitConfigured, fitbitProvider } from "./fitbit";
import type { HealthProvider, ProviderName } from "./types";

/** Which provider the env selects (before checking it's actually usable). */
export function selectedProviderName(): ProviderName {
  return process.env.HEALTH_PROVIDER === "fitbit" ? "fitbit" : "mock";
}

/**
 * The active provider. Real providers only run when explicitly selected AND
 * configured; otherwise we fall back to mock so the demo is never broken.
 */
export function getProvider(): HealthProvider {
  if (selectedProviderName() === "fitbit" && fitbitConfigured()) return fitbitProvider;
  return mockProvider;
}

/** True when a real (non-mock) provider is driving sync — used to mark source. */
export function isRealProviderActive(): boolean {
  return getProvider().name !== "mock";
}
