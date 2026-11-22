import { useCallback, useEffect, useRef, useState } from "react";
import { MicOff, Radio, Volume2 } from "lucide-react";

type RecognitionResult = { [index: number]: { transcript: string }; isFinal: boolean };
type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};
type RecognitionConstructor = new () => RecognitionLike;
type AssistantWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

function localTimeReply(message: string, nextAlarmAt?: string | null) {
  if (!/(time|long|much|left|until|next alarm|alarm)/i.test(message)) return null;
  if (!nextAlarmAt) return "You do not have an upcoming alarm set in UP yet.";
  const target = new Date(nextAlarmAt);
  if (!Number.isFinite(target.getTime())) return "I could not read your next alarm time. Please check your Alarms page.";
  const remaining = target.getTime() - Date.now();
  if (remaining <= 0) return "Your next alarm time has passed. Check your Alarms page for the next one.";
  const totalMinutes = Math.ceil(remaining / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(days + (days === 1 ? " day" : " days"));
  if (hours) parts.push(hours + (hours === 1 ? " hour" : " hours"));
  if (minutes || !parts.length) parts.push(minutes + (minutes === 1 ? " minute" : " minutes"));
  return "Your next alarm is in " + parts.join(" and ") + ".";
}

export default function VoiceAssistant({ nextAlarmAt }: { nextAlarmAt?: string | null }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("up-voice-assistant-enabled") === "true");
  const [status, setStatus] = useState("OFF");
  const [heard, setHeard] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const lastAnswerAt = useRef(0);
  const recognition = useRef<RecognitionLike | null>(null);


  const answer = useCallback(async (transcript = "How much time is left until my next alarm?") => {
    const localReply = localTimeReply(transcript, nextAlarmAt);
    if (localReply) {
      setLastAnswer(localReply);
      setStatus("ANSWERED");
      if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(localReply)); }
      return;
    }
    setStatus("THINKING");
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcript,
          context: { nextAlarmAt: nextAlarmAt ?? null, currentTime: new Date().toISOString() }
        })
      });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || "UP could not answer right now.");
      setLastAnswer(payload.reply);
      setStatus("ANSWERED");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.reply));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "UP could not answer right now.";
      setLastAnswer(message);
      setStatus("ASSISTANT UNAVAILABLE");
    }
  }, [nextAlarmAt]);

  useEffect(() => {
    localStorage.setItem("up-voice-assistant-enabled", String(enabled));
    if (!enabled) {
      recognition.current?.stop();
      recognition.current = null;
      setStatus("OFF");
      return;
    }
    const Speech = (window as AssistantWindow).SpeechRecognition || (window as AssistantWindow).webkitSpeechRecognition;
    if (!Speech) { setStatus("NOT SUPPORTED IN THIS BROWSER"); return; }
    const instance = new Speech();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = navigator.language || "en-US";
    instance.onresult = event => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.trim() ?? "";
      if (!transcript || !last?.isFinal) return;
      setHeard(transcript);
      const now = Date.now();
      if (now - lastAnswerAt.current < 1800) return;
      lastAnswerAt.current = now;
      void answer(transcript);
    };
    instance.onerror = () => setStatus("MICROPHONE PAUSED");
    instance.onend = () => {
      if (localStorage.getItem("up-voice-assistant-enabled") === "true") {
        setStatus("LISTENING");
        try { instance.start(); } catch { /* Browser may still be transitioning. */ }
      }
    };
    recognition.current = instance;
    try { instance.start(); setStatus("LISTENING"); }
    catch { setStatus("ALLOW MICROPHONE ACCESS"); }
    return () => { instance.onend = null; instance.stop(); recognition.current = null; };
  }, [enabled, answer]);

  return <div className="setting-row voice-assistant-setting">
    <div><strong>Voice assistant</strong><span>Talk to UP while the app is open. Ask about your next alarm or use the assistant for a conversation.</span><small>Microphone mode: {status}. Listening works while this page is open in supported browsers. UP answers time-until-alarm questions locally; open-ended AI chat needs the assistant service. Spoken replies use your device voice.</small></div>
    <div className="setting-actions">
      <button className={`toggle ${enabled ? "on" : ""}`} onClick={() => setEnabled(value => !value)} aria-label={enabled ? "Turn voice assistant off" : "Turn voice assistant on"}><span/></button>
      <button className="outline-btn" onClick={() => void answer("How much time is left until my next alarm?")}><Volume2 size={14}/> Test</button>
    </div>
    {heard && <small className="voice-debug-line">Heard: “{heard}”</small>}
    {lastAnswer && <small className="voice-debug-line">UP answered: {lastAnswer}</small>}
    <div className="voice-record-controls"><span>{enabled ? <><Radio size={13}/> {status}</> : <><MicOff size={13}/> Microphone off</>}</span><span>Voice cloning is not active. UP does not record or upload a voice sample.</span></div>
  </div>;
}
