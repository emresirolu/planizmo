export type DailyHealth = {
  date: string; // YYYY-MM-DD
  sleepHours: number | null;
  steps: number | null;
};

export type ProviderName = "mock" | "fitbit" | "google_health";

export type HealthProvider = {
  name: ProviderName;
  /** Inclusive range of daily sleep + steps for the user. */
  fetchRange(
    userId: string,
    fromDate: string,
    toDate: string,
  ): Promise<DailyHealth[]>;
};

export const SLEEP_TARGET = 8; // hours
export const STEPS_TARGET = 8000;
