"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ask, HELP, isClassroomUrl, nowMinutesIST, todayIST, type AssistantData } from "@classpilot/core";

type Msg = { from: "me" | "bot"; text: string; options?: string[]; retry?: string };

/** Ask from anywhere on the page: window.dispatchEvent(new CustomEvent("cp:ask", { detail: "text" })). */
export const askAssistant = (text: string) => window.dispatchEvent(new CustomEvent("cp:ask", { detail: text }));

export function Assistant({ data }: { data: AssistantData }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Ask about your classes, attendance, deadlines or events.", options: HELP.slice(0, 4) }]);
  const [listening, setListening] = useState(false);
  const [voiceOK, setVoiceOK] = useState(false);
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const recRef = useRef<any>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const send = (q: string) => {
    if (!q.trim()) return;
    const r = ask(q, dataRef.current, todayIST(), nowMinutesIST());
    const retry = r.options && /which|pick/i.test(r.text) ? q : undefined;
    setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", text: r.text, options: r.options, retry }]);
    setText("");
    if (r.navigate) router.push(r.navigate);
    if (r.openUrl && isClassroomUrl(r.openUrl)) window.open(r.openUrl, "_blank", "noopener");
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => { setVoiceOK(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    const onAsk = (e: Event) => { setOpen(true); sendRef.current(String((e as CustomEvent).detail ?? "")); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("cp:ask", onAsk);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("cp:ask", onAsk); window.removeEventListener("keydown", onKey); };
  }, []);

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => send(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec; setListening(true); rec.start();
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="assistant-panel" aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed z-40 bottom-5 right-5 h-14 px-5 bg-ink text-bg mono text-[12px] font-bold uppercase tracking-[0.12em] flex items-center gap-2 shadow-[3px_3px_0_0_var(--accent-fill)] hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-none">
        {open ? "Close" : <><span aria-hidden>⌘</span> Ask</>}
      </button>
      {open && (
        <section id="assistant-panel" aria-label="Assistant"
          className="fixed z-40 bottom-24 right-4 left-4 sm:left-auto sm:w-[420px] max-h-[72vh] flex flex-col bg-card border border-line-strong shadow-[3px_3px_0_0_var(--ink)]" style={{ borderColor: "var(--line-strong)" }}>
          <div className="index-band px-4 pt-4">
            <span className="label">Assistant</span>
            <span className="label">ClassPilot AI · runs on your device</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-[15px]" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "text-right" : ""}>
                <div className={`inline-block max-w-[92%] text-left whitespace-pre-line px-3 py-2 ${m.from === "me" ? "bg-ink text-bg" : "bg-panel border border-line"}`}>{m.text}</div>
                {m.options && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {m.options.map((o) => (
                      <button key={o} onClick={() => send(m.retry ? `${m.retry} ${o}` : o)} className="tag hover:bg-ink hover:text-bg min-h-8">{o}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="p-3 border-t border-line flex gap-2">
            <label htmlFor="assistant-input" className="sr-only">Question</label>
            <input id="assistant-input" ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="When is my next DBMS class?" className="input" />
            {voiceOK && (
              <button type="button" onClick={listen} aria-label={listening ? "Stop listening" : "Ask by voice"} aria-pressed={listening}
                className={`btn ${listening ? "btn-bad" : "btn-line"} px-3`}>{listening ? "■" : "🎤"}</button>
            )}
            <button className="btn">Ask</button>
          </form>
        </section>
      )}
    </>
  );
}
