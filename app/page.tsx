import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planizmo — a premium digital daybook",
  description:
    "Planizmo turns your goals, hobbies, routines, and health into a personal daybook — with time blocks, trackers, and weekly reviews that adjust with you.",
};

// Faithful static render of the approved editorial landing (Planizmo Landing.dc.html).
// Tokens + fonts come from .pz-paper in globals.css. CTAs route into the app.
const HTML = `
<div class="pz-paper" style="background:var(--canvas);min-height:100vh">

  <!-- NAV -->
  <div style="position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--canvas) 90%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)">
    <div style="max-width:1120px;margin:0 auto;padding:15px 28px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:28px;height:28px;border-radius:7px;background:var(--accent);color:#F6F1E6;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z"/></svg></div>
        <span style="font-family:var(--serif);font-size:21px;font-weight:500;letter-spacing:-.01em">planizmo</span>
      </div>
      <div class="pz-nav-links" style="display:flex;align-items:center;gap:28px">
        <a href="#how" style="font-size:14px;color:var(--muted);text-decoration:none">How it works</a>
        <a href="#life" style="font-size:14px;color:var(--muted);text-decoration:none">Built for you</a>
        <a href="#surfaces" style="font-size:14px;color:var(--muted);text-decoration:none">The daybook</a>
        <a href="#review" style="font-size:14px;color:var(--muted);text-decoration:none">Review</a>
      </div>
      <a href="/signin" style="background:var(--accent);color:#F6F1E6;font-size:13.5px;font-weight:600;padding:10px 16px;border-radius:8px;cursor:pointer;text-decoration:none;display:inline-block">Build my daybook</a>
    </div>
  </div>

  <!-- HERO -->
  <div style="max-width:1120px;margin:0 auto;padding:64px 28px 40px">
    <div class="pz-hero" style="display:flex;gap:48px;align-items:center">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">A PREMIUM DIGITAL DAYBOOK</div>
        <h1 class="pz-h1" style="font-family:var(--serif);font-size:56px;font-weight:600;line-height:1.05;letter-spacing:-.02em;margin:18px 0 0">Your goals are too big for a to-do list.</h1>
        <p style="font-size:17px;color:var(--muted);line-height:1.6;margin:20px 0 0;max-width:520px">Planizmo turns your goals, hobbies, routines, and health into a personal daybook — with time blocks, trackers, and weekly reviews that adjust with you.</p>
        <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap">
          <a href="/signin" style="background:var(--accent);color:#F6F1E6;font-size:15px;font-weight:600;padding:14px 22px;border-radius:9px;cursor:pointer;text-decoration:none;display:inline-block">Build my daybook</a>
          <a href="#how" style="background:var(--surface);border:1px solid var(--border);color:var(--ink);font-size:15px;font-weight:500;padding:14px 22px;border-radius:9px;cursor:pointer;text-decoration:none;display:inline-block">See how it works</a>
        </div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--faint);margin-top:20px;letter-spacing:.04em">NO CREDIT CARD · 2-MINUTE SETUP · YOURS TO SHAPE</div>
      </div>
      <!-- hero daybook visual -->
      <div style="flex:1;min-width:0;max-width:520px">
        <div style="background:var(--paper);border:1px solid var(--border);border-radius:16px;box-shadow:0 30px 70px rgba(70,55,30,.18);overflow:hidden">
          <div style="padding:20px 22px;border-bottom:1px solid var(--border)">
            <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.16em;color:var(--faint)">FRIDAY · MAY 24</div>
            <div style="font-family:var(--serif);font-size:26px;font-weight:500;margin-top:3px">Today</div>
            <div style="font-family:var(--mono);font-size:10.5px;color:var(--muted);margin-top:9px;letter-spacing:.02em">SLEEP 7H12 · ENERGY STEADY · PROTEIN 96/150 · GYM 15:00 · FOCUS 1/2</div>
          </div>
          <div style="padding:6px 22px 14px;display:flex;gap:22px">
            <div style="flex:1;border-top:2px solid var(--ink);margin-top:8px">
              <div style="display:flex;gap:13px;padding:11px 0;border-bottom:1px dotted var(--rule)"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:46px;text-align:right">08:30</span><span style="font-family:var(--serif);font-size:16px;color:var(--faint);text-decoration:line-through;flex:1">Deep work · session 1</span></div>
              <div style="display:flex;gap:13px;padding:11px 0;border-bottom:1px dotted var(--rule);align-items:center"><span style="font-family:var(--mono);font-size:11px;color:var(--ink);font-weight:600;width:46px;text-align:right">10:45</span><span style="font-family:var(--serif);font-size:16px;font-weight:600;flex:1">Deep work · session 2</span><span style="font-family:var(--mono);font-size:8px;letter-spacing:.1em;color:#F6F1E6;background:var(--accent);padding:2px 6px;border-radius:4px">NEXT</span></div>
              <div style="display:flex;gap:13px;padding:11px 0;border-bottom:1px dotted var(--rule)"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:46px;text-align:right">13:15</span><span style="font-family:var(--serif);font-size:16px;flex:1">Client outreach</span></div>
              <div style="display:flex;gap:13px;padding:11px 0"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:46px;text-align:right">15:00</span><span style="font-family:var(--serif);font-size:16px;flex:1">Gym · upper body</span></div>
            </div>
          </div>
          <div style="padding:0 22px 20px"><div style="font-family:var(--hand);font-size:18px;color:var(--accent);line-height:1.2">You closed session 1 strong — ride it into session 2 before lunch.</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- A · HOW IT WORKS -->
  <div id="how" style="max-width:1120px;margin:0 auto;padding:56px 28px">
    <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">HOW IT WORKS</div>
    <h2 style="font-family:var(--serif);font-size:34px;font-weight:600;letter-spacing:-.01em;margin:12px 0 0">From a few questions to a living plan.</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:30px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:22px"><div style="font-family:var(--mono);font-size:22px;font-weight:600;color:var(--accent)">01</div><div style="font-family:var(--serif);font-size:19px;font-weight:600;margin-top:12px">Answer a few questions</div><div style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:7px">Life areas, goals, your week, energy, and the coaching tone you want.</div></div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:22px"><div style="font-family:var(--mono);font-size:22px;font-weight:600;color:var(--accent)">02</div><div style="font-family:var(--serif);font-size:19px;font-weight:600;margin-top:12px">Planizmo builds your daybook</div><div style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:7px">Goals, trackers, time-block templates, and review metrics — set up for you.</div></div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:22px"><div style="font-family:var(--mono);font-size:22px;font-weight:600;color:var(--accent)">03</div><div style="font-family:var(--serif);font-size:19px;font-weight:600;margin-top:12px">Execute with time blocks</div><div style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:7px">Each day is a clear, ruled plan. You always know what's next.</div></div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:22px"><div style="font-family:var(--mono);font-size:22px;font-weight:600;color:var(--accent)">04</div><div style="font-family:var(--serif);font-size:19px;font-weight:600;margin-top:12px">Review what improved</div><div style="font-size:13.5px;color:var(--muted);line-height:1.55;margin-top:7px">Each week: what improved, what slipped, and the one fix worth making.</div></div>
    </div>
  </div>

  <!-- B · BUILT AROUND YOUR LIFE -->
  <div id="life" style="background:var(--paper);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
    <div style="max-width:1120px;margin:0 auto;padding:56px 28px">
      <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">BUILT AROUND YOUR LIFE</div>
      <h2 style="font-family:var(--serif);font-size:34px;font-weight:600;letter-spacing:-.01em;margin:12px 0 0">One daybook. Many lives.</h2>
      <p style="font-size:15px;color:var(--muted);max-width:560px;margin:12px 0 0;line-height:1.55">Hobbies and ambitions don't become more tabs — they become goals, trackers, time blocks, and review metrics.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:28px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px"><div style="font-family:var(--serif);font-size:18px;font-weight:600">Student</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:7px">Course blocks, study streaks, exam goals, focus reviews.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px"><div style="font-family:var(--serif);font-size:18px;font-weight:600">Founder</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:7px">Deep-work blocks, build missions, momentum trackers, weekly reviews.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px"><div style="font-family:var(--serif);font-size:18px;font-weight:600">Gym-focused</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:7px">Training plan, protein + sleep trackers, strength trend, session logs.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px"><div style="font-family:var(--serif);font-size:18px;font-weight:600">Creative · music</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:7px">Practice blocks, project goals, idea capture, output reviews.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px"><div style="font-family:var(--serif);font-size:18px;font-weight:600">Reader · language</div><div style="font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:7px">Reading blocks, streak trackers, fluency goals, reflection prompts.</div></div>
      </div>
    </div>
  </div>

  <!-- C · TIME BLOCKS BACKBONE -->
  <div style="max-width:1120px;margin:0 auto;padding:64px 28px">
    <div class="pz-hero" style="display:flex;gap:48px;align-items:center">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">TIME BLOCKS ARE THE BACKBONE</div>
        <h2 style="font-family:var(--serif);font-size:36px;font-weight:600;letter-spacing:-.01em;margin:12px 0 0;line-height:1.1">It doesn't just tell you what to do. It shows <span style="font-style:italic">when</span> you'll do it.</h2>
        <p style="font-size:15.5px;color:var(--muted);line-height:1.6;margin:18px 0 0;max-width:500px">Goals and habits are promises until they're on the calendar. Planizmo places real time blocks into your day, protects your focus, and rebalances when life moves.</p>
      </div>
      <div style="flex:1;min-width:0;max-width:460px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px;position:relative">
        <div style="position:absolute;left:64px;top:18px;bottom:18px;width:1px;background:var(--rule)"></div>
        <div style="display:flex;gap:14px;align-items:center;padding:9px 0"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:40px;text-align:right">09:00</span><span style="width:9px;height:9px;border-radius:50%;background:#BDB196;flex:none"></span><span style="font-family:var(--serif);font-size:15px;color:var(--faint);text-decoration:line-through">Study · linear algebra</span></div>
        <div style="display:flex;gap:14px;align-items:center;padding:9px 0"><span style="font-family:var(--mono);font-size:11px;color:var(--ink);font-weight:600;width:40px;text-align:right">10:45</span><span style="width:9px;height:9px;border-radius:50%;background:var(--accent);flex:none"></span><span style="font-family:var(--serif);font-size:15px;font-weight:600">Deep work · session 2</span></div>
        <div style="display:flex;gap:14px;align-items:center;padding:9px 0"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:40px;text-align:right">15:00</span><span style="width:9px;height:9px;border-radius:50%;border:2px solid var(--rule);flex:none"></span><span style="font-family:var(--serif);font-size:15px">Gym · upper body</span></div>
        <div style="display:flex;gap:14px;align-items:center;padding:9px 0"><span style="font-family:var(--mono);font-size:11px;color:var(--faint);width:40px;text-align:right">20:00</span><span style="width:9px;height:9px;border-radius:50%;border:2px solid var(--rule);flex:none"></span><span style="font-family:var(--serif);font-size:15px">Read · 20 min</span></div>
      </div>
    </div>
  </div>

  <!-- D · MORE THAN TRACKING -->
  <div id="surfaces" style="background:var(--paper);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
    <div style="max-width:1120px;margin:0 auto;padding:56px 28px">
      <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">MORE THAN TRACKING</div>
      <h2 style="font-family:var(--serif);font-size:34px;font-weight:600;letter-spacing:-.01em;margin:12px 0 0">Eight surfaces, one notebook.</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:28px">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Today</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Your ruled daily plan — what's next, right now.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Calendar</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Plan and rebalance your whole week.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Operator</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">A command room that creates blocks and moves your day.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Think</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">A room for hard questions and clear decisions.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Goals</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Missions with milestones, logs, and scheduled work.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Trackers</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Steps, sleep, protein, habits, mood — quietly supporting.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Gym</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">A training cockpit with live sets and a logbook.</div></div>
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:17px"><div style="font-family:var(--serif);font-size:17px;font-weight:600">Review</div><div style="font-size:12.5px;color:var(--muted);margin-top:5px;line-height:1.5">Are you improving or drifting? The honest weekly read.</div></div>
      </div>
    </div>
  </div>

  <!-- E · REVIEW -->
  <div id="review" style="max-width:1120px;margin:0 auto;padding:64px 28px">
    <div class="pz-hero" style="display:flex;gap:48px;align-items:center">
      <div style="flex:1;min-width:0">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--accent)">THE WEEKLY REVIEW</div>
        <h2 style="font-family:var(--serif);font-size:36px;font-weight:600;letter-spacing:-.01em;margin:12px 0 0;line-height:1.12">What improved, what slipped, and what to fix next week.</h2>
        <p style="font-size:15.5px;color:var(--muted);line-height:1.6;margin:18px 0 0;max-width:500px">Charts are the evidence; the conclusion is the product. Planizmo reads your week and hands you one high-leverage change — and an uncomfortable truth.</p>
      </div>
      <div style="flex:1;min-width:0;max-width:460px;background:var(--surface);border:1px solid var(--accent);border-radius:14px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:9px;padding:13px 17px;background:color-mix(in srgb,var(--accent) 8%,transparent);border-bottom:1px solid color-mix(in srgb,var(--accent) 30%,transparent)"><span style="color:var(--accent);display:flex"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z"/></svg></span><span style="font-family:var(--serif);font-size:17px;font-weight:600">Planizmo review</span></div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:15px">
          <div><div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--accent)">WHAT IMPROVED</div><div style="font-size:13.5px;margin-top:4px">Gym consistency rose from 2 to 4 sessions.</div></div>
          <div><div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:#A8503F">WHAT SLIPPED</div><div style="font-size:13.5px;margin-top:4px">Deep work dropped after nights under 6h sleep.</div></div>
          <div><div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--faint)">HIGHEST-LEVERAGE FIX</div><div style="font-size:13.5px;margin-top:4px">Protect a 10:00 focus block before messages.</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- F · FINAL CTA -->
  <div style="background:var(--accent);color:#F6F1E6">
    <div style="max-width:1120px;margin:0 auto;padding:74px 28px;text-align:center">
      <h2 style="font-family:var(--serif);font-size:48px;font-weight:600;letter-spacing:-.02em;margin:0">Make your daybook.</h2>
      <p style="font-size:16px;opacity:.85;margin:16px auto 0;max-width:480px;line-height:1.55">Answer a few questions. Planizmo builds your goals, trackers, time blocks, and your first plan.</p>
      <a href="/signin" style="display:inline-flex;background:#F6F1E6;color:var(--accent);font-size:16px;font-weight:700;padding:15px 28px;border-radius:10px;margin-top:26px;cursor:pointer;text-decoration:none">Build my daybook</a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="max-width:1120px;margin:0 auto;padding:26px 28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div style="display:flex;align-items:center;gap:9px"><div style="width:22px;height:22px;border-radius:6px;background:var(--accent);color:#F6F1E6;display:flex;align-items:center;justify-content:center"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 5.4c3-1.1 6-1.1 9 0v13.2c-3-1.1-6-1.1-9 0zM21 5.4c-3-1.1-6-1.1-9 0v13.2c3-1.1 6-1.1 9 0z"/></svg></div><span style="font-family:var(--serif);font-size:16px">planizmo</span></div>
    <div style="font-family:var(--mono);font-size:10.5px;color:var(--faint);letter-spacing:.06em">A PREMIUM DIGITAL DAYBOOK · © 2024</div>
  </div>
</div>
`;

export default function LandingPage() {
  return <div dangerouslySetInnerHTML={{ __html: HTML }} />;
}
