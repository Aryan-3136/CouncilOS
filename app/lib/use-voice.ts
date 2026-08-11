"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; start: () => void; stop: () => void; abort: () => void; onresult: ((event: any) => void) | null; onend: (() => void) | null; onerror: ((event: any) => void) | null; };
type RecognitionConstructor = new () => Recognition;
export const VOICE_RATE = 1; export const VOICE_PITCH = 1;

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle"), [interimTranscript, setInterimTranscript] = useState(""), [finalTranscript, setFinalTranscript] = useState(""), [supported, setSupported] = useState(false), [active, setActive] = useState(false);
  const recognition = useRef<Recognition | null>(null), activeRef = useRef(false), stateRef = useRef<VoiceState>("idle");
  const transition = useCallback((next: VoiceState) => { console.info(`Atlas voice: ${stateRef.current} → ${next}`); stateRef.current = next; setState(next); }, []);
  const restart = useCallback(() => { try { if (activeRef.current && stateRef.current === "listening") recognition.current?.start(); } catch (error) { console.error("Atlas voice restart failure:", error); } }, []);
  const fail = useCallback((reason: string) => { console.error("Atlas voice failure:", reason); activeRef.current = false; setActive(false); try { recognition.current?.stop(); window.speechSynthesis?.cancel(); } catch (error) { console.error("Atlas voice cleanup failure:", error); } transition("idle"); }, [transition]);
  useEffect(() => { const Constructor = typeof window === "undefined" ? undefined : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition as RecognitionConstructor | undefined; if (!Constructor) return; setSupported(true); const instance = new Constructor(); instance.continuous = true; instance.interimResults = true; instance.lang = "en-IN";
    instance.onresult = (event: any) => { try { let interim = "", final = ""; for (let i = event.resultIndex; i < event.results.length; i += 1) { const text = event.results[i][0].transcript; if (event.results[i].isFinal) final += text; else interim += text; } setInterimTranscript(interim); if (final) setFinalTranscript(final.trim()); } catch (error) { console.error("Atlas voice result handler failure:", error); fail("Unable to process voice input"); } };
    instance.onend = () => { try { setInterimTranscript(""); if (activeRef.current && stateRef.current === "listening") restart(); else if (stateRef.current === "listening") transition("idle"); } catch (error) { console.error("Atlas voice end handler failure:", error); fail("Voice recognition stopped unexpectedly"); } };
    instance.onerror = (event: any) => { console.error("Atlas voice recognition error:", event?.error || event); if (event?.error !== "aborted") fail(`Voice recognition error: ${event?.error || "unknown"}`); };
    recognition.current = instance; return () => { try { instance.abort(); } catch { /* already stopped */ } recognition.current = null; };
  }, [fail, restart, transition]);
  const start = useCallback(() => { if (!recognition.current) return; activeRef.current = true; setActive(true); setFinalTranscript(""); setInterimTranscript(""); transition("listening"); restart(); }, [restart, transition]);
  const stop = useCallback(() => { activeRef.current = false; setActive(false); try { recognition.current?.stop(); window.speechSynthesis?.cancel(); } catch (error) { console.error("Atlas voice stop failure:", error); } transition("idle"); }, [transition]);
  const thinking = useCallback(() => transition("thinking"), [transition]);
  const interruptSpeech = useCallback(() => { try { window.speechSynthesis?.cancel(); transition("listening"); restart(); } catch (error) { console.error("Atlas speech interruption failure:", error); fail("Could not stop speech"); } }, [fail, restart, transition]);
  const speak = useCallback((text: string) => { try { if (!window.speechSynthesis) throw new Error("Speech synthesis is unavailable"); recognition.current?.stop(); transition("speaking"); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = VOICE_RATE; utterance.pitch = VOICE_PITCH; utterance.onerror = () => fail("Atlas could not speak the response"); utterance.onend = () => { if (activeRef.current) { transition("listening"); restart(); } else transition("idle"); }; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance); } catch (error) { console.error("Atlas voice speak failure:", error); fail("Atlas could not speak the response"); throw error; } }, [fail, restart, transition]);
  return { state, supported, active, interimTranscript, finalTranscript, start, stop, speak, thinking, fail, interruptSpeech, clearTranscript: () => { setInterimTranscript(""); setFinalTranscript(""); } };
}
