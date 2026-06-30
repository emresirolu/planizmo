"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction, resetDaybookAction } from "@/lib/actions/account";

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" role="dialog" aria-modal>
      <div className="absolute inset-0" style={{ background: "rgba(43,42,38,.42)" }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[16px] p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 30px 70px rgba(70,55,30,.22)" }}>
        {children}
      </div>
    </div>
  );
}

const rowBtn = "flex w-full items-center justify-between rounded-[11px] border px-4 py-3.5 text-left";

export default function AccountPrivacy() {
  const [showReset, setShowReset] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function doReset() {
    start(async () => { await resetDaybookAction(); });
  }
  function doDelete() {
    setErr(null);
    if (confirmText !== "DELETE") { setErr("Type DELETE to confirm."); return; }
    start(async () => {
      const res = await deleteAccountAction(confirmText);
      if (res && !res.ok && res.error) setErr(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Export */}
      <a href="/api/account/export" className={rowBtn} style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--ink)", textDecoration: "none" }}>
        <span>
          <span className="block text-[14px] font-medium">Export my data</span>
          <span className="block text-[12.5px]" style={{ color: "var(--muted)" }}>Download everything you&apos;ve stored as JSON.</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></svg>
      </a>

      {/* Reset */}
      <button type="button" onClick={() => setShowReset(true)} className={rowBtn} style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--ink)", cursor: "pointer" }}>
        <span>
          <span className="block text-[14px] font-medium">Reset my daybook</span>
          <span className="block text-[12.5px]" style={{ color: "var(--muted)" }}>Clear your generated setup and start again.</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>
      </button>

      {/* Delete */}
      <button type="button" onClick={() => { setErr(null); setConfirmText(""); setShowDelete(true); }} className={rowBtn} style={{ background: "color-mix(in srgb, var(--alert) 6%, var(--surface))", borderColor: "color-mix(in srgb, var(--alert) 35%, var(--border))", color: "var(--alert)", cursor: "pointer" }}>
        <span>
          <span className="block text-[14px] font-semibold">Delete account</span>
          <span className="block text-[12.5px]" style={{ color: "color-mix(in srgb, var(--alert) 75%, var(--muted))" }}>Permanently delete your account and all data.</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
      </button>

      {showReset && (
        <Modal onClose={() => setShowReset(false)}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600 }}>Reset your daybook?</div>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            This keeps your account but clears your generated goals, trackers, time blocks, and review setup so you can start again.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowReset(false)} className="rounded-[9px] border px-3.5 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
            <button type="button" disabled={pending} onClick={doReset} className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold disabled:opacity-60" style={{ background: "var(--accent)", color: "#F6F1E6", cursor: "pointer" }}>{pending ? "Resetting…" : "Reset daybook"}</button>
          </div>
        </Modal>
      )}

      {showDelete && (
        <Modal onClose={() => setShowDelete(false)}>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "var(--alert)" }}>Delete account permanently?</div>
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--muted)" }}>
            This will delete your goals, trackers, time blocks, gym logs, reviews, onboarding answers, Think sessions, and AI history. This cannot be undone.
          </p>
          <label className="mt-4 block text-[12px]" style={{ color: "var(--muted)" }}>Type <span className="font-semibold" style={{ color: "var(--ink)" }}>DELETE</span> to confirm</label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="pz-in mt-1.5 w-full rounded-[9px] border px-3 py-2.5 text-[14px] outline-none"
            style={{ background: "var(--paper)", borderColor: "var(--border)", color: "var(--ink)" }}
            placeholder="DELETE"
            autoFocus
          />
          {err && <div className="mt-2 text-[12.5px]" style={{ color: "var(--alert)" }}>{err}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setShowDelete(false)} className="rounded-[9px] border px-3.5 py-2 text-[13px]" style={{ borderColor: "var(--border)", color: "var(--muted)", cursor: "pointer" }}>Cancel</button>
            <button type="button" disabled={pending || confirmText !== "DELETE"} onClick={doDelete} className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--alert)", cursor: "pointer" }}>{pending ? "Deleting…" : "Delete account"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
