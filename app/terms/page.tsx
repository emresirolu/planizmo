import type { Metadata } from "next";
import LegalPage, { CONTACT_EMAIL, L } from "@/components/daybook/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — Planizmo",
  description: "The terms for using Planizmo.",
};

export default function TermsPage() {
  return (
    <LegalPage
      kicker="TERMS OF USE"
      title="Using Planizmo."
      updated="Last updated June 2026"
      intro="By using Planizmo, you agree to these terms. They're written plainly on purpose."
      otherHref="/privacy"
      otherLabel="Read the Privacy Policy"
      sections={[
        {
          h: "What Planizmo is",
          body: <p>Planizmo is a planning and productivity tool — a digital daybook for goals, routines, and tracking. It is <strong>not</strong> medical, financial, legal, or mental-health advice.</p>,
        },
        {
          h: "Your responsibility",
          body: (
            <L items={[
              "You are responsible for your own decisions and how you act on anything in the app.",
              "AI outputs (plans, suggestions, reviews, Think prompts) may be inaccurate or incomplete — review them before relying on them.",
              "Use the app responsibly and lawfully.",
            ]} />
          ),
        },
        {
          h: "Your account",
          body: <p>You can delete your account at any time from Settings, which permanently removes your data. You may also reset your daybook to start over while keeping your account.</p>,
        },
        {
          h: "Changes to the product",
          body: <p>Planizmo is evolving. We may add, change, or remove features over time. We'll aim to keep the core experience — your daybook — stable and yours.</p>,
        },
        {
          h: "Contact",
          body: <p>Questions about these terms? Reach us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.</p>,
        },
      ]}
    />
  );
}
