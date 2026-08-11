"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; abort: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null; };
type RecognitionConstructor = new () => Recognition;
export const VOICE_RATE = 1; export const VOICE_PITCH = 1;

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle"), [interimTranscript, setInterimTranscript] = useState(""), [finalTranscript, setFinalTranscript] = useState(""), [supported, setSupported] = useState(false), [active, setActive] = useState(false);
  const recognition = useRef<Recognition | null>(null), activeRef = useRef(false), stateRef = useRef<VoiceState>("idle");
  useEffect(() => { activeRef.current = active; }, [active]); useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { const Constructor = typeof window === "undefined" ? undefined : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as RecognitionConstructor | undefined; if (!Constructor) return; setSupported(true); const instance = new Constructor(); instance.continuous = false; instance.interimResults = true; instance.lang = "en-IN"; instance.onresult = (event: any) => { let interim = "", final = ""; for (let index = event.resultIndex; index < event.results.length; index += 1) { const text = event.results[index][0].transcript; if (event.results[index].isFinal) final += text; else interim += text; } setInterimTranscript(interim); if (final) setFinalTranscript(final.trim()); }; instance.onend = () => { setInterimTranscript(""); if (activeRef.current && stateRef.current === "listening") window.setTimeout(() => { try { instance.start(); } catch { /* recognition is already restarting */ } }, 250); else if (stateRef.current === "listening") setState("idle"); }; instance.onerror = () => { if (!activeRef.current) setState("idle"); }; recognition.current = instance; return () => { instance.abort(); recognition.current = null; }; }, []);
  const start = useCallback(() => { if (!recognition.current) return; setActive(true); setFinalTranscript(""); setInterimTranscript(""); setState("listening"); try { recognition.current.start(); } catch { /* already listening */ } }, []);
  const stop = useCallback(() => { setActive(false); recognition.current?.stop(); window.speechSynthesis?.cancel(); setState("idle"); }, []);
  const thinking = useCallback(() => setState("thinking"), []);
  const speak = useCallback((text: string) => { if (!window.speechSynthesis) return; recognition.current?.stop(); setState("speaking"); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = VOICE_RATE; utterance.pitch = VOICE_PITCH; utterance.onend = () => { if (activeRef.current) { setState("listening"); window.setTimeout(() => { try { recognition.current?.start(); } catch { /* restart handled by browser */ } }, 200); } else setState("idle"); }; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); }, []);
  return { state, supported, active, interimTranscript, finalTranscript, start, stop, speak, thinking, clearTranscript: () => { setInterimTranscript(""); setFinalTranscript(""); } };
}
