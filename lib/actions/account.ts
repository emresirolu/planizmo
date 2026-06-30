"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { deleteMyAccount, resetMyDaybook } from "@/lib/db/scoped";

/** Clear the generated daybook, keep the account, send the user to onboarding. */
export async function resetDaybookAction(): Promise<void> {
  await resetMyDaybook();
  redirect("/onboarding");
}

/** Permanently delete the signed-in user's account, then sign out to landing.
 *  Requires the user to have typed DELETE (checked again on the server). */
export async function deleteAccountAction(confirmText: string): Promise<{ ok: false; error: string }> {
  if (confirmText !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  await deleteMyAccount();
  // Clears the session cookie and redirects to the landing page.
  await signOut({ redirectTo: "/" });
  return { ok: false, error: "" }; // unreachable (signOut redirects)
}
