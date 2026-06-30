import type { Metadata } from "next";
import LegalPage, { CONTACT_EMAIL, L } from "@/components/daybook/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Planizmo",
  description: "How Planizmo collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      kicker="PRIVACY POLICY"
      title="Your daybook, your data."
      updated="Last updated June 2026"
      intro="Planizmo is a personal digital daybook. This policy explains what we store, how it's used, and the control you have over it."
      otherHref="/terms"
      otherLabel="Read the Terms"
      sections={[
        {
          h: "What we store",
          body: (
            <L items={[
              "Account information (your name and email from Google sign-in).",
              "Onboarding answers (life areas, goals, weekly routine, energy pattern, coaching style).",
              "Goals, trackers and their daily logs, time blocks, and calendar items.",
              "Gym data (body metrics, workouts, and sets).",
              "Review data and the metrics computed from your activity.",
              "Think sessions and AI / Operator interaction history, if you use those features.",
            ]} />
          ),
        },
        {
          h: "How we use it",
          body: (
            <L items={[
              "To personalize your daybook — your planning, time blocks, tracking, and weekly reviews.",
              "To generate AI suggestions, plans, reviews, and Think prompts from the content you provide.",
              "To keep your account working across devices.",
            ]} />
          ),
        },
        {
          h: "AI features",
          body: <p>When you use AI features (Operator, Think, the gym coach, insights, and reviews), the content you provide may be processed by our AI provider to generate plans, suggestions, reviews, and prompts. AI output can be inaccurate — review it before acting on it.</p>,
        },
        {
          h: "Authentication",
          body: <p>We use Google sign-in to authenticate you. We store the identifiers needed to keep you signed in; we do not see your Google password.</p>,
        },
        {
          h: "We do not sell your data",
          body: <p>Planizmo does not sell your personal data. We use it only to run the product for you.</p>,
        },
        {
          h: "Your controls",
          body: (
            <L items={[
              "Export: download everything you've stored as a JSON file from Settings.",
              "Reset: clear your generated daybook and start over, keeping your account.",
              "Delete: permanently delete your account and all associated data.",
              <>Requests: you can request access, export, or deletion of your data any time at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{CONTACT_EMAIL}</a>.</>,
            ]} />
          ),
        },
      ]}
    />
  );
}
