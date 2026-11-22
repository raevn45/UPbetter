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
  const recognition = useRef<RecognitionLike | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const voiceUrl = useRef<string | null>(null);

  useEffect(() => { void loadVoice().then(blob => setHasVoice(Boolean(blob))).catch(() => setHasVoice(false)); }, []);

  const answer = useCallback(async () => {
    let phrase = "No upcoming alarm.";
    if (nextAlarmAt) {
      const remaining = new Date(nextAlarmAt).getTime() - Date.now();
      if (remaining > 0) {
        const hours = Math.max(0.1, Math.round(remaining / 360000) / 10);
        phrase = "You have " + hours + " hours of sleep left.";
      }
    }
    try {
      const voice = await loadVoice();
      if (voice) {
        if (voiceUrl.current) URL.revokeObjectURL(voiceUrl.current);
        voiceUrl.current = URL.createObjectURL(voice);
        const audio = new Audio(voiceUrl.current);
        await audio.play();
        await new Promise(resolve => { audio.onended = resolve; audio.onerror = resolve; });
      }
    } catch { /* The spoken time response remains available if a saved voice clip cannot play. */ }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(phrase));
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
      const transcript = last?.[0]?.transcript?.toLowerCase() ?? "";
      if (/how much time|how much sleep|time is left|sleep.*left/.test(transcript)) void answer();
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
    <div><strong>Voice assistant</strong><span>Say “How much time?” while UP is open. It answers with only your remaining sleep time.</span><small>Microphone mode: {status}. Listening is opt-in and can be switched off here. It only stays active while the app is open and supported by the browser.</small></div>
    <div className="setting-actions">
      <button className={`toggle ${enabled ? "on" : ""}`} onClick={() => setEnabled(value => !value)} aria-label={enabled ? "Turn voice assistant off" : "Turn voice assistant on"}><span/></button>
      <button className="outline-btn" onClick={() => void answer()}><Volume2 size={14}/> Test</button>
    </div>
    <div className="voice-record-controls">
      <span>{hasVoice ? "Your recorded voice greeting is saved on this device." : "Record a short greeting in your own voice. It plays before the time response; dynamic speech still uses your device's speech voice."}</span>
      {recording ? <button className="outline-btn" onClick={() => recorder.current?.stop()}><Square size={14}/> Stop recording</button> : <button className="outline-btn" onClick={() => void startRecording()}><Mic size={14}/> Record my voice</button>}
      {enabled ? <span><Radio size={13}/> {status}</span> : <span><MicOff size={13}/> Microphone off</span>}
    </div>
  </div>;
}
