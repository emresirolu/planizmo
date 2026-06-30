import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import GoogleButton from "@/components/daybook/GoogleButton";

const HOW = [
  ["01", "Answer a few questions"],
  ["02", "Planizmo builds your daybook"],
  ["03", "Execute with time blocks"],
  ["04", "Review what improved"],
];
const BLOCKS = [
  ["08:30", "Deep work", true],
  ["10:45", "Deep work · session 2", false],
  ["15:00", "Gym · upper body", false],
  ["18:00", "Review & plan tomorrow", false],
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="pz-paper flex min-h-dvh items-center justify-center px-5 py-10" style={{ background: "var(--canvas)" }}>
      <div className="grid w-full max-w-[1000px] items-center gap-12 md:grid-cols-2">
        {/* LEFT — editorial intro */}
        <div>
          <div className="flex items-center gap-[10px]">
            <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px]" style={{ background: "var(--accent)", color: "#F6F1E6" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z" /></svg>
            </span>
            <span style={{ fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-.01em" }}>planizmo</span>
          </div>

          <div className="mt-7" style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", color: "var(--accent)" }}>A PREMIUM DIGITAL DAYBOOK</div>
          <h1 className="mt-[14px]" style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 600, lineHeight: 1.07, letterSpacing: "-.02em" }}>Your goals are too big for a to-do list.</h1>
          <p className="mt-4 max-w-[460px] text-[15.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Planizmo turns your goals, hobbies, routines, and health into a personal daybook — with time blocks, trackers, and weekly reviews that adjust with you.
          </p>

          <div className="mt-7 hidden flex-col gap-[14px] md:flex">
            {HOW.map(([n, label]) => (
              <div key={n} className="flex items-baseline gap-3">
                <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{n}</span>
                <span className="text-[14.5px]" style={{ fontFamily: "var(--serif)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — preview + sign-in */}
        <div className="flex flex-col gap-4">
          {/* mini Today preview */}
          <div className="overflow-hidden rounded-[16px]" style={{ background: "var(--paper)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(70,55,30,.14)" }}>
            <div className="px-[22px] pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".16em", color: "var(--faint)" }}>FRIDAY · WEEK 21</div>
              <div className="mt-[3px]" style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 500 }}>Today</div>
              <div className="mt-[9px]" style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--muted)", letterSpacing: ".02em" }}>
                SLEEP <span style={{ color: "var(--ink)" }}>7h12</span> · ENERGY <span style={{ color: "var(--ink)" }}>steady</span> · PROTEIN <span style={{ color: "var(--ink)" }}>96/150</span> · GYM <span style={{ color: "var(--accent)" }}>15:00</span> · FOCUS <span style={{ color: "var(--accent)" }}>1/2</span>
              </div>
            </div>
            <div className="px-[22px] py-2">
              <div style={{ borderTop: "2px solid var(--ink)" }}>
                {BLOCKS.map(([time, label, done], i) => (
                  <div key={time as string} className="flex items-center gap-[13px] py-[10px]" style={{ borderBottom: i < BLOCKS.length - 1 ? "1px dotted var(--rule)" : "none" }}>
                    <span className="w-[46px] flex-none text-right" style={{ fontFamily: "var(--mono)", fontSize: 11, color: done ? "var(--faint)" : "var(--ink)", fontWeight: i === 1 ? 600 : 400 }}>{time}</span>
                    <span className="flex-1" style={{ fontFamily: "var(--serif)", fontSize: 15.5, color: done ? "var(--faint)" : "var(--ink)", textDecoration: done ? "line-through" : "none", fontWeight: i === 1 ? 600 : 400 }}>{label}</span>
                    {i === 1 && <span style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".1em", color: "#F6F1E6", background: "var(--accent)", padding: "2px 6px", borderRadius: 4 }}>NEXT</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-[22px] pb-5 pt-1">
              <div style={{ fontFamily: "var(--hand)", fontSize: 18, lineHeight: 1.2, color: "var(--accent)" }}>You closed session 1 strong — ride it into session 2 before lunch.</div>
            </div>
          </div>

          {/* sign-in card */}
          <div className="rounded-[14px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <GoogleButton />
            </form>
            {error && (
              <p className="mt-3 text-center text-[13px]" style={{ color: "var(--alert)" }}>Sign-in didn&apos;t complete — please try again.</p>
            )}
            <p className="mt-3 text-center text-[12.5px]" style={{ color: "var(--muted)" }}>No credit card. Build your daybook in two minutes.</p>
          </div>

          <p className="text-center text-[12px]" style={{ color: "var(--faint)" }}>By continuing, you agree to use Planizmo responsibly.</p>
        </div>
      </div>
    </main>
  );
}
