import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Radio, Square, Volume2 } from "lucide-react";

type RecognitionResult = { [index: number]: { transcript: string }; isFinal: boolean };
type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start(): void; stop(): void;
};
type RecognitionConstructor = new () => RecognitionLike;
type AssistantWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

function openVoiceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("up-voice-assistant", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("voice");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function saveVoice(blob: Blob) {
  const db = await openVoiceDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("voice", "readwrite");
    tx.objectStore("voice").put(blob, "wake-phrase");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function loadVoice(): Promise<Blob | null> {
  const db = await openVoiceDb();
  const value = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction("voice").objectStore("voice").get("wake-phrase");
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value ?? null;
}

export default function VoiceAssistant({ nextAlarmAt }: { nextAlarmAt?: string | null }) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem("up-voice-assistant-enabled") === "true");
  const [status, setStatus] = useState("OFF");
  const [hasVoice, setHasVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const lastAnswerAt = useRef(0);
  const recognition = useRef<RecognitionLike | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const voiceUrl = useRef<string | null>(null);

  useEffect(() => { void loadVoice().then(blob => setHasVoice(Boolean(blob))).catch(() => setHasVoice(false)); }, []);

  const answer = useCallback(async (transcript = "How much time is left until my next alarm?") => {
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

  const startRecording = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mediaRecorder = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = mediaRecorder;
      chunks.current = [];
      mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: mediaRecorder.mimeType || "audio/webm" });
        if (blob.size) { await saveVoice(blob); setHasVoice(true); }
        stream.current?.getTracks().forEach(track => track.stop());
        stream.current = null;
        setRecording(false);
      };
      mediaRecorder.start();
      setRecording(true);
    } catch { setStatus("MICROPHONE PERMISSION DENIED"); }
  };

  return <div className="setting-row voice-assistant-setting">
    <div><strong>Voice assistant</strong><span>Talk naturally while UP is open. Your speech is sent to UP’s assistant backend for a conversational response.</span><small>Microphone mode: {status}. Speech recognition is foreground-only in supported browsers. AI replies require the UP publisher to configure GEMINI_API_KEY. Spoken replies currently use the device voice, not a voice clone.</small></div>
    <div className="setting-actions">
      <button className={`toggle ${enabled ? "on" : ""}`} onClick={() => setEnabled(value => !value)} aria-label={enabled ? "Turn voice assistant off" : "Turn voice assistant on"}><span/></button>
      <button className="outline-btn" onClick={() => void answer("How much time is left until my next alarm?")}><Volume2 size={14}/> Test</button>
    </div>
    {heard && <small className="voice-debug-line">Heard: “{heard}”</small>}
    {lastAnswer && <small className="voice-debug-line">UP answered: {lastAnswer}</small>}
    <div className="voice-record-controls">
      <span>{hasVoice ? "Your recorded sample is stored locally only. It is not uploaded or used for voice cloning." : "Recording is sample capture only. Voice cloning requires a separately configured, consent-based synthesis provider."}</span>
      {recording ? <button className="outline-btn" onClick={() => recorder.current?.stop()}><Square size={14}/> Stop recording</button> : <button className="outline-btn" onClick={() => void startRecording()}><Mic size={14}/> Record my voice</button>}
      {enabled ? <span><Radio size={13}/> {status}</span> : <span><MicOff size={13}/> Microphone off</span>}
    </div>
  </div>;
}
