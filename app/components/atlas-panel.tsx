"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, LoaderCircle, Mic, MicOff, Send, Sparkles, Volume2 } from "lucide-react";
import { useVoice } from "../lib/use-voice";
import { sanitizeReply } from "../lib/text-utils";

type Message = { role: "user" | "assistant"; content: string };
type HistoryMessage = { role: "user" | "assistant" | "tool"; content: string | null; tool_call_id?: string; tool_calls?: { id: string; type?: "function"; function: { name: string; arguments: string } }[] };

function successfulTools(history: HistoryMessage[]) {
  const names = new Map(history.flatMap((message) => message.tool_calls?.map((call) => [call.id, call.function.name] as const) ?? []));
  return history.flatMap((message) => { if (message.role !== "tool" || !message.tool_call_id || !message.content) return []; try { return JSON.parse(message.content).success ? [names.get(message.tool_call_id)].filter((name): name is string => Boolean(name)) : []; } catch { return []; } });
}

export function AtlasPanel() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "I'm Atlas. Ask about your personal priorities or your council's status." },
  ]);
  const [history, setHistory] = useState<HistoryMessage[]>([{ role: "assistant", content: "I'm Atlas. Ask about your personal priorities or your council's status." }]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const voice = useVoice();
  const isNewConversation = messages.length === 1 && !loading;
  const starters = ["What should I focus on today?", "Add a task", "Show my habit progress", "Which council team needs attention?"];

  const send = async (messageOverride?: string) => {
    const message = (messageOverride ?? text).trim();
    if (!message || loading) return;

    const shouldSpeak = voice.active;
    const nextHistory = [...history, { role: "user" as const, content: message }].slice(-20);
    setText("");
    setMessages((current) => [...current, { role: "user", content: message }]);
    setHistory(nextHistory);
    setLoading(true);
    setVoiceError("");
    if (shouldSpeak) voice.thinking();

    try {
      const controller = shouldSpeak ? new AbortController() : undefined;
      const timeout = shouldSpeak ? window.setTimeout(() => controller?.abort(), 20_000) : undefined;
      const response = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextHistory }),
        signal: controller?.signal,
      });
      if (timeout) window.clearTimeout(timeout);
      if (!response.ok) throw new Error("Atlas request failed");
      const body = await response.json();
      const reply = sanitizeReply(body.reply || body.error || "Atlas is unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (Array.isArray(body.history)) { const updatedHistory = body.history.slice(-20) as HistoryMessage[]; setHistory(updatedHistory); const tools = successfulTools(updatedHistory); const invalidations: Promise<unknown>[] = []; if (tools.some((name) => ["create_task", "assign_task_to_team", "complete_task"].includes(name))) invalidations.push(queryClient.invalidateQueries({ queryKey: ["tasks"] }), queryClient.invalidateQueries({ queryKey: ["goals"] }), queryClient.invalidateQueries({ queryKey: ["weekly-review"] }), queryClient.invalidateQueries({ queryKey: ["team-status"] })); if (tools.includes("checkin_habit")) invalidations.push(queryClient.invalidateQueries({ queryKey: ["habits"] }), queryClient.invalidateQueries({ queryKey: ["weekly-review"] })); if (tools.includes("create_team")) invalidations.push(queryClient.invalidateQueries({ queryKey: ["teams"] }), queryClient.invalidateQueries({ queryKey: ["team-status"] }), queryClient.invalidateQueries({ queryKey: ["weekly-review"] })); if (invalidations.length) await Promise.all(invalidations); } else setHistory((current) => [...current, { role: "assistant" as const, content: reply }].slice(-20));
      if (shouldSpeak) { try { const spoken = reply.match(/^[\s\S]*?[.!?](?:\s|$)/)?.[0]?.trim() || reply; voice.speak(spoken); if (spoken !== reply) console.info("Atlas voice reply truncated:", reply); } catch { setVoiceError("Something went wrong — tap to try again"); voice.fail("Text-to-speech failed"); } }
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      const reply = sanitizeReply(timedOut ? "Atlas took too long to respond. Please try again." : "Something went wrong — tap to try again.");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
      setHistory((current) => [...current, { role: "assistant" as const, content: reply }].slice(-20));
      if (shouldSpeak) { setVoiceError("Something went wrong — tap to try again"); voice.fail(timedOut ? "Atlas request timed out" : "Atlas request failed"); }
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
          {voice.state === "speaking" ? <button className="voice-toggle active" type="button" onClick={voice.interruptSpeech}><MicOff size={16} /> Stop speaking</button> : null}
        </div>
      </div>

      {voice.active && voice.interimTranscript ? <p className="voice-transcript">“{voice.interimTranscript}”</p> : null}

      {voiceError ? <button className="atlas-voice-error" type="button" onClick={() => { setVoiceError(""); voice.start(); }}>{voiceError}</button> : null}
      <section className={`atlas-chat ${isNewConversation ? "atlas-chat-empty" : ""}`} aria-live="polite">
        {isNewConversation ? <div className="atlas-welcome"><span className="atlas-welcome-mark"><Sparkles size={22} /></span><h2>How can I help?</h2><p>Plan your day, keep habits moving, or coordinate your council.</p><div className="atlas-starters">{starters.map((starter) => <button type="button" key={starter} onClick={() => { setText(starter); }}>{starter}</button>)}</div></div> : null}
        {messages.map((message, index) => <article className={`atlas-message ${message.role}`} key={index}>{message.role === "assistant" ? <Sparkles size={16} /> : null}<p>{message.content}</p></article>)}
        {loading ? voice.active ? <article className="atlas-voice-thinking"><span className="voice-orb"><Volume2 size={20} /></span><div><strong>Atlas is considering your request</strong><p>I'll speak the answer, then keep listening.</p></div></article> : <article className="atlas-message assistant"><LoaderCircle className="spin" size={16} /><p>Atlas is thinking…</p></article> : null}
      </section>

      <form className="atlas-compose" onSubmit={(event) => { event.preventDefault(); void send(); }}>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Message Atlas..." aria-label="Message Atlas" />
        <button className="atlas-send" disabled={loading || !text.trim()} aria-label="Send message"><ArrowUp size={18} /></button>
      </form>
      <p className="atlas-hint">Atlas can create tasks, check off habits, and help you prioritize.</p>
    </div>
  );
}
