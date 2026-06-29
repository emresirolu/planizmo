import { redirect } from "next/navigation";

// Habits has been renamed to Trackers in v2.
export default function HabitsRedirect() {
  redirect("/dashboard/trackers");
}
