"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id?: string; role: "user" | "assistant"; content: string };

const Sparkle = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3l1.7 4.7L18 9l-4.3 1.3L12 15l-1.7-4.7L6 9l4.3-1.3z" />
  </svg>
);

function Typing() {
  return (
    <div className="flex gap-1 px-1 py-1.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--muted)", animation: "pulse 1.1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

const CHIPS: { label: string; action: string }[] = [
  { label: "Plan my day", action: "plan_day" },
  { label: "Replan around gym", action: "replan_anchor" },
  { label: "Build grocery list", action: "build_list" },
  { label: "What should I do next?", action: "next_move" },
];

function RailBody({ name, greeting, onClose }: { name: string; greeting: string; onClose?: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSummary(typeof d.summary === "string" ? d.summary : null);
        setMessages(Array.isArray(d.messages) ? d.messages : []);
      })
      .catch(() => active && setSummary("I couldn't load your summary just now — try refreshing in a moment."))
      .finally(() => active && setLoadingInit(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, summary]);

  useEffect(() => {
    const f = () => inputRef.current?.focus();
    window.addEventListener("planizmo:assistant", f);
    return () => window.removeEventListener("planizmo:assistant", f);
  }, []);

  async function send(text: string, action?: string) {
    const t = text.trim();
    if (!t || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: t }]);
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, action }),
      });
      const d = await res.json().catch(() => ({}));
      const reply = typeof d.reply === "string" ? d.reply : "Something went wrong on my end — try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: reply, id: d.id }]);
      if (d.refresh) window.dispatchEvent(new Event("planizmo:data-changed"));
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach my assistant brain just now. Your data is safe — try again shortly." }]);
    } finally {
      setSending(false);
    }
  }

  const thread: Msg[] = summary ? [{ role: "assistant", content: summary }, ...messages] : messages;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b px-[18px] py-[17px]" style={{ borderColor: "var(--border)" }}>
        <div className="flex gap-2.5">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px]" style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", color: "var(--accent)" }}>
            <Sparkle size={18} />
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">Planizmo AI</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>Your personal planning assistant</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: "var(--muted)", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      <div ref={scrollRef} className="pz-sc flex-1 overflow-y-auto p-[18px]">
        {loadingInit ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (<div key={i} className="h-3 rounded" style={{ background: "var(--border)", width: i === 2 ? "55%" : "100%" }} />))}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {thread.map((m, i) => {
              const ai = m.role === "assistant";
              return (
                <div key={m.id ?? i} className="flex gap-2.5" style={{ justifyContent: ai ? "flex-start" : "flex-end" }}>
                  {ai && (
                    <span className="mt-0.5 flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--accent) 13%, transparent)", color: "var(--accent)" }}>
                      <Sparkle size={14} />
                    </span>
                  )}
                  <div
                    className="max-w-[82%] px-3 py-[11px] text-[13.5px] leading-relaxed"
                    style={{
                      borderRadius: ai ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                      background: ai ? "var(--surface2)" : "color-mix(in srgb, var(--accent) 15%, transparent)",
                      border: `1px solid ${ai ? "var(--border)" : "color-mix(in srgb, var(--accent) 28%, transparent)"}`,
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-2 py-1" style={{ background: "var(--surface2)" }}><Typing /></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-[18px] pb-3.5">
        <div className="mb-3 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button key={c.action} type="button" onClick={() => void send(c.label, c.action)} disabled={sending}
              className="rounded-full border px-3 py-[7px] text-[12.5px] disabled:opacity-60"
              style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)", cursor: "pointer" }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-[14px] border py-2 pl-[15px] pr-2" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void send(input); } }}
            placeholder="Ask anything…"
            className="pz-in min-w-0 flex-1 border-none bg-transparent text-[13.5px] outline-none"
            style={{ color: "var(--text)" }}
          />
          <button type="button" onClick={() => void send(input)} disabled={!input.trim() || sending} aria-label="Send"
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] text-white disabled:opacity-50" style={{ background: "var(--accent)", cursor: "pointer" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.6 21 12 3.4 3.4 3.4 10l12 2-12 2z" /></svg>
          </button>
        </div>
        <div className="mt-2.5 text-center text-[11px]" style={{ color: "var(--muted)" }}>AI can make mistakes. Check important info.</div>
      </div>
    </div>
  );
}

export default function AssistantRail({ name, greeting }: { name: string; greeting: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const f = () => { if (window.innerWidth < 1024) setOpen(true); };
    window.addEventListener("planizmo:assistant", f);
    return () => window.removeEventListener("planizmo:assistant", f);
  }, []);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[348px] flex-none border-l lg:block" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <RailBody name={name} greeting={greeting} />
      </aside>

      <button type="button" onClick={() => setOpen(true)} aria-label="Open assistant"
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg lg:hidden" style={{ background: "var(--accent)" }}>
        <Sparkle size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 top-10 overflow-hidden rounded-t-3xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <RailBody name={name} greeting={greeting} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
