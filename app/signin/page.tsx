import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        {/* wordmark */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{ background: "var(--accent)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-medium tracking-tight">planizmo</h1>
            <p
              className="mt-2 text-[15px] leading-relaxed"
              style={{ color: "var(--muted)" }}
            >
              The cleanest, calmest way to track your life. Sign in to build
              your dashboard.
            </p>
          </div>
        </div>

        {/* sign-in card */}
        <div
          className="w-full rounded-2xl border p-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
          }}
        >
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="#fff"
                  d="M21.35 11.1H12v3.83h5.35a4.58 4.58 0 0 1-1.98 3v2.49h3.2c1.87-1.72 2.95-4.26 2.95-7.28 0-.68-.06-1.34-.17-1.97z"
                  opacity=".9"
                />
                <path
                  fill="#fff"
                  d="M12 22c2.67 0 4.91-.88 6.55-2.39l-3.2-2.49c-.89.6-2.03.95-3.35.95-2.57 0-4.75-1.74-5.53-4.07H3.16v2.56A9.99 9.99 0 0 0 12 22z"
                />
                <path
                  fill="#fff"
                  d="M6.47 13.99A6 6 0 0 1 6.15 12c0-.69.12-1.36.32-1.99V7.45H3.16A9.98 9.98 0 0 0 2 12c0 1.62.39 3.15 1.16 4.55l3.31-2.56z"
                  opacity=".7"
                />
                <path
                  fill="#fff"
                  d="M12 5.94c1.45 0 2.75.5 3.78 1.48l2.83-2.83C16.9 2.99 14.67 2 12 2 8.13 2 4.78 4.22 3.16 7.45l3.31 2.56C7.25 7.68 9.43 5.94 12 5.94z"
                  opacity=".85"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        </div>

        <p className="text-center text-[13px]" style={{ color: "var(--muted)" }}>
          By continuing you agree to use Planizmo responsibly.
        </p>
      </div>
    </main>
  );
}
