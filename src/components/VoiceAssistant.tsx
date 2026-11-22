import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Radio, Volume2 } from "lucide-react";
import type { AlarmWithStatus, Weekday } from "../core";

type RecognitionResult = { [index: number]: { transcript: string }; isFinal: boolean };
type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};
type RecognitionConstructor = new () => RecognitionLike;
type AssistantWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
type VoiceAssistantProps = {
  nextAlarmAt?: string | null;
  nextAlarmLabel?: string;
  alarms: AlarmWithStatus[];
  onCreateAlarm: (input: { label: string; hour: number; minute: number; repeatDays: Weekday[] }) => Promise<string>;
  onDeleteAlarm: (id: string) => Promise<string>;
  timeFormat: "12h" | "24h";
};

function localTimeReply(message: string, nextAlarmAt: string | null | undefined, nextAlarmLabel: string, timeFormat: "12h" | "24h") {
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
  const at = target.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: timeFormat === "12h" });
  return `Your next alarm${nextAlarmLabel ? `, ${nextAlarmLabel},` : ""} is at ${at}, in ${parts.join(" and ")}.`;
}

function parseAlarmTime(text: string) {
  const match = text.match(/(?:at|for)\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = (match[3] ?? "").replaceAll(".", "").toLowerCase();
  if (minute > 59 || hour > 23 || hour < 0 || (period && (hour < 1 || hour > 12))) return null;
  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

export default function VoiceAssistant({ nextAlarmAt, nextAlarmLabel = "", alarms, onCreateAlarm, onDeleteAlarm, timeFormat }: VoiceAssistantProps) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("OFF");
  const [heard, setHeard] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const lastAnswerAt = useRef(0);
  const recognition = useRef<RecognitionLike | null>(null);

  const speak = useCallback((message: string) => {
    setLastAnswer(message);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    }
  }, []);

  const answer = useCallback(async (transcript: string) => {
    const lower = transcript.toLowerCase();
    if (/\b(set|create|add|make)\b.*\balarm\b/.test(lower)) {
      const time = parseAlarmTime(transcript);
      if (!time) { speak("Tell me a time, for example, set an alarm for 7:30 AM."); return; }
      const labelMatch = transcript.match(/(?:called|named|labelled|labeled)\s+(.+)$/i);
      const label = labelMatch?.[1]?.trim() || "Voice alarm";
      try { speak(await onCreateAlarm({ ...time, label, repeatDays: [] })); }
      catch (error) { speak(error instanceof Error ? error.message : "I could not create that alarm."); }
      return;
    }
    if (/\b(delete|remove|cancel)\b.*\balarm\b/.test(lower)) {
      const named = transcript.match(/(?:alarm)\s+(?:called|named)\s+(.+)$/i)?.[1]?.trim();
      const candidates = alarms;
      const target = named
        ? candidates.find(item => item.alarm.label.toLowerCase() === named.toLowerCase()) ?? candidates.find(item => item.alarm.label.toLowerCase().includes(named.toLowerCase()))
        : candidates.length === 1 ? candidates[0] : undefined;
      if (!target) { speak(named ? "I could not find an alarm with that name." : "Which alarm should I delete? Say, delete alarm called Gym."); return; }
      if (!window.confirm("Delete the " + target.alarm.label + " alarm?")) { speak("Okay. I left that alarm unchanged."); return; }
      try { speak(await onDeleteAlarm(target.alarm.id)); }
      catch (error) { speak(error instanceof Error ? error.message : "I could not delete that alarm."); }
      return;
    }
    const localReply = localTimeReply(transcript, nextAlarmAt, nextAlarmLabel, timeFormat);
    if (localReply) { speak(localReply); return; }
    setStatus("THINKING");
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript, context: { nextAlarmAt: nextAlarmAt ?? null, alarms: alarms.map(item => ({ label: item.alarm.label, enabled: item.alarm.enabled, hour: item.alarm.hour, minute: item.alarm.minute })), currentTime: new Date().toISOString() }})
      });
      const payload = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error || "UP could not answer right now.");
      speak(payload.reply);
      setStatus("ANSWERED");
    } catch (error) {
      speak(error instanceof Error ? error.message : "UP could not answer right now.");
      setStatus("ASSISTANT UNAVAILABLE");
    }
  }, [alarms, nextAlarmAt, nextAlarmLabel, onCreateAlarm, onDeleteAlarm, speak, timeFormat]);

  const startListening = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("MICROPHONE NOT AVAILABLE IN THIS ENVIRONMENT"); return; }
    try {
      setStatus("REQUESTING MICROPHONE ACCESS");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermission("granted");
      const Speech = (window as AssistantWindow).SpeechRecognition || (window as AssistantWindow).webkitSpeechRecognition;
      if (!Speech) { setStatus("SPEECH RECOGNITION NOT SUPPORTED HERE"); return; }
      setEnabled(true);
    } catch {
      setPermission("denied");
      setStatus("MICROPHONE PERMISSION DENIED. ENABLE IT IN DEVICE SETTINGS.");
    }
  };

  useEffect(() => {
    if (!enabled) {
      recognition.current?.stop();
      recognition.current = null;
      if (status !== "OFF") setStatus("OFF");
      return;
    }
    const Speech = (window as AssistantWindow).SpeechRecognition || (window as AssistantWindow).webkitSpeechRecognition;
    if (!Speech) { setStatus("SPEECH RECOGNITION NOT SUPPORTED HERE"); return; }
    const instance = new Speech();
    instance.continuous = true;
    instance.interimResults = false;
    instance.lang = navigator.language || "en-US";
    instance.onresult = event => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.trim() ?? "";
      if (!transcript || !last?.isFinal) return;
      setHeard(transcript);
      if (Date.now() - lastAnswerAt.current < 1800) return;
      lastAnswerAt.current = Date.now();
      void answer(transcript);
    };
    instance.onerror = () => setStatus("MICROPHONE PAUSED");
    instance.onend = () => {
      if (enabled && document.visibilityState === "visible") {
        setStatus("RECONNECTING");
        try { instance.start(); } catch { /* Browser is still transitioning. */ }
      }
    };
    recognition.current = instance;
    try { instance.start(); setStatus("LISTENING"); }
    catch { setStatus("MICROPHONE COULD NOT START"); }
    return () => { instance.onend = null; instance.stop(); recognition.current = null; };
  }, [enabled, answer]);

  return <div className="setting-row voice-assistant-setting">
    <div><strong>Voice assistant</strong><span>Talk to UP to check, create, and remove alarms. Listening runs only while UP is open.</span><small>Microphone permission: {permission === "granted" ? "Granted" : permission === "denied" ? "Blocked" : "Not requested"} · {status}. Spoken replies use your device's speech voice. UP does not clone or store your voice.</small></div>
    <div className="setting-actions">
      {enabled
        ? <button className="outline-btn" onClick={() => setEnabled(false)}><MicOff size={14}/> Stop listening</button>
        : <button className="primary-btn" onClick={() => void startListening()}><Mic size={14}/> Enable microphone</button>}
      <button className="outline-btn" onClick={() => void answer("How much time is left until my next alarm?")}><Volume2 size={14}/> Test voice reply</button>
    </div>
    {heard && <small className="voice-debug-line">Heard: “{heard}”</small>}
    {lastAnswer && <small className="voice-debug-line">UP: {lastAnswer}</small>}
    <div className="voice-record-controls"><span>{enabled ? <><Radio size={13}/> LISTENING</> : <><MicOff size={13}/> MICROPHONE OFF</>}</span><span>Try: “Set an alarm for 7:30 AM called Gym” or “Delete alarm called Gym”.</span></div>
  </div>;
}
