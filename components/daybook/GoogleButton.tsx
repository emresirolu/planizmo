"use client";

import { useFormStatus } from "react-dom";

// Sage/cream Google button with pending state. Lives inside the sign-in
// <form>, so useFormStatus reflects the server-action submission.
export default function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-[10px] px-4 py-3.5 text-[15px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-70"
      style={{ background: "var(--accent)", color: "#F6F1E6", cursor: pending ? "default" : "pointer" }}
    >
      {pending ? (
        "Connecting…"
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
            <path fill="#F6F1E6" d="M21.35 11.1H12v3.83h5.35a4.58 4.58 0 0 1-1.98 3v2.49h3.2c1.87-1.72 2.95-4.26 2.95-7.28 0-.68-.06-1.34-.17-1.97z" />
            <path fill="#F6F1E6" d="M12 22c2.67 0 4.91-.88 6.55-2.39l-3.2-2.49c-.89.6-2.03.95-3.35.95-2.57 0-4.75-1.74-5.53-4.07H3.16v2.56A9.99 9.99 0 0 0 12 22z" opacity=".85" />
            <path fill="#F6F1E6" d="M6.47 13.99A6 6 0 0 1 6.15 12c0-.69.12-1.36.32-1.99V7.45H3.16A9.98 9.98 0 0 0 2 12c0 1.62.39 3.15 1.16 4.55l3.31-2.56z" opacity=".7" />
            <path fill="#F6F1E6" d="M12 5.94c1.45 0 2.75.5 3.78 1.48l2.83-2.83C16.9 2.99 14.67 2 12 2 8.13 2 4.78 4.22 3.16 7.45l3.31 2.56C7.25 7.68 9.43 5.94 12 5.94z" opacity=".9" />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
