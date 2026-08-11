"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";
import { useVoice } from "../lib/use-voice";
import { sanitizeReply } from "../lib/text-utils";

type Message = { role: "user" | "assistant"; content: string };
type HistoryMessage = { role: "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: { id: string; type?: "function"; function: { name: string; arguments: string } }[] };

export function AtlasPanel() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm Atlas. Ask about your personal priorities or your council's status." },
  ]);
  const [history, setHistory] = useState<HistoryMessage[]>([{ role: "assistant", content: "I'm Atlas. Ask about your personal priorities or your council's status." }]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const voice = useVoice();

  const send = async (messageOverride?: string) => {
    const message = (messageOverride ?? text).trim();
    if (!message || loading) return;

    const shouldSpeak = voice.active;
    const nextHistory = [...history, { role: "user" as const, content: message }].slice(-20);
    setText("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setHistory(nextHistory);
    setLoading(true);
    if (shouldSpeak) voice.thinking();

    try {
      const response = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
      });
      const body = await response.json();
      const reply = sanitizeReply(body.reply || body.error || "Atlas is unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (Array.isArray(body.history)) setHistory(body.history.slice(-20)); else setHistory((current) => [...current, { role: "assistant" as const, content: reply }].slice(-20));
      if (shouldSpeak) voice.speak(reply);
    } catch {
      const reply = sanitizeReply("I couldn't reach Atlas just now. Please try again.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      setHistory((current) => [...current, { role: "assistant" as const, content: reply }].slice(-20));
      if (shouldSpeak) voice.speak(reply);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!voice.active || !voice.finalTranscript || loading) return;
    void send(voice.finalTranscript);
    voice.clearTranscript();
  }, [voice.active, voice.clearTranscript, voice.finalTranscript, loading]);

  const voiceLabel = voice.state === "listening" ? "Listening" : voice.state === "thinking" ? "Atlas is thinking" : "Atlas is speaking";

  return (
    <div className="page atlas-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Executive assistant</p>
          <h1>Atlas</h1>
          <p className="subtle">Personal by default. Name a team or council when you need coordination context.</p>
        </div>
        <div className="atlas-tools">
          <button className={`voice-toggle ${voice.active ? "active" : ""}`} type="button" disabled={!voice.supported} onClick={() => (voice.active ? voice.stop() : voice.start())} title={voice.supported ? "Start or end voice mode" : "Voice input is not supported by this browser"}>
            {voice.active ? <MicOff size={16} /> : <Mic size={16} />}
            {voice.active ? "End voice" : "Voice mode"}
          </button>
          {voice.active ? <span className="voice-status"><span />{voiceLabel}</span> : null}
        </div>
      </div>

      {voice.active && voice.interimTranscript ? <p className="voice-transcript">“{voice.interimTranscript}”</p> : null}

      <section className="atlas-chat" aria-live="polite">
        {messages.map((message, index) => <article className={`atlas-message ${message.role}`} key={index}>{message.role === "assistant" ? <Sparkles size={16} /> : null}<p>{message.content}</p></article>)}
        {loading ? voice.active ? <article className="atlas-voice-thinking"><span className="voice-orb"><Volume2 size={20} /></span><div><strong>Atlas is considering your request</strong><p>I'll speak the answer, then keep listening.</p></div></article> : <article className="atlas-message assistant"><LoaderCircle className="spin" size={16} /><p>Atlas is thinking…</p></article> : null}
      </section>

      <form className="atlas-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="What is on my plate today?" />
        <button className="primary-button" disabled={loading}><Send size={16} /> Send</button>
      </form>
    </div>
  );
}
