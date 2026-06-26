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
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--muted)", animation: "pulse 1.1s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function RailBody({
  name,
  greeting,
  onClose,
}: {
  name: string;
  greeting: string;
  onClose?: () => void;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setSummary(typeof d.summary === "string" ? d.summary : null);
        setMessages(Array.isArray(d.messages) ? d.messages : []);
      })
      .catch(() => {
        if (active) setSummary("I couldn't load your summary just now — try refreshing in a moment.");
      })
      .finally(() => active && setLoadingInit(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, summary]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const d = await res.json().catch(() => ({}));
      const reply =
        typeof d.reply === "string"
          ? d.reply
          : "Something went wrong on my end — try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: reply, id: d.id }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I couldn't reach my assistant brain just now. Your data is safe — try again shortly." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3.5"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: "var(--accent)" }}>
            <Sparkle />
          </span>
          <div>
            <div className="text-[15px] font-medium leading-tight">{greeting}, {name}</div>
            <div className="text-[11px]" style={{ color: "var(--muted)" }}>your assistant</div>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--surface2)", color: "var(--muted)", cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* scrollable content */}
      <div ref={scrollRef} className="pz-scroll flex-1 overflow-y-auto px-4 py-4">
        {/* daily summary */}
        <div className="rounded-2xl border p-3.5" style={{ background: "var(--surface2)", borderColor: "var(--border)" }}>
          <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "var(--accent)" }}>
            <Sparkle size={13} /> today
          </div>
          {loadingInit ? (
            <div className="flex flex-col gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-3 rounded" style={{ background: "var(--border)", width: i === 2 ? "60%" : "100%" }} />
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] leading-relaxed">{summary}</p>
          )}
        </div>

        {/* chat thread */}
        <div className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={m.id ?? i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: "var(--accent)", color: "#fff" }
                    : { background: "var(--surface2)", color: "var(--text)" }
                }
              >
                {m.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-2 py-1" style={{ background: "var(--surface2)" }}>
                <Typing />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="ask about your day…"
            className="pz-in pz-scroll max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || sending}
            aria-label="Send"
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white disabled:opacity-50"
            style={{ background: "var(--accent)", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssistantRail({
  name,
  greeting,
}: {
  name: string;
  greeting: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* desktop: persistent right rail */}
      <aside
        className="sticky top-0 hidden h-dvh w-80 flex-none border-l lg:block"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <RailBody name={name} greeting={greeting} />
      </aside>

      {/* mobile/tablet: launcher + sheet */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg lg:hidden"
        style={{ background: "var(--accent)" }}
      >
        <Sparkle size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,.34)" }} onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 top-10 overflow-hidden rounded-t-3xl border"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <RailBody name={name} greeting={greeting} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
