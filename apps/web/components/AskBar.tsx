"use client";
import { useState } from "react";
import { askAssistant } from "./Assistant";

export function AskBar({ suggestions }: { suggestions: string[] }) {
  const [q, setQ] = useState("");
  return (
    <div className="plate p-3 flex flex-col md:flex-row md:items-center gap-3">
      <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { askAssistant(q); setQ(""); } }}>
        <label htmlFor="askbar" className="sr-only">Ask ClassPilot</label>
        <input id="askbar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything: “When is my next lab?”" className="input bg-card" />
        <button className="btn">Ask</button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="label mr-1">Try</span>
        {suggestions.map((s) => <button key={s} type="button" onClick={() => askAssistant(s)} className="tag bg-card hover:bg-ink hover:text-bg min-h-9">{s}</button>)}
      </div>
    </div>
  );
}
