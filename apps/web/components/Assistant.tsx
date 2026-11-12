"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ask, HELP, nowMinutesIST, todayIST, type AssistantData } from "@bunk/core";

type Msg = { from: "me" | "bot"; text: string; options?: string[] };

export function Assistant({ data }: { data: AssistantData }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi! Ask me about your attendance, skips, classes or events.", options: HELP.slice(0, 4) }]);
  const [listening, setListening] = useState(false);
  const [voiceOK, setVoiceOK] = useState(false);
  const router = useRouter();
  const end = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => { setVoiceOK(!!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs, open]);

  const send = (q: string) => {
    if (!q.trim()) return;
    const r = ask(q, data, todayIST(), nowMinutesIST());
    setMsgs((m) => [...m, { from: "me", text: q }, { from: "bot", text: r.text, options: r.options }]);
    setText("");
    if (r.navigate) router.push(r.navigate);
    if (r.openUrl) window.open(r.openUrl, "_blank", "noopener");
  };

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
      <button onClick={() => setOpen(!open)} aria-label="Open assistant"
        className="fixed bottom-5 right-5 z-30 h-14 w-14 rounded-full bg-accent text-white shadow-lg text-2xl grid place-items-center">
        {open ? "×" : "?"}
      </button>
      {open && (
        <div className="fixed z-30 bottom-24 right-4 left-4 sm:left-auto sm:w-96 card shadow-2xl flex flex-col max-h-[70vh]">
          <div className="px-4 py-3 border-b border-line">
            <p className="font-bold">Assistant</p>
            <p className="text-xs text-muted">Runs on your device. No AI API, so no made-up numbers.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === "me" ? "text-right" : ""}>
                <div className={`inline-block max-w-[90%] text-left whitespace-pre-line rounded-2xl px-3 py-2 ${m.from === "me" ? "bg-accent text-white" : "bg-bg border border-line"}`}>{m.text}</div>
                {m.options && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {m.options.map((o) => <button key={o} onClick={() => send(m.text.startsWith("Which") || m.text.includes("Pick") || m.text.includes("which") ? `${msgs.filter((x) => x.from === "me").at(-1)?.text ?? ""} ${o}` : o)} className="text-xs px-2.5 py-1 rounded-full border border-line hover:border-accent">{o}</button>)}
                  </div>
                )}
              </div>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="p-3 border-t border-line flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. can I skip tomorrow?" className="input" autoFocus />
            {voiceOK && (
              <button type="button" onClick={listen} aria-label="Speak" className={`btn ${listening ? "bg-rose-600" : "btn-ghost"}`}>{listening ? "■" : "🎤"}</button>
            )}
            <button className="btn">Ask</button>
          </form>
        </div>
      )}
    </>
  );
}
